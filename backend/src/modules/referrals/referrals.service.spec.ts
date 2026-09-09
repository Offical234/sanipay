import { Test, TestingModule } from '@nestjs/testing';
import { ReferralsService, QUALIFYING_THRESHOLD_KOBO, DEFAULT_REFERRAL_REWARD_KOBO } from './referrals.service';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ReferralStatus } from '@prisma/client';

describe('ReferralsService', () => {
  let service: ReferralsService;
  let prisma: any;

  const mockNotificationsService = {
    dispatchNotification: jest.fn().mockResolvedValue({ id: 'notif-1' }),
  };

  const mockPrismaService: any = {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    referral: {
      count: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    referralReward: {
      findMany: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    wallet: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    transaction: {
      create: jest.fn(),
    },
    walletTransaction: {
      create: jest.fn(),
    },
    $transaction: jest.fn((callbackOrArray: any): any => {
      if (typeof callbackOrArray === 'function') {
        return callbackOrArray(mockPrismaService);
      }
      return Promise.all(callbackOrArray);
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReferralsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<ReferralsService>(ReferralsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('getReferralSummary', () => {
    it('should return user referral summary and earnings statistics', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        referralCode: 'SP-ABC1234',
      });
      prisma.referral.count
        .mockResolvedValueOnce(5) // total
        .mockResolvedValueOnce(2) // pending
        .mockResolvedValueOnce(1) // qualified
        .mockResolvedValueOnce(2); // rewarded

      prisma.referralReward.findMany.mockResolvedValue([
        { amountKobo: 20000n, isPaid: false },
        { amountKobo: 20000n, isPaid: true },
        { amountKobo: 20000n, isPaid: true },
      ]);

      const result = await service.getReferralSummary('user-1');

      expect(result.data.referralCode).toBe('SP-ABC1234');
      expect(result.data.referralLink).toBe('https://sanipay.ng/ref/SP-ABC1234');
      expect(result.data.totalReferred).toBe(5);
      expect(result.data.counts.pendingQualification).toBe(2);
      expect(result.data.counts.qualified).toBe(1);
      expect(result.data.counts.rewarded).toBe(2);
      expect(result.data.unclaimedRewardsKobo).toBe('20000');
      expect(result.data.unclaimedRewardsFormatted).toBe('₦200.00');
      expect(result.data.totalEarnedKobo).toBe('60000');
      expect(result.data.totalEarnedFormatted).toBe('₦600.00');
    });

    it('should throw NotFoundException if user is not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getReferralSummary('unknown-user')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getReferralHistory', () => {
    it('should return paginated list with masked user details', async () => {
      prisma.referral.count.mockResolvedValue(1);
      prisma.referral.findMany.mockResolvedValue([
        {
          id: 'ref-1',
          status: ReferralStatus.QUALIFIED,
          createdAt: new Date('2026-09-01'),
          updatedAt: new Date('2026-09-02'),
          referredUser: {
            id: 'user-2',
            phone: '08012345678',
            createdAt: new Date('2026-09-01'),
            profile: { fullName: 'Amina Bello' },
          },
          rewards: [
            {
              id: 'rew-1',
              amountKobo: 20000n,
              isPaid: false,
              paidAt: null,
            },
          ],
        },
      ]);

      const result = await service.getReferralHistory('user-1', { page: 1, limit: 10 });

      expect(result.data.length).toBe(1);
      expect(result.data[0].refereeName).toBe('Amina B.');
      expect(result.data[0].refereePhone).toBe('0801***5678');
      expect(result.data[0].status).toBe(ReferralStatus.QUALIFIED);
      expect(result.data[0].rewardAmountKobo).toBe('20000');
      expect(result.data[0].rewardAmountFormatted).toBe('₦200.00');
      expect(result.data[0].isPaid).toBe(false);
      expect(result.meta.totalCount).toBe(1);
    });
  });

  describe('qualifyReferral', () => {
    it('should do nothing if qualifying amount is below threshold', async () => {
      const result = await service.qualifyReferral('referee-1', 50000n);
      expect(result).toBeNull();
      expect(prisma.referral.findFirst).not.toHaveBeenCalled();
    });

    it('should return null if no pending referral exists', async () => {
      prisma.referral.findFirst.mockResolvedValue(null);

      const result = await service.qualifyReferral('referee-1', QUALIFYING_THRESHOLD_KOBO);
      expect(result).toBeNull();
    });

    it('should qualify referral and create ReferralReward when threshold is met', async () => {
      const mockReferral = {
        id: 'ref-123',
        referrerId: 'referrer-1',
        referredUserId: 'referee-1',
        status: ReferralStatus.PENDING_QUALIFICATION,
      };

      prisma.referral.findFirst.mockResolvedValue(mockReferral);
      prisma.referral.update.mockResolvedValue({
        ...mockReferral,
        status: ReferralStatus.QUALIFIED,
      });

      const result = await service.qualifyReferral('referee-1', 150000n);

      expect(prisma.referral.update).toHaveBeenCalledWith({
        where: { id: 'ref-123' },
        data: { status: ReferralStatus.QUALIFIED },
      });
      expect(prisma.referralReward.create).toHaveBeenCalledWith({
        data: {
          referralId: 'ref-123',
          userId: 'referrer-1',
          amountKobo: DEFAULT_REFERRAL_REWARD_KOBO,
          isPaid: false,
        },
      });
      expect(result?.status).toBe(ReferralStatus.QUALIFIED);
    });
  });

  describe('claimRewards', () => {
    it('should throw BadRequestException if user has no unclaimed rewards', async () => {
      prisma.referralReward.findMany.mockResolvedValue([]);

      await expect(service.claimRewards('user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if wallet does not exist', async () => {
      prisma.referralReward.findMany.mockResolvedValue([
        { id: 'rew-1', referralId: 'ref-1', amountKobo: 20000n, isPaid: false },
      ]);
      prisma.wallet.findUnique.mockResolvedValue(null);

      await expect(service.claimRewards('user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if wallet is locked', async () => {
      prisma.referralReward.findMany.mockResolvedValue([
        { id: 'rew-1', referralId: 'ref-1', amountKobo: 20000n, isPaid: false },
      ]);
      prisma.wallet.findUnique.mockResolvedValue({
        id: 'wall-1',
        isLocked: true,
        lockReason: 'Suspicious activity',
      });

      await expect(service.claimRewards('user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should credit wallet, create ledger records, and mark rewards as paid', async () => {
      prisma.referralReward.findMany.mockResolvedValue([
        { id: 'rew-1', referralId: 'ref-1', amountKobo: 20000n, isPaid: false },
        { id: 'rew-2', referralId: 'ref-2', amountKobo: 20000n, isPaid: false },
      ]);

      prisma.wallet.findUnique.mockResolvedValue({
        id: 'wall-1',
        userId: 'user-1',
        balanceKobo: 500000n,
        ledgerBalanceKobo: 500000n,
        isLocked: false,
      });

      prisma.transaction.create.mockResolvedValue({
        id: 'tx-claim-1',
        reference: 'SP_REF_CLM_TEST_123',
      });

      const result = await service.claimRewards('user-1');

      expect(prisma.wallet.update).toHaveBeenCalledWith({
        where: { id: 'wall-1' },
        data: {
          balanceKobo: 540000n,
          ledgerBalanceKobo: 540000n,
          version: { increment: 1 },
        },
      });

      expect(prisma.transaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          type: 'REFERRAL_BONUS',
          status: 'SUCCESS',
          amountKobo: 40000n,
        }),
      });

      expect(prisma.walletTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          walletId: 'wall-1',
          type: 'CREDIT',
          amountKobo: 40000n,
          balanceBeforeKobo: 500000n,
          balanceAfterKobo: 540000n,
        }),
      });

      expect(prisma.referralReward.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['rew-1', 'rew-2'] } },
        data: expect.objectContaining({
          isPaid: true,
          transactionId: 'tx-claim-1',
        }),
      });

      expect(prisma.referral.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['ref-1', 'ref-2'] } },
        data: { status: ReferralStatus.REWARDED },
      });

      expect(result.data.amountClaimedKobo).toBe('40000');
      expect(result.data.amountClaimedFormatted).toBe('₦400.00');
      expect(result.data.rewardsCount).toBe(2);
      expect(result.data.walletBalanceKobo).toBe('540000');
    });
  });

  describe('getAdminOverview', () => {
    it('should return system-wide referral counts, paid amounts, and top referrers', async () => {
      prisma.referral.count
        .mockResolvedValueOnce(50) // total
        .mockResolvedValueOnce(20) // pending
        .mockResolvedValueOnce(10) // qualified
        .mockResolvedValueOnce(20); // rewarded

      prisma.referralReward.findMany.mockResolvedValue([
        { amountKobo: 20000n },
        { amountKobo: 20000n },
      ]);

      prisma.user.findMany.mockResolvedValue([
        {
          id: 'user-top-1',
          email: 'top@test.com',
          phone: '08098765432',
          referralCode: 'TOPREF01',
          profile: { fullName: 'Top Referrer' },
          _count: { referralRecords: 25 },
        },
      ]);

      const result = await service.getAdminOverview();

      expect(result.data.totalReferrals).toBe(50);
      expect(result.data.statusCounts.pendingQualification).toBe(20);
      expect(result.data.statusCounts.qualified).toBe(10);
      expect(result.data.statusCounts.rewarded).toBe(20);
      expect(result.data.rewardsSummary.totalRewardsPaidCount).toBe(2);
      expect(result.data.rewardsSummary.totalPaidKobo).toBe('40000');
      expect(result.data.rewardsSummary.totalPaidFormatted).toBe('₦400.00');
      expect(result.data.topReferrers.length).toBe(1);
      expect(result.data.topReferrers[0].fullName).toBe('Top Referrer');
      expect(result.data.topReferrers[0].totalReferrals).toBe(25);
    });
  });
});
