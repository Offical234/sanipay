import { Injectable, Logger } from '@nestjs/common';

export interface OtpRecord {
  otp: string;
  expiresAt: Date;
  attempts: number;
}

/**
 * In-memory OTP store for development.
 * In production, this should be replaced with Redis-backed TTL storage.
 */
@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly store = new Map<string, OtpRecord>();

  private readonly OTP_TTL_MINUTES = 10;
  private readonly MAX_ATTEMPTS = 5;
  private readonly DEV_OTP = '123456'; // Fixed OTP for dev/sandbox mode

  generate(key: string): string {
    const otp =
      process.env.NODE_ENV === 'development'
        ? this.DEV_OTP
        : Math.floor(100000 + Math.random() * 900000).toString();

    const expiresAt = new Date(Date.now() + this.OTP_TTL_MINUTES * 60 * 1000);
    this.store.set(key, { otp, expiresAt, attempts: 0 });

    this.logger.log(
      process.env.NODE_ENV === 'development'
        ? `[DEV] OTP for ${key}: ${otp}`
        : `OTP generated for ${key}`,
    );

    return otp;
  }

  verify(key: string, otp: string): { valid: boolean; reason?: string } {
    const record = this.store.get(key);

    if (!record) {
      return { valid: false, reason: 'OTP not found or already used' };
    }

    if (new Date() > record.expiresAt) {
      this.store.delete(key);
      return { valid: false, reason: 'OTP has expired. Please request a new one.' };
    }

    if (record.attempts >= this.MAX_ATTEMPTS) {
      this.store.delete(key);
      return { valid: false, reason: 'Too many incorrect OTP attempts. Please request a new one.' };
    }

    if (record.otp !== otp) {
      record.attempts++;
      return { valid: false, reason: 'Invalid OTP code. Please check and try again.' };
    }

    // Valid — consume and delete
    this.store.delete(key);
    return { valid: true };
  }

  invalidate(key: string): void {
    this.store.delete(key);
  }
}
