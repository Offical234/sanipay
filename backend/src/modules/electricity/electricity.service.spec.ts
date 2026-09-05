import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { MeterType } from '@prisma/client';
import { ElectricityService } from './electricity.service';
import { PrismaService } from '../../database/prisma.service';
import { AuthService } from '../auth/auth.service';
import { WalletService } from '../wallet/wallet.service';
import { VTU_PROVIDER } from '../../providers/vtu/vtu-provider.token';

describe('ElectricityService', () => {
  let service: ElectricityService;
  let prisma: any;
  let authService: any;
  let walletService: any;
  let vtuProvider: any;

  const mockProvider = {
    id: 'prov_ikedc_1',
    code: 'IKEDC',
    name: 'Ikeja Electric',
    convenienceFeeKobo: 10000n, // ₦100.00
    isActive: true,
  };

  const mockMeterDetails = {
    customerName: 'Adebayo Okafor',
    customerAddress: '14 Ikeja GRA, Lagos',
    meterNumber: '01234567890',
    meterType: 'PREPAID',
    tariffClass: 'R2 RESIDENTIAL',
    minimumAmountKobo: 50000n,
  };

  beforeEach(async () => {
    prisma = {
      electricityProvider: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      transaction: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      electricityTransaction: {
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
      debitWallet: jest.fn().mockResolvedValue({ balanceBeforeKobo: 500000n, balanceAfterKobo: 390000n }),
      creditWallet: jest.fn().mockResolvedValue({ balanceBeforeKobo: 390000n, balanceAfterKobo: 500000n }),
    };

    vtuProvider = {
      verifyMeter: jest.fn().mockResolvedValue(mockMeterDetails),
      payElectricity: jest.fn().mockResolvedValue({
        success: true,
        providerReference: 'MOCK_EL_123456',
        token: '1234-5678-9012-3456',
        units: '109.89 kWh',
        receiptNumber: 'RCP9988776655',
        message: 'Token generated successfully',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ElectricityService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuthService, useValue: authService },
        { provide: WalletService, useValue: walletService },
        { provide: VTU_PROVIDER, useValue: vtuProvider },
      ],
    }).compile();

    service = module.get<ElectricityService>(ElectricityService);
  });

  describe('getProviders', () => {
    it('should return list of active electricity distribution companies', async () => {
      prisma.electricityProvider.findMany.mockResolvedValue([mockProvider]);

      const result = await service.getProviders();

      expect(result.data).toHaveLength(1);
      expect(result.data[0].code).toBe('IKEDC');
      expect(result.data[0].convenienceFeeFormatted).toBe('₦100.00');
    });
  });

  describe('verifyMeter', () => {
    it('should verify meter with DisCo and cache verification details', async () => {
      prisma.electricityProvider.findUnique.mockResolvedValue(mockProvider);

      const result = await service.verifyMeter({
        providerCode: 'IKEDC',
        meterNumber: '01234567890',
        meterType: MeterType.PREPAID,
      });

      expect(vtuProvider.verifyMeter).toHaveBeenCalledWith({
        providerCode: 'IKEDC',
        meterNumber: '01234567890',
        meterType: MeterType.PREPAID,
      });
      expect(result.success).toBe(true);
      expect(result.data.customerName).toBe('Adebayo Okafor');
    });
  });

  describe('payElectricity', () => {
    const payDto = {
      providerCode: 'IKEDC',
      meterNumber: '01234567890',
      meterType: MeterType.PREPAID,
      amountKobo: 500000, // ₦5,000.00
      customerPhone: '08012345678',
      pin: '1234',
      idempotencyKey: 'idem_ele_test_1',
    };

    it('should reject payment if meter was not pre-validated', async () => {
      await expect(service.payElectricity('usr_test_1', payDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should successfully pay electricity bill and deliver token when meter is validated', async () => {
      // Step 1: Pre-validate meter
      prisma.electricityProvider.findUnique.mockResolvedValue(mockProvider);
      await service.verifyMeter({
        providerCode: 'IKEDC',
        meterNumber: '01234567890',
        meterType: MeterType.PREPAID,
      });

      // Step 2: Pay
      prisma.transaction.findUnique.mockResolvedValue(null);
      prisma.transaction.create.mockResolvedValue({
        id: 'tx_ele_1',
        reference: 'SP_ELE_123',
      });
      prisma.electricityTransaction.create.mockResolvedValue({});
      prisma.transactionItem.create.mockResolvedValue({});
      prisma.transaction.update.mockResolvedValue({});
      prisma.electricityTransaction.update.mockResolvedValue({});

      const result = await service.payElectricity('usr_test_1', payDto);

      expect(authService.verifyTransactionPin).toHaveBeenCalledWith('usr_test_1', '1234');
      // Should debit amount + ₦100 convenience fee = ₦5,100 (510,000 Kobo)
      expect(walletService.debitWallet).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          userId: 'usr_test_1',
          amountKobo: 510000n,
        }),
      );
      expect(result.success).toBe(true);
      expect(result.token).toBe('1234-5678-9012-3456');
      expect(result.units).toBe('109.89 kWh');
    });

    it('should auto-refund wallet if provider returns failure', async () => {
      // Pre-validate meter
      prisma.electricityProvider.findUnique.mockResolvedValue(mockProvider);
      await service.verifyMeter({
        providerCode: 'IKEDC',
        meterNumber: '01234567890',
        meterType: MeterType.PREPAID,
      });

      prisma.transaction.findUnique.mockResolvedValue(null);
      prisma.transaction.create.mockResolvedValue({
        id: 'tx_ele_1',
        reference: 'SP_ELE_123',
      });
      prisma.electricityTransaction.create.mockResolvedValue({});
      prisma.transactionItem.create.mockResolvedValue({});
      prisma.transaction.update.mockResolvedValue({});
      prisma.electricityTransaction.update.mockResolvedValue({});

      vtuProvider.payElectricity.mockResolvedValue({
        success: false,
        providerReference: 'FAIL_ELE_123',
        token: null,
        units: null,
        receiptNumber: null,
        message: 'DisCo gateway unreachable',
      });

      await expect(service.payElectricity('usr_test_1', payDto)).rejects.toThrow(
        BadRequestException,
      );

      expect(walletService.creditWallet).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          userId: 'usr_test_1',
          amountKobo: 510000n,
        }),
      );
    });
  });
});
