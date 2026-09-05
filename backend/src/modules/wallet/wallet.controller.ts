import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Wallet & Balances')
@ApiBearerAuth()
@Controller('wallet')
export class WalletController {
  @Get('balance')
  @ApiOperation({ summary: 'Get current wallet balance in Kobo and ledger status' })
  async getBalance() {
    return {
      message: 'Wallet balance retrieved successfully',
      data: {
        balanceKobo: '0',
        currency: 'NGN',
        isLocked: false,
      },
    };
  }

  @Post('fund/initialize')
  @ApiOperation({ summary: 'Initialize wallet funding checkout' })
  async initializeFunding(@Body() body: Record<string, any>) {
    return {
      message: 'Funding checkout initialized successfully',
    };
  }
}
