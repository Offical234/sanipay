class SmartcardDetailsModel {
  final String smartcardNumber;
  final String customerName;
  final String providerCode;

  SmartcardDetailsModel({
    required this.smartcardNumber,
    required this.customerName,
    required this.providerCode,
  });

  factory SmartcardDetailsModel.fromJson(Map<String, dynamic> json) {
    return SmartcardDetailsModel(
      smartcardNumber: json['smartcardNumber'] as String? ?? '',
      customerName: json['customerName'] as String? ?? 'Subscriber',
      providerCode: json['providerCode'] as String? ?? '',
    );
  }
}

class CableBouquetModel {
  final String code;
  final String name;
  final int priceKobo;
  final String priceFormatted;

  CableBouquetModel({
    required this.code,
    required this.name,
    required this.priceKobo,
    required this.priceFormatted,
  });

  factory CableBouquetModel.fromJson(Map<String, dynamic> json) {
    return CableBouquetModel(
      code: json['code'] as String? ?? '',
      name: json['name'] as String? ?? '',
      priceKobo: int.tryParse(json['priceKobo']?.toString() ?? '0') ?? 0,
      priceFormatted: json['priceFormatted'] as String? ?? '₦0.00',
    );
  }
}
