import { Controller, Get, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Public, CurrentUser } from '../../common/decorators/auth.decorators';
import { ElectricityService } from './electricity.service';
import { VerifyMeterDto, PayElectricityDto } from './dto/electricity.dto';

@ApiTags('Electricity Utility Bills')
@Controller('electricity')
export class ElectricityController {
  constructor(private readonly electricityService: ElectricityService) {}

  @Public()
  @Get('providers')
  @ApiOperation({ summary: 'List active Nigerian DisCo electricity providers' })
  @ApiResponse({ status: 200, description: 'Electricity providers retrieved successfully' })
  async getProviders() {
    return this.electricityService.getProviders();
  }

  @Public()
  @Post(['meter/verify', 'verify-meter'])
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate prepaid or postpaid meter number with DisCo' })
  @ApiResponse({ status: 200, description: 'Meter validated successfully with customer details' })
  @ApiResponse({ status: 400, description: 'Invalid meter number or DisCo error' })
  async verifyMeter(@Body() dto: VerifyMeterDto) {
    return this.electricityService.verifyMeter(dto);
  }

  @Post(['pay', 'purchase'])
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Pay electricity bill and receive prepaid token or receipt' })
  @ApiResponse({ status: 200, description: 'Electricity bill paid successfully, token delivered' })
  @ApiResponse({ status: 400, description: 'Meter not verified or insufficient funds' })
  @ApiResponse({ status: 401, description: 'Invalid transaction PIN' })
  @ApiResponse({ status: 409, description: 'Duplicate idempotency key' })
  async payElectricity(
    @CurrentUser() user: any,
    @Body() dto: PayElectricityDto,
  ) {
    return this.electricityService.payElectricity(user.id, dto);
  }
}

