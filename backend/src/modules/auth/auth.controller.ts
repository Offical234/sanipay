import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Authentication & Identity')
@Controller('auth')
export class AuthController {
  @Post('register')
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiResponse({ status: 201, description: 'Account registered; OTP sent' })
  async register(@Body() body: Record<string, any>) {
    return {
      message: 'Registration initiated successfully. Please verify OTP.',
      requiresOtp: true,
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log in with email/phone and password' })
  @ApiResponse({ status: 200, description: 'Login successful; tokens returned' })
  async login(@Body() body: Record<string, any>) {
    return {
      message: 'Login successful',
    };
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify 6-digit registration / login OTP' })
  async verifyOtp(@Body() body: Record<string, any>) {
    return {
      message: 'OTP verified successfully',
    };
  }

  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh expired JWT access token' })
  async refreshToken(@Body() body: Record<string, any>) {
    return {
      message: 'Token refreshed successfully',
    };
  }
}
