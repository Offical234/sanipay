import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsEnum,
  IsInt,
  IsPositive,
  Min,
  Max,
  IsBoolean,
  IsNumber,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { UserStatus, TransactionType, TransactionStatus } from '@prisma/client';

// ─────────────────────────── PAGINATION ──────────────────────────────────────

export class PaginationQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

// ─────────────────────────── USER MANAGEMENT ─────────────────────────────────

export class UserListQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Search by email, phone, or full name' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: UserStatus })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional({ description: 'Filter by role: CUSTOMER | AGENT | SUPER_ADMIN | SUPPORT | FINANCE_ADMIN' })
  @IsOptional()
  @IsString()
  role?: string;
}

export class UpdateUserStatusDto {
  @ApiProperty({ enum: UserStatus })
  @IsNotEmpty()
  @IsEnum(UserStatus)
  status: UserStatus;

  @ApiPropertyOptional({ example: 'Suspicious activity detected' })
  @IsOptional()
  @IsString()
  reason?: string;
}

// ─────────────────────────── PRICING MANAGEMENT ──────────────────────────────

export class UpdateNetworkDiscountDto {
  @ApiProperty({
    example: 300,
    description: 'Airtime discount in basis points (bps). 300 = 3.00% cashback to customer',
  })
  @IsNotEmpty()
  @IsInt()
  @Min(0)
  @Max(2000)
  airtimeDiscountBps: number;
}

export class UpdateDataPlanPriceDto {
  @ApiProperty({
    example: 150000,
    description: 'New selling price in Kobo (e.g. 150000 = ₦1,500.00)',
  })
  @IsNotEmpty()
  @IsInt()
  @IsPositive()
  sellingPriceKobo: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ─────────────────────────── REFUND MANAGEMENT ───────────────────────────────

export class ProcessRefundDto {
  @ApiProperty({ example: 'txn-uuid-here', description: 'Transaction ID to refund' })
  @IsNotEmpty()
  @IsString()
  transactionId: string;

  @ApiProperty({ example: 'Customer request — VTU delivery failed', description: 'Reason for refund' })
  @IsNotEmpty()
  @IsString()
  reason: string;
}

export class RefundQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ['PENDING', 'COMPLETED', 'REJECTED'], description: 'Filter by refund status' })
  @IsOptional()
  @IsString()
  status?: string;
}

// ─────────────────────────── ADMIN TRANSACTION QUERY ─────────────────────────

export class AdminTransactionQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: TransactionType })
  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;

  @ApiPropertyOptional({ enum: TransactionStatus })
  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;

  @ApiPropertyOptional({ description: 'ISO date — filter from this date' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'ISO date — filter to this date' })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Search by reference, phone, meter number' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by user ID' })
  @IsOptional()
  @IsString()
  userId?: string;
}

// ─────────────────────────── SYSTEM SETTINGS ─────────────────────────────────

export class UpsertSystemSettingDto {
  @ApiProperty({ example: 'MAINTENANCE_MODE', description: 'Setting key (uppercase snake_case)' })
  @IsNotEmpty()
  @IsString()
  key: string;

  @ApiProperty({ example: 'false', description: 'Setting value (always stored as string)' })
  @IsNotEmpty()
  @IsString()
  value: string;

  @ApiPropertyOptional({ example: 'Enable/disable maintenance mode for all services' })
  @IsOptional()
  @IsString()
  description?: string;
}
