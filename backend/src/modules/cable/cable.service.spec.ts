import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { CableService } from './cable.service';
import { PrismaService } from '../../database/prisma.service';
import { AuthService } from '../auth/auth.service';
import { WalletService } from '../wallet/wallet.service';
import { VTU_PROVIDER } from '../../providers/vtu/vtu-provider.token';

describe('CableService', () => {
  let service: CableService;
  let prisma: any;
  let authService: any;
  let walletService: any;
  let vtuProvider: any;

  const mockProvider = {
    id: 'prov_dstv_1',
    code: 'DSTV',
    name: 'DStv Nigeria',
    convenienceFeeKobo: 10000n, // ₦100.00
    isActive: true,
  };

  const mockSmartcardDetails = {
    customerName: 'Oluwaseun Bello',
    smartcardNumber: '1023456789',
    currentBouquet: 'DStv Compact',
    dueDate: '2026-09-20',
    status: 'ACTIVE',
  };

  beforeEach(async () => {
    prisma = {
      cableProvider: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      transaction: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      cableTransaction: {
        create: jest.fn(),
        update: jest.fn(),
      },
      transactionItem: {
        create: jest.fn(),
      },
      $transaction: jest.fn((cb) => {
        if (typeof cb === 'function') {
          return cb(prisma);
        }
        return Promise.all(cb);
      }),
    };

    authService = {
      verifyTransactionPin: jest.fn().mockResolvedValue({ valid: true }),
    };

    walletService = {
      debitWallet: jest.fn().mockResolvedValue({ balanceBeforeKobo: 2000000n, balanceAfterKobo: 740000n }),
      creditWallet: jest.fn().mockResolvedValue({ balanceBeforeKobo: 740000n, balanceAfterKobo: 2000000n }),
    };

    vtuProvider = {
      verifySmartcard: jest.fn().mockResolvedValue(mockSmartcardDetails),
      payCableTV: jest.fn().mockResolvedValue({
        success: true,
        providerReference: 'MOCK_CA_123456',
        renewalDate: '2026-10-20',
        message: 'DStv subscription renewed successfully',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CableService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuthService, useValue: authService },
        { provide: WalletService, useValue: walletService },
        { provide: VTU_PROVIDER, useValue: vtuProvider },
      ],
    }).compile();

    service = module.get<CableService>(CableService);
  });

  describe('getProviders', () => {
    it('should return list of cable providers with their bouquet packages', async () => {
      prisma.cableProvider.findMany.mockResolvedValue([mockProvider]);

      const result = await service.getProviders();

      expect(result.data).toHaveLength(1);
      expect(result.data[0].code).toBe('DSTV');
      expect(result.data[0].packages.length).toBeGreaterThan(0);
    });
  });

  describe('verifySmartcard', () => {
    it('should verify smartcard and return account holder info', async () => {
      prisma.cableProvider.findUnique.mockResolvedValue(mockProvider);

      const result = await service.verifySmartcard({
        providerCode: 'DSTV',
        smartcardNumber: '1023456789',
      });

      expect(vtuProvider.verifySmartcard).toHaveBeenCalledWith({
        providerCode: 'DSTV',
        smartcardNumber: '1023456789',
      });
      expect(result.success).toBe(true);
      expect(result.data.customerName).toBe('Oluwaseun Bello');
      expect(result.data.currentBouquet).toBe('DStv Compact');
    });
  });

  describe('payCableTV', () => {
    const payDto = {
      providerCode: 'DSTV',
      smartcardNumber: '1023456789',
      packageCode: 'DSTV_COMPACT',
      packageName: 'DStv Compact',
      amountKobo: 1250000, // ₦12,500.00
      renewalMonths: 1,
      pin: '1234',
      idempotencyKey: 'idem_cab_test_1',
    };

    it('should reject payment if smartcard was not verified beforehand', async () => {
      await expect(service.payCableTV('usr_test_1', payDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should successfully renew cable subscription when smartcard is verified', async () => {
      // Step 1: Pre-verify smartcard
      prisma.cableProvider.findUnique.mockResolvedValue(mockProvider);
      await service.verifySmartcard({
        providerCode: 'DSTV',
        smartcardNumber: '1023456789',
      });

      // Step 2: Pay
      prisma.transaction.findUnique.mockResolvedValue(null);
      prisma.transaction.create.mockResolvedValue({
        id: 'tx_cab_1',
        reference: 'SP_CAB_123',
      });
      prisma.cableTransaction.create.mockResolvedValue({});
      prisma.transactionItem.create.mockResolvedValue({});
      prisma.transaction.update.mockResolvedValue({});

      const result = await service.payCableTV('usr_test_1', payDto);

      expect(authService.verifyTransactionPin).toHaveBeenCalledWith('usr_test_1', '1234');
      // Should debit amount + ₦100 convenience fee = ₦12,600 (1,260,000 Kobo)
      expect(walletService.debitWallet).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          userId: 'usr_test_1',
          amountKobo: 1260000n,
        }),
      );
      expect(result.success).toBe(true);
      expect(result.renewalDate).toBe('2026-10-20');
    });

    it('should auto-refund wallet on provider failure', async () => {
      prisma.cableProvider.findUnique.mockResolvedValue(mockProvider);
      await service.verifySmartcard({
        providerCode: 'DSTV',
        smartcardNumber: '1023456789',
      });

      prisma.transaction.findUnique.mockResolvedValue(null);
      prisma.transaction.create.mockResolvedValue({
        id: 'tx_cab_1',
        reference: 'SP_CAB_123',
      });
      prisma.cableTransaction.create.mockResolvedValue({});
      prisma.transactionItem.create.mockResolvedValue({});
      prisma.transaction.update.mockResolvedValue({});

      vtuProvider.payCableTV.mockResolvedValue({
        success: false,
        providerReference: 'FAIL_CAB_123',
        message: 'Multichoice gateway error',
      });

      await expect(service.payCableTV('usr_test_1', payDto)).rejects.toThrow(
        BadRequestException,
      );

      expect(walletService.creditWallet).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          userId: 'usr_test_1',
          amountKobo: 1260000n,
        }),
      );
    });
  });
});
