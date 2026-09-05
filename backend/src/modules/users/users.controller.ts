import { Controller, Get, Put, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('User Profile & KYC')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  @Get('me')
  @ApiOperation({ summary: 'Get current user profile and KYC status' })
  async getProfile() {
    return {
      message: 'User profile retrieved successfully',
    };
  }

  @Put('me')
  @ApiOperation({ summary: 'Update user profile details' })
  async updateProfile(@Body() body: Record<string, any>) {
    return {
      message: 'User profile updated successfully',
    };
  }
}
