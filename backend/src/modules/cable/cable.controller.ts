import { Controller, Get, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Public, CurrentUser } from '../../common/decorators/auth.decorators';
import { CableService } from './cable.service';
import { VerifySmartcardDto, PayCableTVDto } from './dto/cable.dto';

@ApiTags('Cable TV Subscriptions')
@Controller('cable')
export class CableController {
  constructor(private readonly cableService: CableService) {}

  @Public()
  @Get('providers')
  @ApiOperation({ summary: 'List supported Cable TV providers (DStv, GOtv, StarTimes, Showmax) with available packages' })
  @ApiResponse({ status: 200, description: 'Cable providers and packages retrieved successfully' })
  async getProviders() {
    return this.cableService.getProviders();
  }

  @Public()
  @Post(['smartcard/verify', 'verify-smartcard'])
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate smartcard / IUC number with Cable TV provider' })
  @ApiResponse({ status: 200, description: 'Smartcard validated successfully with customer and bouquet details' })
  @ApiResponse({ status: 400, description: 'Invalid smartcard number or provider error' })
  async verifySmartcard(@Body() dto: VerifySmartcardDto) {
    return this.cableService.verifySmartcard(dto);
  }

  @Post(['pay', 'purchase'])
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Renew or change cable TV bouquet subscription' })
  @ApiResponse({ status: 200, description: 'Cable subscription renewed successfully' })
  @ApiResponse({ status: 400, description: 'Smartcard not verified or insufficient funds' })
  @ApiResponse({ status: 401, description: 'Invalid transaction PIN' })
  @ApiResponse({ status: 409, description: 'Duplicate idempotency key' })
  async payCableTV(
    @CurrentUser() user: any,
    @Body() dto: PayCableTVDto,
  ) {
    return this.cableService.payCableTV(user.id, dto);
  }
}

