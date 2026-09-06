/**
 * Injection token for the Payment Gateway Provider.
 * Use @Inject(PAYMENT_GATEWAY) to inject the active payment gateway implementation.
 * Swap between MockPaymentAdapter, PaystackAdapter, and FlutterwaveAdapter
 * by changing the provider registration in ProvidersModule.
 */
export const PAYMENT_GATEWAY = 'PAYMENT_GATEWAY';
