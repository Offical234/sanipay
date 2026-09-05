import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuthService } from '../auth/auth.service';
import { WalletService } from '../wallet/wallet.service';
import { VTU_PROVIDER } from '../../providers/vtu/vtu-provider.token';
import { IVTUProvider } from '../../providers/vtu/vtu.interface';
import { PurchaseAirtimeDto } from './dto/airtime.dto';

@Injectable()
export class AirtimeService {
  private readonly logger = new Logger(AirtimeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly walletService: WalletService,
    @Inject(VTU_PROVIDER) private readonly vtuProvider: IVTUProvider,
  ) {}

  // ──────────────────────────── GET NETWORKS ───────────────────────────────

  async getNetworks() {
    const networks = await this.prisma.network.findMany({
      where: { isActive: true, airtimeEnabled: true },
      orderBy: { name: 'asc' },
    });

    return {
      message: 'Active telecom networks retrieved successfully',
      data: networks.map((net) => ({
        id: net.id,
        code: net.code,
        name: net.name,
        discountBps: net.airtimeDiscountBps,
        discountPercent: `${(net.airtimeDiscountBps / 100).toFixed(2)}%`,
        airtimeEnabled: net.airtimeEnabled,
        dataEnabled: net.dataEnabled,
      })),
    };
  }

  // ──────────────────────────── PURCHASE AIRTIME ───────────────────────────

  async purchaseAirtime(userId: string, dto: PurchaseAirtimeDto) {
    // 1. Verify Transaction PIN
    await this.authService.verifyTransactionPin(userId, dto.pin);

    // 2. Check Network Status
    const network = await this.prisma.network.findUnique({
      where: { code: dto.networkCode },
    });

    if (!network || !network.isActive || !network.airtimeEnabled) {
      throw new BadRequestException(
        `Airtime service is currently unavailable for network ${dto.networkCode}.`,
      );
    }

    // 3. Idempotency Check
    if (dto.idempotencyKey) {
      const existing = await this.prisma.transaction.findUnique({
        where: { idempotencyKey: dto.idempotencyKey },
      });
      if (existing) {
        throw new ConflictException(
          `A transaction with idempotency key '${dto.idempotencyKey}' has already been processed.`,
        );
      }
    }

    const amountKobo = BigInt(dto.amountKobo);
    const discountKobo = (amountKobo * BigInt(network.airtimeDiscountBps)) / 10000n;
    const netAmountKobo = amountKobo - discountKobo;
    const reference = `SP_AIR_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const idempotencyKey = dto.idempotencyKey || reference;

    // 4. Atomically debit wallet and record pending transaction
    const transaction = await this.prisma.$transaction(async (tx) => {
      const createdTx = await tx.transaction.create({
        data: {
          userId,
          reference,
          idempotencyKey,
          type: 'AIRTIME',
          status: 'PROCESSING',
          amountKobo,
          feeKobo: 0n,
          discountKobo,
          netAmountKobo,
          providerName: 'MOCK',
          metadata: {
            recipientPhone: dto.recipientPhone,
            networkCode: dto.networkCode,
          },
        },
      });

      await tx.airtimeTransaction.create({
        data: {
          transactionId: createdTx.id,
          networkId: network.id,
          recipientPhone: dto.recipientPhone,
          amountKobo,
          discountKobo,
          providerStatus: 'PENDING',
        },
      });

      await tx.transactionItem.create({
        data: {
          transactionId: createdTx.id,
          itemName: `${network.name} ₦${(dto.amountKobo / 100).toFixed(2)} Airtime`,
          itemType: 'AIRTIME',
          unitPriceKobo: amountKobo,
          quantity: 1,
          totalKobo: amountKobo,
        },
      });

      await this.walletService.debitWallet(tx, {
        userId,
        amountKobo: netAmountKobo,
        transactionId: createdTx.id,
        description: `Airtime top-up: ${network.name} to ${dto.recipientPhone} (Disc: ₦${(Number(discountKobo) / 100).toFixed(2)})`,
      });

      return createdTx;
    });

    // 5. Call Provider Abstraction
    try {
      const providerRes = await this.vtuProvider.purchaseAirtime({
        networkCode: dto.networkCode,
        recipientPhone: dto.recipientPhone,
        amountKobo,
        reference,
      });

      if (providerRes.success) {
        await this.prisma.$transaction(async (tx) => {
          await tx.transaction.update({
            where: { id: transaction.id },
            data: {
              status: 'SUCCESS',
              providerReference: providerRes.providerReference,
            },
          });

          await tx.airtimeTransaction.update({
            where: { transactionId: transaction.id },
            data: { providerStatus: 'SUCCESS' },
          });
        });

        return {
          success: true,
          message: providerRes.message,
          reference: transaction.reference,
          providerReference: providerRes.providerReference,
          network: network.name,
          recipientPhone: dto.recipientPhone,
          faceValueKobo: amountKobo.toString(),
          faceValueFormatted: `₦${(Number(amountKobo) / 100).toFixed(2)}`,
          discountKobo: discountKobo.toString(),
          discountFormatted: `₦${(Number(discountKobo) / 100).toFixed(2)}`,
          amountDebitedKobo: netAmountKobo.toString(),
          amountDebitedFormatted: `₦${(Number(netAmountKobo) / 100).toFixed(2)}`,
          status: 'SUCCESS',
        };
      } else {
        // Provider returned failure -> auto-refund
        await this._handleAirtimeFailure(
          userId,
          transaction.id,
          netAmountKobo,
          dto.recipientPhone,
          providerRes.message,
          providerRes.providerReference,
        );

        throw new BadRequestException(
          providerRes.message || 'Airtime purchase failed. Your wallet has been refunded.',
        );
      }
    } catch (err) {
      if (err instanceof BadRequestException || err instanceof ConflictException) {
        throw err;
      }

      this.logger.error(`Airtime provider error: ${err.message}`, err.stack);
      await this._handleAirtimeFailure(
        userId,
        transaction.id,
        netAmountKobo,
        dto.recipientPhone,
        err.message,
        null,
      );

      throw new BadRequestException(
        'Airtime delivery failed due to a provider timeout. Your wallet has been refunded.',
      );
    }
  }

  private async _handleAirtimeFailure(
    userId: string,
    transactionId: string,
    netAmountKobo: bigint,
    recipientPhone: string,
    reason: string,
    providerRef: string | null,
  ) {
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.transaction.update({
          where: { id: transactionId },
          data: {
            status: 'REFUNDED',
            failureReason: reason,
            providerReference: providerRef,
          },
        });

        await tx.airtimeTransaction.update({
          where: { transactionId },
          data: { providerStatus: 'FAILED' },
        });

        await this.walletService.creditWallet(tx, {
          userId,
          amountKobo: netAmountKobo,
          transactionId,
          description: `Auto-refund for failed airtime to ${recipientPhone}`,
        });
      });
    } catch (refundError) {
      this.logger.error(
        `Critical: Auto-refund failed for transaction ${transactionId}: ${refundError.message}`,
      );
    }
  }
}
