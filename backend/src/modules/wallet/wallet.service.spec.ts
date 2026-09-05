import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { WalletService } from './wallet.service';
import { PrismaService } from '../../database/prisma.service';
import { AuthService } from '../auth/auth.service';
import { PaymentGatewayOption } from './dto/wallet.dto';

describe('WalletService', () => {
  let service: WalletService;
  let prisma: any;
  let authService: any;

  const mockSenderWallet = {
    id: 'wlt_sender_1',
    userId: 'usr_sender_1',
    balanceKobo: 500000n, // ₦5,000.00
    ledgerBalanceKobo: 500000n,
    currency: 'NGN',
    isLocked: false,
    lockReason: null,
    version: 1,
    user: {
      id: 'usr_sender_1',
      email: 'sender@example.com',
      phone: '08011111111',
      role: 'CUSTOMER',
      profile: { fullName: 'Sender User' },
    },
  };

  const mockRecipientWallet = {
    id: 'wlt_recipient_2',
    userId: 'usr_recipient_2',
    balanceKobo: 100000n, // ₦1,000.00
    ledgerBalanceKobo: 100000n,
    currency: 'NGN',
    isLocked: false,
    lockReason: null,
    version: 1,
    user: {
      id: 'usr_recipient_2',
      email: 'recipient@example.com',
      phone: '08022222222',
      role: 'CUSTOMER',
      profile: { fullName: 'Recipient User' },
    },
  };

  beforeEach(async () => {
    prisma = {
      wallet: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      walletTransaction: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      transaction: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      user: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
      },
      $transaction: jest.fn(async (cb) => cb(prisma)),
    };

    authService = {
      verifyTransactionPin: jest.fn().mockResolvedValue({ valid: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuthService, useValue: authService },
      ],
    }).compile();

    service = module.get<WalletService>(WalletService);
  });

  describe('getWallet', () => {
    it('should return wallet balance and formatted Naira string', async () => {
      prisma.wallet.findUnique.mockResolvedValue(mockSenderWallet);

      const res = await service.getWallet('usr_sender_1');
      expect(res.walletId).toBe('wlt_sender_1');
      expect(res.balanceKobo).toBe('500000');
      expect(res.balanceFormatted).toBe('₦5,000.00');
      expect(res.owner.fullName).toBe('Sender User');
    });

    it('should throw NotFoundException if wallet does not exist', async () => {
      prisma.wallet.findUnique.mockResolvedValue(null);

      await expect(service.getWallet('usr_unknown')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('creditWallet', () => {
    it('should calculate new balance and create a CREDIT ledger entry', async () => {
      prisma.wallet.findUnique.mockResolvedValue({ ...mockSenderWallet });
      prisma.wallet.update.mockResolvedValue({ ...mockSenderWallet });
      prisma.walletTransaction.create.mockResolvedValue({ id: 'wtx_1' });

      const res = await service.creditWallet(prisma, {
        userId: 'usr_sender_1',
        amountKobo: 200000n,
        transactionId: 'tx_fund_1',
        description: 'Wallet top-up',
      });

      expect(res.balanceBeforeKobo).toBe(500000n);
      expect(res.balanceAfterKobo).toBe(700000n);
      expect(prisma.wallet.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ balanceKobo: 700000n }),
        }),
      );
      expect(prisma.walletTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'CREDIT',
            amountKobo: 200000n,
            balanceBeforeKobo: 500000n,
            balanceAfterKobo: 700000n,
          }),
        }),
      );
    });
  });

  describe('debitWallet', () => {
    it('should calculate new balance and create a DEBIT ledger entry', async () => {
      prisma.wallet.findUnique.mockResolvedValue({ ...mockSenderWallet });
      prisma.wallet.update.mockResolvedValue({ ...mockSenderWallet });
      prisma.walletTransaction.create.mockResolvedValue({ id: 'wtx_2' });

      const res = await service.debitWallet(prisma, {
        userId: 'usr_sender_1',
        amountKobo: 200000n,
        transactionId: 'tx_bill_1',
        description: 'Airtime recharge',
      });

      expect(res.balanceBeforeKobo).toBe(500000n);
      expect(res.balanceAfterKobo).toBe(300000n);
      expect(prisma.wallet.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ balanceKobo: 300000n }),
        }),
      );
    });

    it('should throw BadRequestException if balance is insufficient', async () => {
      prisma.wallet.findUnique.mockResolvedValue({ ...mockSenderWallet, balanceKobo: 50000n });

      await expect(
        service.debitWallet(prisma, {
          userId: 'usr_sender_1',
          amountKobo: 200000n,
          transactionId: 'tx_fail_1',
          description: 'Debit attempt',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if wallet is locked', async () => {
      prisma.wallet.findUnique.mockResolvedValue({
        ...mockSenderWallet,
        isLocked: true,
        lockReason: 'Suspicious fraud investigation',
      });

      await expect(
        service.debitWallet(prisma, {
          userId: 'usr_sender_1',
          amountKobo: 10000n,
          transactionId: 'tx_locked_1',
          description: 'Debit attempt',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('initializeFunding', () => {
    it('should generate reference and return checkout parameters', async () => {
      prisma.transaction.findUnique.mockResolvedValue(null);
      prisma.transaction.create.mockResolvedValue({
        id: 'tx_fund_1',
        reference: 'SP_FUND_123',
        amountKobo: 100000n,
        providerName: PaymentGatewayOption.PAYSTACK,
      });

      const res = await service.initializeFunding('usr_sender_1', {
        amountKobo: 100000,
        gateway: PaymentGatewayOption.PAYSTACK,
      });

      expect(res.reference).toBeDefined();
      expect(res.authorizationUrl).toBeDefined();
      expect(res.gateway).toBe(PaymentGatewayOption.PAYSTACK);
    });
  });

  describe('transferFunds (P2P)', () => {
    it('should execute P2P transfer with PIN validation', async () => {
      prisma.transaction.findUnique.mockResolvedValue(null); // No existing idempotency
      prisma.user.findFirst.mockResolvedValue({
        id: 'usr_recipient_2',
        phone: '08022222222',
        profile: { fullName: 'Recipient User' },
      });
      prisma.user.findUnique.mockResolvedValue({
        id: 'usr_sender_1',
        phone: '08011111111',
        profile: { fullName: 'Sender User' },
      });
      prisma.transaction.create.mockResolvedValue({ id: 'tx_xfer_1' });

      // Mock wallet queries inside $transaction
      prisma.wallet.findUnique
        .mockResolvedValueOnce({ ...mockSenderWallet }) // for debitWallet
        .mockResolvedValueOnce({ ...mockRecipientWallet }); // for creditWallet
      prisma.wallet.update.mockResolvedValue({});
      prisma.walletTransaction.create.mockResolvedValue({});

      const res = await service.transferFunds('usr_sender_1', {
        recipientIdentifier: '08022222222',
        amountKobo: 100000,
        pin: '1234',
        narration: 'Project share',
        idempotencyKey: 'xfer_key_001',
      });

      expect(authService.verifyTransactionPin).toHaveBeenCalledWith('usr_sender_1', '1234');
      expect(res.amountFormatted).toBe('₦1,000.00');
      expect(res.recipient.fullName).toBe('Recipient User');
      expect(res.balanceAfterKobo).toBe('400000');
    });

    it('should reject self-transfer attempt', async () => {
      prisma.transaction.findUnique.mockResolvedValue(null);
      prisma.user.findFirst.mockResolvedValue({
        id: 'usr_sender_1', // Same ID as sender
        phone: '08011111111',
      });

      await expect(
        service.transferFunds('usr_sender_1', {
          recipientIdentifier: '08011111111',
          amountKobo: 100000,
          pin: '1234',
          idempotencyKey: 'xfer_self_1',
        }),
      ).rejects.toThrow('You cannot transfer funds to your own wallet.');
    });

    it('should reject duplicate transfer with same idempotency key', async () => {
      prisma.transaction.findUnique.mockResolvedValue({ id: 'tx_existing' });

      await expect(
        service.transferFunds('usr_sender_1', {
          recipientIdentifier: '08022222222',
          amountKobo: 100000,
          pin: '1234',
          idempotencyKey: 'xfer_duplicate',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });
});
