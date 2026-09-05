import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Public } from '../../common/decorators/auth.decorators';

@ApiTags('Cable TV Subscriptions')
@Controller('cable')
export class CableController {
  @Public()
  @Get('providers')
  @ApiOperation({ summary: 'List supported Cable TV providers (DStv, GOtv, StarTimes)' })
  async getProviders() {
    return {
      message: 'Cable TV providers retrieved successfully',
      data: [],
    };
  }

  @Public()
  @Post('verify-smartcard')
  @ApiOperation({ summary: 'Validate smartcard / IUC number with Cable TV provider' })
  async verifySmartcard(@Body() body: Record<string, any>) {
    return {
      message: 'Smartcard validated successfully',
    };
  }

  @Post('purchase')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Renew or change cable TV bouquet subscription' })
  async purchaseCable(@Body() body: Record<string, any>) {
    return {
      message: 'Cable TV payment request initiated',
    };
  }
}
