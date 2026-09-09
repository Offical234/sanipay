import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../auth/providers/auth_provider.dart';
import '../../wallet/providers/wallet_provider.dart';
import '../models/cable_models.dart';

class CableNotifier extends StateNotifier<AsyncValue<void>> {
  final Ref _ref;

  CableNotifier(this._ref) : super(const AsyncValue.data(null));

  Future<SmartcardDetailsModel?> verifySmartcard({
    required String providerCode,
    required String smartcardNumber,
  }) async {
    try {
      final api = _ref.read(apiClientProvider);
      final res = await api.post(ApiEndpoints.verifySmartcard, data: {
        'providerCode': providerCode,
        'smartcardNumber': smartcardNumber.trim(),
      });
      if (res['data'] != null) {
        return SmartcardDetailsModel.fromJson(res['data'] as Map<String, dynamic>);
      }
    } catch (e) {
      rethrow;
    }
    return null;
  }

  Future<bool> payCable({
    required String providerCode,
    required String smartcardNumber,
    required String packageCode,
    required int amountKobo,
    required String phone,
    required String pin,
  }) async {
    state = const AsyncValue.loading();
    try {
      final api = _ref.read(apiClientProvider);
      await api.post(ApiEndpoints.payCable, data: {
        'providerCode': providerCode,
        'smartcardNumber': smartcardNumber.trim(),
        'packageCode': packageCode,
        'amountKobo': amountKobo,
        'phone': phone.trim(),
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

final cableProvider =
    StateNotifierProvider.autoDispose<CableNotifier, AsyncValue<void>>(
  (ref) => CableNotifier(ref),
);
