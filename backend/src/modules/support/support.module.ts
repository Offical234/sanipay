import { Module } from '@nestjs/common';
import { SupportController } from './support.controller';

@Module({
  controllers: [SupportController],
  exports: [],
})
export class SupportModule {}
