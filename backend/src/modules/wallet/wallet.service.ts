import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuthService } from '../auth/auth.service';
import {
  FundWalletDto,
  TransferFundsDto,
  WalletHistoryQueryDto,
} from './dto/wallet.dto';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  // ──────────────────────────── GET WALLET BALANCE ─────────────────────────

  async getWallet(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            role: true,
            profile: { select: { fullName: true } },
          },
        },
      },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found for this account.');
    }

    const balanceKobo = wallet.balanceKobo;
    const balanceNaira = (Number(balanceKobo) / 100).toLocaleString('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    return {
      walletId: wallet.id,
      currency: wallet.currency,
      balanceKobo: balanceKobo.toString(),
      balanceFormatted: `₦${balanceNaira}`,
      ledgerBalanceKobo: wallet.ledgerBalanceKobo.toString(),
      isLocked: wallet.isLocked,
      lockReason: wallet.lockReason,
      owner: {
        fullName: wallet.user.profile?.fullName ?? '',
        phone: wallet.user.phone,
        email: wallet.user.email,
      },
    };
  }

  // ──────────────────────────── CREDIT WALLET ──────────────────────────────

  async creditWallet(
    tx: any,
    params: {
      userId: string;
      amountKobo: bigint;
      transactionId: string;
      description: string;
    },
  ) {
    const { userId, amountKobo, transactionId, description } = params;

    const wallet = await tx.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      throw new NotFoundException(`Wallet not found for user ${userId}`);
    }

    const balanceBeforeKobo = wallet.balanceKobo;
    const balanceAfterKobo = balanceBeforeKobo + amountKobo;

    // Atomic wallet balance update
    await tx.wallet.update({
      where: { id: wallet.id },
      data: {
        balanceKobo: balanceAfterKobo,
        ledgerBalanceKobo: balanceAfterKobo,
        version: { increment: 1 },
      },
    });

    // Create immutable audit ledger record
    const ledgerEntry = await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        transactionId,
        type: 'CREDIT',
        amountKobo,
        balanceBeforeKobo,
        balanceAfterKobo,
        description,
      },
    });

    return { balanceBeforeKobo, balanceAfterKobo, ledgerEntry };
  }

  // ──────────────────────────── DEBIT WALLET ───────────────────────────────

  async debitWallet(
    tx: any,
    params: {
      userId: string;
      amountKobo: bigint;
      transactionId: string;
      description: string;
    },
  ) {
    const { userId, amountKobo, transactionId, description } = params;

    const wallet = await tx.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      throw new NotFoundException(`Wallet not found for user ${userId}`);
    }

    if (wallet.isLocked) {
      throw new ForbiddenException(
        `Wallet is locked: ${wallet.lockReason || 'Please contact customer support.'}`,
      );
    }

    if (wallet.balanceKobo < amountKobo) {
      const currentNaira = (Number(wallet.balanceKobo) / 100).toFixed(2);
      const requiredNaira = (Number(amountKobo) / 100).toFixed(2);
      throw new BadRequestException(
        `Insufficient wallet balance. Available: ₦${currentNaira}, Required: ₦${requiredNaira}. Please fund your wallet.`,
      );
    }

    const balanceBeforeKobo = wallet.balanceKobo;
    const balanceAfterKobo = balanceBeforeKobo - amountKobo;

    // Atomic wallet balance update
    await tx.wallet.update({
      where: { id: wallet.id },
      data: {
        balanceKobo: balanceAfterKobo,
        ledgerBalanceKobo: balanceAfterKobo,
        version: { increment: 1 },
      },
    });

    // Create immutable audit ledger record
    const ledgerEntry = await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        transactionId,
        type: 'DEBIT',
        amountKobo,
        balanceBeforeKobo,
        balanceAfterKobo,
        description,
      },
    });

    return { balanceBeforeKobo, balanceAfterKobo, ledgerEntry };
  }

  // ────────────────────────── INITIALIZE FUNDING ───────────────────────────

  async initializeFunding(userId: string, dto: FundWalletDto) {
    const { amountKobo, gateway, idempotencyKey } = dto;

    // Idempotency check: prevent duplicate initialization
    if (idempotencyKey) {
      const existing = await this.prisma.transaction.findUnique({
        where: { idempotencyKey },
      });
      if (existing) {
        return {
          message: 'Existing funding transaction retrieved',
          reference: existing.reference,
          amountKobo: existing.amountKobo.toString(),
          status: existing.status,
          gateway: existing.providerName,
        };
      }
    }

    const reference = `SP_FUND_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const amountBigInt = BigInt(amountKobo);

    const transaction = await this.prisma.transaction.create({
      data: {
        userId,
        reference,
        idempotencyKey: idempotencyKey || reference,
        type: 'WALLET_FUNDING',
        status: 'PENDING',
        amountKobo: amountBigInt,
        netAmountKobo: amountBigInt,
        currency: 'NGN',
        providerName: gateway,
        metadata: {
          gateway,
          channel: 'CHECKOUT',
        },
      },
    });

    // In a production environment with active Paystack keys, this calls Paystack API.
    // For sandbox / mock mode, return standard checkout authorization envelope.
    const checkoutUrl =
      gateway === 'MOCK'
        ? `https://checkout.sanipay.ng/mock?reference=${reference}&amount=${amountKobo}`
        : `https://checkout.paystack.com/access_${reference.toLowerCase()}`;

    return {
      message: 'Funding checkout initialized successfully',
      reference: transaction.reference,
      amountKobo: transaction.amountKobo.toString(),
      authorizationUrl: checkoutUrl,
      gateway,
      currency: 'NGN',
    };
  }

  // ──────────────────────────── TRANSFER FUNDS (P2P) ───────────────────────

  async transferFunds(senderId: string, dto: TransferFundsDto) {
    const { recipientIdentifier, amountKobo, pin, narration, idempotencyKey } = dto;

    // 1. Check idempotency
    const existing = await this.prisma.transaction.findUnique({
      where: { idempotencyKey },
    });
    if (existing) {
      throw new ConflictException(
        'A transfer with this idempotency key has already been executed.',
      );
    }

    // 2. Validate transaction PIN
    await this.authService.verifyTransactionPin(senderId, pin);

    // 3. Find recipient
    const recipient = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: recipientIdentifier.toLowerCase() },
          { phone: recipientIdentifier },
        ],
      },
      include: { profile: true },
    });

    if (!recipient) {
      throw new NotFoundException(
        'Recipient account not found. Please verify the recipient phone number or email.',
      );
    }

    if (recipient.id === senderId) {
      throw new BadRequestException('You cannot transfer funds to your own wallet.');
    }

    // 4. Find sender details
    const sender = await this.prisma.user.findUnique({
      where: { id: senderId },
      include: { profile: true },
    });

    if (!sender) {
      throw new NotFoundException('Sender account not found.');
    }

    const amountBigInt = BigInt(amountKobo);
    const reference = `SP_TRF_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    // 5. Execute double-entry ledger transfer atomically
    const result = await this.prisma.$transaction(async (tx) => {
      // Create master transaction record
      const masterTx = await tx.transaction.create({
        data: {
          userId: senderId,
          reference,
          idempotencyKey,
          type: 'WALLET_TRANSFER',
          status: 'SUCCESS',
          amountKobo: amountBigInt,
          netAmountKobo: amountBigInt,
          currency: 'NGN',
          metadata: {
            senderId,
            recipientId: recipient.id,
            recipientName: recipient.profile?.fullName ?? recipient.phone,
            narration: narration || 'P2P Transfer',
          },
        },
      });

      // Debit sender wallet
      const debitResult = await this.debitWallet(tx, {
        userId: senderId,
        amountKobo: amountBigInt,
        transactionId: masterTx.id,
        description: `Transfer to ${recipient.profile?.fullName ?? recipient.phone}: ${narration || 'P2P Transfer'}`,
      });

      // Credit recipient wallet
      const creditResult = await this.creditWallet(tx, {
        userId: recipient.id,
        amountKobo: amountBigInt,
        transactionId: masterTx.id,
        description: `Transfer from ${sender.profile?.fullName ?? sender.phone}: ${narration || 'P2P Transfer'}`,
      });

      return {
        masterTx,
        debitResult,
        creditResult,
      };
    });

    const amountNaira = (Number(amountBigInt) / 100).toLocaleString('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    this.logger.log(
      `P2P Transfer executed: ${sender.phone} -> ${recipient.phone} [₦${amountNaira}, Ref: ${reference}]`,
    );

    return {
      message: `₦${amountNaira} transferred successfully to ${recipient.profile?.fullName ?? recipient.phone}.`,
      reference,
      amountKobo: amountBigInt.toString(),
      amountFormatted: `₦${amountNaira}`,
      recipient: {
        id: recipient.id,
        fullName: recipient.profile?.fullName ?? '',
        phone: recipient.phone,
      },
      balanceAfterKobo: result.debitResult.balanceAfterKobo.toString(),
    };
  }

  // ──────────────────────────── WALLET HISTORY ─────────────────────────────

  async getTransactions(userId: string, query: WalletHistoryQueryDto) {
    const { page = 1, limit = 20, type } = query;
    const skip = (page - 1) * limit;

    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found.');
    }

    const where: any = { walletId: wallet.id };
    if (type) {
      where.type = type;
    }

    const [total, records] = await Promise.all([
      this.prisma.walletTransaction.count({ where }),
      this.prisma.walletTransaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          transaction: {
            select: {
              reference: true,
              type: true,
              status: true,
            },
          },
        },
      }),
    ]);

    const formattedRecords = records.map((rec) => ({
      id: rec.id,
      reference: rec.transaction.reference,
      transactionType: rec.transaction.type,
      type: rec.type,
      amountKobo: rec.amountKobo.toString(),
      amountFormatted: `${rec.type === 'CREDIT' ? '+' : '-'}₦${(Number(rec.amountKobo) / 100).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      balanceBeforeKobo: rec.balanceBeforeKobo.toString(),
      balanceAfterKobo: rec.balanceAfterKobo.toString(),
      description: rec.description,
      createdAt: rec.createdAt,
    }));

    return {
      message: 'Wallet transaction history retrieved successfully',
      data: formattedRecords,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
