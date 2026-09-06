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
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { CurrentUser, Roles } from '../../common/decorators/auth.decorators';
import { ReferralsService } from './referrals.service';
import { ReferralQueryDto, ClaimRewardsDto } from './dto/referral.dto';

@ApiTags('Referral Program & Commissions')
@ApiBearerAuth()
@Controller('referrals')
export class ReferralsController {
  constructor(private readonly referralsService: ReferralsService) {}

  @Get('summary')
  @ApiOperation({
    summary: 'Get referral code, shareable link, referral counts, and unclaimed earnings',
  })
  @ApiResponse({ status: 200, description: 'Referral summary retrieved successfully' })
  async getReferralSummary(@CurrentUser() user: any) {
    return this.referralsService.getReferralSummary(user.id);
  }

  @Get('history')
  @ApiOperation({
    summary: 'List referred friends with status and reward amounts (paginated)',
  })
  @ApiResponse({ status: 200, description: 'Referral history list retrieved successfully' })
  async getReferralHistory(
    @CurrentUser() user: any,
    @Query() query: ReferralQueryDto,
  ) {
    return this.referralsService.getReferralHistory(user.id, query);
  }

  @Post('claim')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Claim all qualified referral bonuses directly into wallet balance',
  })
  @ApiResponse({ status: 200, description: 'Referral rewards successfully claimed' })
  @ApiResponse({ status: 400, description: 'No unclaimed rewards available to claim' })
  async claimRewards(
    @CurrentUser() user: any,
    @Body() dto: ClaimRewardsDto,
  ) {
    return this.referralsService.claimRewards(user.id, dto);
  }

  @Get('admin/overview')
  @Roles('SUPER_ADMIN', 'FINANCE_ADMIN')
  @ApiOperation({
    summary: 'Administrative metrics and top referrers leaderboard',
  })
  @ApiResponse({ status: 200, description: 'Admin referral overview retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden: Requires administrative privileges' })
  async getAdminOverview() {
    return this.referralsService.getAdminOverview();
  }
}
