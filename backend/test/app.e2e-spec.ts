import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as request from 'supertest';
import * as argon2 from 'argon2';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { API_PREFIX } from '../src/common/constants';
import { OtpService } from '../src/modules/auth/otp.service';

describe('SaniPay Backend API (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let otpService: OtpService;
  let customerToken: string;
  let adminToken: string;

  const samplePasswordHash = '$argon2id$v=19$m=65536,t=3,p=4$dummyhash$dummyhash';
  const samplePinHash = '$argon2id$v=19$m=65536,t=3,p=4$dummypinhash$dummypinhash';

  const mockCustomerUser = {
    id: 'usr_customer_1',
    email: 'musa@example.com',
    phone: '08012345678',
    passwordHash: '',
    transactionPinHash: '',
    role: 'CUSTOMER',
    status: 'ACTIVE',
    failedLoginAttempts: 0,
    lockoutUntil: null,
    isPhoneVerified: true,
    referralCode: 'MUSA1234',
    profile: { fullName: 'Musa Sani' },
    wallet: { balanceKobo: 0n },
  };

  const mockAdminUser = {
    id: 'usr_admin_1',
    email: 'admin@sanipay.ng',
    phone: '08087654321',
    role: 'SUPER_ADMIN',
    status: 'ACTIVE',
  };

  const mockPrismaService: any = {
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    network: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
    },
    dataPlan: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
    },
    electricityProvider: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
    },
    cableProvider: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
    },
    airtimeTransaction: {
      create: jest.fn().mockResolvedValue({ id: 'atx_1' }),
      update: jest.fn().mockResolvedValue({}),
    },
    dataTransaction: {
      create: jest.fn().mockResolvedValue({ id: 'dtx_1' }),
      update: jest.fn().mockResolvedValue({}),
    },
    electricityTransaction: {
      create: jest.fn().mockResolvedValue({ id: 'etx_1' }),
      update: jest.fn().mockResolvedValue({}),
    },
    cableTransaction: {
      create: jest.fn().mockResolvedValue({ id: 'ctx_1' }),
      update: jest.fn().mockResolvedValue({}),
    },
    transactionItem: {
      create: jest.fn().mockResolvedValue({ id: 'txi_1' }),
    },
    paymentTransaction: {
      create: jest.fn().mockResolvedValue({ id: 'ptx_1' }),
      update: jest.fn().mockResolvedValue({}),
      upsert: jest.fn().mockResolvedValue({ id: 'ptx_1' }),
      findUnique: jest.fn().mockResolvedValue(null),
    },
    systemSetting: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
      update: jest.fn(),
    },
    referral: {
      create: jest.fn(),
      findUnique: jest.fn().mockResolvedValue(null),
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      update: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    referralReward: {
      create: jest.fn().mockResolvedValue({ id: 'rew_1' }),
      findMany: jest.fn().mockResolvedValue([]),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    refreshToken: {
      create: jest.fn().mockResolvedValue({ id: 'rt_1' }),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    wallet: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    walletTransaction: {
      create: jest.fn().mockResolvedValue({ id: 'wtx_1' }),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
    transaction: {
      create: jest.fn().mockResolvedValue({ id: 'tx_1', reference: 'SP_MOCK_1', amountKobo: 50000n }),
      findUnique: jest.fn().mockResolvedValue(null),
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      update: jest.fn().mockResolvedValue({}),
    },
    $transaction: jest.fn(async (cb: any) => cb(mockPrismaService)),
  };

  beforeAll(async () => {
    // Generate real Argon2 hashes for the test fixtures
    mockCustomerUser.passwordHash = await argon2.hash('Str0ngP@ssw0rd!', { type: argon2.argon2id });
    mockCustomerUser.transactionPinHash = await argon2.hash('1234', { type: argon2.argon2id });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix(API_PREFIX);
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new TransformInterceptor());

    await app.init();

    jwtService = moduleFixture.get<JwtService>(JwtService);
    otpService = moduleFixture.get<OtpService>(OtpService);

    // Pre-sign real JWT tokens using the test configuration secret
    const secret = 'sanipay_jwt_access_secret_development_minimum_32_chars_ok';
    customerToken = await jwtService.signAsync(
      { sub: mockCustomerUser.id, email: mockCustomerUser.email, role: mockCustomerUser.role },
      { secret, expiresIn: '15m' },
    );
    adminToken = await jwtService.signAsync(
      { sub: mockAdminUser.id, email: mockAdminUser.email, role: mockAdminUser.role },
      { secret, expiresIn: '15m' },
    );
  }, 45000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  // ────────────────────────── HEALTH & SYSTEM ─────────────────────────────

  it('/api/v1/health (GET) should return 200 OK with system status', () => {
    return request(app.getHttpServer())
      .get(`/${API_PREFIX}/health`)
      .expect(200)
      .expect((res) => {
        expect(res.body.success).toBe(true);
        expect(res.body.data.service).toBe('SaniPay Backend API');
        expect(res.body.data.version).toBe('1.0.0');
        expect(res.body.data.status).toBe('ok');
        expect(res.body.data.database).toBe('healthy');
      });
  });

  it('/api/v1/airtime/networks (GET) should return active networks list publicly', () => {
    return request(app.getHttpServer())
      .get(`/${API_PREFIX}/airtime/networks`)
      .expect(200)
      .expect((res) => {
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
      });
  });

  // ────────────────────────── AUTH REGISTRATION ───────────────────────────

  it('/api/v1/auth/register (POST) should register user and request phone OTP', async () => {
    mockPrismaService.user.findFirst.mockResolvedValue(null);
    mockPrismaService.user.create.mockResolvedValue(mockCustomerUser);

    const res = await request(app.getHttpServer())
      .post(`/${API_PREFIX}/auth/register`)
      .send({
        fullName: 'Musa Sani',
        phone: '08012345678',
        email: 'musa@example.com',
        password: 'Str0ngP@ssw0rd!',
        transactionPin: '1234',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.requiresPhoneVerification).toBe(true);
  });

  it('/api/v1/auth/register (POST) should reject invalid Nigerian phone number', () => {
    return request(app.getHttpServer())
      .post(`/${API_PREFIX}/auth/register`)
      .send({
        fullName: 'Musa Sani',
        phone: '12345', // Invalid
        email: 'musa@example.com',
        password: 'Str0ngP@ssw0rd!',
        transactionPin: '1234',
      })
      .expect(400)
      .expect((res) => {
        expect(res.body.success).toBe(false);
        expect(res.body.errorCode).toBe('VALIDATION_ERROR');
      });
  });

  // ────────────────────────── AUTH LOGIN & OTP ─────────────────────────────

  it('/api/v1/auth/login (POST) should authenticate and issue JWT tokens', async () => {
    mockPrismaService.user.findFirst.mockResolvedValue(mockCustomerUser);
    mockPrismaService.user.update.mockResolvedValue(mockCustomerUser);

    const res = await request(app.getHttpServer())
      .post(`/${API_PREFIX}/auth/login`)
      .send({
        identifier: 'musa@example.com',
        password: 'Str0ngP@ssw0rd!',
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
  });

  it('/api/v1/auth/login (POST) should reject invalid credentials with 401', () => {
    mockPrismaService.user.findFirst.mockResolvedValue(mockCustomerUser);
    mockPrismaService.user.update.mockResolvedValue(mockCustomerUser);

    return request(app.getHttpServer())
      .post(`/${API_PREFIX}/auth/login`)
      .send({
        identifier: 'musa@example.com',
        password: 'WrongPassword123!',
      })
      .expect(401)
      .expect((res) => {
        expect(res.body.success).toBe(false);
        expect(res.body.errorCode).toBe('UNAUTHORIZED');
      });
  });

  // ────────────────────────── JWT AUTH GUARDS ──────────────────────────────

  it('/api/v1/auth/me (GET) should reject unauthenticated request with 401', () => {
    return request(app.getHttpServer())
      .get(`/${API_PREFIX}/auth/me`)
      .expect(401)
      .expect((res) => {
        expect(res.body.success).toBe(false);
        expect(res.body.errorCode).toBe('UNAUTHORIZED');
      });
  });

  it('/api/v1/auth/me (GET) should return profile when valid Bearer token provided', async () => {
    mockPrismaService.user.findUnique.mockResolvedValue({
      id: mockCustomerUser.id,
      email: mockCustomerUser.email,
      role: mockCustomerUser.role,
      status: 'ACTIVE',
    });

    const res = await request(app.getHttpServer())
      .get(`/${API_PREFIX}/auth/me`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe(mockCustomerUser.email);
    expect(res.body.data.role).toBe('CUSTOMER');
  });

  // ────────────────────────── ROLES RBAC GUARDS ────────────────────────────

  it('/api/v1/admin/dashboard/overview (GET) should forbid CUSTOMER with 403', () => {
    mockPrismaService.user.findUnique.mockResolvedValue({
      id: mockCustomerUser.id,
      email: mockCustomerUser.email,
      role: 'CUSTOMER',
      status: 'ACTIVE',
    });

    return request(app.getHttpServer())
      .get(`/${API_PREFIX}/admin/dashboard/overview`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(403)
      .expect((res) => {
        expect(res.body.success).toBe(false);
        expect(res.body.errorCode).toBe('FORBIDDEN');
      });
  });

  it('/api/v1/admin/dashboard/overview (GET) should permit SUPER_ADMIN with 200', () => {
    mockPrismaService.user.findUnique.mockResolvedValue({
      id: mockAdminUser.id,
      email: mockAdminUser.email,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
    });

    return request(app.getHttpServer())
      .get(`/${API_PREFIX}/admin/dashboard/overview`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.success).toBe(true);
        expect(res.body.data.totalUsers).toBeDefined();
      });
  });

  // ────────────────────────── WALLET & ACCOUNTING ──────────────────────────

  it('/api/v1/wallet/balance (GET) should return user wallet details', async () => {
    mockPrismaService.wallet.findUnique.mockResolvedValue({
      id: 'wlt_customer_1',
      userId: mockCustomerUser.id,
      balanceKobo: 500000n,
      ledgerBalanceKobo: 500000n,
      currency: 'NGN',
      isLocked: false,
      lockReason: null,
      user: {
        id: mockCustomerUser.id,
        email: mockCustomerUser.email,
        phone: mockCustomerUser.phone,
        role: mockCustomerUser.role,
        profile: { fullName: 'Musa Sani' },
      },
    });

    const res = await request(app.getHttpServer())
      .get(`/${API_PREFIX}/wallet/balance`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.balanceKobo).toBe('500000');
    expect(res.body.data.balanceFormatted).toBe('₦5,000.00');
    expect(res.body.data.currency).toBe('NGN');
  });

  it('/api/v1/wallet/fund/initialize (POST) should initialize checkout', async () => {
    mockPrismaService.transaction.create.mockResolvedValue({
      id: 'tx_fund_1',
      reference: 'SP_FUND_TEST_01',
      amountKobo: 200000n,
      providerName: 'PAYSTACK',
    });

    const res = await request(app.getHttpServer())
      .post(`/${API_PREFIX}/wallet/fund/initialize`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        amountKobo: 200000,
        gateway: 'PAYSTACK',
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.reference).toBeDefined();
    expect(res.body.data.authorizationUrl).toBeDefined();
  });

  it('/api/v1/wallet/fund/initialize (POST) should reject amount below 10,000 Kobo', () => {
    return request(app.getHttpServer())
      .post(`/${API_PREFIX}/wallet/fund/initialize`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        amountKobo: 500, // Below min 10,000
        gateway: 'PAYSTACK',
      })
      .expect(400)
      .expect((res) => {
        expect(res.body.success).toBe(false);
        expect(res.body.errorCode).toBe('VALIDATION_ERROR');
      });
  });

  it('/api/v1/wallet/transfer (POST) should execute P2P transfer', async () => {
    mockPrismaService.transaction.findUnique.mockResolvedValue(null);
    mockPrismaService.user.findFirst.mockResolvedValue({
      id: 'usr_recipient_2',
      phone: '08022222222',
      profile: { fullName: 'Recipient Sani' },
    });
    mockPrismaService.user.findUnique.mockResolvedValue(mockCustomerUser);
    mockPrismaService.wallet.findUnique
      .mockResolvedValueOnce({
        id: 'wlt_1',
        userId: mockCustomerUser.id,
        balanceKobo: 500000n,
        isLocked: false,
      })
      .mockResolvedValueOnce({
        id: 'wlt_2',
        userId: 'usr_recipient_2',
        balanceKobo: 100000n,
        isLocked: false,
      });
    mockPrismaService.wallet.update.mockResolvedValue({});
    mockPrismaService.transaction.create.mockResolvedValue({ id: 'tx_xfer_1' });

    const res = await request(app.getHttpServer())
      .post(`/${API_PREFIX}/wallet/transfer`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        recipientIdentifier: '08022222222',
        amountKobo: 100000,
        pin: '1234',
        narration: 'Project share',
        idempotencyKey: 'xfer_idem_101',
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.amountFormatted).toBe('₦1,000.00');
    expect(res.body.data.reference).toBeDefined();
  });

  it('/api/v1/wallet/transactions (GET) should return paginated ledger entries', async () => {
    mockPrismaService.wallet.findUnique.mockResolvedValue({ id: 'wlt_customer_1' });
    mockPrismaService.walletTransaction.count.mockResolvedValue(1);
    mockPrismaService.walletTransaction.findMany.mockResolvedValue([
      {
        id: 'wtx_1',
        type: 'CREDIT',
        amountKobo: 500000n,
        balanceBeforeKobo: 0n,
        balanceAfterKobo: 500000n,
        description: 'Initial funding',
        createdAt: new Date(),
        transaction: {
          reference: 'SP_FUND_001',
          type: 'WALLET_FUNDING',
          status: 'SUCCESS',
        },
      },
    ]);

    const res = await request(app.getHttpServer())
      .get(`/${API_PREFIX}/wallet/transactions`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].amountFormatted).toBe('+₦5,000.00');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE 7: VTU SERVICES (AIRTIME, DATA, ELECTRICITY, CABLE TV)
  // ─────────────────────────────────────────────────────────────────────────

  describe('VTU Services (e2e)', () => {
    const mockMtnNetwork = {
      id: 'net_mtn_e2e',
      code: 'MTN',
      name: 'MTN Nigeria',
      airtimeDiscountBps: 200,
      isActive: true,
      airtimeEnabled: true,
      dataEnabled: true,
    };

    const mockDataPlan = {
      id: 'b7c3d284-e9fb-4b53-a55b-4264627d7801',
      planCode: 'MTN-SME-1GB',
      name: '1GB SME Data',
      type: 'SME',
      validity: '30 Days',
      costPriceKobo: 22500n,
      sellingPriceKobo: 25000n,
      isActive: true,
      networkId: 'net_mtn_e2e',
      network: mockMtnNetwork,
    };

    const mockDisCo = {
      id: 'prov_ikedc_e2e',
      code: 'IKEDC',
      name: 'Ikeja Electric',
      convenienceFeeKobo: 10000n,
      isActive: true,
    };

    const mockCable = {
      id: 'prov_dstv_e2e',
      code: 'DSTV',
      name: 'DStv Nigeria',
      convenienceFeeKobo: 10000n,
      isActive: true,
    };

    it('/api/v1/airtime/networks (GET) should list active telecom networks', async () => {
      mockPrismaService.network.findMany.mockResolvedValue([mockMtnNetwork]);

      const res = await request(app.getHttpServer())
        .get(`/${API_PREFIX}/airtime/networks`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].code).toBe('MTN');
    });

    it('/api/v1/airtime/purchase (POST) should purchase airtime with wallet debit', async () => {
      mockPrismaService.network.findUnique.mockResolvedValue(mockMtnNetwork);
      mockPrismaService.user.findUnique.mockResolvedValue(mockCustomerUser);
      mockPrismaService.wallet.findUnique.mockResolvedValue({
        id: 'wlt_customer_1',
        userId: 'usr_customer_1',
        balanceKobo: 500000n,
        isLocked: false,
      });
      mockPrismaService.wallet.update.mockResolvedValue({});
      mockPrismaService.transaction.findUnique.mockResolvedValue(null);
      mockPrismaService.transaction.create.mockResolvedValue({
        id: 'tx_air_e2e',
        reference: 'SP_AIR_E2E_1',
        status: 'PROCESSING',
      });

      const res = await request(app.getHttpServer())
        .post(`/${API_PREFIX}/airtime/purchase`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          networkCode: 'MTN',
          recipientPhone: '08012345678',
          amountKobo: 100000,
          pin: '1234',
          idempotencyKey: 'air_idem_e2e_1',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('SUCCESS');
      expect(res.body.data.amountDebitedFormatted).toBe('₦980.00');
    });

    it('/api/v1/data/plans (GET) should list available data plans', async () => {
      mockPrismaService.dataPlan.findMany.mockResolvedValue([mockDataPlan]);

      const res = await request(app.getHttpServer())
        .get(`/${API_PREFIX}/data/plans`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].planCode).toBe('MTN-SME-1GB');
    });

    it('/api/v1/data/purchase (POST) should purchase data plan successfully', async () => {
      mockPrismaService.dataPlan.findUnique.mockResolvedValue(mockDataPlan);
      mockPrismaService.user.findUnique.mockResolvedValue(mockCustomerUser);
      mockPrismaService.wallet.findUnique.mockResolvedValue({
        id: 'wlt_customer_1',
        userId: 'usr_customer_1',
        balanceKobo: 500000n,
        isLocked: false,
      });
      mockPrismaService.wallet.update.mockResolvedValue({});
      mockPrismaService.transaction.findUnique.mockResolvedValue(null);
      mockPrismaService.transaction.create.mockResolvedValue({
        id: 'tx_dat_e2e',
        reference: 'SP_DAT_E2E_1',
      });

      const res = await request(app.getHttpServer())
        .post(`/${API_PREFIX}/data/purchase`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          planId: 'b7c3d284-e9fb-4b53-a55b-4264627d7801',
          recipientPhone: '08012345678',
          pin: '1234',
          idempotencyKey: 'dat_idem_e2e_1',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('SUCCESS');
      expect(res.body.data.amountDebitedFormatted).toBe('₦250.00');
    });

    it('/api/v1/electricity/providers (GET) should list electricity DisCos', async () => {
      mockPrismaService.electricityProvider.findMany.mockResolvedValue([mockDisCo]);

      const res = await request(app.getHttpServer())
        .get(`/${API_PREFIX}/electricity/providers`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data[0].code).toBe('IKEDC');
    });

    it('/api/v1/electricity/meter/verify (POST) should verify meter details', async () => {
      mockPrismaService.electricityProvider.findUnique.mockResolvedValue(mockDisCo);

      const res = await request(app.getHttpServer())
        .post(`/${API_PREFIX}/electricity/meter/verify`)
        .send({
          providerCode: 'IKEDC',
          meterNumber: '01234567890',
          meterType: 'PREPAID',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.customerName).toBeDefined();
    });

    it('/api/v1/electricity/pay (POST) should pay bill and return token', async () => {
      mockPrismaService.electricityProvider.findUnique.mockResolvedValue(mockDisCo);
      mockPrismaService.user.findUnique.mockResolvedValue(mockCustomerUser);
      mockPrismaService.wallet.findUnique.mockResolvedValue({
        id: 'wlt_customer_1',
        userId: 'usr_customer_1',
        balanceKobo: 1000000n,
        isLocked: false,
      });
      mockPrismaService.wallet.update.mockResolvedValue({});
      mockPrismaService.transaction.findUnique.mockResolvedValue(null);
      mockPrismaService.transaction.create.mockResolvedValue({
        id: 'tx_ele_e2e',
        reference: 'SP_ELE_E2E_1',
      });

      const res = await request(app.getHttpServer())
        .post(`/${API_PREFIX}/electricity/pay`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          providerCode: 'IKEDC',
          meterNumber: '01234567890',
          meterType: 'PREPAID',
          amountKobo: 500000,
          customerPhone: '08012345678',
          pin: '1234',
          idempotencyKey: 'ele_idem_e2e_1',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.units).toBeDefined();
    });

    it('/api/v1/cable/providers (GET) should list cable TV providers', async () => {
      mockPrismaService.cableProvider.findMany.mockResolvedValue([mockCable]);

      const res = await request(app.getHttpServer())
        .get(`/${API_PREFIX}/cable/providers`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data[0].code).toBe('DSTV');
      expect(res.body.data[0].packages.length).toBeGreaterThan(0);
    });

    it('/api/v1/cable/smartcard/verify (POST) should verify smartcard/IUC number', async () => {
      mockPrismaService.cableProvider.findUnique.mockResolvedValue(mockCable);

      const res = await request(app.getHttpServer())
        .post(`/${API_PREFIX}/cable/smartcard/verify`)
        .send({
          providerCode: 'DSTV',
          smartcardNumber: '1023456789',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.customerName).toBeDefined();
    });

    it('/api/v1/cable/pay (POST) should renew cable subscription', async () => {
      mockPrismaService.cableProvider.findUnique.mockResolvedValue(mockCable);
      mockPrismaService.user.findUnique.mockResolvedValue(mockCustomerUser);
      mockPrismaService.wallet.findUnique.mockResolvedValue({
        id: 'wlt_customer_1',
        userId: 'usr_customer_1',
        balanceKobo: 2000000n,
        isLocked: false,
      });
      mockPrismaService.wallet.update.mockResolvedValue({});
      mockPrismaService.transaction.findUnique.mockResolvedValue(null);
      mockPrismaService.transaction.create.mockResolvedValue({
        id: 'tx_cab_e2e',
        reference: 'SP_CAB_E2E_1',
      });

      const res = await request(app.getHttpServer())
        .post(`/${API_PREFIX}/cable/pay`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          providerCode: 'DSTV',
          smartcardNumber: '1023456789',
          packageCode: 'DSTV_COMPACT',
          packageName: 'DStv Compact',
          amountKobo: 1250000,
          renewalMonths: 1,
          pin: '1234',
          idempotencyKey: 'cab_idem_e2e_1',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.renewalDate).toBeDefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE 8: PAYMENT GATEWAYS & WEBHOOKS
  // ─────────────────────────────────────────────────────────────────────────

  describe('Payment Gateways & Webhooks (e2e)', () => {
    const mockFundingTx = {
      id: 'tx_fund_e2e_1',
      userId: 'usr_customer_1',
      reference: 'SP_FUND_E2E_123',
      idempotencyKey: 'fund_idem_e2e_1',
      type: 'WALLET_FUNDING',
      status: 'PENDING',
      amountKobo: 500000n,
      feeKobo: 0n,
      discountKobo: 0n,
      netAmountKobo: 500000n,
      currency: 'NGN',
      providerName: 'PAYSTACK',
      updatedAt: new Date(),
    };

    it('/api/v1/payments/webhooks/paystack (POST) should process Paystack webhook and credit wallet', async () => {
      mockPrismaService.transaction.findUnique.mockResolvedValue(mockFundingTx);
      mockPrismaService.transaction.update.mockResolvedValue({
        ...mockFundingTx,
        status: 'SUCCESS',
      });
      mockPrismaService.wallet.findUnique.mockResolvedValue({
        id: 'wlt_customer_1',
        userId: 'usr_customer_1',
        balanceKobo: 0n,
        isLocked: false,
      });
      mockPrismaService.wallet.update.mockResolvedValue({});

      const payload = {
        event: 'charge.success',
        data: {
          reference: 'SP_FUND_E2E_123',
          amount: 500000,
          id: 'pstk_test_123',
          channel: 'card',
        },
      };

      const res = await request(app.getHttpServer())
        .post(`/${API_PREFIX}/payments/webhooks/paystack`)
        .set('x-paystack-signature', 'valid_test_sig')
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('/api/v1/payments/webhooks/flutterwave (POST) should process Flutterwave webhook', async () => {
      mockPrismaService.transaction.findUnique.mockResolvedValue({
        ...mockFundingTx,
        providerName: 'FLUTTERWAVE',
      });
      mockPrismaService.transaction.update.mockResolvedValue({
        ...mockFundingTx,
        status: 'SUCCESS',
      });
      mockPrismaService.wallet.findUnique.mockResolvedValue({
        id: 'wlt_customer_1',
        userId: 'usr_customer_1',
        balanceKobo: 0n,
        isLocked: false,
      });
      mockPrismaService.wallet.update.mockResolvedValue({});

      const payload = {
        event: 'charge.completed',
        data: {
          tx_ref: 'SP_FUND_E2E_123',
          amount: 5000,
          flw_ref: 'flw_test_123',
          status: 'successful',
        },
      };

      const res = await request(app.getHttpServer())
        .post(`/${API_PREFIX}/payments/webhooks/flutterwave`)
        .set('verif-hash', 'flw-test-hash')
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('/api/v1/payments/webhooks/mock (POST) should trigger sandbox mock fulfillment', async () => {
      mockPrismaService.transaction.findUnique.mockResolvedValue({
        ...mockFundingTx,
        providerName: 'MOCK',
      });
      mockPrismaService.transaction.update.mockResolvedValue({
        ...mockFundingTx,
        status: 'SUCCESS',
      });
      mockPrismaService.wallet.findUnique.mockResolvedValue({
        id: 'wlt_customer_1',
        userId: 'usr_customer_1',
        balanceKobo: 0n,
        isLocked: false,
      });
      mockPrismaService.wallet.update.mockResolvedValue({});

      const res = await request(app.getHttpServer())
        .post(`/${API_PREFIX}/payments/webhooks/mock`)
        .send({
          reference: 'SP_FUND_E2E_123',
          amountKobo: 500000,
          channel: 'mock_card',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('SUCCESS');
    });

    it('/api/v1/payments/verify/:reference (GET) should return payment receipt', async () => {
      mockPrismaService.transaction.findUnique.mockResolvedValue({
        ...mockFundingTx,
        status: 'SUCCESS',
        providerReference: 'GW_CONFIRMED_1',
      });

      const res = await request(app.getHttpServer())
        .get(`/${API_PREFIX}/payments/verify/SP_FUND_E2E_123`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('SUCCESS');
      expect(res.body.data.amountFormatted).toBe('₦5,000.00');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE 9: CENTRAL TRANSACTION HISTORY & DIGITAL RECEIPTS
  // ─────────────────────────────────────────────────────────────────────────

  describe('Transactions & Digital Receipts (e2e)', () => {
    const mockDetailedTx = {
      id: 'd9b3a184-d113-4608-8e6d-74d41286a999',
      userId: 'usr_customer_1',
      reference: 'SP_ELE_E2E_99999',
      idempotencyKey: 'ele_idem_e2e_99',
      type: 'ELECTRICITY',
      status: 'SUCCESS',
      amountKobo: 500000n,
      feeKobo: 10000n,
      discountKobo: 0n,
      netAmountKobo: 510000n,
      currency: 'NGN',
      providerName: 'MOCK',
      providerReference: 'MOCK_EL_E2E_1',
      createdAt: new Date(),
      updatedAt: new Date(),
      user: {
        id: 'usr_customer_1',
        email: 'musa@example.com',
        phone: '08012345678',
        profile: { fullName: 'Musa Sani' },
      },
      airtimeTransaction: null,
      dataTransaction: null,
      electricityTransaction: {
        meterNumber: '01234567890',
        meterType: 'PREPAID',
        customerName: 'Adebayo Okafor',
        customerAddress: '14 Ikeja GRA, Lagos',
        token: '1234-5678-9012-3456',
        units: '109.89 kWh',
        receiptNumber: 'RCP_E2E_1234',
        provider: { name: 'Ikeja Electric', code: 'IKEDC' },
      },
      cableTransaction: null,
      paymentTransaction: null,
      transactionItems: [],
      walletTransactions: [],
    };

    it('/api/v1/transactions (GET) should return paginated user transaction history', async () => {
      mockPrismaService.transaction.count.mockResolvedValue(1);
      mockPrismaService.transaction.findMany.mockResolvedValue([mockDetailedTx]);

      const res = await request(app.getHttpServer())
        .get(`/${API_PREFIX}/transactions?page=1&limit=10`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].reference).toBe('SP_ELE_E2E_99999');
      expect(res.body.data[0].amountFormatted).toBe('₦5,000.00');
      expect(res.body.meta.totalCount).toBe(1);
    });

    it('/api/v1/transactions/summary (GET) should return transaction summary statistics', async () => {
      mockPrismaService.transaction.findMany.mockResolvedValue([
        { type: 'WALLET_FUNDING', amountKobo: 500000n, netAmountKobo: 500000n },
        { type: 'ELECTRICITY', amountKobo: 500000n, netAmountKobo: 510000n },
      ]);

      const res = await request(app.getHttpServer())
        .get(`/${API_PREFIX}/transactions/summary`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.totalFundedFormatted).toBe('₦5,000.00');
      expect(res.body.data.totalSpentFormatted).toBe('₦5,100.00');
    });

    it('/api/v1/transactions/:id (GET) should return digital receipt with token and details', async () => {
      mockPrismaService.transaction.findFirst.mockResolvedValue(mockDetailedTx);

      const res = await request(app.getHttpServer())
        .get(`/${API_PREFIX}/transactions/${mockDetailedTx.id}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.receiptNumber).toBe('SP_ELE_E2E_99999');
      expect(res.body.data.serviceDetails.token).toBe('1234-5678-9012-3456');
      expect(res.body.data.serviceDetails.units).toBe('109.89 kWh');
    });

    it('/api/v1/transactions/reference/:reference (GET) should return receipt by reference', async () => {
      mockPrismaService.transaction.findFirst.mockResolvedValue(mockDetailedTx);

      const res = await request(app.getHttpServer())
        .get(`/${API_PREFIX}/transactions/reference/SP_ELE_E2E_99999`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.receiptNumber).toBe('SP_ELE_E2E_99999');
      expect(res.body.data.verificationSeal).toBeDefined();
    });
  });

  describe('Referral & Commission Engine (e2e)', () => {
    it('/api/v1/referrals/summary (GET) should return referral code, link, and earnings metrics', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: mockCustomerUser.id,
        email: mockCustomerUser.email,
        role: 'CUSTOMER',
        status: 'ACTIVE',
        referralCode: 'SP-CUST01',
      });
      mockPrismaService.referral.count
        .mockResolvedValueOnce(3) // total
        .mockResolvedValueOnce(1) // pending
        .mockResolvedValueOnce(1) // qualified
        .mockResolvedValueOnce(1); // rewarded

      mockPrismaService.referralReward.findMany.mockResolvedValue([
        { amountKobo: 20000n, isPaid: false },
        { amountKobo: 20000n, isPaid: true },
      ]);

      const res = await request(app.getHttpServer())
        .get(`/${API_PREFIX}/referrals/summary`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.referralCode).toBe('SP-CUST01');
      expect(res.body.data.referralLink).toBe('https://sanipay.ng/ref/SP-CUST01');
      expect(res.body.data.totalReferred).toBe(3);
      expect(res.body.data.unclaimedRewardsFormatted).toBe('₦200.00');
      expect(res.body.data.totalEarnedFormatted).toBe('₦400.00');
    });

    it('/api/v1/referrals/history (GET) should return paginated referred users with masked info', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: mockCustomerUser.id,
        email: mockCustomerUser.email,
        role: 'CUSTOMER',
        status: 'ACTIVE',
      });
      mockPrismaService.referral.count.mockResolvedValue(1);
      mockPrismaService.referral.findMany.mockResolvedValue([
        {
          id: 'ref-e2e-1',
          status: 'QUALIFIED',
          createdAt: new Date('2026-09-01'),
          updatedAt: new Date('2026-09-02'),
          referredUser: {
            id: 'user-referee-1',
            phone: '08099887766',
            createdAt: new Date('2026-09-01'),
            profile: { fullName: 'Chidi Okonkwo' },
          },
          rewards: [
            {
              id: 'rew-e2e-1',
              amountKobo: 20000n,
              isPaid: false,
              paidAt: null,
            },
          ],
        },
      ]);

      const res = await request(app.getHttpServer())
        .get(`/${API_PREFIX}/referrals/history?page=1&limit=10`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].refereeName).toBe('Chidi O.');
      expect(res.body.data[0].refereePhone).toBe('0809***7766');
      expect(res.body.data[0].status).toBe('QUALIFIED');
      expect(res.body.data[0].rewardAmountFormatted).toBe('₦200.00');
      expect(res.body.meta.totalCount).toBe(1);
    });

    it('/api/v1/referrals/claim (POST) should claim pending referral rewards into wallet', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: mockCustomerUser.id,
        email: mockCustomerUser.email,
        role: 'CUSTOMER',
        status: 'ACTIVE',
      });
      mockPrismaService.referralReward.findMany.mockResolvedValue([
        { id: 'rew-e2e-1', referralId: 'ref-e2e-1', amountKobo: 20000n, isPaid: false },
      ]);
      mockPrismaService.wallet.findUnique.mockResolvedValue({
        id: 'wall-e2e-1',
        userId: mockCustomerUser.id,
        balanceKobo: 100000n,
        ledgerBalanceKobo: 100000n,
        isLocked: false,
      });
      mockPrismaService.wallet.update.mockResolvedValue({
        id: 'wall-e2e-1',
        balanceKobo: 120000n,
        ledgerBalanceKobo: 120000n,
      });
      mockPrismaService.transaction.create.mockResolvedValue({
        id: 'tx-claim-e2e-1',
        reference: 'SP_REF_CLM_E2E_9999',
        amountKobo: 20000n,
      });

      const res = await request(app.getHttpServer())
        .post(`/${API_PREFIX}/referrals/claim`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({})
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.amountClaimedFormatted).toBe('₦200.00');
      expect(res.body.data.rewardsCount).toBe(1);
      expect(res.body.data.walletBalanceFormatted).toBe('₦1,200.00');
    });

    it('/api/v1/referrals/admin/overview (GET) should permit SUPER_ADMIN with 200', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: mockAdminUser.id,
        email: mockAdminUser.email,
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
      });
      mockPrismaService.referral.count
        .mockResolvedValueOnce(25) // total
        .mockResolvedValueOnce(10) // pending
        .mockResolvedValueOnce(5) // qualified
        .mockResolvedValueOnce(10); // rewarded

      mockPrismaService.referralReward.findMany.mockResolvedValue([
        { amountKobo: 20000n },
      ]);
      mockPrismaService.user.findMany.mockResolvedValue([
        {
          id: 'user-admin-top',
          email: 'top@admin.com',
          phone: '08011223344',
          referralCode: 'TOP_LEAD',
          profile: { fullName: 'Top Lead' },
          _count: { referralRecords: 15 },
        },
      ]);

      const res = await request(app.getHttpServer())
        .get(`/${API_PREFIX}/referrals/admin/overview`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.totalReferrals).toBe(25);
      expect(res.body.data.statusCounts.pendingQualification).toBe(10);
      expect(res.body.data.rewardsSummary.totalRewardsPaidCount).toBe(1);
      expect(res.body.data.topReferrers.length).toBe(1);
    });

    it('/api/v1/referrals/admin/overview (GET) should forbid CUSTOMER with 403', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: mockCustomerUser.id,
        email: mockCustomerUser.email,
        role: 'CUSTOMER',
        status: 'ACTIVE',
      });

      await request(app.getHttpServer())
        .get(`/${API_PREFIX}/referrals/admin/overview`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);
    });
  });
});



