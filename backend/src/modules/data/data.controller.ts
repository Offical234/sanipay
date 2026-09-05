import { Controller, Get, Post, Query, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Public, CurrentUser } from '../../common/decorators/auth.decorators';
import { DataService } from './data.service';
import { PurchaseDataDto, GetDataPlansQueryDto } from './dto/data.dto';

@ApiTags('Mobile Data Bundles')
@Controller('data')
export class DataController {
  constructor(private readonly dataService: DataService) {}

  @Public()
  @Get('plans')
  @ApiOperation({ summary: 'List available data plans dynamically' })
  @ApiResponse({ status: 200, description: 'Data plans retrieved successfully' })
  async getDataPlans(@Query() query: GetDataPlansQueryDto) {
    return this.dataService.getDataPlans(query.network);
  }

  @Post('purchase')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Purchase a mobile data bundle' })
  @ApiResponse({ status: 200, description: 'Data plan activated successfully' })
  @ApiResponse({ status: 400, description: 'Insufficient balance or network inactive' })
  @ApiResponse({ status: 401, description: 'Invalid transaction PIN' })
  @ApiResponse({ status: 404, description: 'Data plan not found' })
  @ApiResponse({ status: 409, description: 'Duplicate idempotency key' })
  async purchaseData(
    @CurrentUser() user: any,
    @Body() dto: PurchaseDataDto,
  ) {
    return this.dataService.purchaseData(user.id, dto);
  }
}

