import { Module, Global } from '@nestjs/common';
import { VTU_PROVIDER } from '../../providers/vtu/vtu-provider.token';
import { MockVTUAdapter } from '../../providers/vtu/mock-vtu.adapter';
import { PAYMENT_GATEWAY } from '../../providers/payment/payment-gateway.token';
import { MockPaymentAdapter } from '../../providers/payment/mock-payment.adapter';
import { PaystackAdapter } from '../../providers/payment/paystack.adapter';
import { FlutterwaveAdapter } from '../../providers/payment/flutterwave.adapter';

@Global()
@Module({
  providers: [
    {
      provide: VTU_PROVIDER,
      useClass: MockVTUAdapter,
    },
    {
      provide: PAYMENT_GATEWAY,
      useClass: MockPaymentAdapter,
    },
    MockPaymentAdapter,
    PaystackAdapter,
    FlutterwaveAdapter,
  ],
  exports: [
    VTU_PROVIDER,
    PAYMENT_GATEWAY,
    MockPaymentAdapter,
    PaystackAdapter,
    FlutterwaveAdapter,
  ],
})
export class ProvidersModule {}


