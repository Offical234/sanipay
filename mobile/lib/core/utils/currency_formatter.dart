import 'package:intl/intl.dart';

class CurrencyFormatter {
  static final NumberFormat _nairaFormat = NumberFormat.currency(
    locale: 'en_NG',
    symbol: '₦',
    decimalDigits: 2,
  );

  /// Converts an amount in Kobo (e.g. 150000) to formatted Naira (e.g. ₦1,500.00)
  static String formatKobo(dynamic kobo) {
    if (kobo == null) return '₦0.00';
    num val = 0;
    if (kobo is num) {
      val = kobo;
    } else if (kobo is String) {
      val = num.tryParse(kobo) ?? 0;
    }
    return _nairaFormat.format(val / 100);
  }

  /// Converts Naira float to Kobo BigInt/int
  static int nairaToKobo(double naira) {
    return (naira * 100).round();
  }
}
