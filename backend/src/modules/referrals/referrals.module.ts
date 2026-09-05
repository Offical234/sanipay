import { Module } from '@nestjs/common';
import { ReferralsController } from './referrals.controller';

@Module({
  controllers: [ReferralsController],
  exports: [],
})
export class ReferralsModule {}
