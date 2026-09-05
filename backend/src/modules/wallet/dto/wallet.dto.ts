import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  Matches,
  Min,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum PaymentGatewayOption {
  PAYSTACK = 'PAYSTACK',
  FLUTTERWAVE = 'FLUTTERWAVE',
  MOCK = 'MOCK',
}

export enum LedgerFilterType {
  CREDIT = 'CREDIT',
  DEBIT = 'DEBIT',
}

export class FundWalletDto {
  @ApiProperty({
    example: 500000,
    description: 'Amount to fund in Kobo (e.g. 500000 Kobo = ₦5,000.00). Minimum 10,000 Kobo (₦100).',
  })
  @Type(() => Number)
  @IsInt()
  @Min(10000, { message: 'Minimum funding amount is 10,000 Kobo (₦100.00)' })
  amountKobo: number;

  @ApiProperty({
    enum: PaymentGatewayOption,
    example: PaymentGatewayOption.PAYSTACK,
    description: 'Payment gateway processor',
  })
  @IsEnum(PaymentGatewayOption, { message: 'gateway must be PAYSTACK, FLUTTERWAVE, or MOCK' })
  gateway: PaymentGatewayOption;

  @ApiPropertyOptional({
    example: 'idem_fund_987654321',
    description: 'Client-generated idempotency key to prevent double charging on retry',
  })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

export class TransferFundsDto {
  @ApiProperty({
    example: '08098765432',
    description: 'Recipient Nigerian phone number or registered email address',
  })
  @IsString()
  @IsNotEmpty()
  recipientIdentifier: string;

  @ApiProperty({
    example: 100000,
    description: 'Transfer amount in Kobo (e.g. 100000 Kobo = ₦1,000.00). Minimum 10,000 Kobo.',
  })
  @Type(() => Number)
  @IsInt()
  @Min(10000, { message: 'Minimum transfer amount is 10,000 Kobo (₦100.00)' })
  amountKobo: number;

  @ApiProperty({
    example: '1234',
    description: 'Sender 4-digit financial transaction authorization PIN',
  })
  @IsString()
  @Matches(/^\d{4}$/, { message: 'pin must be exactly 4 numeric digits' })
  pin: string;

  @ApiPropertyOptional({
    example: 'Lunch contribution',
    description: 'Payment description / narration for transfer statement',
  })
  @IsOptional()
  @IsString()
  narration?: string;

  @ApiProperty({
    example: 'idem_xfer_123456789',
    description: 'Unique client idempotency key to prevent duplicate transfer execution',
  })
  @IsString()
  @IsNotEmpty()
  idempotencyKey: string;
}

export class WalletHistoryQueryDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ example: 20, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit: number = 20;

  @ApiPropertyOptional({ enum: LedgerFilterType, description: 'Filter by CREDIT or DEBIT' })
  @IsOptional()
  @IsEnum(LedgerFilterType)
  type?: LedgerFilterType;
}
