import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../../database/prisma.service';
import { UpdateProfileDto, ChangePasswordDto, SetTransactionPinDto } from './dto/user.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ──────────────────────────── GET PROFILE ────────────────────────────────

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        wallet: {
          select: {
            balanceKobo: true,
            currency: true,
            isLocked: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User account not found.');
    }

    const balanceKobo = user.wallet?.balanceKobo ?? 0n;

    return {
      message: 'User profile retrieved successfully',
      data: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified,
        referralCode: user.referralCode,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        profile: user.profile
          ? {
              fullName: user.profile.fullName,
              avatarUrl: user.profile.avatarUrl,
              address: user.profile.address,
              state: user.profile.state,
              lga: user.profile.lga,
              bvnVerified: user.profile.bvnVerified,
              ninVerified: user.profile.ninVerified,
            }
          : null,
        wallet: user.wallet
          ? {
              balanceKobo: balanceKobo.toString(),
              balanceFormatted: `₦${(Number(balanceKobo) / 100).toLocaleString('en-NG', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`,
              currency: user.wallet.currency,
              isLocked: user.wallet.isLocked,
            }
          : null,
      },
    };
  }

  // ──────────────────────────── UPDATE PROFILE ─────────────────────────────

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, profile: { select: { id: true } } },
    });

    if (!user) {
      throw new NotFoundException('User account not found.');
    }

    // Build only the fields that were provided
    const updateData: Record<string, any> = {};
    if (dto.fullName !== undefined) updateData.fullName = dto.fullName;
    if (dto.avatarUrl !== undefined) updateData.avatarUrl = dto.avatarUrl;
    if (dto.address !== undefined) updateData.address = dto.address;
    if (dto.state !== undefined) updateData.state = dto.state;
    if (dto.lga !== undefined) updateData.lga = dto.lga;

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('No valid profile fields provided for update.');
    }

    const updatedProfile = await this.prisma.userProfile.upsert({
      where: { userId },
      create: {
        userId,
        fullName: dto.fullName || 'SaniPay User',
        avatarUrl: dto.avatarUrl,
        address: dto.address,
        state: dto.state,
        lga: dto.lga,
      },
      update: updateData,
    });

    this.logger.log(`Profile updated for user ${userId}`);

    return {
      message: 'Profile updated successfully',
      data: {
        fullName: updatedProfile.fullName,
        avatarUrl: updatedProfile.avatarUrl,
        address: updatedProfile.address,
        state: updatedProfile.state,
        lga: updatedProfile.lga,
      },
    };
  }

  // ──────────────────────────── CHANGE PASSWORD ────────────────────────────

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, passwordHash: true },
    });

    if (!user) {
      throw new NotFoundException('User account not found.');
    }

    // 1. Verify current password
    const isCurrentValid = await argon2.verify(user.passwordHash, dto.currentPassword);
    if (!isCurrentValid) {
      throw new UnauthorizedException('Current password is incorrect.');
    }

    // 2. Prevent re-using the same password
    const isSamePassword = await argon2.verify(user.passwordHash, dto.newPassword);
    if (isSamePassword) {
      throw new BadRequestException('New password must be different from the current password.');
    }

    // 3. Hash and save new password
    const newPasswordHash = await argon2.hash(dto.newPassword, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    // 4. Revoke all existing refresh tokens for security
    await this.prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });

    this.logger.log(`Password changed and all sessions invalidated for user ${userId}`);

    return {
      message: 'Password changed successfully. Please log in again with your new password.',
    };
  }

  // ──────────────────────────── SET TRANSACTION PIN ────────────────────────

  async setTransactionPin(userId: string, dto: SetTransactionPinDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, passwordHash: true },
    });

    if (!user) {
      throw new NotFoundException('User account not found.');
    }

    // 1. Verify account password before allowing PIN change
    const isPasswordValid = await argon2.verify(user.passwordHash, dto.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Account password is incorrect. PIN change rejected.');
    }

    // 2. Hash new transaction PIN
    const newPinHash = await argon2.hash(dto.pin, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { transactionPinHash: newPinHash },
    });

    this.logger.log(`Transaction PIN updated for user ${userId}`);

    return {
      message: 'Transaction PIN updated successfully.',
    };
  }
}
