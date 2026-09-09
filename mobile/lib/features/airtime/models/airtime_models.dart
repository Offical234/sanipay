class NetworkModel {
  final String id;
  final String code;
  final String name;
  final int airtimeDiscountBps;

  NetworkModel({
    required this.id,
    required this.code,
    required this.name,
    required this.airtimeDiscountBps,
  });

  factory NetworkModel.fromJson(Map<String, dynamic> json) {
    return NetworkModel(
      id: json['id'] as String? ?? '',
      code: json['code'] as String? ?? '',
      name: json['name'] as String? ?? '',
      airtimeDiscountBps: json['airtimeDiscountBps'] as int? ?? 0,
    );
  }
}
