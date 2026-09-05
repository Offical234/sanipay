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
    },
    systemSetting: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    referral: {
      create: jest.fn(),
    },
    refreshToken: {
      create: jest.fn().mockResolvedValue({ id: 'rt_1' }),
      findFirst: jest.fn(),
      update: jest.fn(),
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
});
