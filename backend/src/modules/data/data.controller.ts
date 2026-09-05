import { Controller, Get, Post, Query, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

@ApiTags('Mobile Data Bundles')
@Controller('data')
export class DataController {
  @Get('plans')
  @ApiOperation({ summary: 'List available data plans dynamically' })
  @ApiQuery({ name: 'network', required: false, enum: ['MTN', 'AIRTEL', 'GLO', 'NINE_MOBILE'] })
  async getDataPlans(@Query('network') network?: string) {
    return {
      message: 'Data plans retrieved successfully',
      data: [],
    };
  }

  @Post('purchase')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Purchase a mobile data bundle' })
  async purchaseData(@Body() body: Record<string, any>) {
    return {
      message: 'Data purchase request initiated',
    };
  }
}
