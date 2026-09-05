import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Customer Support & Tickets')
@ApiBearerAuth()
@Controller('support')
export class SupportController {
  @Get('tickets')
  @ApiOperation({ summary: 'List user support tickets' })
  async getTickets() {
    return {
      message: 'Support tickets retrieved successfully',
      data: [],
    };
  }

  @Post('tickets')
  @ApiOperation({ summary: 'Open a new customer support ticket' })
  async createTicket(@Body() body: Record<string, any>) {
    return {
      message: 'Support ticket created successfully',
    };
  }

  @Post('tickets/:id/messages')
  @ApiOperation({ summary: 'Send a message reply in support ticket' })
  async addTicketMessage(
    @Param('id') ticketId: string,
    @Body() body: Record<string, any>,
  ) {
    return {
      message: 'Ticket message sent successfully',
    };
  }
}
