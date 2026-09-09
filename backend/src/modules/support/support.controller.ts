import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { CurrentUser, Roles } from '../../common/decorators/auth.decorators';
import { SupportService } from './support.service';
import {
  CreateTicketDto,
  AddMessageDto,
  UpdateTicketStatusDto,
  TicketQueryDto,
} from './dto/support.dto';
import { SenderType } from '@prisma/client';

@ApiTags('Customer Support & Tickets')
@ApiBearerAuth()
@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post('tickets')
  @ApiOperation({ summary: 'Open a new support ticket with initial message' })
  @ApiResponse({ status: 201, description: 'Ticket created and notification sent' })
  async createTicket(
    @CurrentUser() user: any,
    @Body() dto: CreateTicketDto,
  ) {
    return this.supportService.createTicket(user.id, dto);
  }

  @Get('tickets')
  @ApiOperation({ summary: 'List support tickets (customers: own tickets; admins/support: all)' })
  @ApiResponse({ status: 200, description: 'Tickets list retrieved' })
  async getTickets(
    @CurrentUser() user: any,
    @Query() query: TicketQueryDto,
  ) {
    return this.supportService.getTickets(user.id, query, user.role);
  }

  @Get('tickets/:id')
  @ApiOperation({ summary: 'Get full ticket details including threaded messages' })
  @ApiParam({ name: 'id', description: 'Ticket UUID' })
  @ApiResponse({ status: 200, description: 'Ticket details retrieved' })
  @ApiResponse({ status: 403, description: 'Forbidden: Not your ticket' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  async getTicketById(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.supportService.getTicketById(user.id, id, user.role);
  }

  @Post('tickets/:id/messages')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add a reply message to a support ticket thread' })
  @ApiParam({ name: 'id', description: 'Ticket UUID' })
  @ApiResponse({ status: 200, description: 'Message added to thread' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  async addMessage(
    @CurrentUser() user: any,
    @Param('id') ticketId: string,
    @Body() dto: AddMessageDto,
  ) {
    const senderType =
      user.role === 'SUPER_ADMIN' || user.role === 'SUPPORT'
        ? SenderType.ADMIN
        : SenderType.USER;

    return this.supportService.addMessage(user.id, ticketId, dto, senderType);
  }

  @Patch('tickets/:id/status')
  @Roles('SUPER_ADMIN', 'SUPPORT')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin: Update ticket status and priority' })
  @ApiParam({ name: 'id', description: 'Ticket UUID' })
  @ApiResponse({ status: 200, description: 'Ticket status updated, user notified on resolution' })
  @ApiResponse({ status: 403, description: 'Forbidden: Admin/Support access required' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  async updateStatus(
    @CurrentUser() user: any,
    @Param('id') ticketId: string,
    @Body() dto: UpdateTicketStatusDto,
  ) {
    return this.supportService.updateTicketStatus(user.id, ticketId, dto);
  }
}
