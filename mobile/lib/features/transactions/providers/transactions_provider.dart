import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../auth/providers/auth_provider.dart';
import '../models/transaction_models.dart';

final transactionsProvider =
    FutureProvider.autoDispose<List<TransactionItemModel>>((ref) async {
  final api = ref.watch(apiClientProvider);
  try {
    final res = await api.get(ApiEndpoints.transactions, queryParameters: {'limit': 30});
    if (res['data'] is List) {
      return (res['data'] as List)
          .map((item) => TransactionItemModel.fromJson(item as Map<String, dynamic>))
          .toList();
    }
  } catch (_) {}
  return [];
});
