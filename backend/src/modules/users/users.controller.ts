import {
  Controller,
  Get,
  Put,
  Patch,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/auth.decorators';
import { UsersService } from './users.service';
import { UpdateProfileDto, ChangePasswordDto, SetTransactionPinDto } from './dto/user.dto';

@ApiTags('User Profile & Account')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile, KYC status, and wallet balance' })
  @ApiResponse({ status: 200, description: 'User profile retrieved successfully' })
  async getProfile(@CurrentUser() user: any) {
    return this.usersService.getProfile(user.id);
  }

  @Put('me')
  @ApiOperation({ summary: 'Update user profile details (name, address, avatar)' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 400, description: 'No valid fields provided' })
  async updateProfile(
    @CurrentUser() user: any,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user.id, dto);
  }

  @Patch('me/password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change account password (invalidates all active sessions)' })
  @ApiResponse({ status: 200, description: 'Password changed. All sessions logged out.' })
  @ApiResponse({ status: 401, description: 'Current password is incorrect' })
  async changePassword(
    @CurrentUser() user: any,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(user.id, dto);
  }

  @Patch('me/transaction-pin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set or change the 4-digit transaction PIN' })
  @ApiResponse({ status: 200, description: 'Transaction PIN updated successfully' })
  @ApiResponse({ status: 401, description: 'Account password is incorrect' })
  async setTransactionPin(
    @CurrentUser() user: any,
    @Body() dto: SetTransactionPinDto,
  ) {
    return this.usersService.setTransactionPin(user.id, dto);
  }
}
