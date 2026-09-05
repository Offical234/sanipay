import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import {
  FundWalletDto,
  TransferFundsDto,
  WalletHistoryQueryDto,
} from './dto/wallet.dto';
import { CurrentUser } from '../../common/decorators/auth.decorators';

@ApiTags('Wallet & Accounting')
@ApiBearerAuth()
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('balance')
  @ApiOperation({ summary: 'Get authenticated user wallet balance and ledger status' })
  @ApiResponse({ status: 200, description: 'Wallet balance retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized / Missing token' })
  async getBalance(@CurrentUser() user: any) {
    return this.walletService.getWallet(user.id);
  }

  @Post('fund/initialize')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Initialize a wallet funding checkout session' })
  @ApiResponse({ status: 200, description: 'Checkout session created with payment URL' })
  @ApiResponse({ status: 400, description: 'Invalid amount or unsupported gateway' })
  async initializeFunding(
    @CurrentUser() user: any,
    @Body() dto: FundWalletDto,
  ) {
    return this.walletService.initializeFunding(user.id, dto);
  }

  @Post('transfer')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'P2P Wallet transfer to another SaniPay user' })
  @ApiResponse({ status: 200, description: 'Funds transferred successfully' })
  @ApiResponse({ status: 400, description: 'Insufficient balance or self-transfer attempt' })
  @ApiResponse({ status: 401, description: 'Incorrect transaction PIN' })
  @ApiResponse({ status: 404, description: 'Recipient user not found' })
  @ApiResponse({ status: 409, description: 'Duplicate idempotency key' })
  async transferFunds(
    @CurrentUser() user: any,
    @Body() dto: TransferFundsDto,
  ) {
    return this.walletService.transferFunds(user.id, dto);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Get paginated audit ledger history for authenticated user' })
  @ApiResponse({ status: 200, description: 'Ledger entries retrieved successfully' })
  async getTransactions(
    @CurrentUser() user: any,
    @Query() query: WalletHistoryQueryDto,
  ) {
    return this.walletService.getTransactions(user.id, query);
  }
}
