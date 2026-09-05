import { Module, Global } from '@nestjs/common';
import { VTU_PROVIDER } from '../../providers/vtu/vtu-provider.token';
import { MockVTUAdapter } from '../../providers/vtu/mock-vtu.adapter';

@Global()
@Module({
  providers: [
    {
      provide: VTU_PROVIDER,
      useClass: MockVTUAdapter,
    },
  ],
  exports: [VTU_PROVIDER],
})
export class ProvidersModule {}

