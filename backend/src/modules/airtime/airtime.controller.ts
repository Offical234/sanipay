import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Public } from '../../common/decorators/auth.decorators';

@ApiTags('Airtime VTU')
@Controller('airtime')
export class AirtimeController {
  @Public()
  @Get('networks')
  @ApiOperation({ summary: 'List active Nigerian telecom networks and current discounts' })
  async getNetworks() {
    return {
      message: 'Telecom networks retrieved successfully',
      data: [],
    };
  }

  @Post('purchase')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Purchase airtime top-up for self or third-party phone' })
  async purchaseAirtime(@Body() body: Record<string, any>) {
    return {
      message: 'Airtime purchase request initiated',
    };
  }
}
