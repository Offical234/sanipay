import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  CreateTicketDto,
  AddMessageDto,
  UpdateTicketStatusDto,
  TicketQueryDto,
} from './dto/support.dto';
import { Prisma, TicketStatus, SenderType } from '@prisma/client';

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ──────────────────────────── CREATE TICKET ──────────────────────────────

  async createTicket(userId: string, dto: CreateTicketDto) {
    const ticketNumber = this._generateTicketNumber();

    const ticket = await this.prisma.$transaction(async (tx) => {
      const newTicket = await tx.supportTicket.create({
        data: {
          userId,
          ticketNumber,
          subject: dto.subject,
          category: dto.category,
          status: TicketStatus.OPEN,
          transactionId: dto.transactionId ?? null,
          messages: {
            create: {
              senderId: userId,
              senderType: SenderType.USER,
              message: dto.message,
              attachments: Prisma.JsonNull,
            },
          },
        },
        include: {
          messages: true,
        },
      });

      return newTicket;
    });

    // Notify user that ticket was opened
    await this.notificationsService.dispatchNotification({
      userId,
      title: 'Support Ticket Opened',
      message: `Your support ticket #${ticketNumber} has been received. We'll respond within 24 hours.`,
      type: 'SYSTEM',
      metadata: { ticketId: ticket.id, ticketNumber },
    });

    this.logger.log(`Support ticket ${ticketNumber} created by user ${userId}`);

    return {
      message: 'Support ticket created successfully',
      data: {
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
        category: ticket.category,
        status: ticket.status,
        priority: ticket.priority,
        createdAt: ticket.createdAt,
      },
    };
  }

  // ──────────────────────────── LIST TICKETS ───────────────────────────────

  async getTickets(userId: string, query: TicketQueryDto, userRole?: string) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const isAdmin = userRole === 'SUPER_ADMIN' || userRole === 'SUPPORT';
    const where: any = {};

    // Customers can only see their own tickets
    if (!isAdmin) {
      where.userId = userId;
    }

    if (query.status) where.status = query.status;
    if (query.category) where.category = query.category;
    if (query.priority) where.priority = query.priority;

    const [totalCount, tickets] = await Promise.all([
      this.prisma.supportTicket.count({ where }),
      this.prisma.supportTicket.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              phone: true,
              profile: { select: { fullName: true } },
            },
          },
          _count: { select: { messages: true } },
        },
      }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      message: 'Support tickets retrieved successfully',
      data: tickets.map((t) => ({
        id: t.id,
        ticketNumber: t.ticketNumber,
        subject: t.subject,
        category: t.category,
        status: t.status,
        priority: t.priority,
        messageCount: t._count.messages,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        // Include user details for admins
        ...(isAdmin && {
          user: {
            id: t.user.id,
            email: t.user.email,
            fullName: t.user.profile?.fullName,
          },
        }),
      })),
      meta: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  // ─────────────────────────── TICKET DETAILS ──────────────────────────────

  async getTicketById(userId: string, ticketId: string, userRole?: string) {
    const isAdmin = userRole === 'SUPER_ADMIN' || userRole === 'SUPPORT';

    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            profile: { select: { fullName: true } },
          },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            senderId: true,
            senderType: true,
            message: true,
            attachments: true,
            createdAt: true,
          },
        },
        transaction: {
          select: {
            id: true,
            reference: true,
            type: true,
            status: true,
            amountKobo: true,
          },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket '${ticketId}' not found`);
    }

    if (!isAdmin && ticket.userId !== userId) {
      throw new ForbiddenException('You do not have permission to view this ticket');
    }

    return {
      message: 'Support ticket retrieved successfully',
      data: {
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
        category: ticket.category,
        status: ticket.status,
        priority: ticket.priority,
        user: isAdmin
          ? {
              id: ticket.user.id,
              email: ticket.user.email,
              fullName: ticket.user.profile?.fullName,
            }
          : undefined,
        linkedTransaction: ticket.transaction
          ? {
              id: ticket.transaction.id,
              reference: ticket.transaction.reference,
              type: ticket.transaction.type,
              status: ticket.transaction.status,
              amountKobo: ticket.transaction.amountKobo?.toString(),
            }
          : null,
        messages: ticket.messages,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
      },
    };
  }

  // ──────────────────────────── ADD MESSAGE ────────────────────────────────

  async addMessage(
    senderId: string,
    ticketId: string,
    dto: AddMessageDto,
    senderType: SenderType,
  ) {
    const isAdmin = senderType === SenderType.ADMIN;

    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket '${ticketId}' not found`);
    }

    // Customer ownership check
    if (!isAdmin && ticket.userId !== senderId) {
      throw new ForbiddenException('You do not have permission to reply to this ticket');
    }

    // Admin cannot message on another agent's own ticket (open only)
    if (!isAdmin && (ticket.status === TicketStatus.RESOLVED || ticket.status === TicketStatus.CLOSED)) {
      // Reopen if customer sends a new message on a resolved/closed ticket
      await this.prisma.supportTicket.update({
        where: { id: ticketId },
        data: { status: TicketStatus.OPEN },
      });
      this.logger.log(`Ticket ${ticket.ticketNumber} reopened by customer reply`);
    }

    const message = await this.prisma.supportMessage.create({
      data: {
        ticketId,
        senderId,
        senderType,
        message: dto.message,
        attachments: dto.attachments ?? Prisma.JsonNull,
      },
    });

    // Update ticket updatedAt
    await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: { updatedAt: new Date() },
    });

    // Notify customer when agent replies
    if (isAdmin && ticket.userId !== senderId) {
      await this.notificationsService.dispatchNotification({
        userId: ticket.userId,
        title: `Reply on Ticket #${ticket.ticketNumber}`,
        message: `A support agent has responded to your ticket: "${ticket.subject}"`,
        type: 'SYSTEM',
        metadata: { ticketId, ticketNumber: ticket.ticketNumber },
      });
    }

    return {
      message: 'Message sent successfully',
      data: {
        id: message.id,
        ticketId: message.ticketId,
        senderType: message.senderType,
        message: message.message,
        createdAt: message.createdAt,
      },
    };
  }

  // ───────────────────────── UPDATE TICKET STATUS ──────────────────────────

  async updateTicketStatus(
    adminUserId: string,
    ticketId: string,
    dto: UpdateTicketStatusDto,
  ) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket '${ticketId}' not found`);
    }

    const updated = await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        status: dto.status,
        ...(dto.priority && { priority: dto.priority }),
      },
    });

    // Notify user on resolution or closure
    if (dto.status === TicketStatus.RESOLVED || dto.status === TicketStatus.CLOSED) {
      await this.notificationsService.dispatchNotification({
        userId: ticket.userId,
        title: `Ticket #${ticket.ticketNumber} ${dto.status === TicketStatus.RESOLVED ? 'Resolved' : 'Closed'}`,
        message:
          dto.status === TicketStatus.RESOLVED
            ? `Your support ticket "${ticket.subject}" has been marked as resolved. Please re-open if the issue persists.`
            : `Your support ticket "${ticket.subject}" has been closed. Contact us again if you need further assistance.`,
        type: 'SYSTEM',
        metadata: { ticketId, ticketNumber: ticket.ticketNumber, status: dto.status },
      });
    }

    this.logger.log(
      `Ticket ${ticket.ticketNumber} status updated to ${dto.status} by admin ${adminUserId}`,
    );

    return {
      message: `Ticket status updated to ${dto.status}`,
      data: {
        id: updated.id,
        ticketNumber: updated.ticketNumber,
        status: updated.status,
        priority: updated.priority,
        updatedAt: updated.updatedAt,
      },
    };
  }

  // ───────────────────────────── UTILITIES ─────────────────────────────────

  private _generateTicketNumber(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `TKT-${year}${month}${day}-${suffix}`;
  }
}
