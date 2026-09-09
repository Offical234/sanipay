class ReferralSummaryModel {
  final String referralCode;
  final String referralLink;
  final int totalReferrals;
  final int qualifiedCount;
  final int rewardedCount;
  final int unclaimedRewardsCount;
  final int claimableKobo;
  final String claimableFormatted;
  final String totalEarnedFormatted;

  ReferralSummaryModel({
    required this.referralCode,
    required this.referralLink,
    required this.totalReferrals,
    required this.qualifiedCount,
    required this.rewardedCount,
    required this.unclaimedRewardsCount,
    required this.claimableKobo,
    required this.claimableFormatted,
    required this.totalEarnedFormatted,
  });

  factory ReferralSummaryModel.fromJson(Map<String, dynamic> json) {
    return ReferralSummaryModel(
      referralCode: json['referralCode'] as String? ?? '',
      referralLink: json['referralLink'] as String? ?? '',
      totalReferrals: json['totalReferrals'] as int? ?? 0,
      qualifiedCount: json['qualifiedCount'] as int? ?? 0,
      rewardedCount: json['rewardedCount'] as int? ?? 0,
      unclaimedRewardsCount: json['unclaimedRewardsCount'] as int? ?? 0,
      claimableKobo: int.tryParse(json['claimableKobo']?.toString() ?? '0') ?? 0,
      claimableFormatted: json['claimableFormatted'] as String? ?? '₦0.00',
      totalEarnedFormatted: json['totalEarnedFormatted'] as String? ?? '₦0.00',
    );
  }
}
