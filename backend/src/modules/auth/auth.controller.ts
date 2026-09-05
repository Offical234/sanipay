import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import {
  LoginDto,
  VerifyOtpDto,
  ResendOtpDto,
  RefreshTokenDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePinDto,
  VerifyPinDto,
} from './dto/auth.dto';
import { Public, CurrentUser } from '../../common/decorators/auth.decorators';

@ApiTags('Authentication & Identity')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new customer or agent account' })
  @ApiResponse({ status: 201, description: 'Registration successful; 6-digit OTP dispatched' })
  @ApiResponse({ status: 409, description: 'Conflict: Email or phone already registered' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify 6-digit OTP and activate account' })
  @ApiResponse({ status: 200, description: 'OTP verified; access & refresh tokens issued' })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP code' })
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto);
  }

  @Public()
  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request a fresh 6-digit verification OTP' })
  @ApiResponse({ status: 200, description: 'Fresh OTP dispatched' })
  @ApiResponse({ status: 404, description: 'Phone number not found' })
  async resendOtp(@Body() dto: ResendOtpDto) {
    return this.authService.resendOtp(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate with email/phone and password' })
  @ApiResponse({ status: 200, description: 'Login successful; JWT token pair issued' })
  @ApiResponse({ status: 401, description: 'Invalid credentials or account locked' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange a valid refresh token for a fresh JWT access token' })
  @ApiResponse({ status: 200, description: 'New token pair generated' })
  @ApiResponse({ status: 401, description: 'Expired or revoked refresh token' })
  async refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Initiate password reset via OTP' })
  @ApiResponse({ status: 200, description: 'Reset instructions dispatched if account exists' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set new password using 6-digit OTP' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid OTP or password criteria not met' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retrieve profile details of the authenticated user' })
  @ApiResponse({ status: 200, description: 'Authenticated user profile' })
  @ApiResponse({ status: 401, description: 'Unauthorized / Missing bearer token' })
  async getMe(@CurrentUser() user: any) {
    return {
      message: 'Authenticated user profile retrieved successfully',
      data: user,
    };
  }

  @Post('verify-pin')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Validate 4-digit transaction PIN before sensitive operations' })
  @ApiResponse({ status: 200, description: 'PIN verified successfully' })
  @ApiResponse({ status: 401, description: 'Incorrect transaction PIN' })
  async verifyPin(@CurrentUser() user: any, @Body() dto: VerifyPinDto) {
    return this.authService.verifyTransactionPin(user.id, dto.pin);
  }

  @Post('change-pin')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change 4-digit transaction PIN by providing current PIN' })
  @ApiResponse({ status: 200, description: 'Transaction PIN changed successfully' })
  @ApiResponse({ status: 401, description: 'Current PIN is incorrect' })
  async changePin(@CurrentUser() user: any, @Body() dto: ChangePinDto) {
    return this.authService.changePin(user.id, dto);
  }
}
