import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { TelecomNetworkCode } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuthService } from '../auth/auth.service';
import { WalletService } from '../wallet/wallet.service';
import { VTU_PROVIDER } from '../../providers/vtu/vtu-provider.token';
import { IVTUProvider } from '../../providers/vtu/vtu.interface';
import { PurchaseDataDto } from './dto/data.dto';

@Injectable()
export class DataService {
  private readonly logger = new Logger(DataService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly walletService: WalletService,
    @Inject(VTU_PROVIDER) private readonly vtuProvider: IVTUProvider,
  ) {}

  // ──────────────────────────── GET DATA PLANS ─────────────────────────────

  async getDataPlans(networkCode?: TelecomNetworkCode) {
    const plans = await this.prisma.dataPlan.findMany({
      where: {
        isActive: true,
        ...(networkCode ? { network: { code: networkCode } } : {}),
      },
      include: {
        network: {
          select: { id: true, code: true, name: true, isActive: true },
        },
      },
      orderBy: [{ network: { name: 'asc' } }, { sellingPriceKobo: 'asc' }],
    });

    return {
      message: 'Data plans retrieved successfully',
      data: plans.map((plan) => {
        const priceNaira = (Number(plan.sellingPriceKobo) / 100).toFixed(2);
        return {
          id: plan.id,
          planCode: plan.planCode,
          name: plan.name,
          type: plan.type,
          validity: plan.validity,
          sellingPriceKobo: plan.sellingPriceKobo.toString(),
          sellingPriceFormatted: `₦${priceNaira}`,
          network: {
            id: plan.network.id,
            code: plan.network.code,
            name: plan.network.name,
          },
        };
      }),
    };
  }

  // ──────────────────────────── PURCHASE DATA ──────────────────────────────

  async purchaseData(userId: string, dto: PurchaseDataDto) {
    // 1. Verify Transaction PIN
    await this.authService.verifyTransactionPin(userId, dto.pin);

    // 2. Fetch Plan & Network
    const plan = await this.prisma.dataPlan.findUnique({
      where: { id: dto.planId },
      include: { network: true },
    });

    if (!plan || !plan.isActive) {
      throw new NotFoundException('Selected data plan is invalid or inactive.');
    }

    if (!plan.network.isActive || !plan.network.dataEnabled) {
      throw new BadRequestException(
        `Data service is temporarily suspended for ${plan.network.name}.`,
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

    const amountKobo = plan.sellingPriceKobo;
    const netAmountKobo = amountKobo;
    const reference = `SP_DAT_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const idempotencyKey = dto.idempotencyKey || reference;

    // 4. Atomically debit wallet and record pending transaction
    const transaction = await this.prisma.$transaction(async (tx) => {
      const createdTx = await tx.transaction.create({
        data: {
          userId,
          reference,
          idempotencyKey,
          type: 'DATA',
          status: 'PROCESSING',
          amountKobo,
          feeKobo: 0n,
          discountKobo: 0n,
          netAmountKobo,
          providerName: 'MOCK',
          metadata: {
            recipientPhone: dto.recipientPhone,
            networkCode: plan.network.code,
            planCode: plan.planCode,
            planName: plan.name,
          },
        },
      });

      await tx.dataTransaction.create({
        data: {
          transactionId: createdTx.id,
          networkId: plan.networkId,
          planId: plan.id,
          recipientPhone: dto.recipientPhone,
          amountKobo,
          planName: plan.name,
          dataVolume: plan.validity,
        },
      });

      await tx.transactionItem.create({
        data: {
          transactionId: createdTx.id,
          itemName: `${plan.network.name} ${plan.name} (${plan.validity})`,
          itemType: 'DATA',
          unitPriceKobo: amountKobo,
          quantity: 1,
          totalKobo: amountKobo,
        },
      });

      await this.walletService.debitWallet(tx, {
        userId,
        amountKobo: netAmountKobo,
        transactionId: createdTx.id,
        description: `Data bundle: ${plan.network.name} ${plan.name} to ${dto.recipientPhone}`,
      });

      return createdTx;
    });

    // 5. Call Provider Abstraction
    try {
      const providerRes = await this.vtuProvider.purchaseData({
        networkCode: plan.network.code,
        planCode: plan.planCode,
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
        });

        return {
          success: true,
          message: providerRes.message,
          reference: transaction.reference,
          providerReference: providerRes.providerReference,
          network: plan.network.name,
          planName: plan.name,
          validity: plan.validity,
          recipientPhone: dto.recipientPhone,
          amountDebitedKobo: netAmountKobo.toString(),
          amountDebitedFormatted: `₦${(Number(netAmountKobo) / 100).toFixed(2)}`,
          status: 'SUCCESS',
        };
      } else {
        await this._handleDataFailure(
          userId,
          transaction.id,
          netAmountKobo,
          dto.recipientPhone,
          plan.name,
          providerRes.message,
          providerRes.providerReference,
        );

        throw new BadRequestException(
          providerRes.message || 'Data purchase failed. Your wallet has been refunded.',
        );
      }
    } catch (err) {
      if (err instanceof BadRequestException || err instanceof ConflictException) {
        throw err;
      }

      this.logger.error(`Data provider error: ${err.message}`, err.stack);
      await this._handleDataFailure(
        userId,
        transaction.id,
        netAmountKobo,
        dto.recipientPhone,
        plan.name,
        err.message,
        null,
      );

      throw new BadRequestException(
        'Data plan activation failed due to a provider timeout. Your wallet has been refunded.',
      );
    }
  }

  private async _handleDataFailure(
    userId: string,
    transactionId: string,
    netAmountKobo: bigint,
    recipientPhone: string,
    planName: string,
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

        await this.walletService.creditWallet(tx, {
          userId,
          amountKobo: netAmountKobo,
          transactionId,
          description: `Auto-refund for failed ${planName} data bundle to ${recipientPhone}`,
        });
      });
    } catch (refundError) {
      this.logger.error(
        `Critical: Auto-refund failed for transaction ${transactionId}: ${refundError.message}`,
      );
    }
  }
}
