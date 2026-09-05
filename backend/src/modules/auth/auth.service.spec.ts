import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service';
import { OtpService } from './otp.service';
import { PrismaService } from '../../database/prisma.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;
  let jwtService: any;
  let otpService: OtpService;

  const mockUser = {
    id: 'usr_test_123',
    email: 'musa@example.com',
    phone: '08012345678',
    passwordHash: '',
    transactionPinHash: '',
    role: 'CUSTOMER',
    status: 'ACTIVE',
    failedLoginAttempts: 0,
    lockoutUntil: null,
    isPhoneVerified: true,
    referralCode: 'SANI1234',
  };

  beforeAll(async () => {
    mockUser.passwordHash = await argon2.hash('Str0ngP@ssw0rd!', { type: argon2.argon2id });
    mockUser.transactionPinHash = await argon2.hash('1234', { type: argon2.argon2id });
  });

  beforeEach(async () => {
    prisma = {
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
      $transaction: jest.fn(async (cb) => cb(prisma)),
    };

    jwtService = {
      signAsync: jest.fn().mockResolvedValue('mock_jwt_token'),
      verifyAsync: jest.fn(),
    };

    const config = {
      get: jest.fn((key: string) => {
        if (key === 'jwt.accessSecret') return 'test_access_secret_min_32_chars_ok';
        if (key === 'jwt.refreshSecret') return 'test_refresh_secret_min_32_chars_ok';
        if (key === 'jwt.accessExpiresIn') return '15m';
        if (key === 'jwt.refreshExpiresIn') return '30d';
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        OtpService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    otpService = module.get<OtpService>(OtpService);
  });

  describe('register', () => {
    it('should register a new user successfully and return userId', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ ...mockUser, id: 'usr_new_1' });

      const res = await service.register({
        fullName: 'Musa Sani',
        email: 'musa@example.com',
        phone: '08012345678',
        password: 'Str0ngP@ssw0rd!',
        transactionPin: '1234',
      });

      expect(res.message).toContain('Registration successful');
      expect(res.userId).toBe('usr_new_1');
      expect(res.requiresPhoneVerification).toBe(true);
      expect(prisma.user.create).toHaveBeenCalled();
    });

    it('should reject registration with duplicate email', async () => {
      prisma.user.findFirst.mockResolvedValue({ email: 'musa@example.com', phone: '08099999999' });

      await expect(
        service.register({
          fullName: 'Musa Sani',
          email: 'musa@example.com',
          phone: '08012345678',
          password: 'Str0ngP@ssw0rd!',
          transactionPin: '1234',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should reject registration with duplicate phone', async () => {
      prisma.user.findFirst.mockResolvedValue({ email: 'other@example.com', phone: '08012345678' });

      await expect(
        service.register({
          fullName: 'Musa Sani',
          email: 'musa@example.com',
          phone: '08012345678',
          password: 'Str0ngP@ssw0rd!',
          transactionPin: '1234',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should return token pair for valid credentials', async () => {
      prisma.user.findFirst.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue(mockUser);

      const res = await service.login({
        identifier: 'musa@example.com',
        password: 'Str0ngP@ssw0rd!',
      });

      expect(res.accessToken).toBe('mock_jwt_token');
      expect(res.refreshToken).toBe('mock_jwt_token');
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ failedLoginAttempts: 0, lockoutUntil: null }),
        }),
      );
    });

    it('should throw UnauthorizedException for unknown user', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.login({ identifier: 'unknown@example.com', password: 'password' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should increment failed attempts and lock out after repeated failures', async () => {
      prisma.user.findFirst.mockResolvedValue({ ...mockUser, failedLoginAttempts: 4 });
      prisma.user.update.mockResolvedValue(mockUser);

      await expect(
        service.login({ identifier: 'musa@example.com', password: 'WrongPassword1!' }),
      ).rejects.toThrow('Too many failed attempts. Account locked for 15 minutes.');

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ failedLoginAttempts: 5 }),
        }),
      );
    });
  });

  describe('verifyOtp', () => {
    it('should verify OTP and activate account', async () => {
      const otp = otpService.generate('phone_verify:08012345678');
      prisma.user.findUnique.mockResolvedValue({ ...mockUser, isPhoneVerified: false });
      prisma.user.update.mockResolvedValue({ ...mockUser, isPhoneVerified: true });

      const res = await service.verifyOtp({ phone: '08012345678', otp });
      expect(res.accessToken).toBeDefined();
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isPhoneVerified: true, status: 'ACTIVE' }),
        }),
      );
    });

    it('should reject incorrect OTP', async () => {
      otpService.generate('phone_verify:08012345678');

      await expect(
        service.verifyOtp({ phone: '08012345678', otp: '000000' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('verifyTransactionPin', () => {
    it('should succeed when PIN matches', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const res = await service.verifyTransactionPin('usr_test_123', '1234');
      expect(res.valid).toBe(true);
    });

    it('should reject invalid PIN', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.verifyTransactionPin('usr_test_123', '9999'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
