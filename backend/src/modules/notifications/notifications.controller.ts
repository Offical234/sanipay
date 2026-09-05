import { Controller, Get, Put, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Notifications & Inbox')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  @Get()
  @ApiOperation({ summary: 'Get user notification inbox' })
  async getNotifications() {
    return {
      message: 'Notifications retrieved successfully',
      data: [],
    };
  }

  @Put(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  async markAsRead(@Param('id') id: string) {
    return {
      message: 'Notification marked as read',
    };
  }
}
