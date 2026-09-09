class WalletModel {
  final String id;
  final String balanceKobo;
  final String balanceFormatted;
  final bool isLocked;

  WalletModel({
    required this.id,
    required this.balanceKobo,
    required this.balanceFormatted,
    required this.isLocked,
  });

  factory WalletModel.fromJson(Map<String, dynamic> json) {
    return WalletModel(
      id: json['id'] as String? ?? '',
      balanceKobo: json['balanceKobo']?.toString() ?? '0',
      balanceFormatted: json['balanceFormatted'] as String? ?? '₦0.00',
      isLocked: json['isLocked'] as bool? ?? false,
    );
  }
}
