import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';

@Module({
  controllers: [PaymentsController],
  exports: [],
})
export class PaymentsModule {}
