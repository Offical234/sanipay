import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Referral Program')
@ApiBearerAuth()
@Controller('referrals')
export class ReferralsController {
  @Get('summary')
  @ApiOperation({ summary: 'Get referral code, stats, earnings in Kobo, and rewards history' })
  async getReferralSummary() {
    return {
      message: 'Referral summary retrieved successfully',
      data: {
        referralCode: '',
        totalReferred: 0,
        totalEarnedKobo: '0',
      },
    };
  }
}
