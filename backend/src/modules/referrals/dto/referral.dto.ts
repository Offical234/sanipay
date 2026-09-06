import {
  IsOptional,
  IsEnum,
  IsString,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ReferralStatus } from '@prisma/client';

export class ReferralQueryDto {
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
    enum: ReferralStatus,
    description: 'Filter by referral status: PENDING_QUALIFICATION, QUALIFIED, REWARDED',
  })
  @IsOptional()
  @IsEnum(ReferralStatus)
  status?: ReferralStatus;
}

export class ClaimRewardsDto {
  @ApiPropertyOptional({
    example: 'claim-ref-user123-1694000000',
    description: 'Optional idempotency key to prevent double claiming',
  })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
