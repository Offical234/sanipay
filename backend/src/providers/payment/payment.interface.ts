// ─────────────────────────────────────────────────────────────────────────────
// Payment Gateway Abstraction Interface
// Decouples payment processors (Paystack, Flutterwave, Monnify, Mock)
// from the core wallet, accounting, and transaction coordinator.
// ─────────────────────────────────────────────────────────────────────────────

export interface PaymentInitRequest {
  reference: string;
  amountKobo: bigint;
  email: string;
  customerName?: string;
  callbackUrl?: string;
  metadata?: Record<string, any>;
}

export interface PaymentInitResponse {
  reference: string;
  checkoutUrl: string;
  accessCode?: string;
}

export interface PaymentVerificationResult {
  success: boolean;
  reference: string;
  gatewayReference: string;
  amountKobo: bigint;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  channel: string;
  paidAt?: Date;
  gatewayFeeKobo?: bigint;
  message: string;
  rawPayload: Record<string, any>;
}

export interface WebhookVerificationResult {
  isValid: boolean;
  event?: string;
  reference?: string;
  gatewayReference?: string;
  amountKobo?: bigint;
  status?: 'SUCCESS' | 'FAILED' | 'PENDING';
  channel?: string;
  paidAt?: Date;
  rawPayload?: Record<string, any>;
}

export interface IPaymentGateway {
  readonly providerName: string;
  initializePayment(request: PaymentInitRequest): Promise<PaymentInitResponse>;
  verifyPayment(reference: string): Promise<PaymentVerificationResult>;
  verifyWebhookSignature(signature: string, rawBody: string | Buffer): boolean;
  parseWebhookEvent(body: any): WebhookVerificationResult;
}
