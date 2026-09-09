import {
  IsString,
  IsOptional,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsUrl,
  Matches,
  Length,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Adebayo Okafor', description: 'Full legal name' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  fullName?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/avatar.jpg', description: 'Avatar image URL' })
  @IsOptional()
  @IsUrl()
  avatarUrl?: string;

  @ApiPropertyOptional({ example: '14 Ikeja GRA, Lagos', description: 'Home address' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({ example: 'Lagos', description: 'State of residence' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @ApiPropertyOptional({ example: 'Ikeja', description: 'Local Government Area' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lga?: string;
}

export class ChangePasswordDto {
  @ApiProperty({ example: 'OldPassw0rd!', description: 'Current password' })
  @IsNotEmpty()
  @IsString()
  currentPassword: string;

  @ApiProperty({
    example: 'NewPassw0rd!',
    description: 'New password (min 8 chars, must include letter + number)',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: 'New password must contain at least one letter and one number',
  })
  newPassword: string;
}

export class SetTransactionPinDto {
  @ApiProperty({ example: '1234', description: '4-digit numeric transaction PIN' })
  @IsNotEmpty()
  @IsString()
  @Length(4, 4)
  @Matches(/^\d{4}$/, { message: 'Transaction PIN must be exactly 4 digits' })
  pin: string;

  @ApiProperty({ example: 'CurrentPassw0rd!', description: 'Current account password for identity verification' })
  @IsNotEmpty()
  @IsString()
  password: string;
}
