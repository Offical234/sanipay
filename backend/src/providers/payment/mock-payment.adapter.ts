import { Injectable, Logger } from '@nestjs/common';
import {
  IPaymentGateway,
  PaymentInitRequest,
  PaymentInitResponse,
  PaymentVerificationResult,
  WebhookVerificationResult,
} from './payment.interface';

@Injectable()
export class MockPaymentAdapter implements IPaymentGateway {
  private readonly logger = new Logger(MockPaymentAdapter.name);
  readonly providerName = 'MOCK';

  async initializePayment(request: PaymentInitRequest): Promise<PaymentInitResponse> {
    this.logger.log(
      `[MOCK] Initializing payment for ref: ${request.reference}, amount: ₦${Number(request.amountKobo) / 100}`,
    );

    const accessCode = `MOCK_ACCESS_${Date.now()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const checkoutUrl = `https://checkout.sanipay.ng/mock?reference=${request.reference}&amount=${request.amountKobo.toString()}&accessCode=${accessCode}`;

    return {
      reference: request.reference,
      checkoutUrl,
      accessCode,
    };
  }

  async verifyPayment(reference: string): Promise<PaymentVerificationResult> {
    this.logger.log(`[MOCK] Verifying payment for reference: ${reference}`);

    if (reference.includes('FAIL')) {
      return {
        success: false,
        reference,
        gatewayReference: `MOCK_GW_FAIL_${Date.now()}`,
        amountKobo: 0n,
        status: 'FAILED',
        channel: 'mock_card',
        message: 'Payment was declined by the cardholder bank.',
        rawPayload: { reference, status: 'failed' },
      };
    }

    return {
      success: true,
      reference,
      gatewayReference: `MOCK_GW_${Date.now()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      amountKobo: 500000n, // Default mock ₦5,000.00 unless parsed
      status: 'SUCCESS',
      channel: 'mock_card',
      paidAt: new Date(),
      gatewayFeeKobo: 7500n, // ₦75.00 mock processing fee
      message: 'Payment verified successfully via Mock Gateway',
      rawPayload: { reference, status: 'success', gateway: 'MOCK' },
    };
  }

  verifyWebhookSignature(signature: string, _rawBody: string | Buffer): boolean {
    if (!signature || signature === 'invalid_signature') {
      return false;
    }
    // In dev / test sandbox, allow signatures starting with 'mock' or 'test' or 'valid'
    return (
      signature === 'mock-valid-signature' ||
      signature.startsWith('mock_') ||
      signature.startsWith('test_') ||
      process.env.NODE_ENV !== 'production'
    );
  }

  parseWebhookEvent(body: any): WebhookVerificationResult {
    this.logger.log(`[MOCK] Parsing webhook event: ${body?.event || 'charge.success'}`);

    const data = body?.data ?? body ?? {};
    const reference = data.reference || `SP_MOCK_${Date.now()}`;
    const amountKobo = data.amountKobo
      ? BigInt(data.amountKobo)
      : data.amount
        ? BigInt(data.amount)
        : 500000n;

    const isSuccess = data.status !== 'failed' && data.status !== 'error';

    return {
      isValid: true,
      event: body?.event || 'charge.success',
      reference,
      gatewayReference: data.gatewayReference || `MOCK_GW_${Date.now()}`,
      amountKobo,
      status: isSuccess ? 'SUCCESS' : 'FAILED',
      channel: data.channel || 'mock_transfer',
      paidAt: data.paidAt ? new Date(data.paidAt) : new Date(),
      rawPayload: body,
    };
  }
}
