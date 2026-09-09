import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ReferralQueryDto, ClaimRewardsDto } from './dto/referral.dto';
import { ReferralStatus } from '@prisma/client';

export const QUALIFYING_THRESHOLD_KOBO = 100000n; // ₦1,000.00 in Kobo
export const DEFAULT_REFERRAL_REWARD_KOBO = 20000n; // ₦200.00 in Kobo

@Injectable()
export class ReferralsService {
  private readonly logger = new Logger(ReferralsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ──────────────────────────── REFERRAL SUMMARY ────────────────────────────

  async getReferralSummary(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, referralCode: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const [
      totalReferred,
      pendingCount,
      qualifiedCount,
      rewardedCount,
      rewards,
    ] = await Promise.all([
      this.prisma.referral.count({ where: { referrerId: userId } }),
      this.prisma.referral.count({
        where: { referrerId: userId, status: ReferralStatus.PENDING_QUALIFICATION },
      }),
      this.prisma.referral.count({
        where: { referrerId: userId, status: ReferralStatus.QUALIFIED },
      }),
      this.prisma.referral.count({
        where: { referrerId: userId, status: ReferralStatus.REWARDED },
      }),
      this.prisma.referralReward.findMany({
        where: { userId },
        select: { amountKobo: true, isPaid: true },
      }),
    ]);

    let unclaimedKobo = 0n;
    let totalEarnedKobo = 0n;

    for (const reward of rewards) {
      totalEarnedKobo += reward.amountKobo;
      if (!reward.isPaid) {
        unclaimedKobo += reward.amountKobo;
      }
    }

    const referralLink = `https://sanipay.ng/ref/${user.referralCode}`;

    return {
      message: 'Referral summary retrieved successfully',
      data: {
        referralCode: user.referralCode,
        referralLink,
        totalReferred,
        counts: {
          pendingQualification: pendingCount,
          qualified: qualifiedCount,
          rewarded: rewardedCount,
        },
        unclaimedRewardsKobo: unclaimedKobo.toString(),
        unclaimedRewardsFormatted: this._formatNaira(unclaimedKobo),
        totalEarnedKobo: totalEarnedKobo.toString(),
        totalEarnedFormatted: this._formatNaira(totalEarnedKobo),
      },
    };
  }

  // ──────────────────────────── REFERRAL HISTORY ────────────────────────────

  async getReferralHistory(userId: string, query: ReferralQueryDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = { referrerId: userId };
    if (query.status) {
      where.status = query.status;
    }

    const [totalCount, referrals] = await Promise.all([
      this.prisma.referral.count({ where }),
      this.prisma.referral.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          referredUser: {
            select: {
              id: true,
              phone: true,
              createdAt: true,
              profile: { select: { fullName: true } },
            },
          },
          rewards: {
            select: {
              id: true,
              amountKobo: true,
              isPaid: true,
              paidAt: true,
            },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    const data = referrals.map((ref) => {
      const reward = ref.rewards[0];
      const rewardAmountKobo = reward ? reward.amountKobo : DEFAULT_REFERRAL_REWARD_KOBO;

      return {
        id: ref.id,
        refereeName: this._maskName(ref.referredUser.profile?.fullName),
        refereePhone: this._maskPhone(ref.referredUser.phone),
        status: ref.status,
        rewardAmountKobo: rewardAmountKobo.toString(),
        rewardAmountFormatted: this._formatNaira(rewardAmountKobo),
        isPaid: reward ? reward.isPaid : false,
        paidAt: reward?.paidAt || null,
        joinedAt: ref.createdAt,
        updatedAt: ref.updatedAt,
      };
    });

    return {
      message: 'Referral history retrieved successfully',
      data,
      meta: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  // ────────────────────────── QUALIFY REFERRAL HOOK ─────────────────────────

  async qualifyReferral(refereeUserId: string, qualifyingAmountKobo: bigint) {
    if (qualifyingAmountKobo < QUALIFYING_THRESHOLD_KOBO) {
      this.logger.debug(
        `Amount ${qualifyingAmountKobo} Kobo does not meet qualifying threshold (${QUALIFYING_THRESHOLD_KOBO} Kobo) for referee ${refereeUserId}`,
      );
      return null;
    }

    const referral = await this.prisma.referral.findFirst({
      where: {
        referredUserId: refereeUserId,
        status: ReferralStatus.PENDING_QUALIFICATION,
      },
    });

    if (!referral) {
      return null;
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedReferral = await tx.referral.update({
        where: { id: referral.id },
        data: { status: ReferralStatus.QUALIFIED },
      });

      await tx.referralReward.create({
        data: {
          referralId: referral.id,
          userId: referral.referrerId,
          amountKobo: DEFAULT_REFERRAL_REWARD_KOBO,
          isPaid: false,
        },
      });

      return updatedReferral;
    });

    this.logger.log(
      `Referral ${referral.id} qualified for referee ${refereeUserId}. Reward of ${DEFAULT_REFERRAL_REWARD_KOBO} Kobo granted to referrer ${referral.referrerId}`,
    );

    return updated;
  }

  // ──────────────────────────── CLAIM REWARDS ───────────────────────────────

  async claimRewards(userId: string, dto?: ClaimRewardsDto) {
    const unpaidRewards = await this.prisma.referralReward.findMany({
      where: {
        userId,
        isPaid: false,
      },
      include: { referral: true },
    });

    if (unpaidRewards.length === 0) {
      throw new BadRequestException('You do not have any unclaimed referral rewards to claim.');
    }

    let totalClaimKobo = 0n;
    for (const reward of unpaidRewards) {
      totalClaimKobo += reward.amountKobo;
    }

    const claimReference = `SP_REF_CLM_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const idempotencyKey =
      dto?.idempotencyKey || `claim_${userId}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const result = await this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: { userId },
      });

      if (!wallet) {
        throw new NotFoundException('User wallet not found');
      }

      if (wallet.isLocked) {
        throw new BadRequestException(`Wallet is locked: ${wallet.lockReason || 'Contact support'}`);
      }

      const balanceBefore = wallet.balanceKobo;
      const balanceAfter = balanceBefore + totalClaimKobo;
      const ledgerBefore = wallet.ledgerBalanceKobo;
      const ledgerAfter = ledgerBefore + totalClaimKobo;

      // 1. Credit wallet
      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balanceKobo: balanceAfter,
          ledgerBalanceKobo: ledgerAfter,
          version: { increment: 1 },
        },
      });

      // 2. Create master Transaction
      const transaction = await tx.transaction.create({
        data: {
          userId,
          reference: claimReference,
          idempotencyKey,
          type: 'REFERRAL_BONUS',
          status: 'SUCCESS',
          amountKobo: totalClaimKobo,
          netAmountKobo: totalClaimKobo,
          feeKobo: 0n,
          currency: 'NGN',
          metadata: {
            description: `Referral bonus payout for ${unpaidRewards.length} qualified referrals`,
            rewardsCount: unpaidRewards.length,
          },
        },
      });

      // 3. Create double-entry WalletTransaction ledger record
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          transactionId: transaction.id,
          type: 'CREDIT',
          amountKobo: totalClaimKobo,
          balanceBeforeKobo: balanceBefore,
          balanceAfterKobo: balanceAfter,
          description: `Referral bonus claim (${unpaidRewards.length} referrals)`,
        },
      });

      // 4. Mark rewards as paid
      const rewardIds = unpaidRewards.map((r) => r.id);
      await tx.referralReward.updateMany({
        where: { id: { in: rewardIds } },
        data: {
          isPaid: true,
          paidAt: new Date(),
          transactionId: transaction.id,
        },
      });

      // 5. Update referrals to REWARDED
      const referralIds = unpaidRewards.map((r) => r.referralId);
      await tx.referral.updateMany({
        where: { id: { in: referralIds } },
        data: { status: ReferralStatus.REWARDED },
      });

      return {
        transaction,
        balanceAfter,
      };
    });

    this.logger.log(
      `User ${userId} claimed ${totalClaimKobo} Kobo across ${unpaidRewards.length} referral rewards. Reference: ${claimReference}`,
    );

    // Dispatch wallet notification for the claim
    await this.notificationsService.dispatchNotification({
      userId,
      title: 'Referral Bonus Credited',
      message: `${this._formatNaira(totalClaimKobo)} in referral bonuses has been credited to your wallet. Ref: ${claimReference}`,
      type: 'WALLET',
      metadata: { reference: claimReference, amountKobo: totalClaimKobo.toString() },
    });

    return {
      message: 'Referral rewards successfully claimed and credited to your wallet',
      data: {
        reference: result.transaction.reference,
        amountClaimedKobo: totalClaimKobo.toString(),
        amountClaimedFormatted: this._formatNaira(totalClaimKobo),
        rewardsCount: unpaidRewards.length,
        walletBalanceKobo: result.balanceAfter.toString(),
        walletBalanceFormatted: this._formatNaira(result.balanceAfter),
      },
    };
  }

  // ──────────────────────────── ADMIN OVERVIEW ──────────────────────────────

  async getAdminOverview() {
    const [
      totalReferrals,
      pendingCount,
      qualifiedCount,
      rewardedCount,
      rewardsPaid,
      topReferrers,
    ] = await Promise.all([
      this.prisma.referral.count(),
      this.prisma.referral.count({
        where: { status: ReferralStatus.PENDING_QUALIFICATION },
      }),
      this.prisma.referral.count({
        where: { status: ReferralStatus.QUALIFIED },
      }),
      this.prisma.referral.count({
        where: { status: ReferralStatus.REWARDED },
      }),
      this.prisma.referralReward.findMany({
        where: { isPaid: true },
        select: { amountKobo: true },
      }),
      this.prisma.user.findMany({
        where: {
          referralRecords: { some: {} },
        },
        select: {
          id: true,
          email: true,
          phone: true,
          referralCode: true,
          profile: { select: { fullName: true } },
          _count: { select: { referralRecords: true } },
        },
        orderBy: {
          referralRecords: { _count: 'desc' },
        },
        take: 10,
      }),
    ]);

    let totalPaidKobo = 0n;
    for (const r of rewardsPaid) {
      totalPaidKobo += r.amountKobo;
    }

    return {
      message: 'Admin referral program overview retrieved successfully',
      data: {
        totalReferrals,
        statusCounts: {
          pendingQualification: pendingCount,
          qualified: qualifiedCount,
          rewarded: rewardedCount,
        },
        rewardsSummary: {
          totalRewardsPaidCount: rewardsPaid.length,
          totalPaidKobo: totalPaidKobo.toString(),
          totalPaidFormatted: this._formatNaira(totalPaidKobo),
        },
        topReferrers: topReferrers.map((user) => ({
          userId: user.id,
          fullName: user.profile?.fullName || 'User',
          email: user.email,
          phone: this._maskPhone(user.phone),
          referralCode: user.referralCode,
          totalReferrals: user._count.referralRecords,
        })),
      },
    };
  }

  // ───────────────────────────── UTILITIES ──────────────────────────────────

  private _formatNaira(amountKobo: bigint): string {
    const naira = Number(amountKobo) / 100;
    return `₦${naira.toLocaleString('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  private _maskPhone(phone: string): string {
    if (!phone || phone.length < 8) return phone || '';
    const start = phone.substring(0, 4);
    const end = phone.substring(phone.length - 4);
    return `${start}***${end}`;
  }

  private _maskName(fullName?: string | null): string {
    if (!fullName) return 'User';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0];
    return `${parts[0]} ${parts[1].charAt(0)}.`;
  }
}
