import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  UserListQueryDto,
  UpdateUserStatusDto,
  UpdateNetworkDiscountDto,
  UpdateDataPlanPriceDto,
  ProcessRefundDto,
  RefundQueryDto,
  AdminTransactionQueryDto,
  UpsertSystemSettingDto,
} from './dto/admin.dto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ──────────────────────────── DASHBOARD OVERVIEW ─────────────────────────

  async getDashboardOverview() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalUsers,
      activeUsers,
      suspendedUsers,
      totalTransactions,
      todayTransactions,
      monthTransactions,
      successfulTxns,
      failedTxns,
      refundedTxns,
      processingTxns,
      walletStats,
      txnVolumeByType,
      recentTransactions,
    ] = await Promise.all([
      // User counts
      this.prisma.user.count(),
      this.prisma.user.count({ where: { status: 'ACTIVE' } }),
      this.prisma.user.count({ where: { status: 'SUSPENDED' } }),

      // Transaction counts
      this.prisma.transaction.count(),
      this.prisma.transaction.count({ where: { createdAt: { gte: todayStart } } }),
      this.prisma.transaction.count({ where: { createdAt: { gte: thisMonthStart } } }),
      this.prisma.transaction.count({ where: { status: 'SUCCESS' } }),
      this.prisma.transaction.count({ where: { status: 'FAILED' } }),
      this.prisma.transaction.count({ where: { status: 'REFUNDED' } }),
      this.prisma.transaction.count({ where: { status: 'PROCESSING' } }),

      // Wallet aggregate — total money held
      this.prisma.wallet.aggregate({ _sum: { balanceKobo: true } }),

      // Volume breakdown by type (successful only)
      this.prisma.transaction.groupBy({
        by: ['type'],
        where: { status: 'SUCCESS' },
        _sum: { netAmountKobo: true },
        _count: true,
      }),

      // Recent 5 transactions for activity feed
      this.prisma.transaction.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          reference: true,
          type: true,
          status: true,
          amountKobo: true,
          createdAt: true,
          user: { select: { email: true, phone: true, profile: { select: { fullName: true } } } },
        },
      }),
    ]);

    // Compute total revenue (all successful non-funding transactions)
    const revenueData = await this.prisma.transaction.aggregate({
      where: {
        status: 'SUCCESS',
        type: { not: 'WALLET_FUNDING' },
      },
      _sum: { netAmountKobo: true },
    });

    const todayRevenueData = await this.prisma.transaction.aggregate({
      where: {
        status: 'SUCCESS',
        type: { not: 'WALLET_FUNDING' },
        createdAt: { gte: todayStart },
      },
      _sum: { netAmountKobo: true },
    });

    const monthRevenueData = await this.prisma.transaction.aggregate({
      where: {
        status: 'SUCCESS',
        type: { not: 'WALLET_FUNDING' },
        createdAt: { gte: thisMonthStart },
      },
      _sum: { netAmountKobo: true },
    });

    const formatKobo = (k: bigint | null) =>
      `₦${(Number(k ?? 0n) / 100).toLocaleString('en-NG', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;

    return {
      message: 'Admin dashboard overview retrieved successfully',
      data: {
        users: {
          total: totalUsers,
          active: activeUsers,
          suspended: suspendedUsers,
          pendingVerification: totalUsers - activeUsers - suspendedUsers,
        },
        transactions: {
          total: totalTransactions,
          today: todayTransactions,
          thisMonth: monthTransactions,
          byStatus: {
            successful: successfulTxns,
            failed: failedTxns,
            refunded: refundedTxns,
            processing: processingTxns,
          },
        },
        revenue: {
          totalKobo: (revenueData._sum.netAmountKobo ?? 0n).toString(),
          totalFormatted: formatKobo(revenueData._sum.netAmountKobo),
          todayKobo: (todayRevenueData._sum.netAmountKobo ?? 0n).toString(),
          todayFormatted: formatKobo(todayRevenueData._sum.netAmountKobo),
          thisMonthKobo: (monthRevenueData._sum.netAmountKobo ?? 0n).toString(),
          thisMonthFormatted: formatKobo(monthRevenueData._sum.netAmountKobo),
        },
        wallets: {
          totalFundsHeldKobo: (walletStats._sum.balanceKobo ?? 0n).toString(),
          totalFundsHeldFormatted: formatKobo(walletStats._sum.balanceKobo),
        },
        volumeByType: txnVolumeByType.map((entry) => ({
          type: entry.type,
          count: entry._count,
          volumeKobo: (entry._sum.netAmountKobo ?? 0n).toString(),
          volumeFormatted: formatKobo(entry._sum.netAmountKobo),
        })),
        recentActivity: recentTransactions.map((tx) => ({
          id: tx.id,
          reference: tx.reference,
          type: tx.type,
          status: tx.status,
          amountFormatted: formatKobo(tx.amountKobo),
          user: {
            name: tx.user?.profile?.fullName ?? tx.user?.email ?? 'Unknown',
            phone: tx.user?.phone,
          },
          createdAt: tx.createdAt,
        })),
      },
    };
  }

  // ──────────────────────────── USER MANAGEMENT ────────────────────────────

  async listUsers(query: UserListQueryDto) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 20;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {};

    if (query.status) where.status = query.status;
    if (query.role) where.role = query.role as any;

    if (query.search) {
      const term = query.search.trim();
      where.OR = [
        { email: { contains: term, mode: 'insensitive' } },
        { phone: { contains: term } },
        { profile: { fullName: { contains: term, mode: 'insensitive' } } },
      ];
    }

    const [totalCount, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          profile: { select: { fullName: true, avatarUrl: true, bvnVerified: true } },
          wallet: { select: { balanceKobo: true, isLocked: true } },
          _count: { select: { transactions: true, supportTickets: true } },
        },
      }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      message: 'Users retrieved successfully',
      data: users.map((u) => ({
        id: u.id,
        email: u.email,
        phone: u.phone,
        role: u.role,
        status: u.status,
        isEmailVerified: u.isEmailVerified,
        isPhoneVerified: u.isPhoneVerified,
        fullName: u.profile?.fullName ?? null,
        bvnVerified: u.profile?.bvnVerified ?? false,
        walletBalance: u.wallet
          ? {
              kobo: u.wallet.balanceKobo.toString(),
              formatted: `₦${(Number(u.wallet.balanceKobo) / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`,
              isLocked: u.wallet.isLocked,
            }
          : null,
        transactionCount: u._count.transactions,
        ticketCount: u._count.supportTickets,
        createdAt: u.createdAt,
      })),
      meta: { page, limit, totalCount, totalPages, hasNextPage: page < totalPages },
    };
  }

  async getUserDetails(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        wallet: { include: { walletTransactions: { take: 10, orderBy: { createdAt: 'desc' } } } },
        transactions: { take: 10, orderBy: { createdAt: 'desc' } },
        supportTickets: { take: 5, orderBy: { createdAt: 'desc' } },
        _count: {
          select: {
            transactions: true,
            supportTickets: true,
            referralsMade: true,
          },
        },
      },
    });

    if (!user) throw new NotFoundException(`User ${userId} not found`);

    return {
      message: 'User details retrieved successfully',
      data: user,
    };
  }

  async updateUserStatus(adminId: string, userId: string, dto: UpdateUserStatusDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException(`User ${userId} not found`);

    if (user.id === adminId) {
      throw new BadRequestException('You cannot change your own account status.');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { status: dto.status },
    });

    // Write audit log
    await this.prisma.auditLog.create({
      data: {
        actorId: adminId,
        actorType: 'ADMIN',
        action: `USER_STATUS_CHANGED_TO_${dto.status}`,
        targetEntity: 'User',
        targetId: userId,
        oldValues: { status: user.status },
        newValues: { status: dto.status, reason: dto.reason },
      },
    });

    this.logger.log(`Admin ${adminId} changed user ${userId} status to ${dto.status}`);

    return {
      message: `User account ${dto.status === 'ACTIVE' ? 'activated' : 'suspended'} successfully`,
      data: {
        userId: updatedUser.id,
        email: updatedUser.email,
        status: updatedUser.status,
      },
    };
  }

  // ──────────────────────────── TRANSACTION MANAGEMENT ─────────────────────

  async listTransactions(query: AdminTransactionQueryDto) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 20;
    const skip = (page - 1) * limit;

    const where: Prisma.TransactionWhereInput = {};

    if (query.userId) where.userId = query.userId;
    if (query.type) where.type = query.type;
    if (query.status) where.status = query.status;
    if (query.startDate || query.endDate) {
      where.createdAt = {
        gte: query.startDate ? new Date(query.startDate) : undefined,
        lte: query.endDate ? new Date(query.endDate) : undefined,
      };
    }
    if (query.search) {
      const term = query.search.trim();
      where.OR = [
        { reference: { contains: term, mode: 'insensitive' } },
        { providerReference: { contains: term, mode: 'insensitive' } },
        { user: { email: { contains: term, mode: 'insensitive' } } },
        { user: { phone: { contains: term } } },
        { airtimeTransaction: { recipientPhone: { contains: term } } },
        { dataTransaction: { recipientPhone: { contains: term } } },
        { electricityTransaction: { meterNumber: { contains: term } } },
        { cableTransaction: { smartcardNumber: { contains: term } } },
      ];
    }

    const [totalCount, transactions] = await Promise.all([
      this.prisma.transaction.count({ where }),
      this.prisma.transaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { email: true, phone: true, profile: { select: { fullName: true } } } },
          airtimeTransaction: { include: { network: true } },
          dataTransaction: { include: { network: true } },
          electricityTransaction: { include: { provider: true } },
          cableTransaction: { include: { provider: true } },
        },
      }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);
    const formatKobo = (k: bigint) => `₦${(Number(k) / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;

    return {
      message: 'Admin transactions retrieved successfully',
      data: transactions.map((tx) => ({
        id: tx.id,
        reference: tx.reference,
        type: tx.type,
        status: tx.status,
        amountFormatted: formatKobo(tx.amountKobo),
        amountKobo: tx.amountKobo.toString(),
        netAmountKobo: tx.netAmountKobo.toString(),
        netAmountFormatted: formatKobo(tx.netAmountKobo),
        providerName: tx.providerName,
        providerReference: tx.providerReference,
        failureReason: tx.failureReason,
        user: {
          name: tx.user?.profile?.fullName ?? tx.user?.email ?? 'Unknown',
          email: tx.user?.email,
          phone: tx.user?.phone,
        },
        createdAt: tx.createdAt,
      })),
      meta: { page, limit, totalCount, totalPages, hasNextPage: page < totalPages },
    };
  }

  // ──────────────────────────── REFUND MANAGEMENT ──────────────────────────

  async processRefund(adminId: string, dto: ProcessRefundDto) {
    // 1. Find transaction
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: dto.transactionId },
      include: {
        refund: true,
        user: { select: { id: true, email: true } },
      },
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction ${dto.transactionId} not found`);
    }

    if (transaction.status === 'REFUNDED') {
      throw new ConflictException('This transaction has already been refunded.');
    }

    if (transaction.refund) {
      throw new ConflictException('A refund record already exists for this transaction.');
    }

    if (!['FAILED', 'SUCCESS', 'PROCESSING'].includes(transaction.status)) {
      throw new BadRequestException(
        `Cannot refund a transaction with status: ${transaction.status}`,
      );
    }

    const refundAmountKobo = transaction.netAmountKobo;

    // 2. Process in an atomic transaction
    await this.prisma.$transaction(async (tx) => {
      // Create refund record
      await tx.refund.create({
        data: {
          transactionId: dto.transactionId,
          userId: transaction.userId,
          amountKobo: refundAmountKobo,
          reason: dto.reason,
          status: 'COMPLETED',
          processedBy: adminId,
        },
      });

      // Mark original transaction as REFUNDED
      await tx.transaction.update({
        where: { id: dto.transactionId },
        data: { status: 'REFUNDED', failureReason: dto.reason },
      });

      // Credit the user's wallet
      const wallet = await tx.wallet.findUnique({ where: { userId: transaction.userId } });
      if (!wallet) throw new NotFoundException('User wallet not found for refund');

      const refundTxRef = `SP_RFND_${Date.now()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      // Create a companion refund transaction entry
      const refundTx = await tx.transaction.create({
        data: {
          userId: transaction.userId,
          reference: refundTxRef,
          idempotencyKey: refundTxRef,
          type: 'REFUND',
          status: 'SUCCESS',
          amountKobo: refundAmountKobo,
          feeKobo: 0n,
          discountKobo: 0n,
          netAmountKobo: refundAmountKobo,
          providerName: 'ADMIN',
          metadata: {
            originalTransactionId: dto.transactionId,
            refundedBy: adminId,
            reason: dto.reason,
          },
        },
      });

      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balanceKobo: { increment: refundAmountKobo } },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          transactionId: refundTx.id,
          type: 'CREDIT',
          amountKobo: refundAmountKobo,
          balanceBeforeKobo: wallet.balanceKobo,
          balanceAfterKobo: wallet.balanceKobo + refundAmountKobo,
          description: `Admin refund: ${dto.reason}`,
        },
      });
    });

    // 3. Audit log
    await this.prisma.auditLog.create({
      data: {
        actorId: adminId,
        actorType: 'ADMIN',
        action: 'MANUAL_REFUND_PROCESSED',
        targetEntity: 'Transaction',
        targetId: dto.transactionId,
        newValues: {
          reason: dto.reason,
          refundAmountKobo: refundAmountKobo.toString(),
          userId: transaction.userId,
        },
      },
    });

    this.logger.log(`Admin ${adminId} processed refund for txn ${dto.transactionId}`);

    return {
      message: 'Refund processed successfully. User wallet has been credited.',
      data: {
        transactionId: dto.transactionId,
        refundedAmountKobo: refundAmountKobo.toString(),
        refundedAmountFormatted: `₦${(Number(refundAmountKobo) / 100).toLocaleString('en-NG', {
          minimumFractionDigits: 2,
        })}`,
        reason: dto.reason,
      },
    };
  }

  async listRefunds(query: RefundQueryDto) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 20;
    const skip = (page - 1) * limit;

    const where: Prisma.RefundWhereInput = {};
    if (query.status) where.status = query.status as any;

    const [totalCount, refunds] = await Promise.all([
      this.prisma.refund.count({ where }),
      this.prisma.refund.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          transaction: { select: { reference: true, type: true, providerName: true } },
          user: { select: { email: true, phone: true, profile: { select: { fullName: true } } } },
        },
      }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      message: 'Refunds retrieved successfully',
      data: refunds.map((r) => ({
        id: r.id,
        transactionId: r.transactionId,
        transactionRef: r.transaction.reference,
        transactionType: r.transaction.type,
        amountKobo: r.amountKobo.toString(),
        amountFormatted: `₦${(Number(r.amountKobo) / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`,
        status: r.status,
        reason: r.reason,
        processedBy: r.processedBy,
        user: {
          name: r.user?.profile?.fullName ?? r.user?.email,
          email: r.user?.email,
          phone: r.user?.phone,
        },
        createdAt: r.createdAt,
      })),
      meta: { page, limit, totalCount, totalPages, hasNextPage: page < totalPages },
    };
  }

  // ──────────────────────────── PRICING MANAGEMENT ─────────────────────────

  async listNetworks() {
    const networks = await this.prisma.network.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            dataPlans: true,
            airtimeTransactions: true,
            dataTransactions: true,
          },
        },
      },
    });

    return {
      message: 'Network pricing retrieved successfully',
      data: networks.map((n) => ({
        id: n.id,
        code: n.code,
        name: n.name,
        airtimeDiscountBps: n.airtimeDiscountBps,
        airtimeDiscountPercent: `${(n.airtimeDiscountBps / 100).toFixed(2)}%`,
        isActive: n.isActive,
        airtimeEnabled: n.airtimeEnabled,
        dataEnabled: n.dataEnabled,
        dataPlansCount: n._count.dataPlans,
        airtimeTxnCount: n._count.airtimeTransactions,
        dataTxnCount: n._count.dataTransactions,
        updatedAt: n.updatedAt,
      })),
    };
  }

  async updateNetworkDiscount(adminId: string, networkId: string, dto: UpdateNetworkDiscountDto) {
    const network = await this.prisma.network.findUnique({ where: { id: networkId } });
    if (!network) throw new NotFoundException(`Network ${networkId} not found`);

    const updated = await this.prisma.network.update({
      where: { id: networkId },
      data: { airtimeDiscountBps: dto.airtimeDiscountBps },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: adminId,
        actorType: 'ADMIN',
        action: 'NETWORK_DISCOUNT_UPDATED',
        targetEntity: 'Network',
        targetId: networkId,
        oldValues: { airtimeDiscountBps: network.airtimeDiscountBps },
        newValues: { airtimeDiscountBps: dto.airtimeDiscountBps },
      },
    });

    return {
      message: `${updated.name} airtime discount updated to ${(dto.airtimeDiscountBps / 100).toFixed(2)}%`,
      data: { id: updated.id, code: updated.code, name: updated.name, airtimeDiscountBps: updated.airtimeDiscountBps },
    };
  }

  async listDataPlans(networkId?: string) {
    const where: Prisma.DataPlanWhereInput = {};
    if (networkId) where.networkId = networkId;

    const plans = await this.prisma.dataPlan.findMany({
      where,
      orderBy: [{ network: { name: 'asc' } }, { sellingPriceKobo: 'asc' }],
      include: { network: { select: { id: true, code: true, name: true } } },
    });

    const formatKobo = (k: bigint) =>
      `₦${(Number(k) / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;

    return {
      message: 'Data plans retrieved successfully',
      data: plans.map((p) => ({
        id: p.id,
        planCode: p.planCode,
        name: p.name,
        type: p.type,
        validity: p.validity,
        costPriceKobo: p.costPriceKobo.toString(),
        costPriceFormatted: formatKobo(p.costPriceKobo),
        sellingPriceKobo: p.sellingPriceKobo.toString(),
        sellingPriceFormatted: formatKobo(p.sellingPriceKobo),
        marginKobo: (p.sellingPriceKobo - p.costPriceKobo).toString(),
        marginFormatted: formatKobo(p.sellingPriceKobo - p.costPriceKobo),
        isActive: p.isActive,
        network: p.network,
        updatedAt: p.updatedAt,
      })),
    };
  }

  async updateDataPlanPrice(adminId: string, planId: string, dto: UpdateDataPlanPriceDto) {
    const plan = await this.prisma.dataPlan.findUnique({ where: { id: planId } });
    if (!plan) throw new NotFoundException(`Data plan ${planId} not found`);

    const updateData: any = { sellingPriceKobo: BigInt(dto.sellingPriceKobo) };
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    const updated = await this.prisma.dataPlan.update({
      where: { id: planId },
      data: updateData,
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: adminId,
        actorType: 'ADMIN',
        action: 'DATA_PLAN_PRICE_UPDATED',
        targetEntity: 'DataPlan',
        targetId: planId,
        oldValues: {
          sellingPriceKobo: plan.sellingPriceKobo.toString(),
          isActive: plan.isActive,
        },
        newValues: {
          sellingPriceKobo: dto.sellingPriceKobo,
          isActive: dto.isActive,
        },
      },
    });

    return {
      message: `Data plan "${updated.name}" price updated successfully`,
      data: {
        id: updated.id,
        name: updated.name,
        sellingPriceKobo: updated.sellingPriceKobo.toString(),
        isActive: updated.isActive,
      },
    };
  }

  // ──────────────────────────── SYSTEM SETTINGS ────────────────────────────

  async getSystemSettings() {
    const settings = await this.prisma.systemSetting.findMany({
      orderBy: { key: 'asc' },
    });

    return {
      message: 'System settings retrieved successfully',
      data: settings.map((s) => ({
        id: s.id,
        key: s.key,
        value: s.isSecret ? '***' : s.value,
        description: s.description,
        isSecret: s.isSecret,
        updatedAt: s.updatedAt,
      })),
    };
  }

  async upsertSystemSetting(adminId: string, dto: UpsertSystemSettingDto) {
    const existing = await this.prisma.systemSetting.findUnique({ where: { key: dto.key } });

    const setting = await this.prisma.systemSetting.upsert({
      where: { key: dto.key },
      create: {
        key: dto.key,
        value: dto.value,
        description: dto.description,
      },
      update: {
        value: dto.value,
        description: dto.description ?? undefined,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: adminId,
        actorType: 'ADMIN',
        action: existing ? 'SYSTEM_SETTING_UPDATED' : 'SYSTEM_SETTING_CREATED',
        targetEntity: 'SystemSetting',
        targetId: dto.key,
        oldValues: existing ? { value: existing.isSecret ? '***' : existing.value } : Prisma.JsonNull,
        newValues: { value: setting.isSecret ? '***' : dto.value },
      },
    });

    return {
      message: `System setting '${dto.key}' ${existing ? 'updated' : 'created'} successfully`,
      data: {
        key: setting.key,
        value: setting.isSecret ? '***' : setting.value,
        description: setting.description,
      },
    };
  }
}
