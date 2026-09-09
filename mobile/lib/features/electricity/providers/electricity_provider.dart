import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../auth/providers/auth_provider.dart';
import '../../wallet/providers/wallet_provider.dart';
import '../models/electricity_models.dart';

class ElectricityNotifier extends StateNotifier<AsyncValue<ElectricityPaymentResultModel?>> {
  final Ref _ref;

  ElectricityNotifier(this._ref) : super(const AsyncValue.data(null));

  Future<MeterDetailsModel?> verifyMeter({
    required String discoCode,
    required String meterNumber,
    required String meterType,
  }) async {
    try {
      final api = _ref.read(apiClientProvider);
      final res = await api.post(ApiEndpoints.verifyMeter, data: {
        'discoCode': discoCode,
        'meterNumber': meterNumber.trim(),
        'meterType': meterType,
      });
      if (res['data'] != null) {
        return MeterDetailsModel.fromJson(res['data'] as Map<String, dynamic>);
      }
    } catch (e) {
      rethrow;
    }
    return null;
  }

  Future<ElectricityPaymentResultModel?> payElectricity({
    required String discoCode,
    required String meterNumber,
    required String meterType,
    required int amountKobo,
    required String phone,
    required String pin,
  }) async {
    state = const AsyncValue.loading();
    try {
      final api = _ref.read(apiClientProvider);
      final res = await api.post(ApiEndpoints.payElectricity, data: {
        'discoCode': discoCode,
        'meterNumber': meterNumber.trim(),
        'meterType': meterType,
        'amountKobo': amountKobo,
        'phone': phone.trim(),
        'pin': pin,
      });
      _ref.invalidate(walletProvider);
      final result = ElectricityPaymentResultModel.fromJson(res['data'] as Map<String, dynamic>);
      state = AsyncValue.data(result);
      return result;
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      return null;
    }
  }
}

final electricityProvider =
    StateNotifierProvider.autoDispose<ElectricityNotifier, AsyncValue<ElectricityPaymentResultModel?>>(
  (ref) => ElectricityNotifier(ref),
);
