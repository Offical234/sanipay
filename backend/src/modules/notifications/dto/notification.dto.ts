import {
  IsOptional,
  IsBoolean,
  IsEnum,
  IsString,
  IsInt,
  Min,
  Max,
  IsNotEmpty,
  MaxLength,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType } from '@prisma/client';

export class NotificationQueryDto {
  @ApiPropertyOptional({ example: 1, description: 'Page number (starts at 1)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, description: 'Items per page (max 100)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ example: false, description: 'Filter by read status (true = read only, false = unread only)' })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  isRead?: boolean;
}

export class BroadcastNotificationDto {
  @ApiProperty({ example: 'System Maintenance', description: 'Notification title (max 255 chars)' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiProperty({ example: 'Scheduled downtime on Sunday 02:00–04:00 WAT.', description: 'Notification body message' })
  @IsNotEmpty()
  @IsString()
  message: string;

  @ApiPropertyOptional({
    enum: NotificationType,
    example: 'SYSTEM',
    description: 'Notification category type',
  })
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType = NotificationType.SYSTEM;

  @ApiPropertyOptional({ description: 'Optional metadata JSON payload' })
  @IsOptional()
  metadata?: Record<string, any>;
}
