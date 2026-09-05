import { Module } from '@nestjs/common';
import { AirtimeController } from './airtime.controller';
import { AirtimeService } from './airtime.service';
import { WalletModule } from '../wallet/wallet.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [WalletModule, AuthModule],
  controllers: [AirtimeController],
  providers: [AirtimeService],
  exports: [AirtimeService],
})
export class AirtimeModule {}

