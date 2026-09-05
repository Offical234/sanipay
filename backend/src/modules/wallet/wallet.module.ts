import { Module } from '@nestjs/common';
import { WalletController } from './wallet.controller';

@Module({
  controllers: [WalletController],
  exports: [],
})
export class WalletModule {}
