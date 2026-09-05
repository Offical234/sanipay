import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Public } from '../../common/decorators/auth.decorators';

@ApiTags('Electricity Utility Bills')
@Controller('electricity')
export class ElectricityController {
  @Public()
  @Get('providers')
  @ApiOperation({ summary: 'List active Nigerian DisCo electricity providers' })
  async getProviders() {
    return {
      message: 'Electricity providers retrieved successfully',
      data: [],
    };
  }

  @Public()
  @Post('verify-meter')
  @ApiOperation({ summary: 'Validate prepaid or postpaid meter number with DisCo' })
  async verifyMeter(@Body() body: Record<string, any>) {
    return {
      message: 'Meter validated successfully',
    };
  }

  @Post('purchase')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Pay electricity bill and receive prepaid token or receipt' })
  async purchaseElectricity(@Body() body: Record<string, any>) {
    return {
      message: 'Electricity payment request initiated',
    };
  }
}
