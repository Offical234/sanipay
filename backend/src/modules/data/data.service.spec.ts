import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { TelecomNetworkCode, DataPlanType } from '@prisma/client';
import { DataService } from './data.service';
import { PrismaService } from '../../database/prisma.service';
import { AuthService } from '../auth/auth.service';
import { WalletService } from '../wallet/wallet.service';
import { VTU_PROVIDER } from '../../providers/vtu/vtu-provider.token';

describe('DataService', () => {
  let service: DataService;
  let prisma: any;
  let authService: any;
  let walletService: any;
  let vtuProvider: any;

  const mockPlan = {
    id: 'plan_mtn_1gb',
    planCode: 'MTN-SME-1GB',
    name: '1GB SME Data',
    type: DataPlanType.SME,
    validity: '30 Days',
    costPriceKobo: 22500n,
    sellingPriceKobo: 25000n, // ₦250.00
    isActive: true,
    networkId: 'net_mtn_123',
    network: {
      id: 'net_mtn_123',
      code: TelecomNetworkCode.MTN,
      name: 'MTN Nigeria',
      isActive: true,
      dataEnabled: true,
    },
  };

  beforeEach(async () => {
    prisma = {
      dataPlan: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      transaction: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      dataTransaction: {
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
      debitWallet: jest.fn().mockResolvedValue({ balanceBeforeKobo: 500000n, balanceAfterKobo: 475000n }),
      creditWallet: jest.fn().mockResolvedValue({ balanceBeforeKobo: 475000n, balanceAfterKobo: 500000n }),
    };

    vtuProvider = {
      purchaseData: jest.fn().mockResolvedValue({
        success: true,
        providerReference: 'MOCK_DT_123456',
        providerStatus: 'SUCCESS',
        message: 'Data plan activated successfully',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuthService, useValue: authService },
        { provide: WalletService, useValue: walletService },
        { provide: VTU_PROVIDER, useValue: vtuProvider },
      ],
    }).compile();

    service = module.get<DataService>(DataService);
  });

  describe('getDataPlans', () => {
    it('should return active data plans formatted with selling price in Naira', async () => {
      prisma.dataPlan.findMany.mockResolvedValue([mockPlan]);

      const result = await service.getDataPlans(TelecomNetworkCode.MTN);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].planCode).toBe('MTN-SME-1GB');
      expect(result.data[0].sellingPriceFormatted).toBe('₦250.00');
    });
  });

  describe('purchaseData', () => {
    const validDto = {
      planId: 'plan_mtn_1gb',
      recipientPhone: '08012345678',
      pin: '1234',
      idempotencyKey: 'idem_dat_test_1',
    };

    it('should successfully complete data purchase and debit wallet', async () => {
      prisma.dataPlan.findUnique.mockResolvedValue(mockPlan);
      prisma.transaction.findUnique.mockResolvedValue(null);
      prisma.transaction.create.mockResolvedValue({
        id: 'tx_dat_1',
        reference: 'SP_DAT_123',
      });
      prisma.dataTransaction.create.mockResolvedValue({});
      prisma.transactionItem.create.mockResolvedValue({});
      prisma.transaction.update.mockResolvedValue({});

      const result = await service.purchaseData('usr_test_1', validDto);

      expect(authService.verifyTransactionPin).toHaveBeenCalledWith('usr_test_1', '1234');
      expect(walletService.debitWallet).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          userId: 'usr_test_1',
          amountKobo: 25000n,
        }),
      );
      expect(vtuProvider.purchaseData).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.status).toBe('SUCCESS');
    });

    it('should throw NotFoundException if data plan is not found', async () => {
      prisma.dataPlan.findUnique.mockResolvedValue(null);

      await expect(service.purchaseData('usr_test_1', validDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if network data is disabled', async () => {
      prisma.dataPlan.findUnique.mockResolvedValue({
        ...mockPlan,
        network: { ...mockPlan.network, dataEnabled: false },
      });

      await expect(service.purchaseData('usr_test_1', validDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ConflictException if duplicate idempotency key is submitted', async () => {
      prisma.dataPlan.findUnique.mockResolvedValue(mockPlan);
      prisma.transaction.findUnique.mockResolvedValue({ id: 'existing_tx' });

      await expect(service.purchaseData('usr_test_1', validDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should auto-refund wallet when provider fails', async () => {
      prisma.dataPlan.findUnique.mockResolvedValue(mockPlan);
      prisma.transaction.findUnique.mockResolvedValue(null);
      prisma.transaction.create.mockResolvedValue({
        id: 'tx_dat_1',
        reference: 'SP_DAT_123',
      });
      prisma.dataTransaction.create.mockResolvedValue({});
      prisma.transactionItem.create.mockResolvedValue({});
      prisma.transaction.update.mockResolvedValue({});

      vtuProvider.purchaseData.mockResolvedValue({
        success: false,
        providerReference: 'FAIL_REF_DATA',
        message: 'Recipient number barred from receiving data',
      });

      await expect(service.purchaseData('usr_test_1', validDto)).rejects.toThrow(
        BadRequestException,
      );

      expect(walletService.creditWallet).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          userId: 'usr_test_1',
          amountKobo: 25000n,
        }),
      );
    });
  });
});
