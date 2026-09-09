import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../auth/providers/auth_provider.dart';
import '../../wallet/providers/wallet_provider.dart';

class AirtimePurchaseNotifier extends StateNotifier<AsyncValue<void>> {
  final Ref _ref;

  AirtimePurchaseNotifier(this._ref) : super(const AsyncValue.data(null));

  Future<bool> purchaseAirtime({
    required String networkCode,
    required String recipientPhone,
    required int amountKobo,
    required String pin,
  }) async {
    state = const AsyncValue.loading();
    try {
      final api = _ref.read(apiClientProvider);
      await api.post(ApiEndpoints.purchaseAirtime, data: {
        'networkCode': networkCode,
        'phone': recipientPhone,
        'amountKobo': amountKobo,
        'pin': pin,
      });
      _ref.invalidate(walletProvider);
      state = const AsyncValue.data(null);
      return true;
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      return false;
    }
  }
}

final airtimePurchaseProvider =
    StateNotifierProvider.autoDispose<AirtimePurchaseNotifier, AsyncValue<void>>(
  (ref) => AirtimePurchaseNotifier(ref),
);
