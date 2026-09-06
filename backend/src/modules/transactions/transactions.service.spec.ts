import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { TransactionType, TransactionStatus } from '@prisma/client';
import { TransactionsService } from './transactions.service';
import { PrismaService } from '../../database/prisma.service';

describe('TransactionsService', () => {
  let service: TransactionsService;
  let prisma: any;

  const mockTx = {
    id: 'b7c3d284-e9fb-4b53-a55b-4264627d7801',
    userId: 'usr_customer_1',
    reference: 'SP_AIR_12345678',
    idempotencyKey: 'idem_air_1',
    type: TransactionType.AIRTIME,
    status: TransactionStatus.SUCCESS,
    amountKobo: 100000n,
    feeKobo: 0n,
    discountKobo: 2000n,
    netAmountKobo: 98000n,
    currency: 'NGN',
    providerName: 'MOCK',
    providerReference: 'MOCK_AT_998877',
    failureReason: null,
    metadata: {},
    createdAt: new Date('2026-09-01T10:00:00Z'),
    updatedAt: new Date('2026-09-01T10:00:05Z'),
    user: {
      id: 'usr_customer_1',
      email: 'customer@example.com',
      phone: '08012345678',
      profile: { fullName: 'Musa Sani' },
    },
    airtimeTransaction: {
      recipientPhone: '08012345678',
      discountKobo: 2000n,
      network: { id: 'net_1', name: 'MTN Nigeria', code: 'MTN' },
    },
    dataTransaction: null,
    electricityTransaction: null,
    cableTransaction: null,
    paymentTransaction: null,
    transactionItems: [
      {
        id: 'item_1',
        itemName: 'MTN ₦1,000.00 Airtime',
        itemType: 'AIRTIME',
        quantity: 1,
        unitPriceKobo: 100000n,
        totalKobo: 100000n,
      },
    ],
    walletTransactions: [],
  };

  const mockElectricityTx = {
    id: 'e4a2c184-d113-4608-8e6d-74d41286a222',
    userId: 'usr_customer_1',
    reference: 'SP_ELE_98765432',
    idempotencyKey: 'idem_ele_1',
    type: TransactionType.ELECTRICITY,
    status: TransactionStatus.SUCCESS,
    amountKobo: 500000n,
    feeKobo: 10000n,
    discountKobo: 0n,
    netAmountKobo: 510000n,
    currency: 'NGN',
    providerName: 'MOCK',
    providerReference: 'MOCK_EL_112233',
    createdAt: new Date('2026-09-02T12:00:00Z'),
    updatedAt: new Date('2026-09-02T12:00:05Z'),
    user: {
      id: 'usr_customer_1',
      email: 'customer@example.com',
      phone: '08012345678',
      profile: { fullName: 'Musa Sani' },
    },
    airtimeTransaction: null,
    dataTransaction: null,
    electricityTransaction: {
      meterNumber: '01234567890',
      meterType: 'PREPAID',
      customerName: 'Adebayo Okafor',
      customerAddress: '14 Ikeja GRA, Lagos',
      token: '1234-5678-9012-3456',
      units: '109.89 kWh',
      receiptNumber: 'RCP9988776655',
      provider: { name: 'Ikeja Electric', code: 'IKEDC' },
    },
    cableTransaction: null,
    paymentTransaction: null,
    transactionItems: [],
    walletTransactions: [],
  };

  beforeEach(async () => {
    prisma = {
      transaction: {
        count: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
  });

  describe('getTransactions', () => {
    it('should return paginated transactions list with calculated metadata', async () => {
      prisma.transaction.count.mockResolvedValue(1);
      prisma.transaction.findMany.mockResolvedValue([mockTx]);

      const result = await service.getTransactions('usr_customer_1', { page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].reference).toBe('SP_AIR_12345678');
      expect(result.data[0].amountFormatted).toBe('₦1,000.00');
      expect(result.data[0].netAmountFormatted).toBe('₦980.00');
      expect(result.meta.totalCount).toBe(1);
      expect(result.meta.totalPages).toBe(1);
      expect(result.meta.hasNextPage).toBe(false);
    });

    it('should filter by transaction type and status', async () => {
      prisma.transaction.count.mockResolvedValue(1);
      prisma.transaction.findMany.mockResolvedValue([mockTx]);

      await service.getTransactions('usr_customer_1', {
        type: TransactionType.AIRTIME,
        status: TransactionStatus.SUCCESS,
      });

      expect(prisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'usr_customer_1',
            type: TransactionType.AIRTIME,
            status: TransactionStatus.SUCCESS,
          }),
        }),
      );
    });

    it('should allow SUPER_ADMIN to query transactions across all users', async () => {
      prisma.transaction.count.mockResolvedValue(2);
      prisma.transaction.findMany.mockResolvedValue([mockTx, mockElectricityTx]);

      await service.getTransactions('usr_admin_1', {}, 'SUPER_ADMIN');

      expect(prisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({
            userId: 'usr_admin_1',
          }),
        }),
      );
    });
  });

  describe('getTransactionDetails', () => {
    it('should generate rich digital receipt including prepaid electricity token and units', async () => {
      prisma.transaction.findFirst.mockResolvedValue(mockElectricityTx);

      const result = await service.getTransactionDetails(
        'usr_customer_1',
        'SP_ELE_98765432',
      );

      expect(result.data.receiptNumber).toBe('SP_ELE_98765432');
      expect(result.data.status).toBe(TransactionStatus.SUCCESS);
      expect(result.data.serviceDetails.category).toBe('ELECTRICITY');
      expect(result.data.serviceDetails.token).toBe('1234-5678-9012-3456');
      expect(result.data.serviceDetails.units).toBe('109.89 kWh');
      expect(result.data.totalPaidFormatted).toBe('₦5,100.00');
      expect(result.data.verificationSeal).toContain('SANIPAY-CERT');
    });

    it('should throw NotFoundException if transaction is not found', async () => {
      prisma.transaction.findFirst.mockResolvedValue(null);

      await expect(
        service.getTransactionDetails('usr_customer_1', 'NON_EXISTENT_ID'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user tries to view another customer receipt', async () => {
      prisma.transaction.findFirst.mockResolvedValue(mockTx); // owned by usr_customer_1

      await expect(
        service.getTransactionDetails('usr_intruder_99', mockTx.id, 'CUSTOMER'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow SUPER_ADMIN to view another customer receipt', async () => {
      prisma.transaction.findFirst.mockResolvedValue(mockTx);

      const result = await service.getTransactionDetails(
        'usr_admin_1',
        mockTx.id,
        'SUPER_ADMIN',
      );

      expect(result.data.receiptNumber).toBe('SP_AIR_12345678');
    });
  });

  describe('getTransactionSummary', () => {
    it('should calculate total funded and total spent metrics', async () => {
      prisma.transaction.findMany.mockResolvedValue([
        {
          type: 'WALLET_FUNDING',
          amountKobo: 500000n,
          netAmountKobo: 500000n,
        },
        {
          type: 'AIRTIME',
          amountKobo: 100000n,
          netAmountKobo: 98000n,
        },
        {
          type: 'ELECTRICITY',
          amountKobo: 500000n,
          netAmountKobo: 510000n,
        },
      ]);

      const result = await service.getTransactionSummary('usr_customer_1');

      expect(result.data.totalFundedFormatted).toBe('₦5,000.00');
      expect(result.data.totalSpentFormatted).toBe('₦6,080.00');
      expect(result.data.totalSuccessfulTransactions).toBe(3);
    });
  });
});
