import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { TelecomNetworkCode } from '@prisma/client';
import { AirtimeService } from './airtime.service';
import { PrismaService } from '../../database/prisma.service';
import { AuthService } from '../auth/auth.service';
import { WalletService } from '../wallet/wallet.service';
import { VTU_PROVIDER } from '../../providers/vtu/vtu-provider.token';

describe('AirtimeService', () => {
  let service: AirtimeService;
  let prisma: any;
  let authService: any;
  let walletService: any;
  let vtuProvider: any;

  const mockNetwork = {
    id: 'net_mtn_123',
    code: TelecomNetworkCode.MTN,
    name: 'MTN Nigeria',
    airtimeDiscountBps: 200, // 2.00%
    isActive: true,
    airtimeEnabled: true,
    dataEnabled: true,
  };

  beforeEach(async () => {
    prisma = {
      network: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      transaction: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      airtimeTransaction: {
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
      debitWallet: jest.fn().mockResolvedValue({ balanceBeforeKobo: 500000n, balanceAfterKobo: 402000n }),
      creditWallet: jest.fn().mockResolvedValue({ balanceBeforeKobo: 402000n, balanceAfterKobo: 500000n }),
    };

    vtuProvider = {
      purchaseAirtime: jest.fn().mockResolvedValue({
        success: true,
        providerReference: 'MOCK_AT_123456',
        providerStatus: 'SUCCESS',
        message: 'Airtime delivered successfully',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AirtimeService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuthService, useValue: authService },
        { provide: WalletService, useValue: walletService },
        { provide: VTU_PROVIDER, useValue: vtuProvider },
      ],
    }).compile();

    service = module.get<AirtimeService>(AirtimeService);
  });

  describe('getNetworks', () => {
    it('should return list of active telecom networks with discount percentage', async () => {
      prisma.network.findMany.mockResolvedValue([mockNetwork]);

      const result = await service.getNetworks();

      expect(result.data).toHaveLength(1);
      expect(result.data[0].code).toBe(TelecomNetworkCode.MTN);
      expect(result.data[0].discountPercent).toBe('2.00%');
    });
  });

  describe('purchaseAirtime', () => {
    const validDto = {
      networkCode: TelecomNetworkCode.MTN,
      recipientPhone: '08012345678',
      amountKobo: 100000, // ₦1,000.00
      pin: '1234',
      idempotencyKey: 'idem_air_test_1',
    };

    it('should successfully complete airtime purchase with 2% discount applied', async () => {
      prisma.network.findUnique.mockResolvedValue(mockNetwork);
      prisma.transaction.findUnique.mockResolvedValue(null);
      prisma.transaction.create.mockResolvedValue({
        id: 'tx_air_1',
        reference: 'SP_AIR_123',
        status: 'PROCESSING',
      });
      prisma.airtimeTransaction.create.mockResolvedValue({});
      prisma.transactionItem.create.mockResolvedValue({});
      prisma.transaction.update.mockResolvedValue({});
      prisma.airtimeTransaction.update.mockResolvedValue({});

      const result = await service.purchaseAirtime('usr_test_1', validDto);

      expect(authService.verifyTransactionPin).toHaveBeenCalledWith('usr_test_1', '1234');
      expect(walletService.debitWallet).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          userId: 'usr_test_1',
          amountKobo: 98000n, // ₦1,000 - 2% (₦20) = ₦980 (98,000 Kobo)
        }),
      );
      expect(vtuProvider.purchaseAirtime).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.status).toBe('SUCCESS');
      expect(result.discountKobo).toBe('2000');
    });

    it('should reject purchase if network is inactive or not found', async () => {
      prisma.network.findUnique.mockResolvedValue(null);

      await expect(service.purchaseAirtime('usr_test_1', validDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject duplicate idempotency key with ConflictException', async () => {
      prisma.network.findUnique.mockResolvedValue(mockNetwork);
      prisma.transaction.findUnique.mockResolvedValue({ id: 'existing_tx' });

      await expect(service.purchaseAirtime('usr_test_1', validDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should reject purchase if PIN verification fails', async () => {
      authService.verifyTransactionPin.mockRejectedValue(
        new UnauthorizedException('Invalid transaction PIN.'),
      );

      await expect(service.purchaseAirtime('usr_test_1', validDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should auto-refund wallet when provider fails', async () => {
      prisma.network.findUnique.mockResolvedValue(mockNetwork);
      prisma.transaction.findUnique.mockResolvedValue(null);
      prisma.transaction.create.mockResolvedValue({
        id: 'tx_air_1',
        reference: 'SP_AIR_123',
      });
      prisma.airtimeTransaction.create.mockResolvedValue({});
      prisma.transactionItem.create.mockResolvedValue({});
      prisma.transaction.update.mockResolvedValue({});
      prisma.airtimeTransaction.update.mockResolvedValue({});

      vtuProvider.purchaseAirtime.mockResolvedValue({
        success: false,
        providerReference: 'FAIL_REF_123',
        message: 'Network provider timeout',
      });

      await expect(service.purchaseAirtime('usr_test_1', validDto)).rejects.toThrow(
        BadRequestException,
      );

      expect(walletService.creditWallet).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          userId: 'usr_test_1',
          amountKobo: 98000n,
        }),
      );
    });
  });
});
