import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../auth/providers/auth_provider.dart';
import '../../wallet/providers/wallet_provider.dart';
import '../models/data_models.dart';

final dataPlansProvider =
    FutureProvider.family.autoDispose<List<DataPlanModel>, String?>((ref, networkCode) async {
  final api = ref.watch(apiClientProvider);
  try {
    final res = await api.get(
      ApiEndpoints.dataPlans,
      queryParameters: networkCode != null ? {'network': networkCode} : null,
    );
    if (res['data'] is List) {
      return (res['data'] as List)
          .map((item) => DataPlanModel.fromJson(item as Map<String, dynamic>))
          .toList();
    }
  } catch (_) {}
  return [];
});

class DataPurchaseNotifier extends StateNotifier<AsyncValue<void>> {
  final Ref _ref;

  DataPurchaseNotifier(this._ref) : super(const AsyncValue.data(null));

  Future<bool> purchaseData({
    required String planId,
    required String recipientPhone,
    required String pin,
  }) async {
    state = const AsyncValue.loading();
    try {
      final api = _ref.read(apiClientProvider);
      await api.post(ApiEndpoints.purchaseData, data: {
        'planId': planId,
        'phone': recipientPhone,
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

final dataPurchaseProvider =
    StateNotifierProvider.autoDispose<DataPurchaseNotifier, AsyncValue<void>>(
  (ref) => DataPurchaseNotifier(ref),
);
