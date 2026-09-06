import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PaymentGateway, TransactionStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { PaystackAdapter } from '../../providers/payment/paystack.adapter';
import { FlutterwaveAdapter } from '../../providers/payment/flutterwave.adapter';
import { MockPaymentAdapter } from '../../providers/payment/mock-payment.adapter';
import { MockWebhookTriggerDto } from './dto/payment.dto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
    private readonly paystackAdapter: PaystackAdapter,
    private readonly flutterwaveAdapter: FlutterwaveAdapter,
    private readonly mockPaymentAdapter: MockPaymentAdapter,
  ) {}

  // ──────────────────────────── PAYSTACK WEBHOOK ───────────────────────────

  async handlePaystackWebhook(signature: string, rawBody: string | Buffer, body: any) {
    this.logger.log('Incoming Paystack webhook received');

    // 1. Cryptographic HMAC-SHA512 Verification
    const isValid = this.paystackAdapter.verifyWebhookSignature(signature, rawBody);
    if (!isValid) {
      this.logger.warn('Paystack webhook rejected: Invalid HMAC signature');
      throw new UnauthorizedException('Invalid Paystack webhook signature');
    }

    // 2. Parse Event Payload
    const parsed = this.paystackAdapter.parseWebhookEvent(body);
    if (parsed.event !== 'charge.success') {
      this.logger.log(`Ignoring non-charge event: ${parsed.event}`);
      return { status: 'ignored', message: `Event ${parsed.event} does not require fulfillment` };
    }

    if (!parsed.reference) {
      throw new BadRequestException('Webhook payload missing transaction reference');
    }

    // 3. Fulfill Payment & Credit Wallet
    await this._fulfillPayment({
      reference: parsed.reference,
      gatewayReference: parsed.gatewayReference || `PSTK_${Date.now()}`,
      gateway: PaymentGateway.PAYSTACK,
      channel: parsed.channel || 'card',
      amountKobo: parsed.amountKobo,
      paidAt: parsed.paidAt || new Date(),
      rawPayload: body,
    });

    return {
      success: true,
      message: 'Paystack payment fulfilled successfully',
      reference: parsed.reference,
    };
  }

  // ────────────────────────── FLUTTERWAVE WEBHOOK ──────────────────────────

  async handleFlutterwaveWebhook(signature: string, rawBody: string | Buffer, body: any) {
    this.logger.log('Incoming Flutterwave webhook received');

    // 1. Verify Secret Hash
    const isValid = this.flutterwaveAdapter.verifyWebhookSignature(signature, rawBody);
    if (!isValid) {
      this.logger.warn('Flutterwave webhook rejected: Invalid verification hash');
      throw new UnauthorizedException('Invalid Flutterwave secret hash');
    }

    // 2. Parse Event
    const parsed = this.flutterwaveAdapter.parseWebhookEvent(body);
    if (parsed.status !== 'SUCCESS') {
      this.logger.log(`Ignoring non-successful Flutterwave event: ${parsed.event}`);
      return { status: 'ignored', message: 'Transaction was not successful' };
    }

    if (!parsed.reference) {
      throw new BadRequestException('Webhook payload missing transaction reference');
    }

    // 3. Fulfill Payment & Credit Wallet
    await this._fulfillPayment({
      reference: parsed.reference,
      gatewayReference: parsed.gatewayReference || `FLW_${Date.now()}`,
      gateway: PaymentGateway.FLUTTERWAVE,
      channel: parsed.channel || 'card',
      amountKobo: parsed.amountKobo,
      paidAt: parsed.paidAt || new Date(),
      rawPayload: body,
    });

    return {
      success: true,
      message: 'Flutterwave payment fulfilled successfully',
      reference: parsed.reference,
    };
  }

  // ──────────────────────────── MOCK WEBHOOK ───────────────────────────────

  async handleMockWebhook(dto: MockWebhookTriggerDto) {
    this.logger.log(`[MOCK] Webhook trigger for reference: ${dto.reference}`);

    const transaction = await this.prisma.transaction.findUnique({
      where: { reference: dto.reference },
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction with reference '${dto.reference}' not found`);
    }

    const amountKobo = dto.amountKobo ? BigInt(dto.amountKobo) : transaction.amountKobo;

    await this._fulfillPayment({
      reference: dto.reference,
      gatewayReference: `MOCK_GW_${Date.now()}`,
      gateway: PaymentGateway.MOCK,
      channel: dto.channel || 'mock_sandbox',
      amountKobo,
      paidAt: new Date(),
      rawPayload: { trigger: 'mock_sandbox_endpoint', ...dto },
    });

    return {
      success: true,
      status: 'SUCCESS',
      message: 'Mock payment fulfilled successfully',
      reference: dto.reference,
    };
  }

  // ──────────────────────────── VERIFY PAYMENT ─────────────────────────────

  async verifyPayment(reference: string) {
    this.logger.log(`Manual verification requested for reference: ${reference}`);

    const transaction = await this.prisma.transaction.findUnique({
      where: { reference },
      include: {
        paymentTransaction: true,
        user: { select: { id: true, email: true, phone: true } },
      },
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction with reference '${reference}' not found`);
    }

    // If already verified and successful, return receipt directly
    if (transaction.status === TransactionStatus.SUCCESS) {
      return this._formatReceipt(transaction);
    }

    // If still pending, query the payment processor
    let gatewayResult;
    const gateway = transaction.providerName?.toUpperCase() || 'MOCK';

    if (gateway === 'PAYSTACK') {
      gatewayResult = await this.paystackAdapter.verifyPayment(reference);
    } else if (gateway === 'FLUTTERWAVE') {
      gatewayResult = await this.flutterwaveAdapter.verifyPayment(reference);
    } else {
      gatewayResult = await this.mockPaymentAdapter.verifyPayment(reference);
    }

    if (gatewayResult.status === 'SUCCESS') {
      const updatedTx = await this._fulfillPayment({
        reference,
        gatewayReference: gatewayResult.gatewayReference,
        gateway: (gateway as PaymentGateway) || PaymentGateway.MOCK,
        channel: gatewayResult.channel,
        amountKobo: gatewayResult.amountKobo || transaction.amountKobo,
        paidAt: gatewayResult.paidAt || new Date(),
        rawPayload: gatewayResult.rawPayload,
      });

      return this._formatReceipt(updatedTx);
    }

    return {
      success: false,
      status: transaction.status,
      reference: transaction.reference,
      message: gatewayResult.message || 'Payment has not been confirmed yet by the provider.',
    };
  }

  // ──────────────────────────── INTERNAL FULFILLMENT ───────────────────────

  private async _fulfillPayment(params: {
    reference: string;
    gatewayReference: string;
    gateway: PaymentGateway;
    channel: string;
    amountKobo?: bigint;
    paidAt: Date;
    rawPayload: Record<string, any>;
  }) {
    const { reference, gatewayReference, gateway, channel, paidAt, rawPayload } = params;

    const transaction = await this.prisma.transaction.findUnique({
      where: { reference },
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction with reference '${reference}' not found`);
    }

    // Idempotency: skip if already SUCCESS
    if (transaction.status === TransactionStatus.SUCCESS) {
      this.logger.log(`Idempotent ignore: Transaction ${reference} is already SUCCESS.`);
      return transaction;
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Mark Transaction as SUCCESS
      const updatedTx = await tx.transaction.update({
        where: { id: transaction.id },
        data: {
          status: TransactionStatus.SUCCESS,
          providerReference: gatewayReference,
          providerName: gateway,
        },
      });

      // 2. Create or Update PaymentTransaction sub-record
      await tx.paymentTransaction.upsert({
        where: { transactionId: transaction.id },
        update: {
          status: TransactionStatus.SUCCESS,
          gatewayReference,
          channel,
          paidAt,
          rawWebhookPayload: rawPayload,
        },
        create: {
          transactionId: transaction.id,
          userId: transaction.userId,
          gateway,
          gatewayReference: gatewayReference || `GW_${reference}`,
          amountKobo: transaction.amountKobo,
          channel,
          status: TransactionStatus.SUCCESS,
          paidAt,
          rawWebhookPayload: rawPayload,
        },
      });

      // 3. Atomically Credit Wallet & Record Ledger Entry
      await this.walletService.creditWallet(tx, {
        userId: transaction.userId,
        amountKobo: transaction.netAmountKobo,
        transactionId: transaction.id,
        description: `Wallet funded via ${gateway} (Ref: ${reference})`,
      });

      // 4. Qualify Referral if this is first qualified funding (>= ₦1,000)
      if (transaction.amountKobo >= 100000n) {
        const referral = await tx.referral.findUnique({
          where: { referredUserId: transaction.userId },
        });

        if (referral && referral.status === 'PENDING_QUALIFICATION') {
          await tx.referral.update({
            where: { id: referral.id },
            data: { status: 'QUALIFIED' },
          });
          await tx.referralReward.create({
            data: {
              referralId: referral.id,
              userId: referral.referrerId,
              amountKobo: 20000n,
              isPaid: false,
            },
          });
          this.logger.log(
            `Referral qualified for referred user ${transaction.userId} (Referrer: ${referral.referrerId}) - reward generated`,
          );
        }
      }

      return updatedTx;
    });
  }

  private _formatReceipt(transaction: any) {
    const amountNaira = (Number(transaction.amountKobo) / 100).toLocaleString('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    return {
      success: true,
      status: transaction.status,
      reference: transaction.reference,
      providerReference: transaction.providerReference,
      gateway: transaction.providerName,
      amountKobo: transaction.amountKobo.toString(),
      amountFormatted: `₦${amountNaira}`,
      type: transaction.type,
      currency: transaction.currency,
      paidAt: transaction.updatedAt,
      message: 'Payment confirmed and wallet credited successfully',
    };
  }
}
