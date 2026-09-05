import { Injectable, Logger } from '@nestjs/common';
import {
  IVTUProvider,
  AirtimeRequest,
  DataRequest,
  MeterVerifyRequest,
  ElectricityRequest,
  SmartcardVerifyRequest,
  CableRequest,
  ProviderTransactionResult,
  MeterDetails,
  ElectricityPaymentResult,
  SmartcardDetails,
  CablePaymentResult,
} from './vtu.interface';

/**
 * MockVTUAdapter — Fully deterministic provider for development & testing.
 *
 * Behaviour:
 *  - Airtime/Data: Success for all numbers EXCEPT those starting with '070FAIL'
 *  - Electricity: Always validates meter; token = 16-digit numeric string
 *  - Cable: Always validates smartcard; returns mock bouquet info
 *
 * Used when NODE_ENV !== 'production'. Swap to VTPassAdapter in production
 * by changing the provider binding in ProvidersModule — no business logic changes.
 */
@Injectable()
export class MockVTUAdapter implements IVTUProvider {
  private readonly logger = new Logger(MockVTUAdapter.name);

  // ──────────────────────────── AIRTIME ───────────────────────────────────

  async purchaseAirtime(request: AirtimeRequest): Promise<ProviderTransactionResult> {
    this.logger.log(
      `[MOCK] Airtime purchase: ${request.networkCode} → ${request.recipientPhone} ₦${Number(request.amountKobo) / 100}`,
    );

    // Simulate failure for test phone numbers starting with specific prefix
    if (request.recipientPhone.startsWith('07099999')) {
      return {
        success: false,
        providerReference: `MOCK_FAIL_${Date.now()}`,
        providerStatus: 'FAILED',
        message: 'Network operator rejected the airtime request. Please try again.',
      };
    }

    await this._simulateLatency(200);

    return {
      success: true,
      providerReference: `MOCK_AT_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      providerStatus: 'SUCCESS',
      message: `${request.networkCode} airtime of ₦${(Number(request.amountKobo) / 100).toFixed(2)} delivered to ${request.recipientPhone}.`,
    };
  }

  // ──────────────────────────── DATA ──────────────────────────────────────

  async purchaseData(request: DataRequest): Promise<ProviderTransactionResult> {
    this.logger.log(
      `[MOCK] Data purchase: ${request.networkCode} plan ${request.planCode} → ${request.recipientPhone}`,
    );

    if (request.recipientPhone.startsWith('07099999')) {
      return {
        success: false,
        providerReference: `MOCK_FAIL_${Date.now()}`,
        providerStatus: 'FAILED',
        message: 'Data plan activation failed. The recipient number may be inactive.',
      };
    }

    await this._simulateLatency(250);

    return {
      success: true,
      providerReference: `MOCK_DT_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      providerStatus: 'SUCCESS',
      message: `Data plan activated for ${request.recipientPhone}.`,
    };
  }

  // ──────────────────────────── METER VALIDATION ──────────────────────────

  async verifyMeter(request: MeterVerifyRequest): Promise<MeterDetails> {
    this.logger.log(
      `[MOCK] Meter verification: ${request.providerCode} / ${request.meterNumber} (${request.meterType})`,
    );

    // Simulate invalid meter for test number
    if (request.meterNumber === '000000000000') {
      throw new Error('Meter number not found in distribution company registry.');
    }

    await this._simulateLatency(400);

    const mockCustomers: Record<string, { name: string; address: string }> = {
      IKEDC: { name: 'Adebayo Okafor', address: '14 Ikeja GRA, Lagos' },
      EKEDC: { name: 'Chioma Nwosu', address: '7 Apapa Road, Lagos Island' },
      AEDC: { name: 'Ibrahim Musa', address: '25 Garki District, Abuja' },
      IBEDC: { name: 'Segun Adeyemi', address: '10 Bodija Estate, Ibadan' },
      PHED: { name: 'Emeka Obi', address: '3 Trans-Amadi, Port Harcourt' },
      KEDCO: { name: 'Aminu Suleiman', address: '8 Katsina Road, Kano' },
    };

    const customer = mockCustomers[request.providerCode] ?? {
      name: 'Taiwo Adeleke',
      address: `Plot ${Math.floor(Math.random() * 200) + 1}, Mock Street, Nigeria`,
    };

    return {
      customerName: customer.name,
      customerAddress: customer.address,
      meterNumber: request.meterNumber,
      meterType: request.meterType,
      tariffClass: 'R2 RESIDENTIAL',
      minimumAmountKobo: 50000n, // ₦500
    };
  }

  // ──────────────────────────── ELECTRICITY PAYMENT ───────────────────────

  async payElectricity(request: ElectricityRequest): Promise<ElectricityPaymentResult> {
    this.logger.log(
      `[MOCK] Electricity payment: ${request.providerCode} / ${request.meterNumber} ₦${Number(request.amountKobo) / 100}`,
    );

    // Simulate provider-side failure (test meter number)
    if (request.meterNumber === '111111111111') {
      return {
        success: false,
        providerReference: `MOCK_FAIL_${Date.now()}`,
        token: null,
        units: null,
        receiptNumber: null,
        message: 'Electricity payment processing failed. Your wallet has been refunded.',
      };
    }

    await this._simulateLatency(600);

    // Generate realistic 16-digit prepaid token
    const token = Array.from({ length: 4 }, () =>
      Math.floor(Math.random() * 9000 + 1000).toString(),
    ).join('-');

    const amountNaira = Number(request.amountKobo) / 100;
    const units = (amountNaira / 45.5).toFixed(2); // ≈ ₦45.50 per kWh mock rate

    return {
      success: true,
      providerReference: `MOCK_EL_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      token,
      units: `${units} kWh`,
      receiptNumber: `RCP${Date.now().toString().slice(-10)}`,
      message: `Token generated successfully. Units: ${units} kWh.`,
    };
  }

  // ──────────────────────────── SMARTCARD VALIDATION ──────────────────────

  async verifySmartcard(request: SmartcardVerifyRequest): Promise<SmartcardDetails> {
    this.logger.log(
      `[MOCK] Smartcard verification: ${request.providerCode} / ${request.smartcardNumber}`,
    );

    if (request.smartcardNumber === '0000000000') {
      throw new Error('Smartcard number not found. Please verify the IUC/decoder number.');
    }

    await this._simulateLatency(350);

    const mockBouquets: Record<string, { bouquet: string; customer: string }> = {
      DSTV: { bouquet: 'DStv Compact', customer: 'Oluwaseun Bello' },
      GOTV: { bouquet: 'GOtv Max', customer: 'Fatima Ahmed' },
      STARTIMES: { bouquet: 'StarTimes Smart', customer: 'Emmanuel Eze' },
      SHOWMAX: { bouquet: 'Showmax Standard', customer: 'Ngozi Okonkwo' },
    };

    const info = mockBouquets[request.providerCode] ?? {
      bouquet: 'Basic Package',
      customer: 'SaniPay Customer',
    };

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 15);

    return {
      customerName: info.customer,
      smartcardNumber: request.smartcardNumber,
      currentBouquet: info.bouquet,
      dueDate: dueDate.toISOString().split('T')[0],
      status: 'ACTIVE',
    };
  }

  // ──────────────────────────── CABLE TV PAYMENT ──────────────────────────

  async payCableTV(request: CableRequest): Promise<CablePaymentResult> {
    this.logger.log(
      `[MOCK] Cable payment: ${request.providerCode} / ${request.smartcardNumber} → ${request.packageCode} × ${request.renewalMonths}mo`,
    );

    if (request.smartcardNumber === '1111111111') {
      return {
        success: false,
        providerReference: `MOCK_FAIL_${Date.now()}`,
        renewalDate: '',
        message: 'Cable TV payment failed. Your wallet has been refunded.',
      };
    }

    await this._simulateLatency(400);

    const renewalDate = new Date();
    renewalDate.setMonth(renewalDate.getMonth() + request.renewalMonths);

    return {
      success: true,
      providerReference: `MOCK_CA_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      renewalDate: renewalDate.toISOString().split('T')[0],
      message: `${request.providerCode} subscription renewed for ${request.renewalMonths} month(s). Next due: ${renewalDate.toISOString().split('T')[0]}.`,
    };
  }

  // ──────────────────────────── HELPERS ───────────────────────────────────

  private _simulateLatency(ms: number): Promise<void> {
    // In test environment (jest), skip artificial latency for speed
    if (process.env.NODE_ENV === 'test') return Promise.resolve();
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
