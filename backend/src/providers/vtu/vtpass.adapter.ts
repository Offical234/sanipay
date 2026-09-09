import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
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
 * VTPassAdapter — Production adapter for the VTPass VTU aggregator.
 *
 * Authentication: Basic auth using API key + public key (or secret key) per VTPass docs v3.
 * Base URL:  VTPASS_BASE_URL env var (defaults to sandbox: https://sandbox.vtpass.com/api)
 * Docs:      https://www.vtpass.com/documentation/api
 *
 * Network service IDs:
 *   airtime:    mtn / airtel / glo / etisalat
 *   data:       mtn-data / airtel-data / glo-data / etisalat-data
 * Electricity disco service IDs: ikeja-electric, eko-electric, abuja-electric, ibadan-electric,
 *                                  phed, kedco, aedc
 * Cable service IDs: dstv / gotv / startimes / showmax
 */
@Injectable()
export class VTPassAdapter implements IVTUProvider {
  private readonly logger = new Logger(VTPassAdapter.name);

  constructor(private readonly configService: ConfigService) {}

  // ─────────────────────────── PRIVATE HELPERS ────────────────────────────

  private get baseUrl(): string {
    return (
      this.configService.get<string>('vtu.vtpassBaseUrl') ||
      process.env.VTPASS_BASE_URL ||
      'https://sandbox.vtpass.com/api'
    );
  }

  private get apiKey(): string {
    return this.configService.get<string>('vtu.vtpassApiKey') || process.env.VTPASS_API_KEY || '';
  }

  private get publicKey(): string {
    // VTPass uses public key for requests; secret key for webhook verification
    return (
      this.configService.get<string>('vtu.vtpassSecretKey') ||
      process.env.VTPASS_SECRET_KEY ||
      ''
    );
  }

  /** Build Authorization header using VTPass Basic auth: base64(apiKey:publicKey) */
  private get authHeader(): string {
    const credentials = Buffer.from(`${this.apiKey}:${this.publicKey}`).toString('base64');
    return `Basic ${credentials}`;
  }

  private _networkServiceId(networkCode: string): string {
    const map: Record<string, string> = {
      MTN: 'mtn',
      AIRTEL: 'airtel',
      GLO: 'glo',
      NINE_MOBILE: 'etisalat',
    };
    return map[networkCode.toUpperCase()] ?? networkCode.toLowerCase();
  }

  private _dataServiceId(networkCode: string): string {
    return `${this._networkServiceId(networkCode)}-data`;
  }

  private _discoServiceId(providerCode: string): string {
    const map: Record<string, string> = {
      IKEDC: 'ikeja-electric',
      EKEDC: 'eko-electric',
      AEDC: 'abuja-electric',
      IBEDC: 'ibadan-electric',
      PHED: 'phed',
      KEDCO: 'kedco',
      JEDC: 'jos-electric',
      BEDC: 'benin-electric',
      KAEDCO: 'kaduna-electric',
      EEDC: 'enugu-electric',
    };
    return map[providerCode.toUpperCase()] ?? providerCode.toLowerCase();
  }

  private _cableServiceId(providerCode: string): string {
    const map: Record<string, string> = {
      DSTV: 'dstv',
      GOTV: 'gotv',
      STARTIMES: 'startimes',
      SHOWMAX: 'showmax',
    };
    return map[providerCode.toUpperCase()] ?? providerCode.toLowerCase();
  }

  private _generateRequestId(): string {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const datePart = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}`;
    const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `SP${datePart}${rand}`;
  }

  private async _post(endpoint: string, body: Record<string, any>): Promise<any> {
    const url = `${this.baseUrl}/${endpoint}`;
    const requestId = this._generateRequestId();

    this.logger.log(`[VTPASS] POST ${endpoint} | request_id: ${requestId}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'api-key': this.apiKey,
        'public-key': this.publicKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...body, request_id: requestId }),
    });

    const data = await response.json();
    this.logger.debug(`[VTPASS] Response: ${JSON.stringify(data)}`);
    return { data, requestId };
  }

  private async _get(endpoint: string, params: Record<string, string> = {}): Promise<any> {
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}/${endpoint}${qs ? '?' + qs : ''}`;

    this.logger.log(`[VTPASS] GET ${endpoint}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'api-key': this.apiKey,
        'public-key': this.publicKey,
      },
    });

    return response.json();
  }

  /** VTPass success check: response_description === '000' or code === '000' */
  private _isSuccess(data: any): boolean {
    const desc = data?.code ?? data?.content?.transactions?.status ?? '';
    return desc === '000' || desc === 'delivered';
  }

  private _extractMessage(data: any): string {
    return (
      data?.response_description ||
      data?.content?.transactions?.product_name ||
      data?.content?.error ||
      'VTPass request completed'
    );
  }

  // ──────────────────────────── AIRTIME ────────────────────────────────────

  async purchaseAirtime(request: AirtimeRequest): Promise<ProviderTransactionResult> {
    this.logger.log(
      `[VTPASS] Airtime: ${request.networkCode} → ${request.recipientPhone} ₦${Number(request.amountKobo) / 100}`,
    );

    try {
      const { data, requestId } = await this._post('pay', {
        serviceID: this._networkServiceId(request.networkCode),
        amount: (Number(request.amountKobo) / 100).toFixed(0),
        phone: request.recipientPhone,
        billersCode: request.recipientPhone,
      });

      const success = this._isSuccess(data);
      const txnRef = data?.content?.transactions?.transactionId || requestId;

      return {
        success,
        providerReference: txnRef,
        providerStatus: data?.code || 'UNKNOWN',
        message: this._extractMessage(data),
      };
    } catch (err) {
      this.logger.error(`[VTPASS] Airtime error: ${err.message}`, err.stack);
      return {
        success: false,
        providerReference: '',
        providerStatus: 'ERROR',
        message: `VTPass airtime failed: ${err.message}`,
      };
    }
  }

  // ──────────────────────────── DATA ───────────────────────────────────────

  async purchaseData(request: DataRequest): Promise<ProviderTransactionResult> {
    this.logger.log(
      `[VTPASS] Data: ${request.networkCode} plan ${request.planCode} → ${request.recipientPhone}`,
    );

    try {
      const { data, requestId } = await this._post('pay', {
        serviceID: this._dataServiceId(request.networkCode),
        variation_code: request.planCode,
        phone: request.recipientPhone,
        billersCode: request.recipientPhone,
        amount: (Number(request.amountKobo) / 100).toFixed(0),
      });

      const success = this._isSuccess(data);
      const txnRef = data?.content?.transactions?.transactionId || requestId;

      return {
        success,
        providerReference: txnRef,
        providerStatus: data?.code || 'UNKNOWN',
        message: this._extractMessage(data),
      };
    } catch (err) {
      this.logger.error(`[VTPASS] Data error: ${err.message}`, err.stack);
      return {
        success: false,
        providerReference: '',
        providerStatus: 'ERROR',
        message: `VTPass data purchase failed: ${err.message}`,
      };
    }
  }

  // ──────────────────────────── METER VERIFICATION ─────────────────────────

  async verifyMeter(request: MeterVerifyRequest): Promise<MeterDetails> {
    this.logger.log(
      `[VTPASS] Meter verify: ${request.providerCode} / ${request.meterNumber} (${request.meterType})`,
    );

    const { data } = await this._post('merchant-verify', {
      serviceID: this._discoServiceId(request.providerCode),
      billersCode: request.meterNumber,
      type: request.meterType === 'PREPAID' ? 'prepaid' : 'postpaid',
    });

    if (!data?.content?.Customer_Name && !data?.content?.customerName) {
      throw new Error(
        data?.content?.error ||
          data?.response_description ||
          'Meter number not found. Please check and try again.',
      );
    }

    const content = data.content;
    const customerName = content.Customer_Name || content.customerName || 'Unknown Customer';
    const customerAddress = content.Address || content.address || '';
    const minimumAmount = content.Minimum_Amount || content.minimumAmount;

    return {
      customerName,
      customerAddress,
      meterNumber: request.meterNumber,
      meterType: request.meterType,
      tariffClass: content.Tariff || content.tariff || undefined,
      minimumAmountKobo: minimumAmount
        ? BigInt(Math.round(parseFloat(minimumAmount) * 100))
        : 50000n,
    };
  }

  // ──────────────────────────── ELECTRICITY PAYMENT ────────────────────────

  async payElectricity(request: ElectricityRequest): Promise<ElectricityPaymentResult> {
    this.logger.log(
      `[VTPASS] Electricity: ${request.providerCode} / ${request.meterNumber} ₦${Number(request.amountKobo) / 100}`,
    );

    try {
      const { data, requestId } = await this._post('pay', {
        serviceID: this._discoServiceId(request.providerCode),
        billersCode: request.meterNumber,
        variation_code: request.meterType === 'PREPAID' ? 'prepaid' : 'postpaid',
        amount: (Number(request.amountKobo) / 100).toFixed(0),
        phone: request.customerPhone,
      });

      const success = this._isSuccess(data);
      const content = data?.content;
      const txnData = content?.transactions;
      const token = txnData?.token || content?.token || null;
      const units = txnData?.units || content?.units || null;
      const receiptNumber = txnData?.transactionId || requestId;

      return {
        success,
        providerReference: receiptNumber,
        token: token ? String(token) : null,
        units: units ? String(units) : null,
        receiptNumber,
        message: this._extractMessage(data),
      };
    } catch (err) {
      this.logger.error(`[VTPASS] Electricity error: ${err.message}`, err.stack);
      return {
        success: false,
        providerReference: '',
        token: null,
        units: null,
        receiptNumber: null,
        message: `VTPass electricity payment failed: ${err.message}`,
      };
    }
  }

  // ──────────────────────────── SMARTCARD VERIFICATION ─────────────────────

  async verifySmartcard(request: SmartcardVerifyRequest): Promise<SmartcardDetails> {
    this.logger.log(
      `[VTPASS] Smartcard verify: ${request.providerCode} / ${request.smartcardNumber}`,
    );

    const { data } = await this._post('merchant-verify', {
      serviceID: this._cableServiceId(request.providerCode),
      billersCode: request.smartcardNumber,
    });

    if (!data?.content?.Customer_Name && !data?.content?.customerName) {
      throw new Error(
        data?.content?.error ||
          data?.response_description ||
          'Smartcard not found. Please verify the IUC/decoder number.',
      );
    }

    const content = data.content;
    const customerName = content.Customer_Name || content.customerName || 'Unknown Customer';
    const currentBouquet =
      content.Current_Bouquet || content.currentBouquet || content.Bouquet_Code || 'Unknown';
    const dueDate = content.Renewal_Amount
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    return {
      customerName,
      smartcardNumber: request.smartcardNumber,
      currentBouquet,
      dueDate,
      status: content.Status || content.status || 'ACTIVE',
    };
  }

  // ──────────────────────────── CABLE TV PAYMENT ───────────────────────────

  async payCableTV(request: CableRequest): Promise<CablePaymentResult> {
    this.logger.log(
      `[VTPASS] Cable: ${request.providerCode} / ${request.smartcardNumber} → ${request.packageCode} × ${request.renewalMonths}mo`,
    );

    try {
      const { data, requestId } = await this._post('pay', {
        serviceID: this._cableServiceId(request.providerCode),
        billersCode: request.smartcardNumber,
        variation_code: request.packageCode,
        amount: (Number(request.amountKobo) / 100).toFixed(0),
        phone: request.smartcardNumber, // VTPass uses smartcard as contact for cable
        quantity: request.renewalMonths,
      });

      const success = this._isSuccess(data);
      const txnRef = data?.content?.transactions?.transactionId || requestId;

      // Compute renewal date
      const renewalDate = new Date();
      renewalDate.setMonth(renewalDate.getMonth() + request.renewalMonths);

      return {
        success,
        providerReference: txnRef,
        renewalDate: renewalDate.toISOString().split('T')[0],
        message: this._extractMessage(data),
      };
    } catch (err) {
      this.logger.error(`[VTPASS] Cable error: ${err.message}`, err.stack);
      return {
        success: false,
        providerReference: '',
        renewalDate: '',
        message: `VTPass cable payment failed: ${err.message}`,
      };
    }
  }
}
