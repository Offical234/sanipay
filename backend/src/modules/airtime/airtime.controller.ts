import { Controller, Get, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Public, CurrentUser } from '../../common/decorators/auth.decorators';
import { AirtimeService } from './airtime.service';
import { PurchaseAirtimeDto } from './dto/airtime.dto';

@ApiTags('Airtime VTU')
@Controller('airtime')
export class AirtimeController {
  constructor(private readonly airtimeService: AirtimeService) {}

  @Public()
  @Get('networks')
  @ApiOperation({ summary: 'List active Nigerian telecom networks and current discounts' })
  @ApiResponse({ status: 200, description: 'Active telecom networks retrieved successfully' })
  async getNetworks() {
    return this.airtimeService.getNetworks();
  }

  @Post('purchase')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Purchase airtime top-up for self or third-party phone' })
  @ApiResponse({ status: 200, description: 'Airtime delivered successfully with receipt' })
  @ApiResponse({ status: 400, description: 'Insufficient balance or provider error' })
  @ApiResponse({ status: 401, description: 'Invalid transaction PIN' })
  @ApiResponse({ status: 409, description: 'Duplicate idempotency key' })
  async purchaseAirtime(
    @CurrentUser() user: any,
    @Body() dto: PurchaseAirtimeDto,
  ) {
    return this.airtimeService.purchaseAirtime(user.id, dto);
  }
}

