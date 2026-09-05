import { Module } from '@nestjs/common';
import { CableController } from './cable.controller';
import { CableService } from './cable.service';
import { WalletModule } from '../wallet/wallet.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [WalletModule, AuthModule],
  controllers: [CableController],
  providers: [CableService],
  exports: [CableService],
})
export class CableModule {}

