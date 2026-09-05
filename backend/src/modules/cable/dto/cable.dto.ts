import {
  IsString,
  IsNotEmpty,
  IsOptional,
  Matches,
  Min,
  Max,
  IsInt,
  Length,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class VerifySmartcardDto {
  @ApiProperty({
    example: 'DSTV',
    description: 'Cable TV provider code: DSTV, GOTV, STARTIMES, SHOWMAX',
  })
  @IsString()
  @IsNotEmpty()
  providerCode: string;

  @ApiProperty({
    example: '1023456789',
    description: 'Decoder smartcard number or IUC number',
  })
  @IsString()
  @Length(8, 20, { message: 'smartcardNumber must be between 8 and 20 characters' })
  smartcardNumber: string;
}

export class PayCableTVDto {
  @ApiProperty({
    example: 'DSTV',
    description: 'Cable TV provider code (DSTV, GOTV, STARTIMES, SHOWMAX)',
  })
  @IsString()
  @IsNotEmpty()
  providerCode: string;

  @ApiProperty({
    example: '1023456789',
    description: 'Decoder smartcard number or IUC number (must have been verified first)',
  })
  @IsString()
  @Length(8, 20, { message: 'smartcardNumber must be between 8 and 20 characters' })
  smartcardNumber: string;

  @ApiProperty({
    example: 'DSTV_COMPACT',
    description: 'Package/bouquet code',
  })
  @IsString()
  @IsNotEmpty()
  packageCode: string;

  @ApiProperty({
    example: 'DStv Compact',
    description: 'Package/bouquet display name',
  })
  @IsString()
  @IsNotEmpty()
  packageName: string;

  @ApiProperty({
    example: 1250000,
    description: 'Package subscription amount in Kobo (e.g. 1250000 Kobo = ₦12,500.00)',
  })
  @Type(() => Number)
  @IsInt()
  @Min(100000, { message: 'Minimum cable subscription is 100,000 Kobo (₦1,000.00)' })
  @Max(50000000, { message: 'Maximum cable subscription is 50,000,000 Kobo (₦500,000.00)' })
  amountKobo: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Number of subscription months (1 to 12). Default 1.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  renewalMonths?: number = 1;

  @ApiProperty({
    example: '1234',
    description: '4-digit transaction PIN',
  })
  @IsString()
  @Matches(/^\d{4}$/, { message: 'PIN must be exactly 4 digits' })
  pin: string;

  @ApiPropertyOptional({
    example: 'idem_cab_55667788',
    description: 'Unique client idempotency key to prevent duplicate subscription charges',
  })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
