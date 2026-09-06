import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { TransactionQueryDto } from './dto/transaction.dto';

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ──────────────────────────── LIST TRANSACTIONS ──────────────────────────

  async getTransactions(userId: string, query: TransactionQueryDto, userRole?: string) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 20;
    const skip = (page - 1) * limit;

    const isAdmin = userRole === 'SUPER_ADMIN' || userRole === 'FINANCE_ADMIN';

    // Construct filter criteria
    const where: Prisma.TransactionWhereInput = {};

    if (!isAdmin) {
      where.userId = userId;
    }

    if (query.type) {
      where.type = query.type;
    }

    if (query.status) {
      where.status = query.status;
    }

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
        { airtimeTransaction: { recipientPhone: { contains: term } } },
        { dataTransaction: { recipientPhone: { contains: term } } },
        { electricityTransaction: { meterNumber: { contains: term } } },
        { electricityTransaction: { customerName: { contains: term, mode: 'insensitive' } } },
        { cableTransaction: { smartcardNumber: { contains: term } } },
        { cableTransaction: { customerName: { contains: term, mode: 'insensitive' } } },
      ];
    }

    // Parallel count & query
    const [totalCount, transactions] = await Promise.all([
      this.prisma.transaction.count({ where }),
      this.prisma.transaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          airtimeTransaction: { include: { network: true } },
          dataTransaction: { include: { network: true } },
          electricityTransaction: { include: { provider: true } },
          cableTransaction: { include: { provider: true } },
          paymentTransaction: true,
          transactionItems: true,
        },
      }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      message: 'Transactions retrieved successfully',
      data: transactions.map((tx) => this._mapTransactionListItem(tx)),
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

  // ──────────────────────────── TRANSACTION DETAILS / RECEIPT ──────────────

  async getTransactionDetails(userId: string, identifier: string, userRole?: string) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);

    const transaction = await this.prisma.transaction.findFirst({
      where: isUuid ? { id: identifier } : { reference: identifier },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            profile: { select: { fullName: true } },
          },
        },
        airtimeTransaction: { include: { network: true } },
        dataTransaction: { include: { network: true } },
        electricityTransaction: { include: { provider: true } },
        cableTransaction: { include: { provider: true } },
        paymentTransaction: true,
        transactionItems: true,
        walletTransactions: true,
      },
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction '${identifier}' not found`);
    }

    const isAdmin = userRole === 'SUPER_ADMIN' || userRole === 'FINANCE_ADMIN';
    if (!isAdmin && transaction.userId !== userId) {
      throw new ForbiddenException('You do not have permission to view this transaction receipt');
    }

    return {
      message: 'Transaction details retrieved successfully',
      data: this._generateDigitalReceipt(transaction),
    };
  }

  // ──────────────────────────── TRANSACTION SUMMARY ────────────────────────

  async getTransactionSummary(userId: string) {
    const transactions = await this.prisma.transaction.findMany({
      where: {
        userId,
        status: 'SUCCESS',
      },
      select: {
        type: true,
        amountKobo: true,
        netAmountKobo: true,
      },
    });

    let totalFundedKobo = 0n;
    let totalSpentKobo = 0n;
    const countByType: Record<string, number> = {};

    for (const tx of transactions) {
      countByType[tx.type] = (countByType[tx.type] || 0) + 1;

      if (tx.type === 'WALLET_FUNDING') {
        totalFundedKobo += tx.netAmountKobo;
      } else {
        totalSpentKobo += tx.netAmountKobo;
      }
    }

    const formatKobo = (k: bigint) =>
      `₦${(Number(k) / 100).toLocaleString('en-NG', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;

    return {
      message: 'Transaction summary statistics retrieved',
      data: {
        totalFundedKobo: totalFundedKobo.toString(),
        totalFundedFormatted: formatKobo(totalFundedKobo),
        totalSpentKobo: totalSpentKobo.toString(),
        totalSpentFormatted: formatKobo(totalSpentKobo),
        totalSuccessfulTransactions: transactions.length,
        breakdownByType: countByType,
      },
    };
  }

  // ──────────────────────────── HELPERS ────────────────────────────────────

  private _formatNaira(amountKobo: bigint): string {
    return `₦${(Number(amountKobo) / 100).toLocaleString('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  private _mapTransactionListItem(tx: any) {
    let serviceTitle = tx.type.replace(/_/g, ' ');
    let subtitle = tx.reference;

    if (tx.airtimeTransaction) {
      serviceTitle = `${tx.airtimeTransaction.network.name} Airtime`;
      subtitle = tx.airtimeTransaction.recipientPhone;
    } else if (tx.dataTransaction) {
      serviceTitle = `${tx.dataTransaction.network.name} ${tx.dataTransaction.planName}`;
      subtitle = tx.dataTransaction.recipientPhone;
    } else if (tx.electricityTransaction) {
      serviceTitle = `${tx.electricityTransaction.provider.name} (${tx.electricityTransaction.meterType})`;
      subtitle = `Meter: ${tx.electricityTransaction.meterNumber}`;
    } else if (tx.cableTransaction) {
      serviceTitle = `${tx.cableTransaction.provider.name} - ${tx.cableTransaction.packageName}`;
      subtitle = `IUC: ${tx.cableTransaction.smartcardNumber}`;
    } else if (tx.type === 'WALLET_FUNDING') {
      serviceTitle = `Wallet Funding (${tx.providerName || 'Gateway'})`;
      subtitle = `Ref: ${tx.reference}`;
    } else if (tx.type === 'WALLET_TRANSFER') {
      serviceTitle = 'P2P Wallet Transfer';
      subtitle = tx.metadata?.recipientPhone ? `To: ${tx.metadata.recipientPhone}` : tx.reference;
    }

    return {
      id: tx.id,
      reference: tx.reference,
      type: tx.type,
      status: tx.status,
      title: serviceTitle,
      subtitle,
      amountKobo: tx.amountKobo.toString(),
      amountFormatted: this._formatNaira(tx.amountKobo),
      netAmountKobo: tx.netAmountKobo.toString(),
      netAmountFormatted: this._formatNaira(tx.netAmountKobo),
      providerReference: tx.providerReference,
      createdAt: tx.createdAt,
    };
  }

  private _generateDigitalReceipt(tx: any) {
    let serviceDetails: Record<string, any> = {};

    if (tx.airtimeTransaction) {
      serviceDetails = {
        category: 'AIRTIME',
        network: tx.airtimeTransaction.network.name,
        networkCode: tx.airtimeTransaction.network.code,
        recipientPhone: tx.airtimeTransaction.recipientPhone,
        discountKobo: tx.airtimeTransaction.discountKobo.toString(),
        discountFormatted: this._formatNaira(tx.airtimeTransaction.discountKobo),
      };
    } else if (tx.dataTransaction) {
      serviceDetails = {
        category: 'DATA',
        network: tx.dataTransaction.network.name,
        networkCode: tx.dataTransaction.network.code,
        planName: tx.dataTransaction.planName,
        validity: tx.dataTransaction.dataVolume,
        recipientPhone: tx.dataTransaction.recipientPhone,
      };
    } else if (tx.electricityTransaction) {
      serviceDetails = {
        category: 'ELECTRICITY',
        discoName: tx.electricityTransaction.provider.name,
        discoCode: tx.electricityTransaction.provider.code,
        meterNumber: tx.electricityTransaction.meterNumber,
        meterType: tx.electricityTransaction.meterType,
        customerName: tx.electricityTransaction.customerName,
        customerAddress: tx.electricityTransaction.customerAddress,
        token: tx.electricityTransaction.token, // 16-digit prepaid recharge token
        units: tx.electricityTransaction.units,
        receiptNumber: tx.electricityTransaction.receiptNumber,
      };
    } else if (tx.cableTransaction) {
      serviceDetails = {
        category: 'CABLE_TV',
        providerName: tx.cableTransaction.provider.name,
        providerCode: tx.cableTransaction.provider.code,
        smartcardNumber: tx.cableTransaction.smartcardNumber,
        customerName: tx.cableTransaction.customerName,
        packageName: tx.cableTransaction.packageName,
        packageCode: tx.cableTransaction.packageCode,
        renewalMonths: tx.cableTransaction.renewalMonths,
      };
    } else if (tx.paymentTransaction) {
      serviceDetails = {
        category: 'WALLET_FUNDING',
        gateway: tx.paymentTransaction.gateway,
        gatewayReference: tx.paymentTransaction.gatewayReference,
        channel: tx.paymentTransaction.channel,
        paidAt: tx.paymentTransaction.paidAt,
      };
    }

    return {
      receiptNumber: tx.reference,
      transactionId: tx.id,
      status: tx.status,
      type: tx.type,
      currency: tx.currency,
      faceValueKobo: tx.amountKobo.toString(),
      faceValueFormatted: this._formatNaira(tx.amountKobo),
      feeKobo: tx.feeKobo.toString(),
      feeFormatted: this._formatNaira(tx.feeKobo),
      discountKobo: tx.discountKobo.toString(),
      discountFormatted: this._formatNaira(tx.discountKobo),
      totalPaidKobo: tx.netAmountKobo.toString(),
      totalPaidFormatted: this._formatNaira(tx.netAmountKobo),
      createdAt: tx.createdAt,
      paidAt: tx.paymentTransaction?.paidAt || tx.updatedAt,
      providerName: tx.providerName,
      providerReference: tx.providerReference,
      customer: {
        fullName: tx.user?.profile?.fullName || 'SaniPay Customer',
        email: tx.user?.email,
        phone: tx.user?.phone,
      },
      serviceDetails,
      items: (tx.transactionItems || []).map((item: any) => ({
        id: item.id,
        name: item.itemName,
        type: item.itemType,
        quantity: item.quantity,
        unitPriceFormatted: this._formatNaira(item.unitPriceKobo),
        totalFormatted: this._formatNaira(item.totalKobo),
      })),
      verificationSeal: `SANIPAY-CERT-${tx.reference.slice(-8)}-${tx.id.slice(0, 4).toUpperCase()}`,
    };
  }
}
