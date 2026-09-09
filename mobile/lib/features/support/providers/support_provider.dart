import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../auth/providers/auth_provider.dart';
import '../models/support_models.dart';

final supportTicketsProvider =
    FutureProvider.autoDispose<List<SupportTicketModel>>((ref) async {
  final api = ref.watch(apiClientProvider);
  try {
    final res = await api.get(ApiEndpoints.supportTickets);
    if (res['data'] is List) {
      return (res['data'] as List)
          .map((item) => SupportTicketModel.fromJson(item as Map<String, dynamic>))
          .toList();
    }
  } catch (_) {}
  return [];
});

class CreateTicketNotifier extends StateNotifier<AsyncValue<void>> {
  final Ref _ref;

  CreateTicketNotifier(this._ref) : super(const AsyncValue.data(null));

  Future<bool> createTicket({
    required String subject,
    required String category,
    required String priority,
    required String message,
  }) async {
    state = const AsyncValue.loading();
    try {
      final api = _ref.read(apiClientProvider);
      await api.post(ApiEndpoints.supportTickets, data: {
        'subject': subject.trim(),
        'category': category,
        'priority': priority,
        'message': message.trim(),
      });
      _ref.invalidate(supportTicketsProvider);
      state = const AsyncValue.data(null);
      return true;
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      return false;
    }
  }
}

final createTicketProvider =
    StateNotifierProvider.autoDispose<CreateTicketNotifier, AsyncValue<void>>(
  (ref) => CreateTicketNotifier(ref),
);
