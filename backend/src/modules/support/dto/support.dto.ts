import {
  IsOptional,
  IsEnum,
  IsString,
  IsNotEmpty,
  IsUUID,
  IsInt,
  Min,
  Max,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TicketCategory, TicketStatus, TicketPriority } from '@prisma/client';

export class CreateTicketDto {
  @ApiProperty({ example: 'Wallet funded but airtime not delivered', description: 'Brief subject line (max 255 chars)' })
  @IsNotEmpty()
  @IsString()
  @MinLength(5)
  @MaxLength(255)
  subject: string;

  @ApiProperty({
    enum: TicketCategory,
    example: 'AIRTIME',
    description: 'Service category this ticket relates to',
  })
  @IsEnum(TicketCategory)
  category: TicketCategory;

  @ApiProperty({ example: 'I purchased ₦500 airtime for 0803xxx5678 but it was not delivered after 20 minutes.' })
  @IsNotEmpty()
  @IsString()
  @MinLength(10)
  message: string;

  @ApiPropertyOptional({
    example: 'b2d9f4e0-3a11-4f2f-b9e2-2a9c8d0f4e11',
    description: 'Optional: Link this ticket to a specific transaction UUID',
  })
  @IsOptional()
  @IsUUID()
  transactionId?: string;
}

export class AddMessageDto {
  @ApiProperty({ example: 'Thank you for reaching out. We are looking into this.' })
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  message: string;

  @ApiPropertyOptional({ description: 'Optional attachment URLs or metadata' })
  @IsOptional()
  attachments?: Record<string, any>;
}

export class UpdateTicketStatusDto {
  @ApiProperty({ enum: TicketStatus, example: 'RESOLVED', description: 'New ticket status' })
  @IsEnum(TicketStatus)
  status: TicketStatus;

  @ApiPropertyOptional({ enum: TicketPriority, example: 'HIGH', description: 'Updated priority level' })
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;
}

export class TicketQueryDto {
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

  @ApiPropertyOptional({ enum: TicketStatus })
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @ApiPropertyOptional({ enum: TicketCategory })
  @IsOptional()
  @IsEnum(TicketCategory)
  category?: TicketCategory;

  @ApiPropertyOptional({ enum: TicketPriority })
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;
}
