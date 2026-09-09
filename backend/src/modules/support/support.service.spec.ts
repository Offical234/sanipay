import { Test, TestingModule } from '@nestjs/testing';
import { SupportService } from './support.service';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { TicketStatus, TicketCategory, TicketPriority, SenderType } from '@prisma/client';

describe('SupportService', () => {
  let service: SupportService;
  let prisma: any;
  let notificationsService: any;

  const mockTicket = {
    id: 'tkt-1',
    userId: 'user-1',
    ticketNumber: 'TKT-20260906-ABCD',
    subject: 'Airtime not delivered',
    category: TicketCategory.AIRTIME,
    status: TicketStatus.OPEN,
    priority: TicketPriority.MEDIUM,
    transactionId: null,
    createdAt: new Date('2026-09-06'),
    updatedAt: new Date('2026-09-06'),
    messages: [],
    user: {
      id: 'user-1',
      email: 'musa@example.com',
      phone: '08012345678',
      profile: { fullName: 'Musa Sani' },
    },
    transaction: null,
    _count: { messages: 1 },
  };

  const mockPrismaService: any = {
    supportTicket: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    supportMessage: {
      create: jest.fn(),
    },
    $transaction: jest.fn((cb: any): any => cb(mockPrismaService)),
  };

  const mockNotificationsService = {
    dispatchNotification: jest.fn().mockResolvedValue({ id: 'notif-1' }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupportService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<SupportService>(SupportService);
    prisma = module.get<PrismaService>(PrismaService);
    notificationsService = module.get<NotificationsService>(NotificationsService);
  });

  describe('createTicket', () => {
    it('should create ticket with unique ticket number and initial message', async () => {
      const createdTicket = { ...mockTicket, messages: [{ id: 'msg-1' }] };
      prisma.supportTicket.create.mockResolvedValue(createdTicket);

      const result = await service.createTicket('user-1', {
        subject: 'Airtime not delivered',
        category: TicketCategory.AIRTIME,
        message: 'I bought ₦500 airtime 30 mins ago but it was not delivered.',
      });

      expect(prisma.supportTicket.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            subject: 'Airtime not delivered',
            category: TicketCategory.AIRTIME,
            status: TicketStatus.OPEN,
          }),
        }),
      );

      // Ticket number format: TKT-YYYYMMDD-XXXX
      expect(result.data.ticketNumber).toMatch(/^TKT-\d{8}-[A-Z0-9]{4}$/);

      // Verify dispatch notification was called
      expect(notificationsService.dispatchNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          title: 'Support Ticket Opened',
        }),
      );
    });
  });

  describe('getTickets', () => {
    it('should scope tickets to userId for customers', async () => {
      prisma.supportTicket.count.mockResolvedValue(1);
      prisma.supportTicket.findMany.mockResolvedValue([mockTicket]);

      const result = await service.getTickets('user-1', { page: 1, limit: 10 }, 'CUSTOMER');

      expect(prisma.supportTicket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'user-1' }),
        }),
      );
      expect(result.data.length).toBe(1);
    });

    it('should return all tickets for admins without scoping by userId', async () => {
      prisma.supportTicket.count.mockResolvedValue(3);
      prisma.supportTicket.findMany.mockResolvedValue([mockTicket]);

      await service.getTickets('admin-1', { page: 1, limit: 10 }, 'SUPER_ADMIN');

      const callArg = prisma.supportTicket.findMany.mock.calls[0][0];
      expect(callArg.where.userId).toBeUndefined();
    });

    it('should filter by status when provided', async () => {
      prisma.supportTicket.count.mockResolvedValue(1);
      prisma.supportTicket.findMany.mockResolvedValue([mockTicket]);

      await service.getTickets('user-1', { page: 1, limit: 10, status: TicketStatus.OPEN }, 'CUSTOMER');

      expect(prisma.supportTicket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: TicketStatus.OPEN }),
        }),
      );
    });
  });

  describe('getTicketById', () => {
    it('should return full ticket details with messages for owner', async () => {
      prisma.supportTicket.findUnique.mockResolvedValue({
        ...mockTicket,
        messages: [{ id: 'msg-1', senderType: SenderType.USER, message: 'Hi', createdAt: new Date() }],
      });

      const result = await service.getTicketById('user-1', 'tkt-1', 'CUSTOMER');

      expect(result.data.id).toBe('tkt-1');
      expect(result.data.messages.length).toBe(1);
    });

    it('should throw NotFoundException for non-existent ticket', async () => {
      prisma.supportTicket.findUnique.mockResolvedValue(null);

      await expect(service.getTicketById('user-1', 'bad-id', 'CUSTOMER')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when customer accesses another user ticket', async () => {
      prisma.supportTicket.findUnique.mockResolvedValue({
        ...mockTicket,
        userId: 'other-user',
        messages: [],
        transaction: null,
      });

      await expect(service.getTicketById('user-1', 'tkt-1', 'CUSTOMER')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should allow admin to access any ticket', async () => {
      prisma.supportTicket.findUnique.mockResolvedValue({
        ...mockTicket,
        userId: 'other-user',
        messages: [],
        transaction: null,
      });

      const result = await service.getTicketById('admin-1', 'tkt-1', 'SUPER_ADMIN');
      expect(result.data.id).toBe('tkt-1');
    });
  });

  describe('addMessage', () => {
    it('should add a customer message to a ticket thread', async () => {
      prisma.supportTicket.findUnique.mockResolvedValue(mockTicket);
      prisma.supportMessage.create.mockResolvedValue({
        id: 'msg-new-1',
        ticketId: 'tkt-1',
        senderType: SenderType.USER,
        message: 'Please check this urgently.',
        createdAt: new Date(),
      });
      prisma.supportTicket.update.mockResolvedValue(mockTicket);

      const result = await service.addMessage(
        'user-1',
        'tkt-1',
        { message: 'Please check this urgently.' },
        SenderType.USER,
      );

      expect(prisma.supportMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ticketId: 'tkt-1',
            senderId: 'user-1',
            senderType: SenderType.USER,
          }),
        }),
      );
      expect(result.data.senderType).toBe(SenderType.USER);
    });

    it('should notify ticket owner when admin replies', async () => {
      prisma.supportTicket.findUnique.mockResolvedValue({ ...mockTicket, userId: 'user-1' });
      prisma.supportMessage.create.mockResolvedValue({
        id: 'msg-admin-1',
        ticketId: 'tkt-1',
        senderType: SenderType.ADMIN,
        message: 'We are looking into this.',
        createdAt: new Date(),
      });
      prisma.supportTicket.update.mockResolvedValue(mockTicket);

      await service.addMessage(
        'admin-1',
        'tkt-1',
        { message: 'We are looking into this.' },
        SenderType.ADMIN,
      );

      expect(notificationsService.dispatchNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          title: expect.stringContaining('TKT-20260906-ABCD'),
        }),
      );
    });
  });

  describe('updateTicketStatus', () => {
    it('should update ticket status to RESOLVED and notify user', async () => {
      prisma.supportTicket.findUnique.mockResolvedValue(mockTicket);
      prisma.supportTicket.update.mockResolvedValue({
        ...mockTicket,
        status: TicketStatus.RESOLVED,
      });

      const result = await service.updateTicketStatus('admin-1', 'tkt-1', {
        status: TicketStatus.RESOLVED,
      });

      expect(prisma.supportTicket.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: TicketStatus.RESOLVED }),
        }),
      );
      expect(notificationsService.dispatchNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          title: expect.stringContaining('Resolved'),
        }),
      );
      expect(result.data.status).toBe(TicketStatus.RESOLVED);
    });
  });
});
