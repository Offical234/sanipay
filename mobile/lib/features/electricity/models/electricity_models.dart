class MeterDetailsModel {
  final String meterNumber;
  final String customerName;
  final String customerAddress;
  final String discoCode;
  final String meterType;

  MeterDetailsModel({
    required this.meterNumber,
    required this.customerName,
    required this.customerAddress,
    required this.discoCode,
    required this.meterType,
  });

  factory MeterDetailsModel.fromJson(Map<String, dynamic> json) {
    return MeterDetailsModel(
      meterNumber: json['meterNumber'] as String? ?? '',
      customerName: json['customerName'] as String? ?? 'Customer',
      customerAddress: json['customerAddress'] as String? ?? '',
      discoCode: json['discoCode'] as String? ?? '',
      meterType: json['meterType'] as String? ?? 'PREPAID',
    );
  }
}

class ElectricityPaymentResultModel {
  final String reference;
  final String? token;
  final String? units;
  final String amountFormatted;

  ElectricityPaymentResultModel({
    required this.reference,
    this.token,
    this.units,
    required this.amountFormatted,
  });

  factory ElectricityPaymentResultModel.fromJson(Map<String, dynamic> json) {
    return ElectricityPaymentResultModel(
      reference: json['reference'] as String? ?? '',
      token: json['token'] as String?,
      units: json['units'] as String?,
      amountFormatted: json['amountFormatted'] as String? ?? '₦0.00',
    );
  }
}
