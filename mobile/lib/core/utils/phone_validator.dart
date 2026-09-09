enum TelecomOperator { mtn, airtel, glo, nineMobile, unknown }

class PhoneValidator {
  static final RegExp _phoneRegex = RegExp(r'^(?:\+234|234|0)([789][01]\d{8})$');

  static bool isValidNigerianPhone(String phone) {
    final clean = phone.replaceAll(RegExp(r'[\s-]'), '');
    return _phoneRegex.hasMatch(clean);
  }

  static String normalizeToNational(String phone) {
    final clean = phone.replaceAll(RegExp(r'[\s-]'), '');
    final match = _phoneRegex.firstMatch(clean);
    if (match != null) {
      return '0${match.group(1)}';
    }
    return phone;
  }

  static TelecomOperator detectOperator(String phone) {
    final normalized = normalizeToNational(phone);
    if (normalized.length < 4) return TelecomOperator.unknown;

    final prefix = normalized.substring(0, 4);

    // MTN Prefixes
    const mtnPrefixes = [
      '0803', '0806', '0703', '0706', '0813', '0816', '0810', '0814', '0903', '0906', '0913', '0916'
    ];
    if (mtnPrefixes.contains(prefix)) return TelecomOperator.mtn;

    // Airtel Prefixes
    const airtelPrefixes = [
      '0802', '0808', '0708', '0812', '0701', '0902', '0901', '0904', '0907', '0912'
    ];
    if (airtelPrefixes.contains(prefix)) return TelecomOperator.airtel;

    // Glo Prefixes
    const gloPrefixes = ['0805', '0807', '0705', '0815', '0811', '0905', '0915'];
    if (gloPrefixes.contains(prefix)) return TelecomOperator.glo;

    // 9mobile Prefixes
    const nineMobilePrefixes = ['0809', '0817', '0818', '0909', '0908'];
    if (nineMobilePrefixes.contains(prefix)) return TelecomOperator.nineMobile;

    return TelecomOperator.unknown;
  }

  static String operatorName(TelecomOperator op) {
    switch (op) {
      case TelecomOperator.mtn:
        return 'MTN';
      case TelecomOperator.airtel:
        return 'Airtel';
      case TelecomOperator.glo:
        return 'GLO';
      case TelecomOperator.nineMobile:
        return '9mobile';
      case TelecomOperator.unknown:
        return 'Unknown Network';
    }
  }
}
