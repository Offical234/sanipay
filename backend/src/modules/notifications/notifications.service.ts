import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { NotificationType } from '@prisma/client';
import { NotificationQueryDto, BroadcastNotificationDto } from './dto/notification.dto';

export interface DispatchNotificationParams {
  userId: string;
  title: string;
  message: string;
  type?: NotificationType;
  metadata?: Record<string, any>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ────────────────────────── INBOX / QUERY ────────────────────────────────

  async getNotifications(userId: string, query: NotificationQueryDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (query.isRead !== undefined) {
      where.isRead = query.isRead;
    }

    const [totalCount, unreadCount, notifications] = await Promise.all([
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          message: true,
          type: true,
          isRead: true,
          metadata: true,
          createdAt: true,
        },
      }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      message: 'Notifications retrieved successfully',
      data: notifications,
      meta: {
        page,
        limit,
        totalCount,
        totalPages,
        unreadCount,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  // ──────────────────────────── UNREAD COUNT ───────────────────────────────

  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });

    return {
      message: 'Unread notification count retrieved',
      data: { unreadCount: count },
    };
  }

  // ────────────────────────── MARK AS READ ─────────────────────────────────

  async markAsRead(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException(`Notification '${notificationId}' not found`);
    }

    if (notification.userId !== userId) {
      throw new ForbiddenException('You do not have permission to mark this notification as read');
    }

    if (notification.isRead) {
      return {
        message: 'Notification is already marked as read',
        data: { id: notificationId, isRead: true },
      };
    }

    await this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });

    return {
      message: 'Notification marked as read',
      data: { id: notificationId, isRead: true },
    };
  }

  // ────────────────────────── MARK ALL AS READ ─────────────────────────────

  async markAllAsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    return {
      message: `${result.count} notification${result.count !== 1 ? 's' : ''} marked as read`,
      data: { updatedCount: result.count },
    };
  }

  // ────────────────────────── DISPATCH (Internal) ──────────────────────────

  async dispatchNotification(params: DispatchNotificationParams) {
    try {
      const notification = await this.prisma.notification.create({
        data: {
          userId: params.userId,
          title: params.title,
          message: params.message,
          type: params.type ?? NotificationType.TRANSACTION,
          metadata: params.metadata ?? undefined,
        },
      });

      this.logger.debug(
        `Notification dispatched to user ${params.userId}: [${params.type ?? 'TRANSACTION'}] ${params.title}`,
      );

      return notification;
    } catch (error) {
      // Non-critical: do not bubble up notification failures to interrupt main flow
      this.logger.error(
        `Failed to dispatch notification to user ${params.userId}: ${error.message}`,
      );
      return null;
    }
  }

  // ───────────────────────── ADMIN BROADCAST ───────────────────────────────

  async broadcastSystemMessage(dto: BroadcastNotificationDto) {
    const activeUsers = await this.prisma.user.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true },
    });

    if (activeUsers.length === 0) {
      return {
        message: 'No active users to broadcast to',
        data: { dispatchedCount: 0 },
      };
    }

    const notifications = activeUsers.map((user) => ({
      userId: user.id,
      title: dto.title,
      message: dto.message,
      type: dto.type ?? NotificationType.SYSTEM,
      metadata: dto.metadata ?? undefined,
    }));

    // createMany for efficient bulk insert
    const result = await this.prisma.notification.createMany({
      data: notifications,
      skipDuplicates: true,
    });

    this.logger.log(
      `Admin broadcast dispatched to ${result.count} users: [${dto.type ?? 'SYSTEM'}] ${dto.title}`,
    );

    return {
      message: `System notification broadcast to ${result.count} active users`,
      data: { dispatchedCount: result.count },
    };
  }
}
