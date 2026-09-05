import { Module } from '@nestjs/common';
import { ElectricityController } from './electricity.controller';
import { ElectricityService } from './electricity.service';
import { WalletModule } from '../wallet/wallet.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [WalletModule, AuthModule],
  controllers: [ElectricityController],
  providers: [ElectricityService],
  exports: [ElectricityService],
})
export class ElectricityModule {}

