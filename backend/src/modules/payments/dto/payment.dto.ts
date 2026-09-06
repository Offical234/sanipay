import { IsString, IsNotEmpty, IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class VerifyPaymentParamDto {
  @ApiProperty({
    example: 'SP_FUND_1725600000000_ABC12',
    description: 'Unique SaniPay transaction reference for the funding checkout',
  })
  @IsString()
  @IsNotEmpty()
  reference: string;
}

export class MockWebhookTriggerDto {
  @ApiProperty({
    example: 'SP_FUND_1725600000000_ABC12',
    description: 'Transaction reference to simulate payment confirmation for',
  })
  @IsString()
  @IsNotEmpty()
  reference: string;

  @ApiPropertyOptional({
    example: 500000,
    description: 'Amount in Kobo (e.g. 500000 = ₦5,000.00)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1000)
  amountKobo?: number;

  @ApiPropertyOptional({
    example: 'card',
    description: 'Payment channel: card, bank_transfer, ussd',
  })
  @IsOptional()
  @IsString()
  channel?: string;
}
