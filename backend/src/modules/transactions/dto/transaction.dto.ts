import {
  IsOptional,
  IsEnum,
  IsString,
  IsInt,
  Min,
  Max,
  IsDateString,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { TransactionType, TransactionStatus } from '@prisma/client';

export class TransactionQueryDto {
  @ApiPropertyOptional({ example: 1, description: 'Page number for pagination (starts at 1)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, description: 'Number of items per page (max 100)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    enum: TransactionType,
    description: 'Filter by transaction type: AIRTIME, DATA, ELECTRICITY, CABLE_TV, WALLET_FUNDING, WALLET_TRANSFER, etc.',
  })
  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;

  @ApiPropertyOptional({
    enum: TransactionStatus,
    description: 'Filter by status: PENDING, PROCESSING, SUCCESS, FAILED, REFUNDED',
  })
  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;

  @ApiPropertyOptional({
    example: '2026-09-01T00:00:00.000Z',
    description: 'Filter transactions created on or after this ISO-8601 timestamp',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    example: '2026-09-30T23:59:59.999Z',
    description: 'Filter transactions created on or before this ISO-8601 timestamp',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    example: '08012345678',
    description: 'Free-text search query (searches reference, recipient phone, meter number, or smartcard number)',
  })
  @IsOptional()
  @IsString()
  search?: string;
}

export class TransactionParamDto {
  @ApiProperty({
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    description: 'Transaction ID (UUID) or unique transaction reference (e.g. SP_AIR_...)',
  })
  @IsString()
  @IsNotEmpty()
  id: string;
}
