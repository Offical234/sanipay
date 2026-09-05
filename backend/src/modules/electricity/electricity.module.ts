import { Module } from '@nestjs/common';
import { ElectricityController } from './electricity.controller';

@Module({
  controllers: [ElectricityController],
  exports: [],
})
export class ElectricityModule {}
