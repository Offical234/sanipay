import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'Musa Sani', description: 'Full legal name' })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  fullName: string;

  @ApiProperty({ example: '08012345678', description: 'Nigerian mobile number' })
  @IsString()
  @Matches(/^(0)(7|8|9)(0|1)\d{8}$/, {
    message: 'phone must be a valid Nigerian mobile number (e.g. 08012345678)',
  })
  phone: string;

  @ApiProperty({ example: 'musa@example.com', description: 'Valid email address' })
  @IsEmail({}, { message: 'email must be a valid email address' })
  email: string;

  @ApiProperty({
    example: 'Str0ngP@ssw0rd!',
    description: 'Min 8 chars, uppercase, lowercase, number and special character',
  })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&_#^])[A-Za-z\d@$!%*?&_#^]{8,}$/, {
    message:
      'password must contain at least one uppercase, one lowercase, one number and one special character',
  })
  password: string;

  @ApiProperty({
    example: '1234',
    description: 'Exactly 4 numeric digits — used for financial transaction authorisation',
  })
  @IsString()
  @Matches(/^\d{4}$/, { message: 'transactionPin must be exactly 4 numeric digits' })
  transactionPin: string;

  @ApiPropertyOptional({ example: 'SANI123', description: 'Referral code from an existing user' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  referralCode?: string;
}
