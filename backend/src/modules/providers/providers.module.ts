import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// VTU Adapters
import { VTU_PROVIDER } from '../../providers/vtu/vtu-provider.token';
import { MockVTUAdapter } from '../../providers/vtu/mock-vtu.adapter';
import { VTPassAdapter } from '../../providers/vtu/vtpass.adapter';
import { ClubKonnectAdapter } from '../../providers/vtu/clubkonnect.adapter';

// Payment Gateway Adapters
import { PAYMENT_GATEWAY } from '../../providers/payment/payment-gateway.token';
import { MockPaymentAdapter } from '../../providers/payment/mock-payment.adapter';
import { PaystackAdapter } from '../../providers/payment/paystack.adapter';
import { FlutterwaveAdapter } from '../../providers/payment/flutterwave.adapter';

/**
 * ProvidersModule — Global provider registry for all external service adapters.
 *
 * VTU Provider Selection (DEFAULT_VTU_PROVIDER env var):
 *   'mock'        → MockVTUAdapter     (default — safe for dev/test)
 *   'vtpass'      → VTPassAdapter      (production VTPass aggregator)
 *   'clubkonnect' → ClubKonnectAdapter (production ClubKonnect aggregator)
 *
 * Payment Gateway Selection (DEFAULT_PAYMENT_GATEWAY env var):
 *   'mock'         → MockPaymentAdapter  (default — safe for dev/test)
 *   'paystack'     → PaystackAdapter
 *   'flutterwave'  → FlutterwaveAdapter
 *
 * Zero business logic changes needed to swap providers — only update the env var.
 */
@Global()
@Module({
  providers: [
    // ── VTU Adapters (all registered so they can be individually injected if needed)
    MockVTUAdapter,
    VTPassAdapter,
    ClubKonnectAdapter,

    // ── Active VTU Provider — selected from DEFAULT_VTU_PROVIDER env var
    {
      provide: VTU_PROVIDER,
      useFactory: (
        config: ConfigService,
        mockAdapter: MockVTUAdapter,
        vtpassAdapter: VTPassAdapter,
        clubkonnectAdapter: ClubKonnectAdapter,
      ) => {
        const provider = (
          config.get<string>('vtu.defaultProvider') ||
          process.env.DEFAULT_VTU_PROVIDER ||
          'mock'
        ).toLowerCase();

        switch (provider) {
          case 'vtpass':
            return vtpassAdapter;
          case 'clubkonnect':
            return clubkonnectAdapter;
          case 'mock':
          default:
            return mockAdapter;
        }
      },
      inject: [ConfigService, MockVTUAdapter, VTPassAdapter, ClubKonnectAdapter],
    },

    // ── Payment Gateway Adapters (all registered for multi-gateway support in PaymentsService)
    MockPaymentAdapter,
    PaystackAdapter,
    FlutterwaveAdapter,

    // ── Active Payment Gateway — selected from DEFAULT_PAYMENT_GATEWAY env var
    {
      provide: PAYMENT_GATEWAY,
      useFactory: (
        config: ConfigService,
        mockAdapter: MockPaymentAdapter,
        paystackAdapter: PaystackAdapter,
        flutterwaveAdapter: FlutterwaveAdapter,
      ) => {
        const gateway = (
          config.get<string>('payment.defaultGateway') ||
          process.env.DEFAULT_PAYMENT_GATEWAY ||
          'mock'
        ).toLowerCase();

        switch (gateway) {
          case 'paystack':
            return paystackAdapter;
          case 'flutterwave':
            return flutterwaveAdapter;
          case 'mock':
          default:
            return mockAdapter;
        }
      },
      inject: [ConfigService, MockPaymentAdapter, PaystackAdapter, FlutterwaveAdapter],
    },
  ],
  exports: [
    VTU_PROVIDER,
    PAYMENT_GATEWAY,
    MockVTUAdapter,
    VTPassAdapter,
    ClubKonnectAdapter,
    MockPaymentAdapter,
    PaystackAdapter,
    FlutterwaveAdapter,
  ],
})
export class ProvidersModule {}
