class DataPlanModel {
  final String id;
  final String planCode;
  final String name;
  final String type;
  final String validity;
  final int sellingPriceKobo;
  final String sellingPriceFormatted;
  final String networkCode;

  DataPlanModel({
    required this.id,
    required this.planCode,
    required this.name,
    required this.type,
    required this.validity,
    required this.sellingPriceKobo,
    required this.sellingPriceFormatted,
    required this.networkCode,
  });

  factory DataPlanModel.fromJson(Map<String, dynamic> json) {
    return DataPlanModel(
      id: json['id'] as String? ?? '',
      planCode: json['planCode'] as String? ?? '',
      name: json['name'] as String? ?? '',
      type: json['type'] as String? ?? 'SME',
      validity: json['validity'] as String? ?? '30 Days',
      sellingPriceKobo: int.tryParse(json['sellingPriceKobo']?.toString() ?? '0') ?? 0,
      sellingPriceFormatted: json['sellingPriceFormatted'] as String? ?? '₦0.00',
      networkCode: json['network']?['code'] as String? ?? '',
    );
  }
}
