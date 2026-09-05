import { Module } from '@nestjs/common';
import { CableController } from './cable.controller';

@Module({
  controllers: [CableController],
  exports: [],
})
export class CableModule {}
