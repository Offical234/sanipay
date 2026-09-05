import { Module } from '@nestjs/common';
import { AirtimeController } from './airtime.controller';

@Module({
  controllers: [AirtimeController],
  exports: [],
})
export class AirtimeModule {}
