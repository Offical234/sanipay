import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../../database/prisma.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { NotificationType } from '@prisma/client';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: any;

  const mockNotification = {
    id: 'notif-1',
    userId: 'user-1',
    title: 'Transfer Sent',
    message: '₦1,000.00 sent to Amina B.',
    type: NotificationType.WALLET,
    isRead: false,
    metadata: null,
    createdAt: new Date('2026-09-06'),
  };

  const mockPrismaService: any = {
    notification: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('getNotifications', () => {
    it('should return paginated inbox with unread count in meta', async () => {
      prisma.notification.count
        .mockResolvedValueOnce(5) // totalCount
        .mockResolvedValueOnce(3); // unreadCount

      prisma.notification.findMany.mockResolvedValue([mockNotification]);

      const result = await service.getNotifications('user-1', { page: 1, limit: 10 });

      expect(result.data.length).toBe(1);
      expect(result.data[0].title).toBe('Transfer Sent');
      expect(result.meta.totalCount).toBe(5);
      expect(result.meta.unreadCount).toBe(3);
      expect(result.meta.hasNextPage).toBe(false);
    });

    it('should filter by isRead when provided', async () => {
      prisma.notification.count.mockResolvedValue(2);
      prisma.notification.findMany.mockResolvedValue([mockNotification]);

      await service.getNotifications('user-1', { page: 1, limit: 10, isRead: false });

      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1', isRead: false },
        }),
      );
    });
  });

  describe('getUnreadCount', () => {
    it('should return count of unread notifications', async () => {
      prisma.notification.count.mockResolvedValue(7);

      const result = await service.getUnreadCount('user-1');

      expect(result.data.unreadCount).toBe(7);
      expect(prisma.notification.count).toHaveBeenCalledWith({
        where: { userId: 'user-1', isRead: false },
      });
    });
  });

  describe('markAsRead', () => {
    it('should mark a notification as read for the owner', async () => {
      prisma.notification.findUnique.mockResolvedValue({ ...mockNotification, isRead: false });
      prisma.notification.update.mockResolvedValue({ ...mockNotification, isRead: true });

      const result = await service.markAsRead('user-1', 'notif-1');

      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'notif-1' },
        data: { isRead: true },
      });
      expect(result.data.isRead).toBe(true);
    });

    it('should throw NotFoundException for missing notification', async () => {
      prisma.notification.findUnique.mockResolvedValue(null);

      await expect(service.markAsRead('user-1', 'bad-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when userId does not own the notification', async () => {
      prisma.notification.findUnique.mockResolvedValue({
        ...mockNotification,
        userId: 'other-user',
      });

      await expect(service.markAsRead('user-1', 'notif-1')).rejects.toThrow(ForbiddenException);
    });

    it('should return immediately if already read without updating', async () => {
      prisma.notification.findUnique.mockResolvedValue({ ...mockNotification, isRead: true });

      const result = await service.markAsRead('user-1', 'notif-1');

      expect(prisma.notification.update).not.toHaveBeenCalled();
      expect(result.data.isRead).toBe(true);
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all unread notifications as read and return count', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 5 });

      const result = await service.markAllAsRead('user-1');

      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', isRead: false },
        data: { isRead: true },
      });
      expect(result.data.updatedCount).toBe(5);
    });
  });

  describe('dispatchNotification', () => {
    it('should create a notification record with correct fields', async () => {
      prisma.notification.create.mockResolvedValue({ ...mockNotification, id: 'notif-new-1' });

      const result = await service.dispatchNotification({
        userId: 'user-1',
        title: 'Transfer Sent',
        message: '₦1,000 sent.',
        type: NotificationType.WALLET,
      });

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          title: 'Transfer Sent',
          type: NotificationType.WALLET,
        }),
      });
      expect(result).not.toBeNull();
    });

    it('should silently swallow errors and return null on failure', async () => {
      prisma.notification.create.mockRejectedValue(new Error('DB connection lost'));

      const result = await service.dispatchNotification({
        userId: 'user-1',
        title: 'Test',
        message: 'Testing',
      });

      expect(result).toBeNull();
    });
  });

  describe('broadcastSystemMessage', () => {
    it('should create notifications for all active users', async () => {
      prisma.user.findMany.mockResolvedValue([
        { id: 'user-1' },
        { id: 'user-2' },
        { id: 'user-3' },
      ]);
      prisma.notification.createMany.mockResolvedValue({ count: 3 });

      const result = await service.broadcastSystemMessage({
        title: 'System Maintenance',
        message: 'Server will be down Sunday 2AM.',
        type: NotificationType.SYSTEM,
      });

      expect(prisma.notification.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ userId: 'user-1', title: 'System Maintenance' }),
          expect.objectContaining({ userId: 'user-2' }),
          expect.objectContaining({ userId: 'user-3' }),
        ]),
        skipDuplicates: true,
      });
      expect(result.data.dispatchedCount).toBe(3);
    });

    it('should return 0 dispatched count when no active users exist', async () => {
      prisma.user.findMany.mockResolvedValue([]);

      const result = await service.broadcastSystemMessage({
        title: 'Test',
        message: 'Empty',
      });

      expect(result.data.dispatchedCount).toBe(0);
      expect(prisma.notification.createMany).not.toHaveBeenCalled();
    });
  });
});
