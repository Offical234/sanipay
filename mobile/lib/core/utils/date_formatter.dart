import 'package:intl/intl.dart';

class DateFormatter {
  static String formatDateTime(String? isoString) {
    if (isoString == null || isoString.isEmpty) return '—';
    try {
      final date = DateTime.parse(isoString).toLocal();
      return DateFormat('dd MMM yyyy, hh:mm a').format(date);
    } catch (_) {
      return isoString;
    }
  }

  static String formatDateOnly(String? isoString) {
    if (isoString == null || isoString.isEmpty) return '—';
    try {
      final date = DateTime.parse(isoString).toLocal();
      return DateFormat('dd MMM yyyy').format(date);
    } catch (_) {
      return isoString;
    }
  }
}
