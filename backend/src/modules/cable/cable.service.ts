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
import { IVTUProvider, SmartcardDetails } from '../../providers/vtu/vtu.interface';
import { VerifySmartcardDto, PayCableTVDto } from './dto/cable.dto';

interface CachedSmartcardValidation {
  details: SmartcardDetails;
  providerCode: string;
  smartcardNumber: string;
  expiresAt: number;
}

const CABLE_PACKAGES: Record<
  string,
  Array<{ code: string; name: string; priceKobo: number; priceFormatted: string }>
> = {
  DSTV: [
    { code: 'DSTV_PADI', name: 'DStv Padi', priceKobo: 250000, priceFormatted: '₦2,500.00' },
    { code: 'DSTV_YANGA', name: 'DStv Yanga', priceKobo: 350000, priceFormatted: '₦3,500.00' },
    { code: 'DSTV_CONFAM', name: 'DStv Confam', priceKobo: 620000, priceFormatted: '₦6,200.00' },
    { code: 'DSTV_COMPACT', name: 'DStv Compact', priceKobo: 1250000, priceFormatted: '₦12,500.00' },
    { code: 'DSTV_COMPACT_PLUS', name: 'DStv Compact Plus', priceKobo: 1980000, priceFormatted: '₦19,800.00' },
    { code: 'DSTV_PREMIUM', name: 'DStv Premium', priceKobo: 2950000, priceFormatted: '₦29,500.00' },
  ],
  GOTV: [
    { code: 'GOTV_SMALLIE', name: 'GOtv Smallie', priceKobo: 130000, priceFormatted: '₦1,300.00' },
    { code: 'GOTV_JINJA', name: 'GOtv Jinja', priceKobo: 270000, priceFormatted: '₦2,700.00' },
    { code: 'GOTV_JOLLI', name: 'GOtv Jolli', priceKobo: 395000, priceFormatted: '₦3,950.00' },
    { code: 'GOTV_MAX', name: 'GOtv Max', priceKobo: 570000, priceFormatted: '₦5,700.00' },
    { code: 'GOTV_SUPA', name: 'GOtv Supa', priceKobo: 760000, priceFormatted: '₦7,600.00' },
  ],
  STARTIMES: [
    { code: 'STARTIMES_NOVA', name: 'StarTimes Nova', priceKobo: 140000, priceFormatted: '₦1,400.00' },
    { code: 'STARTIMES_BASIC', name: 'StarTimes Basic', priceKobo: 260000, priceFormatted: '₦2,600.00' },
    { code: 'STARTIMES_SMART', name: 'StarTimes Smart', priceKobo: 350000, priceFormatted: '₦3,500.00' },
    { code: 'STARTIMES_CLASSIC', name: 'StarTimes Classic', priceKobo: 380000, priceFormatted: '₦3,800.00' },
    { code: 'STARTIMES_SUPER', name: 'StarTimes Super', priceKobo: 650000, priceFormatted: '₦6,500.00' },
  ],
  SHOWMAX: [
    { code: 'SHOWMAX_ENT', name: 'Showmax Entertainment', priceKobo: 290000, priceFormatted: '₦2,900.00' },
    { code: 'SHOWMAX_PL', name: 'Showmax Premier League Mobile', priceKobo: 290000, priceFormatted: '₦2,900.00' },
    { code: 'SHOWMAX_PRO', name: 'Showmax Pro', priceKobo: 630000, priceFormatted: '₦6,300.00' },
  ],
};

@Injectable()
export class CableService {
  private readonly logger = new Logger(CableService.name);

  // 10-minute cache for validated smartcards
  private readonly smartcardCache = new Map<string, CachedSmartcardValidation>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly walletService: WalletService,
    @Inject(VTU_PROVIDER) private readonly vtuProvider: IVTUProvider,
  ) {}

  // ──────────────────────────── GET PROVIDERS & PACKAGES ───────────────────

  async getProviders() {
    const providers = await this.prisma.cableProvider.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    return {
      message: 'Active cable TV providers retrieved successfully',
      data: providers.map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        convenienceFeeKobo: p.convenienceFeeKobo.toString(),
        convenienceFeeFormatted: `₦${(Number(p.convenienceFeeKobo) / 100).toFixed(2)}`,
        packages: CABLE_PACKAGES[p.code.toUpperCase()] ?? [],
      })),
    };
  }

  // ──────────────────────────── VERIFY SMARTCARD ───────────────────────────

  async verifySmartcard(dto: VerifySmartcardDto) {
    const provider = await this.prisma.cableProvider.findUnique({
      where: { code: dto.providerCode },
    });

    if (!provider || !provider.isActive) {
      throw new BadRequestException(
        `Cable TV provider '${dto.providerCode}' is not supported or inactive.`,
      );
    }

    try {
      const details = await this.vtuProvider.verifySmartcard({
        providerCode: dto.providerCode,
        smartcardNumber: dto.smartcardNumber,
      });

      // Cache validation for 10 minutes (600,000 ms)
      const cacheKey = this._buildCacheKey(dto.providerCode, dto.smartcardNumber);
      this.smartcardCache.set(cacheKey, {
        details,
        providerCode: dto.providerCode,
        smartcardNumber: dto.smartcardNumber,
        expiresAt: Date.now() + 10 * 60 * 1000,
      });

      return {
        success: true,
        message: 'Smartcard verified successfully',
        data: {
          customerName: details.customerName,
          smartcardNumber: details.smartcardNumber,
          currentBouquet: details.currentBouquet,
          dueDate: details.dueDate,
          status: details.status,
          providerName: provider.name,
          convenienceFeeKobo: provider.convenienceFeeKobo.toString(),
          convenienceFeeFormatted: `₦${(Number(provider.convenienceFeeKobo) / 100).toFixed(2)}`,
          availablePackages: CABLE_PACKAGES[provider.code.toUpperCase()] ?? [],
        },
      };
    } catch (err) {
      this.logger.warn(`Smartcard verification failed for ${dto.smartcardNumber}: ${err.message}`);
      throw new BadRequestException(
        err.message || 'Unable to verify smartcard/IUC number with the cable provider.',
      );
    }
  }

  // ──────────────────────────── PAY CABLE TV ───────────────────────────────

  async payCableTV(userId: string, dto: PayCableTVDto) {
    // 1. Mandatory 10-minute Smartcard Validation Check
    const cacheKey = this._buildCacheKey(dto.providerCode, dto.smartcardNumber);
    const cached = this.smartcardCache.get(cacheKey);

    if (!cached || cached.expiresAt < Date.now()) {
      throw new BadRequestException(
        'Smartcard/IUC has not been verified or the verification session has expired. Please verify smartcard details before payment.',
      );
    }

    // 2. Verify Transaction PIN
    await this.authService.verifyTransactionPin(userId, dto.pin);

    // 3. Fetch Provider
    const provider = await this.prisma.cableProvider.findUnique({
      where: { code: dto.providerCode },
    });

    if (!provider || !provider.isActive) {
      throw new BadRequestException(
        `Cable provider '${dto.providerCode}' is inactive or unavailable.`,
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

    const renewalMonths = dto.renewalMonths && dto.renewalMonths > 0 ? dto.renewalMonths : 1;
    const amountKobo = BigInt(dto.amountKobo);
    const feeKobo = provider.convenienceFeeKobo;
    const netAmountKobo = amountKobo + feeKobo;
    const reference = `SP_CAB_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const idempotencyKey = dto.idempotencyKey || reference;

    // 5. Atomically debit wallet and record pending transaction
    const transaction = await this.prisma.$transaction(async (tx) => {
      const createdTx = await tx.transaction.create({
        data: {
          userId,
          reference,
          idempotencyKey,
          type: 'CABLE_TV',
          status: 'PROCESSING',
          amountKobo,
          feeKobo,
          discountKobo: 0n,
          netAmountKobo,
          providerName: 'MOCK',
          metadata: {
            providerCode: provider.code,
            smartcardNumber: dto.smartcardNumber,
            packageCode: dto.packageCode,
            packageName: dto.packageName,
            renewalMonths,
            customerName: cached.details.customerName,
          },
        },
      });

      await tx.cableTransaction.create({
        data: {
          transactionId: createdTx.id,
          providerId: provider.id,
          smartcardNumber: dto.smartcardNumber,
          customerName: cached.details.customerName,
          packageCode: dto.packageCode,
          packageName: dto.packageName,
          amountKobo,
          renewalMonths,
        },
      });

      await tx.transactionItem.create({
        data: {
          transactionId: createdTx.id,
          itemName: `${provider.name} - ${dto.packageName} (${renewalMonths} mo)`,
          itemType: 'CABLE_TV',
          unitPriceKobo: amountKobo,
          quantity: 1,
          totalKobo: amountKobo,
        },
      });

      await this.walletService.debitWallet(tx, {
        userId,
        amountKobo: netAmountKobo,
        transactionId: createdTx.id,
        description: `Cable TV: ${provider.name} ${dto.packageName} (${renewalMonths} mo) [IUC: ${dto.smartcardNumber}]`,
      });

      return createdTx;
    });

    // 6. Call Provider Abstraction
    try {
      const providerRes = await this.vtuProvider.payCableTV({
        providerCode: dto.providerCode,
        smartcardNumber: dto.smartcardNumber,
        packageCode: dto.packageCode,
        packageName: dto.packageName,
        amountKobo,
        renewalMonths,
        reference,
      });

      if (providerRes.success) {
        // Clear smartcard cache on success
        this.smartcardCache.delete(cacheKey);

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
          renewalDate: providerRes.renewalDate,
          providerName: provider.name,
          customerName: cached.details.customerName,
          smartcardNumber: dto.smartcardNumber,
          packageName: dto.packageName,
          renewalMonths,
          amountPaidKobo: amountKobo.toString(),
          amountPaidFormatted: `₦${(Number(amountKobo) / 100).toFixed(2)}`,
          feeKobo: feeKobo.toString(),
          feeFormatted: `₦${(Number(feeKobo) / 100).toFixed(2)}`,
          totalDebitedKobo: netAmountKobo.toString(),
          totalDebitedFormatted: `₦${(Number(netAmountKobo) / 100).toFixed(2)}`,
          status: 'SUCCESS',
        };
      } else {
        await this._handleCableFailure(
          userId,
          transaction.id,
          netAmountKobo,
          dto.smartcardNumber,
          providerRes.message,
          providerRes.providerReference,
        );

        throw new BadRequestException(
          providerRes.message || 'Cable TV subscription renewal failed. Your wallet has been refunded.',
        );
      }
    } catch (err) {
      if (err instanceof BadRequestException || err instanceof ConflictException) {
        throw err;
      }

      this.logger.error(`Cable payment provider error: ${err.message}`, err.stack);
      await this._handleCableFailure(
        userId,
        transaction.id,
        netAmountKobo,
        dto.smartcardNumber,
        err.message,
        null,
      );

      throw new BadRequestException(
        'Cable subscription renewal failed due to a provider timeout. Your wallet has been refunded.',
      );
    }
  }

  // ──────────────────────────── PRIVATE HELPERS ────────────────────────────

  private _buildCacheKey(providerCode: string, smartcardNumber: string): string {
    return `${providerCode.toUpperCase()}:${smartcardNumber.trim()}`;
  }

  private async _handleCableFailure(
    userId: string,
    transactionId: string,
    netAmountKobo: bigint,
    smartcardNumber: string,
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
          description: `Auto-refund for failed cable subscription (IUC: ${smartcardNumber})`,
        });
      });
    } catch (refundError) {
      this.logger.error(
        `Critical: Auto-refund failed for cable transaction ${transactionId}: ${refundError.message}`,
      );
    }
  }
}
