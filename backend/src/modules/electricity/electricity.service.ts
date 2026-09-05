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
import { IVTUProvider, MeterDetails } from '../../providers/vtu/vtu.interface';
import { VerifyMeterDto, PayElectricityDto } from './dto/electricity.dto';

interface CachedMeterValidation {
  details: MeterDetails;
  providerCode: string;
  meterNumber: string;
  meterType: string;
  expiresAt: number;
}

@Injectable()
export class ElectricityService {
  private readonly logger = new Logger(ElectricityService.name);

  // 10-minute in-memory cache for validated meters
  private readonly meterCache = new Map<string, CachedMeterValidation>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly walletService: WalletService,
    @Inject(VTU_PROVIDER) private readonly vtuProvider: IVTUProvider,
  ) {}

  // ──────────────────────────── GET PROVIDERS ──────────────────────────────

  async getProviders() {
    const providers = await this.prisma.electricityProvider.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    return {
      message: 'Active electricity providers retrieved successfully',
      data: providers.map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        convenienceFeeKobo: p.convenienceFeeKobo.toString(),
        convenienceFeeFormatted: `₦${(Number(p.convenienceFeeKobo) / 100).toFixed(2)}`,
      })),
    };
  }

  // ──────────────────────────── VERIFY METER ───────────────────────────────

  async verifyMeter(dto: VerifyMeterDto) {
    const provider = await this.prisma.electricityProvider.findUnique({
      where: { code: dto.providerCode },
    });

    if (!provider || !provider.isActive) {
      throw new BadRequestException(
        `Electricity distribution company '${dto.providerCode}' is not supported or inactive.`,
      );
    }

    try {
      const details = await this.vtuProvider.verifyMeter({
        providerCode: dto.providerCode,
        meterNumber: dto.meterNumber,
        meterType: dto.meterType,
      });

      // Cache validation for 10 minutes (600,000 ms)
      const cacheKey = this._buildCacheKey(dto.providerCode, dto.meterNumber, dto.meterType);
      this.meterCache.set(cacheKey, {
        details,
        providerCode: dto.providerCode,
        meterNumber: dto.meterNumber,
        meterType: dto.meterType,
        expiresAt: Date.now() + 10 * 60 * 1000,
      });

      return {
        success: true,
        message: 'Meter details verified successfully',
        data: {
          customerName: details.customerName,
          customerAddress: details.customerAddress,
          meterNumber: details.meterNumber,
          meterType: details.meterType,
          tariffClass: details.tariffClass,
          discoName: provider.name,
          convenienceFeeKobo: provider.convenienceFeeKobo.toString(),
          convenienceFeeFormatted: `₦${(Number(provider.convenienceFeeKobo) / 100).toFixed(2)}`,
        },
      };
    } catch (err) {
      this.logger.warn(`Meter verification failed for ${dto.meterNumber}: ${err.message}`);
      throw new BadRequestException(
        err.message || 'Unable to verify meter number with the distribution company.',
      );
    }
  }

  // ──────────────────────────── PAY ELECTRICITY ────────────────────────────

  async payElectricity(userId: string, dto: PayElectricityDto) {
    // 1. Mandatory 10-minute Meter Verification Check
    const cacheKey = this._buildCacheKey(dto.providerCode, dto.meterNumber, dto.meterType);
    const cached = this.meterCache.get(cacheKey);

    if (!cached || cached.expiresAt < Date.now()) {
      throw new BadRequestException(
        'Meter has not been validated or the verification session has expired. Please verify meter details before proceeding to payment.',
      );
    }

    // 2. Verify Transaction PIN
    await this.authService.verifyTransactionPin(userId, dto.pin);

    // 3. Fetch DisCo Provider
    const provider = await this.prisma.electricityProvider.findUnique({
      where: { code: dto.providerCode },
    });

    if (!provider || !provider.isActive) {
      throw new BadRequestException(
        `Electricity provider '${dto.providerCode}' is inactive or unavailable.`,
      );
    }

    // 4. Idempotency Check
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
    const feeKobo = provider.convenienceFeeKobo;
    const netAmountKobo = amountKobo + feeKobo;
    const reference = `SP_ELE_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const idempotencyKey = dto.idempotencyKey || reference;

    // 5. Atomically debit wallet and record pending transaction
    const transaction = await this.prisma.$transaction(async (tx) => {
      const createdTx = await tx.transaction.create({
        data: {
          userId,
          reference,
          idempotencyKey,
          type: 'ELECTRICITY',
          status: 'PROCESSING',
          amountKobo,
          feeKobo,
          discountKobo: 0n,
          netAmountKobo,
          providerName: 'MOCK',
          metadata: {
            providerCode: provider.code,
            meterNumber: dto.meterNumber,
            meterType: dto.meterType,
            customerName: cached.details.customerName,
            customerPhone: dto.customerPhone,
          },
        },
      });

      await tx.electricityTransaction.create({
        data: {
          transactionId: createdTx.id,
          providerId: provider.id,
          meterNumber: dto.meterNumber,
          meterType: dto.meterType,
          customerName: cached.details.customerName,
          customerAddress: cached.details.customerAddress,
          amountKobo,
        },
      });

      await tx.transactionItem.create({
        data: {
          transactionId: createdTx.id,
          itemName: `${provider.name} - ${dto.meterType} (Meter: ${dto.meterNumber})`,
          itemType: 'ELECTRICITY',
          unitPriceKobo: amountKobo,
          quantity: 1,
          totalKobo: amountKobo,
        },
      });

      await this.walletService.debitWallet(tx, {
        userId,
        amountKobo: netAmountKobo,
        transactionId: createdTx.id,
        description: `Electricity bill: ${provider.name} (Meter: ${dto.meterNumber})`,
      });

      return createdTx;
    });

    // 6. Call Provider Abstraction
    try {
      const providerRes = await this.vtuProvider.payElectricity({
        providerCode: dto.providerCode,
        meterNumber: dto.meterNumber,
        meterType: dto.meterType,
        amountKobo,
        customerPhone: dto.customerPhone,
        reference,
      });

      if (providerRes.success) {
        // Invalidate cached meter verification once consumed
        this.meterCache.delete(cacheKey);

        await this.prisma.$transaction(async (tx) => {
          await tx.transaction.update({
            where: { id: transaction.id },
            data: {
              status: 'SUCCESS',
              providerReference: providerRes.providerReference,
            },
          });

          await tx.electricityTransaction.update({
            where: { transactionId: transaction.id },
            data: {
              token: providerRes.token,
              units: providerRes.units,
              receiptNumber: providerRes.receiptNumber,
            },
          });
        });

        return {
          success: true,
          message: providerRes.message,
          reference: transaction.reference,
          providerReference: providerRes.providerReference,
          token: providerRes.token,
          units: providerRes.units,
          receiptNumber: providerRes.receiptNumber,
          discoName: provider.name,
          customerName: cached.details.customerName,
          meterNumber: dto.meterNumber,
          meterType: dto.meterType,
          amountPaidKobo: amountKobo.toString(),
          amountPaidFormatted: `₦${(Number(amountKobo) / 100).toFixed(2)}`,
          feeKobo: feeKobo.toString(),
          feeFormatted: `₦${(Number(feeKobo) / 100).toFixed(2)}`,
          totalDebitedKobo: netAmountKobo.toString(),
          totalDebitedFormatted: `₦${(Number(netAmountKobo) / 100).toFixed(2)}`,
          status: 'SUCCESS',
        };
      } else {
        await this._handleElectricityFailure(
          userId,
          transaction.id,
          netAmountKobo,
          dto.meterNumber,
          providerRes.message,
          providerRes.providerReference,
        );

        throw new BadRequestException(
          providerRes.message || 'Electricity bill payment failed. Your wallet has been refunded.',
        );
      }
    } catch (err) {
      if (err instanceof BadRequestException || err instanceof ConflictException) {
        throw err;
      }

      this.logger.error(`Electricity payment provider error: ${err.message}`, err.stack);
      await this._handleElectricityFailure(
        userId,
        transaction.id,
        netAmountKobo,
        dto.meterNumber,
        err.message,
        null,
      );

      throw new BadRequestException(
        'Electricity bill payment failed due to a provider timeout. Your wallet has been refunded.',
      );
    }
  }

  // ──────────────────────────── PRIVATE HELPERS ────────────────────────────

  private _buildCacheKey(providerCode: string, meterNumber: string, meterType: string): string {
    return `${providerCode.toUpperCase()}:${meterNumber.trim()}:${meterType.toUpperCase()}`;
  }

  private async _handleElectricityFailure(
    userId: string,
    transactionId: string,
    netAmountKobo: bigint,
    meterNumber: string,
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
          description: `Auto-refund for failed electricity purchase (Meter: ${meterNumber})`,
        });
      });
    } catch (refundError) {
      this.logger.error(
        `Critical: Auto-refund failed for electricity transaction ${transactionId}: ${refundError.message}`,
      );
    }
  }
}
