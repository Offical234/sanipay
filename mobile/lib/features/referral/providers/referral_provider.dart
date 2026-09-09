import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../auth/providers/auth_provider.dart';
import '../../wallet/providers/wallet_provider.dart';
import '../models/referral_models.dart';

final referralSummaryProvider =
    FutureProvider.autoDispose<ReferralSummaryModel?>((ref) async {
  final api = ref.watch(apiClientProvider);
  try {
    final res = await api.get(ApiEndpoints.referralSummary);
    if (res['data'] != null) {
      return ReferralSummaryModel.fromJson(res['data'] as Map<String, dynamic>);
    }
  } catch (_) {}
  return null;
});

class ClaimReferralNotifier extends StateNotifier<AsyncValue<void>> {
  final Ref _ref;

  ClaimReferralNotifier(this._ref) : super(const AsyncValue.data(null));

  Future<bool> claimRewards() async {
    state = const AsyncValue.loading();
    try {
      final api = _ref.read(apiClientProvider);
      await api.post(ApiEndpoints.claimReferral);
      _ref.invalidate(referralSummaryProvider);
      _ref.invalidate(walletProvider);
      state = const AsyncValue.data(null);
      return true;
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      return false;
    }
  }
}

final claimReferralProvider =
    StateNotifierProvider.autoDispose<ClaimReferralNotifier, AsyncValue<void>>(
  (ref) => ClaimReferralNotifier(ref),
);
