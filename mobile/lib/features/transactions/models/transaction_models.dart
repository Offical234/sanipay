class TransactionItemModel {
  final String id;
  final String reference;
  final String type;
  final String status;
  final String amountFormatted;
  final int amountKobo;
  final String providerName;
  final String createdAt;

  TransactionItemModel({
    required this.id,
    required this.reference,
    required this.type,
    required this.status,
    required this.amountFormatted,
    required this.amountKobo,
    required this.providerName,
    required this.createdAt,
  });

  factory TransactionItemModel.fromJson(Map<String, dynamic> json) {
    return TransactionItemModel(
      id: json['id'] as String? ?? '',
      reference: json['reference'] as String? ?? '',
      type: json['type'] as String? ?? '',
      status: json['status'] as String? ?? '',
      amountFormatted: json['amountFormatted'] as String? ?? '₦0.00',
      amountKobo: int.tryParse(json['amountKobo']?.toString() ?? '0') ?? 0,
      providerName: json['providerName'] as String? ?? '',
      createdAt: json['createdAt'] as String? ?? '',
    );
  }
}
