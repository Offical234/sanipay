import { IsString, IsNotEmpty, Matches, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'musa@example.com', description: 'Email or Nigerian phone number' })
  @IsString()
  @IsNotEmpty()
  identifier: string;

  @ApiProperty({ example: 'Str0ngP@ssw0rd!' })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class VerifyOtpDto {
  @ApiProperty({ example: '08012345678' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^(0)(7|8|9)(0|1)\d{8}$/, {
    message: 'phone must be a valid Nigerian mobile number (e.g. 08012345678)',
  })
  phone: string;

  @ApiProperty({ example: '123456', description: '6-digit OTP code' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{6}$/, { message: 'otp must be exactly 6 numeric digits' })
  otp: string;
}

export class ResendOtpDto {
  @ApiProperty({ example: '08012345678' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^(0)(7|8|9)(0|1)\d{8}$/, {
    message: 'phone must be a valid Nigerian mobile number (e.g. 08012345678)',
  })
  phone: string;
}

export class RefreshTokenDto {
  @ApiProperty({ description: 'Valid refresh token issued at login' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'musa@example.com', description: 'Email or phone number' })
  @IsString()
  @IsNotEmpty()
  identifier: string;
}

export class ResetPasswordDto {
  @ApiProperty({ example: 'musa@example.com', description: 'Email or phone number' })
  @IsString()
  @IsNotEmpty()
  identifier: string;

  @ApiProperty({ example: '123456', description: '6-digit OTP received via SMS/Email' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{6}$/, { message: 'otp must be exactly 6 numeric digits' })
  otp: string;

  @ApiProperty({ example: 'NewStr0ngP@ss1!', description: 'New password' })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&_#^])[A-Za-z\d@$!%*?&_#^]{8,}$/, {
    message:
      'newPassword must contain at least 8 characters, one uppercase, one lowercase, one number, and one special character',
  })
  newPassword: string;
}

export class ChangePinDto {
  @ApiProperty({ example: '1234', description: 'Current 4-digit transaction PIN' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}$/, { message: 'currentPin must be exactly 4 numeric digits' })
  currentPin: string;

  @ApiProperty({ example: '5678', description: 'New 4-digit transaction PIN' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}$/, { message: 'newPin must be exactly 4 numeric digits' })
  newPin: string;
}

export class VerifyPinDto {
  @ApiProperty({ example: '1234', description: '4-digit transaction PIN' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}$/, { message: 'pin must be exactly 4 numeric digits' })
  pin: string;
}
