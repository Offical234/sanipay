import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { PrismaService } from '../../database/prisma.service';
import { OtpService } from './otp.service';
import { RegisterDto } from './dto/register.dto';
import {
  LoginDto,
  VerifyOtpDto,
  ResendOtpDto,
  RefreshTokenDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePinDto,
} from './dto/auth.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly otpService: OtpService,
  ) {}

  // ───────────────────────────── REGISTRATION ──────────────────────────────

  async register(dto: RegisterDto) {
    const { fullName, phone, email, password, transactionPin, referralCode } = dto;

    // 1. Check for duplicate accounts
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: email.toLowerCase() }, { phone }] },
    });
    if (existing) {
      if (existing.email === email.toLowerCase()) {
        throw new ConflictException('An account with this email address already exists.');
      }
      throw new ConflictException('An account with this phone number already exists.');
    }

    // 2. Resolve referrer
    let referredById: string | undefined;
    if (referralCode) {
      const referrer = await this.prisma.user.findUnique({ where: { referralCode } });
      if (referrer) {
        referredById = referrer.id;
      }
    }

    // 3. Hash password & PIN with Argon2id (never plaintext)
    const [passwordHash, transactionPinHash] = await Promise.all([
      argon2.hash(password, { type: argon2.argon2id, memoryCost: 65536, timeCost: 3 }),
      argon2.hash(transactionPin, { type: argon2.argon2id, memoryCost: 65536, timeCost: 3 }),
    ]);

    // 4. Generate unique referral code
    const userReferralCode = this.generateReferralCode();

    // 5. Create user and wallet in a single transaction
    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: email.toLowerCase(),
          phone,
          passwordHash,
          transactionPinHash,
          referralCode: userReferralCode,
          referredById: referredById ?? null,
          profile: {
            create: { fullName: fullName.trim() },
          },
          wallet: {
            create: { balanceKobo: 0n, ledgerBalanceKobo: 0n },
          },
        },
        include: { profile: true },
      });

      // 6. Create referral record if referred
      if (referredById) {
        await tx.referral.create({
          data: {
            referrerId: referredById,
            referredUserId: newUser.id,
          },
        });
      }

      return newUser;
    });

    // 7. Generate & send OTP for phone verification
    const otp = this.otpService.generate(`phone_verify:${phone}`);
    this.logger.log(`Registration OTP dispatched for ${phone} [sandbox/dev: ${otp}]`);

    return {
      message: 'Registration successful. Please verify your phone number with the OTP sent.',
      userId: user.id,
      requiresPhoneVerification: true,
    };
  }

  // ─────────────────────────── OTP VERIFICATION ────────────────────────────

  async verifyOtp(dto: VerifyOtpDto) {
    const { phone, otp } = dto;
    const result = this.otpService.verify(`phone_verify:${phone}`, otp);

    if (!result.valid) {
      throw new BadRequestException(result.reason);
    }

    const user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user) throw new NotFoundException('User not found.');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { isPhoneVerified: true, status: 'ACTIVE' },
    });

    // Issue tokens after verified
    const tokens = await this.generateTokens(user.id, user.email, user.role);
    return {
      message: 'Phone number verified successfully. You are now logged in.',
      ...tokens,
    };
  }

  // ───────────────────────────── RESEND OTP ────────────────────────────────

  async resendOtp(dto: ResendOtpDto) {
    const { phone } = dto;
    const user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user) {
      throw new NotFoundException('No account associated with this phone number.');
    }

    const otp = this.otpService.generate(`phone_verify:${phone}`);
    this.logger.log(`New OTP requested for ${phone} [sandbox/dev: ${otp}]`);

    return {
      message: 'A new 6-digit verification OTP has been sent to your phone.',
    };
  }

  // ────────────────────────────────── LOGIN ────────────────────────────────

  async login(dto: LoginDto) {
    const { identifier, password } = dto;

    // Find by email or phone
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier.toLowerCase() },
          { phone: identifier },
        ],
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials. Please check your email/phone and password.');
    }

    // Check account lockout
    if (user.lockoutUntil && new Date() < user.lockoutUntil) {
      const minutesLeft = Math.ceil((user.lockoutUntil.getTime() - Date.now()) / 60000);
      throw new UnauthorizedException(
        `Account temporarily locked due to excessive failed attempts. Please try again in ${minutesLeft} minute(s).`,
      );
    }

    // Check account status
    if (user.status === 'SUSPENDED') {
      throw new UnauthorizedException('Your account has been suspended. Please contact support.');
    }

    // Verify password
    const passwordValid = await argon2.verify(user.passwordHash, password);
    if (!passwordValid) {
      const attempts = user.failedLoginAttempts + 1;
      const lockoutUntil = attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;

      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: attempts, lockoutUntil },
      });

      if (lockoutUntil) {
        throw new UnauthorizedException(
          'Too many failed attempts. Account locked for 15 minutes.',
        );
      }

      throw new UnauthorizedException(
        `Invalid credentials. ${5 - attempts} attempt(s) remaining before lockout.`,
      );
    }

    // Reset failed attempts on successful login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockoutUntil: null, lastLoginAt: new Date() },
    });

    if (!user.isPhoneVerified) {
      // Resend OTP
      const otp = this.otpService.generate(`phone_verify:${user.phone}`);
      this.logger.log(`Phone verification OTP re-issued for ${user.phone}: ${otp}`);
      throw new UnauthorizedException(
        'Phone number not yet verified. A new OTP has been sent to your phone.',
      );
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    return {
      message: 'Login successful.',
      ...tokens,
    };
  }

  // ────────────────────────── TOKEN REFRESH ────────────────────────────────

  async refreshToken(dto: RefreshTokenDto) {
    const { refreshToken } = dto;

    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret:
          this.config.get<string>('jwt.refreshSecret') ||
          'sanipay_jwt_refresh_secret_development_minimum_32_chars_ok',
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token. Please log in again.');
    }

    // Check DB record
    const stored = await this.prisma.refreshToken.findFirst({
      where: { userId: payload.sub, isRevoked: false },
      orderBy: { createdAt: 'desc' },
    });

    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired or revoked. Please log in again.');
    }

    const isTokenValid = await argon2.verify(stored.tokenHash, refreshToken);
    if (!isTokenValid) {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account not found or inactive.');
    }

    // Revoke old token and issue new pair
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { isRevoked: true },
    });

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    return { message: 'Tokens refreshed successfully.', ...tokens };
  }

  // ────────────────────────── FORGOT PASSWORD ──────────────────────────────

  async forgotPassword(dto: ForgotPasswordDto) {
    const { identifier } = dto;
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier.toLowerCase() },
          { phone: identifier },
        ],
      },
    });

    if (user) {
      const otp = this.otpService.generate(`pwd_reset:${user.phone}`);
      this.logger.log(`Password reset OTP dispatched for ${user.phone}: ${otp}`);
    }

    // Return generic message to prevent account enumeration
    return {
      message: 'If an account matches the provided identifier, a 6-digit password reset code has been sent.',
    };
  }

  // ────────────────────────── RESET PASSWORD ───────────────────────────────

  async resetPassword(dto: ResetPasswordDto) {
    const { identifier, otp, newPassword } = dto;

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier.toLowerCase() },
          { phone: identifier },
        ],
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired password reset request.');
    }

    const verification = this.otpService.verify(`pwd_reset:${user.phone}`, otp);
    if (!verification.valid) {
      throw new BadRequestException(verification.reason || 'Invalid or expired OTP code.');
    }

    const passwordHash = await argon2.hash(newPassword, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        failedLoginAttempts: 0,
        lockoutUntil: null,
      },
    });

    return {
      message: 'Password reset successfully. You can now log in with your new password.',
    };
  }

  // ──────────────────────── VERIFY TRANSACTION PIN ─────────────────────────

  async verifyTransactionPin(userId: string, pin: string): Promise<{ valid: boolean }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found.');

    const valid = await argon2.verify(user.transactionPinHash, pin);
    if (!valid) {
      throw new UnauthorizedException('Invalid transaction PIN. Please try again.');
    }

    return { valid: true };
  }

  // ───────────────────────── CHANGE TRANSACTION PIN ────────────────────────

  async changePin(userId: string, dto: ChangePinDto) {
    const { currentPin, newPin } = dto;

    if (currentPin === newPin) {
      throw new BadRequestException('New PIN must be different from current PIN.');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found.');

    const valid = await argon2.verify(user.transactionPinHash, currentPin);
    if (!valid) {
      throw new UnauthorizedException('Current transaction PIN is incorrect.');
    }

    const transactionPinHash = await argon2.hash(newPin, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { transactionPinHash },
    });

    return {
      message: 'Transaction PIN changed successfully.',
    };
  }

  // ───────────────────────── INTERNAL HELPERS ──────────────────────────────

  private async generateTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };
    const accessSecret =
      this.config.get<string>('jwt.accessSecret') ||
      'sanipay_jwt_access_secret_development_minimum_32_chars_ok';
    const refreshSecret =
      this.config.get<string>('jwt.refreshSecret') ||
      'sanipay_jwt_refresh_secret_development_minimum_32_chars_ok';
    const accessExpiresIn = (this.config.get('jwt.accessExpiresIn', { infer: true }) ?? '15m') as any;
    const refreshExpiresIn = (this.config.get('jwt.refreshExpiresIn', { infer: true }) ?? '30d') as any;

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, { secret: accessSecret, expiresIn: accessExpiresIn }),
      this.jwtService.signAsync(payload, { secret: refreshSecret, expiresIn: refreshExpiresIn }),
    ]);

    // Persist hashed refresh token for revocation support
    const refreshTokenHash = await argon2.hash(refreshToken, { type: argon2.argon2id });
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({
      data: { userId, tokenHash: refreshTokenHash, expiresAt },
    });

    return { accessToken, refreshToken };
  }

  private generateReferralCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }
}
