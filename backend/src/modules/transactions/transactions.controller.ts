import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

@ApiTags('Transaction History & Receipts')
@ApiBearerAuth()
@Controller('transactions')
export class TransactionsController {
  @Get()
  @ApiOperation({ summary: 'List user transaction history with pagination and status filter' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'REFUNDED'] })
  @ApiQuery({ name: 'type', required: false, enum: ['AIRTIME', 'DATA', 'ELECTRICITY', 'CABLE_TV', 'WALLET_FUNDING'] })
  async getTransactions(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: string,
    @Query('type') type?: string,
  ) {
    return {
      message: 'Transactions retrieved successfully',
      data: [],
      meta: {
        page: Number(page),
        limit: Number(limit),
        totalCount: 0,
        totalPages: 0,
      },
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get digital receipt and detailed transaction information' })
  async getTransactionById(@Param('id') id: string) {
    return {
      message: 'Transaction details retrieved successfully',
    };
  }
}
