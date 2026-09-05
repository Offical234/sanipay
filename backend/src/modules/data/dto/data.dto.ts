import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsEnum,
  IsOptional,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TelecomNetworkCode } from '@prisma/client';

export class GetDataPlansQueryDto {
  @ApiPropertyOptional({
    enum: TelecomNetworkCode,
    description: 'Filter data plans by network operator (MTN, AIRTEL, GLO, NINE_MOBILE)',
    example: TelecomNetworkCode.MTN,
  })
  @IsOptional()
  @IsEnum(TelecomNetworkCode, {
    message: 'network must be MTN, AIRTEL, GLO, or NINE_MOBILE',
  })
  network?: TelecomNetworkCode;
}

export class PurchaseDataDto {
  @ApiProperty({
    example: 'd3b07384-d113-4608-8e6d-74d41286a111',
    description: 'UUID of the selected data plan from /data/plans catalogue',
  })
  @IsUUID('4', { message: 'planId must be a valid UUID' })
  @IsNotEmpty()
  planId: string;

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
    example: '1234',
    description: '4-digit transaction PIN',
  })
  @IsString()
  @Matches(/^\d{4}$/, { message: 'PIN must be exactly 4 digits' })
  pin: string;

  @ApiPropertyOptional({
    example: 'idem_dat_987654321',
    description: 'Unique client idempotency key to prevent duplicate charges',
  })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
