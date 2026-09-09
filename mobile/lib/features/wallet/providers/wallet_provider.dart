import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../auth/providers/auth_provider.dart';
import '../models/wallet_models.dart';

final walletProvider = FutureProvider.autoDispose<WalletModel?>((ref) async {
  final api = ref.watch(apiClientProvider);
  try {
    final res = await api.get(ApiEndpoints.wallet);
    if (res['data'] != null) {
      return WalletModel.fromJson(res['data'] as Map<String, dynamic>);
    }
  } catch (_) {}
  return null;
});

class WalletTransferNotifier extends StateNotifier<AsyncValue<void>> {
  final Ref _ref;

  WalletTransferNotifier(this._ref) : super(const AsyncValue.data(null));

  Future<bool> transferFunds({
    required String recipientIdentifier,
    required int amountKobo,
    required String pin,
  }) async {
    state = const AsyncValue.loading();
    try {
      final api = _ref.read(apiClientProvider);
      await api.post(ApiEndpoints.walletTransfer, data: {
        'recipientIdentifier': recipientIdentifier.trim(),
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

final walletTransferProvider =
    StateNotifierProvider.autoDispose<WalletTransferNotifier, AsyncValue<void>>(
  (ref) => WalletTransferNotifier(ref),
);
