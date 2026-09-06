import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/auth.decorators';
import { TransactionsService } from './transactions.service';
import { TransactionQueryDto } from './dto/transaction.dto';

@ApiTags('Transaction History & Receipts')
@ApiBearerAuth()
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  @ApiOperation({ summary: 'List user transaction history with pagination and multi-parameter filters' })
  @ApiResponse({ status: 200, description: 'Paginated transactions list retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized / Missing JWT token' })
  async getTransactions(
    @CurrentUser() user: any,
    @Query() query: TransactionQueryDto,
  ) {
    return this.transactionsService.getTransactions(user.id, query, user.role);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get total funds and expenditures summary metrics for current user' })
  @ApiResponse({ status: 200, description: 'Transaction summary statistics retrieved' })
  async getTransactionSummary(@CurrentUser() user: any) {
    return this.transactionsService.getTransactionSummary(user.id);
  }

  @Get('reference/:reference')
  @ApiOperation({ summary: 'Get digital receipt by unique transaction reference (e.g. SP_AIR_...)' })
  @ApiParam({ name: 'reference', description: 'Transaction reference' })
  @ApiResponse({ status: 200, description: 'Transaction digital receipt retrieved' })
  @ApiResponse({ status: 404, description: 'Transaction reference not found' })
  @ApiResponse({ status: 403, description: 'Forbidden / Unauthorized receipt access' })
  async getTransactionByReference(
    @CurrentUser() user: any,
    @Param('reference') reference: string,
  ) {
    return this.transactionsService.getTransactionDetails(user.id, reference, user.role);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get digital receipt by transaction UUID or reference' })
  @ApiParam({ name: 'id', description: 'Transaction UUID or reference' })
  @ApiResponse({ status: 200, description: 'Transaction digital receipt retrieved' })
  @ApiResponse({ status: 404, description: 'Transaction ID not found' })
  @ApiResponse({ status: 403, description: 'Forbidden / Unauthorized receipt access' })
  async getTransactionById(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.transactionsService.getTransactionDetails(user.id, id, user.role);
  }
}
