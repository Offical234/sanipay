import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  Matches,
  Min,
  Max,
  IsInt,
  Length,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MeterType } from '@prisma/client';

export class VerifyMeterDto {
  @ApiProperty({
    example: 'IKEDC',
    description: 'Distribution company (DisCo) code (e.g. IKEDC, EKEDC, AEDC, IBEDC, PHED, KEDCO)',
  })
  @IsString()
  @IsNotEmpty()
  providerCode: string;

  @ApiProperty({
    example: '01234567890',
    description: 'Electricity meter number (6 to 20 digits/characters)',
  })
  @IsString()
  @Length(6, 20, { message: 'meterNumber must be between 6 and 20 characters' })
  meterNumber: string;

  @ApiProperty({
    enum: MeterType,
    example: MeterType.PREPAID,
    description: 'Meter type: PREPAID or POSTPAID',
  })
  @IsEnum(MeterType, { message: 'meterType must be PREPAID or POSTPAID' })
  meterType: MeterType;
}

export class PayElectricityDto {
  @ApiProperty({
    example: 'IKEDC',
    description: 'Distribution company (DisCo) code',
  })
  @IsString()
  @IsNotEmpty()
  providerCode: string;

  @ApiProperty({
    example: '01234567890',
    description: 'Electricity meter number (must have been validated first)',
  })
  @IsString()
  @Length(6, 20, { message: 'meterNumber must be between 6 and 20 characters' })
  meterNumber: string;

  @ApiProperty({
    enum: MeterType,
    example: MeterType.PREPAID,
    description: 'Meter type: PREPAID or POSTPAID',
  })
  @IsEnum(MeterType, { message: 'meterType must be PREPAID or POSTPAID' })
  meterType: MeterType;

  @ApiProperty({
    example: 500000,
    description: 'Electricity payment amount in Kobo (e.g. 500000 Kobo = ₦5,000.00). Min ₦500 (50,000 Kobo)',
  })
  @Type(() => Number)
  @IsInt()
  @Min(50000, { message: 'Minimum electricity purchase is 50,000 Kobo (₦500.00)' })
  @Max(50000000, { message: 'Maximum electricity purchase is 50,000,000 Kobo (₦500,000.00)' })
  amountKobo: number;

  @ApiProperty({
    example: '08012345678',
    description: 'Customer contact phone number for SMS token delivery',
  })
  @IsString()
  @Matches(/^(0)(7|8|9)(0|1)\d{8}$/, {
    message: 'customerPhone must be a valid Nigerian mobile number (e.g. 08012345678)',
  })
  customerPhone: string;

  @ApiProperty({
    example: '1234',
    description: '4-digit transaction PIN',
  })
  @IsString()
  @Matches(/^\d{4}$/, { message: 'PIN must be exactly 4 digits' })
  pin: string;

  @ApiPropertyOptional({
    example: 'idem_ele_11223344',
    description: 'Unique client idempotency key to prevent double charging',
  })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
