import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
 * ClubKonnectAdapter — Production adapter for the ClubKonnect VTU aggregator.
 *
 * Authentication: API key + UserID query parameters
 * Base URL: CLUBKONNEKT_BASE_URL env var (defaults to https://www.clubkonnect.com/api)
 * Docs:     https://www.clubkonnect.com/APIDocumentation
 *
 * Network codes used by ClubKonnect:
 *   MTN=01  AIRTEL=04  GLO=02  NINE_MOBILE=03
 */
@Injectable()
export class ClubKonnectAdapter implements IVTUProvider {
  private readonly logger = new Logger(ClubKonnectAdapter.name);

  constructor(private readonly configService: ConfigService) {}

  // ─────────────────────────── PRIVATE HELPERS ────────────────────────────

  private get baseUrl(): string {
    return (
      this.configService.get<string>('vtu.clubkonnektBaseUrl') ||
      process.env.CLUBKONNEKT_BASE_URL ||
      'https://www.clubkonnect.com/api'
    );
  }

  private get apiKey(): string {
    return (
      this.configService.get<string>('vtu.clubkonnektApiKey') ||
      process.env.CLUBKONNEKT_API_KEY ||
      ''
    );
  }

  private get userId(): string {
    return (
      this.configService.get<string>('vtu.clubkonnektUserId') ||
      process.env.CLUBKONNEKT_USER_ID ||
      ''
    );
  }

  /** Build standard auth query params */
  private get authParams(): Record<string, string> {
    return {
      APIKey: this.apiKey,
      UserID: this.userId,
    };
  }

  private _networkId(networkCode: string): string {
    const map: Record<string, string> = {
      MTN: '01',
      GLO: '02',
      NINE_MOBILE: '03',
      AIRTEL: '04',
    };
    return map[networkCode.toUpperCase()] ?? '01';
  }

  private _discoCode(providerCode: string): string {
    // ClubKonnect uses numeric or short codes for discos
    const map: Record<string, string> = {
      IKEDC: 'IKEJA',
      EKEDC: 'EKO',
      AEDC: 'ABUJA',
      IBEDC: 'IBADAN',
      PHED: 'PHED',
      KEDCO: 'KANO',
      JEDC: 'JOS',
      BEDC: 'BENIN',
      KAEDCO: 'KADUNA',
      EEDC: 'ENUGU',
    };
    return map[providerCode.toUpperCase()] ?? providerCode;
  }

  private async _request(
    endpoint: string,
    params: Record<string, string>,
    method: 'GET' | 'POST' = 'POST',
  ): Promise<any> {
    const allParams = { ...this.authParams, ...params };

    if (method === 'GET') {
      const qs = new URLSearchParams(allParams).toString();
      const url = `${this.baseUrl}/${endpoint}?${qs}`;
      this.logger.log(`[CLUBKONNECT] GET ${endpoint}`);
      const res = await fetch(url, { method: 'GET' });
      return res.json();
    }

    // POST: send as JSON body
    const url = `${this.baseUrl}/${endpoint}`;
    this.logger.log(`[CLUBKONNECT] POST ${endpoint}`);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(allParams),
    });
    return res.json();
  }

  /** ClubKonnect success: status === '00' or status_code === '0' or ReturnCode === '00' */
  private _isSuccess(data: any): boolean {
    const status = data?.status ?? data?.Status ?? data?.ReturnCode ?? data?.StatusCode ?? '';
    return status === '00' || status === '0' || status === 'success' || status === 'successful';
  }

  private _extractRef(data: any, fallback: string): string {
    return (
      data?.transaction_id ||
      data?.TransactionID ||
      data?.ref ||
      data?.OrderNumber ||
      fallback
    );
  }

  // ──────────────────────────── AIRTIME ────────────────────────────────────

  async purchaseAirtime(request: AirtimeRequest): Promise<ProviderTransactionResult> {
    this.logger.log(
      `[CLUBKONNECT] Airtime: ${request.networkCode} → ${request.recipientPhone} ₦${Number(request.amountKobo) / 100}`,
    );

    try {
      const data = await this._request('airtime', {
        MobileNetwork: this._networkId(request.networkCode),
        Amount: (Number(request.amountKobo) / 100).toFixed(0),
        MobileNumber: request.recipientPhone,
        Reference: request.reference,
      });

      const success = this._isSuccess(data);
      return {
        success,
        providerReference: this._extractRef(data, request.reference),
        providerStatus: data?.status ?? data?.Status ?? 'UNKNOWN',
        message: data?.message ?? data?.Message ?? (success ? 'Airtime delivered' : 'Airtime failed'),
      };
    } catch (err) {
      this.logger.error(`[CLUBKONNECT] Airtime error: ${err.message}`, err.stack);
      return {
        success: false,
        providerReference: '',
        providerStatus: 'ERROR',
        message: `ClubKonnect airtime failed: ${err.message}`,
      };
    }
  }

  // ──────────────────────────── DATA ───────────────────────────────────────

  async purchaseData(request: DataRequest): Promise<ProviderTransactionResult> {
    this.logger.log(
      `[CLUBKONNECT] Data: ${request.networkCode} plan ${request.planCode} → ${request.recipientPhone}`,
    );

    try {
      const data = await this._request('data', {
        MobileNetwork: this._networkId(request.networkCode),
        DataPlan: request.planCode,
        MobileNumber: request.recipientPhone,
        Reference: request.reference,
      });

      const success = this._isSuccess(data);
      return {
        success,
        providerReference: this._extractRef(data, request.reference),
        providerStatus: data?.status ?? 'UNKNOWN',
        message: data?.message ?? data?.Message ?? (success ? 'Data activated' : 'Data purchase failed'),
      };
    } catch (err) {
      this.logger.error(`[CLUBKONNECT] Data error: ${err.message}`, err.stack);
      return {
        success: false,
        providerReference: '',
        providerStatus: 'ERROR',
        message: `ClubKonnect data purchase failed: ${err.message}`,
      };
    }
  }

  // ──────────────────────────── METER VERIFICATION ─────────────────────────

  async verifyMeter(request: MeterVerifyRequest): Promise<MeterDetails> {
    this.logger.log(
      `[CLUBKONNECT] Meter verify: ${request.providerCode} / ${request.meterNumber}`,
    );

    const data = await this._request(
      'electricity/verify',
      {
        Disco: this._discoCode(request.providerCode),
        MeterNumber: request.meterNumber,
        MeterType: request.meterType === 'PREPAID' ? 'Prepaid' : 'Postpaid',
      },
      'GET',
    );

    const customerName = data?.CustomerName || data?.customer_name;
    if (!customerName) {
      throw new Error(
        data?.message || data?.Message || 'Meter not found. Please verify the meter number.',
      );
    }

    return {
      customerName,
      customerAddress: data?.CustomerAddress || data?.address || '',
      meterNumber: request.meterNumber,
      meterType: request.meterType,
      tariffClass: data?.TariffClass || data?.tariff || undefined,
      minimumAmountKobo: data?.MinAmount
        ? BigInt(Math.round(parseFloat(data.MinAmount) * 100))
        : 50000n,
    };
  }

  // ──────────────────────────── ELECTRICITY PAYMENT ────────────────────────

  async payElectricity(request: ElectricityRequest): Promise<ElectricityPaymentResult> {
    this.logger.log(
      `[CLUBKONNECT] Electricity: ${request.providerCode} / ${request.meterNumber} ₦${Number(request.amountKobo) / 100}`,
    );

    try {
      const data = await this._request('electricity', {
        Disco: this._discoCode(request.providerCode),
        MeterNumber: request.meterNumber,
        MeterType: request.meterType === 'PREPAID' ? 'Prepaid' : 'Postpaid',
        Amount: (Number(request.amountKobo) / 100).toFixed(0),
        PhoneNumber: request.customerPhone,
        Reference: request.reference,
      });

      const success = this._isSuccess(data);
      return {
        success,
        providerReference: this._extractRef(data, request.reference),
        token: data?.Token || data?.token || null,
        units: data?.Units || data?.units ? String(data.Units || data.units) : null,
        receiptNumber: data?.ReceiptNumber || data?.receipt_number || null,
        message: data?.message || data?.Message || (success ? 'Token generated' : 'Electricity payment failed'),
      };
    } catch (err) {
      this.logger.error(`[CLUBKONNECT] Electricity error: ${err.message}`, err.stack);
      return {
        success: false,
        providerReference: '',
        token: null,
        units: null,
        receiptNumber: null,
        message: `ClubKonnect electricity payment failed: ${err.message}`,
      };
    }
  }

  // ──────────────────────────── SMARTCARD VERIFICATION ─────────────────────

  async verifySmartcard(request: SmartcardVerifyRequest): Promise<SmartcardDetails> {
    this.logger.log(
      `[CLUBKONNECT] Smartcard verify: ${request.providerCode} / ${request.smartcardNumber}`,
    );

    const data = await this._request(
      'cable/verify',
      {
        CableName: request.providerCode.toUpperCase(),
        SmartCardNumber: request.smartcardNumber,
      },
      'GET',
    );

    const customerName = data?.CustomerName || data?.customer_name;
    if (!customerName) {
      throw new Error(
        data?.message || 'Smartcard not found. Please verify the IUC/decoder number.',
      );
    }

    const dueDate = data?.RenewalDate || data?.renewal_date;
    const formattedDue = dueDate
      ? new Date(dueDate).toISOString().split('T')[0]
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    return {
      customerName,
      smartcardNumber: request.smartcardNumber,
      currentBouquet: data?.CurrentBouquet || data?.current_bouquet || 'Unknown',
      dueDate: formattedDue,
      status: data?.Status || data?.status || 'ACTIVE',
    };
  }

  // ──────────────────────────── CABLE TV PAYMENT ───────────────────────────

  async payCableTV(request: CableRequest): Promise<CablePaymentResult> {
    this.logger.log(
      `[CLUBKONNECT] Cable: ${request.providerCode} / ${request.smartcardNumber} → ${request.packageCode} × ${request.renewalMonths}mo`,
    );

    try {
      const data = await this._request('cable', {
        CableName: request.providerCode.toUpperCase(),
        SmartCardNumber: request.smartcardNumber,
        CablePackage: request.packageCode,
        Amount: (Number(request.amountKobo) / 100).toFixed(0),
        PhoneNumber: request.smartcardNumber,
        Reference: request.reference,
        Month: String(request.renewalMonths),
      });

      const success = this._isSuccess(data);
      const renewalDate = new Date();
      renewalDate.setMonth(renewalDate.getMonth() + request.renewalMonths);

      return {
        success,
        providerReference: this._extractRef(data, request.reference),
        renewalDate: renewalDate.toISOString().split('T')[0],
        message: data?.message || data?.Message || (success ? 'Subscription renewed' : 'Cable payment failed'),
      };
    } catch (err) {
      this.logger.error(`[CLUBKONNECT] Cable error: ${err.message}`, err.stack);
      return {
        success: false,
        providerReference: '',
        renewalDate: '',
        message: `ClubKonnect cable payment failed: ${err.message}`,
      };
    }
  }
}
