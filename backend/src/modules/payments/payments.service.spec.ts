import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PaymentGateway, TransactionStatus } from '@prisma/client';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../../database/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { PaystackAdapter } from '../../providers/payment/paystack.adapter';
import { FlutterwaveAdapter } from '../../providers/payment/flutterwave.adapter';
import { MockPaymentAdapter } from '../../providers/payment/mock-payment.adapter';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prisma: any;
  let walletService: any;
  let paystackAdapter: any;
  let flutterwaveAdapter: any;
  let mockPaymentAdapter: any;

  const mockTransaction = {
    id: 'tx_fund_1',
    userId: 'usr_test_1',
    reference: 'SP_FUND_12345',
    idempotencyKey: 'idem_fund_1',
    type: 'WALLET_FUNDING',
    status: TransactionStatus.PENDING,
    amountKobo: 500000n, // ₦5,000.00
    netAmountKobo: 500000n,
    currency: 'NGN',
    providerName: 'PAYSTACK',
    providerReference: null,
  };

  beforeEach(async () => {
    prisma = {
      transaction: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      paymentTransaction: {
        upsert: jest.fn(),
      },
      referral: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      referralReward: {
        create: jest.fn(),
      },
      $transaction: jest.fn((cb) => {
        if (typeof cb === 'function') {
          return cb(prisma);
        }
        return Promise.all(cb);
      }),
    };

    walletService = {
      creditWallet: jest.fn().mockResolvedValue({
        balanceBeforeKobo: 0n,
        balanceAfterKobo: 500000n,
      }),
    };

    paystackAdapter = {
      verifyWebhookSignature: jest.fn().mockReturnValue(true),
      parseWebhookEvent: jest.fn().mockReturnValue({
        isValid: true,
        event: 'charge.success',
        reference: 'SP_FUND_12345',
        gatewayReference: 'PSTK_GW_98765',
        amountKobo: 500000n,
        channel: 'card',
        paidAt: new Date(),
      }),
      verifyPayment: jest.fn().mockResolvedValue({
        status: 'SUCCESS',
        reference: 'SP_FUND_12345',
        gatewayReference: 'PSTK_GW_98765',
        amountKobo: 500000n,
        channel: 'card',
        paidAt: new Date(),
        rawPayload: { status: 'success' },
      }),
    };

    flutterwaveAdapter = {
      verifyWebhookSignature: jest.fn().mockReturnValue(true),
      parseWebhookEvent: jest.fn().mockReturnValue({
        isValid: true,
        event: 'charge.completed',
        reference: 'SP_FUND_12345',
        gatewayReference: 'FLW_GW_98765',
        amountKobo: 500000n,
        status: 'SUCCESS',
        channel: 'card',
        paidAt: new Date(),
      }),
      verifyPayment: jest.fn().mockResolvedValue({
        status: 'SUCCESS',
        reference: 'SP_FUND_12345',
        gatewayReference: 'FLW_GW_98765',
        amountKobo: 500000n,
        channel: 'card',
        paidAt: new Date(),
        rawPayload: { status: 'successful' },
      }),
    };

    mockPaymentAdapter = {
      verifyPayment: jest.fn().mockResolvedValue({
        status: 'SUCCESS',
        reference: 'SP_FUND_12345',
        gatewayReference: 'MOCK_GW_98765',
        amountKobo: 500000n,
        channel: 'mock_card',
        paidAt: new Date(),
        rawPayload: { status: 'success' },
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: WalletService, useValue: walletService },
        { provide: PaystackAdapter, useValue: paystackAdapter },
        { provide: FlutterwaveAdapter, useValue: flutterwaveAdapter },
        { provide: MockPaymentAdapter, useValue: mockPaymentAdapter },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  describe('handlePaystackWebhook', () => {
    it('should successfully fulfill payment, credit wallet, and qualify referral', async () => {
      prisma.transaction.findUnique.mockResolvedValue(mockTransaction);
      prisma.transaction.update.mockResolvedValue({
        ...mockTransaction,
        status: TransactionStatus.SUCCESS,
      });
      prisma.referral.findUnique.mockResolvedValue({
        id: 'ref_1',
        referredUserId: 'usr_test_1',
        status: 'PENDING_QUALIFICATION',
      });

      const result = await service.handlePaystackWebhook(
        'valid_signature',
        'raw_body',
        { event: 'charge.success', data: { reference: 'SP_FUND_12345' } },
      );

      expect(paystackAdapter.verifyWebhookSignature).toHaveBeenCalledWith('valid_signature', 'raw_body');
      expect(prisma.transaction.update).toHaveBeenCalledWith({
        where: { id: 'tx_fund_1' },
        data: expect.objectContaining({
          status: TransactionStatus.SUCCESS,
          providerReference: 'PSTK_GW_98765',
        }),
      });
      expect(walletService.creditWallet).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          userId: 'usr_test_1',
          amountKobo: 500000n,
        }),
      );
      expect(prisma.referral.update).toHaveBeenCalledWith({
        where: { id: 'ref_1' },
        data: { status: 'QUALIFIED' },
      });
      expect(result.success).toBe(true);
    });

    it('should reject webhook with invalid signature with UnauthorizedException', async () => {
      paystackAdapter.verifyWebhookSignature.mockReturnValue(false);

      await expect(
        service.handlePaystackWebhook('bad_signature', 'raw_body', {}),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should idempotently ignore already fulfilled transactions without double crediting', async () => {
      prisma.transaction.findUnique.mockResolvedValue({
        ...mockTransaction,
        status: TransactionStatus.SUCCESS,
      });

      const result = await service.handlePaystackWebhook(
        'valid_signature',
        'raw_body',
        { event: 'charge.success', data: { reference: 'SP_FUND_12345' } },
      );

      expect(walletService.creditWallet).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });

  describe('handleFlutterwaveWebhook', () => {
    it('should fulfill payment on valid Flutterwave webhook', async () => {
      prisma.transaction.findUnique.mockResolvedValue(mockTransaction);
      prisma.transaction.update.mockResolvedValue({
        ...mockTransaction,
        status: TransactionStatus.SUCCESS,
      });
      prisma.referral.findUnique.mockResolvedValue(null);

      const result = await service.handleFlutterwaveWebhook(
        'valid_flw_hash',
        'raw_body',
        { event: 'charge.completed', data: { tx_ref: 'SP_FUND_12345' } },
      );

      expect(flutterwaveAdapter.verifyWebhookSignature).toHaveBeenCalled();
      expect(walletService.creditWallet).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should reject Flutterwave webhook with invalid secret hash', async () => {
      flutterwaveAdapter.verifyWebhookSignature.mockReturnValue(false);

      await expect(
        service.handleFlutterwaveWebhook('bad_hash', 'raw_body', {}),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('handleMockWebhook', () => {
    it('should fulfill payment via sandbox mock webhook endpoint', async () => {
      prisma.transaction.findUnique.mockResolvedValue(mockTransaction);
      prisma.transaction.update.mockResolvedValue({
        ...mockTransaction,
        status: TransactionStatus.SUCCESS,
      });
      prisma.referral.findUnique.mockResolvedValue(null);

      const result = await service.handleMockWebhook({
        reference: 'SP_FUND_12345',
        amountKobo: 500000,
        channel: 'mock_card',
      });

      expect(walletService.creditWallet).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });

  describe('verifyPayment', () => {
    it('should return receipt immediately if transaction is already confirmed', async () => {
      prisma.transaction.findUnique.mockResolvedValue({
        ...mockTransaction,
        status: TransactionStatus.SUCCESS,
        providerReference: 'PSTK_CONFIRMED',
        updatedAt: new Date(),
      });

      const result: any = await service.verifyPayment('SP_FUND_12345');

      expect(result.success).toBe(true);
      expect(result.status).toBe(TransactionStatus.SUCCESS);
      expect(result.amountFormatted).toBe('₦5,000.00');
    });

    it('should verify with gateway and fulfill if transaction is PENDING', async () => {
      prisma.transaction.findUnique
        .mockResolvedValueOnce(mockTransaction) // First call in verifyPayment
        .mockResolvedValueOnce(mockTransaction); // Second call in _fulfillPayment

      prisma.transaction.update.mockResolvedValue({
        ...mockTransaction,
        status: TransactionStatus.SUCCESS,
        providerReference: 'PSTK_GW_98765',
        updatedAt: new Date(),
      });
      prisma.referral.findUnique.mockResolvedValue(null);

      const result: any = await service.verifyPayment('SP_FUND_12345');

      expect(paystackAdapter.verifyPayment).toHaveBeenCalledWith('SP_FUND_12345');
      expect(walletService.creditWallet).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should throw NotFoundException if reference does not exist', async () => {
      prisma.transaction.findUnique.mockResolvedValue(null);

      await expect(service.verifyPayment('NON_EXISTENT_REF')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
