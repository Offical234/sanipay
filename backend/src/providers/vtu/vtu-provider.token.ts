/**
 * Injection token for the VTU Provider.
 * Use @Inject(VTU_PROVIDER) to inject the active provider implementation.
 * Swap from MockVTUAdapter to a real adapter (VTPassAdapter, ClubKonnectAdapter)
 * by changing the provider registration in ProvidersModule — zero business logic changes needed.
 */
export const VTU_PROVIDER = 'VTU_PROVIDER';
