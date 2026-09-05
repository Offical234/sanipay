// ─────────────────────────────────────────────────────────────────────────────
// VTU Provider Abstraction Interface
// All external VTU/billing providers must implement this contract.
// Core business logic NEVER references vendor-specific code directly.
// ─────────────────────────────────────────────────────────────────────────────

// ──────────────────── REQUEST TYPES ──────────────────────────────────────────

export interface AirtimeRequest {
  networkCode: string; // MTN | AIRTEL | GLO | NINE_MOBILE
  recipientPhone: string;
  amountKobo: bigint;
  reference: string;
}

export interface DataRequest {
  networkCode: string;
  planCode: string;
  recipientPhone: string;
  amountKobo: bigint;
  reference: string;
}

export interface MeterVerifyRequest {
  providerCode: string; // e.g. IKEDC, EKEDC
  meterNumber: string;
  meterType: 'PREPAID' | 'POSTPAID';
}

export interface ElectricityRequest {
  providerCode: string;
  meterNumber: string;
  meterType: 'PREPAID' | 'POSTPAID';
  amountKobo: bigint;
  customerPhone: string;
  reference: string;
}

export interface SmartcardVerifyRequest {
  providerCode: string; // DSTV | GOTV | STARTIMES | SHOWMAX
  smartcardNumber: string;
}

export interface CableRequest {
  providerCode: string;
  smartcardNumber: string;
  packageCode: string;
  packageName: string;
  amountKobo: bigint;
  renewalMonths: number;
  reference: string;
}

// ──────────────────── RESULT TYPES ───────────────────────────────────────────

export interface ProviderTransactionResult {
  success: boolean;
  providerReference: string;
  providerStatus: string;
  message: string;
}

export interface MeterDetails {
  customerName: string;
  customerAddress: string;
  meterNumber: string;
  meterType: string;
  tariffClass?: string;
  minimumAmountKobo?: bigint;
}

export interface ElectricityPaymentResult {
  success: boolean;
  providerReference: string;
  token: string | null;
  units: string | null;
  receiptNumber: string | null;
  message: string;
}

export interface SmartcardDetails {
  customerName: string;
  smartcardNumber: string;
  currentBouquet: string;
  dueDate: string;
  status: string;
}

export interface CablePaymentResult {
  success: boolean;
  providerReference: string;
  renewalDate: string;
  message: string;
}

// ──────────────────── CONTRACT ────────────────────────────────────────────────

export interface IVTUProvider {
  purchaseAirtime(request: AirtimeRequest): Promise<ProviderTransactionResult>;
  purchaseData(request: DataRequest): Promise<ProviderTransactionResult>;
  verifyMeter(request: MeterVerifyRequest): Promise<MeterDetails>;
  payElectricity(request: ElectricityRequest): Promise<ElectricityPaymentResult>;
  verifySmartcard(request: SmartcardVerifyRequest): Promise<SmartcardDetails>;
  payCableTV(request: CableRequest): Promise<CablePaymentResult>;
}
