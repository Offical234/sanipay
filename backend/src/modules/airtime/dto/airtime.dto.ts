import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  Matches,
  Min,
  Max,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TelecomNetworkCode } from '@prisma/client';

export class PurchaseAirtimeDto {
  @ApiProperty({
    enum: TelecomNetworkCode,
    example: TelecomNetworkCode.MTN,
    description: 'Telecom Network Code (MTN, AIRTEL, GLO, NINE_MOBILE)',
  })
  @IsEnum(TelecomNetworkCode, {
    message: 'networkCode must be MTN, AIRTEL, GLO, or NINE_MOBILE',
  })
  networkCode: TelecomNetworkCode;

  @ApiProperty({
    example: '08012345678',
    description: 'Recipient Nigerian phone number (11 digits)',
  })
  @IsString()
  @Matches(/^(0)(7|8|9)(0|1)\d{8}$/, {
    message: 'recipientPhone must be a valid Nigerian mobile number (e.g. 08012345678)',
  })
  recipientPhone: string;

  @ApiProperty({
    example: 100000,
    description: 'Airtime amount in Kobo (e.g. 100000 Kobo = ₦1,000.00). Min ₦50 (5000 Kobo), Max ₦50,000 (5,000,000 Kobo)',
  })
  @Type(() => Number)
  @IsInt()
  @Min(5000, { message: 'Minimum airtime amount is 5,000 Kobo (₦50.00)' })
  @Max(5000000, { message: 'Maximum airtime amount is 5,000,000 Kobo (₦50,000.00)' })
  amountKobo: number;

  @ApiProperty({
    example: '1234',
    description: '4-digit transaction PIN',
  })
  @IsString()
  @Matches(/^\d{4}$/, { message: 'PIN must be exactly 4 digits' })
  pin: string;

  @ApiPropertyOptional({
    example: 'idem_air_123456789',
    description: 'Unique client idempotency key to prevent double charging',
  })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
