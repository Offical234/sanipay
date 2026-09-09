import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:share_plus/share_plus.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_spacing.dart';
import '../providers/referral_provider.dart';

class ReferralScreen extends ConsumerWidget {
  const ReferralScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final summaryAsync = ref.watch(referralSummaryProvider);
    final claimState = ref.watch(claimReferralProvider);

    return Scaffold(
      backgroundColor: AppColors.darkBackground,
      appBar: AppBar(
        title: const Text('Referrals & Rewards'),
      ),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(referralSummaryProvider),
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(20),
          child: summaryAsync.when(
            data: (summary) {
              final code = summary?.referralCode ?? 'SP-SANIPAY';
              final link = summary?.referralLink ?? 'https://sanipay.ng/ref/$code';
              final claimable = summary?.claimableFormatted ?? '₦0.00';
              final hasClaimable = (summary?.claimableKobo ?? 0) > 0;

              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Promo Card
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFF312E81), Color(0xFF1E1B4B)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: AppSpacing.roundedLg,
                      border: Border.all(color: AppColors.accent.withOpacity(0.4)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(LucideIcons.gift, size: 36, color: AppColors.accent),
                        const SizedBox(height: 14),
                        const Text(
                          'Invite & Earn ₦200 Cash',
                          style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: Colors.white),
                        ),
                        const SizedBox(height: 6),
                        const Text(
                          'Earn an automatic ₦200 bonus credited straight to your wallet whenever a friend registers with your code and recharges up to ₦1,000.',
                          style: TextStyle(color: Colors.white70, fontSize: 13, height: 1.4),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Referral Code Box
                  const Text('Your Unique Referral Code', style: TextStyle(fontWeight: FontWeight.w700, color: AppColors.textLightPrimary, fontSize: 14)),
                  const SizedBox(height: 10),
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppColors.darkSurface,
                      borderRadius: AppSpacing.roundedMd,
                      border: Border.all(color: AppColors.darkBorder),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.between,
                      children: [
                        Text(
                          code,
                          style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: AppColors.primary, letterSpacing: 1.5),
                        ),
                        Row(
                          children: [
                            IconButton(
                              icon: const Icon(LucideIcons.copy, size: 20, color: AppColors.textLightPrimary),
                              onPressed: () {
                                Clipboard.setData(ClipboardData(text: code));
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(content: Text('Referral code copied to clipboard!')),
                                );
                              },
                            ),
                            IconButton(
                              icon: const Icon(LucideIcons.share2, size: 20, color: AppColors.primary),
                              onPressed: () {
                                Share.share(
                                  'Join SaniPay for fast airtime, cheap data, and easy bill payments! Use my referral code $code or sign up via: $link',
                                );
                              },
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Stats Grid
                  Row(
                    children: [
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: AppColors.darkSurface,
                            borderRadius: AppSpacing.roundedMd,
                            border: Border.all(color: AppColors.darkBorder),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Total Invited', style: TextStyle(color: AppColors.textLightSecondary, fontSize: 12)),
                              const SizedBox(height: 6),
                              Text(
                                '${summary?.totalReferrals ?? 0}',
                                style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: AppColors.textLightPrimary),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: AppColors.darkSurface,
                            borderRadius: AppSpacing.roundedMd,
                            border: Border.all(color: AppColors.darkBorder),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Claimable Bonus', style: TextStyle(color: AppColors.textLightSecondary, fontSize: 12)),
                              const SizedBox(height: 6),
                              Text(
                                claimable,
                                style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: AppColors.primary),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 28),

                  // Claim Bonus Action
                  ElevatedButton(
                    onPressed: !hasClaimable || claimState.isLoading
                        ? null
                        : () async {
                            final success = await ref.read(claimReferralProvider.notifier).claimRewards();
                            if (success) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text('Referral commissions credited to your wallet!'),
                                  backgroundColor: AppColors.success,
                                ),
                              );
                            }
                          },
                    child: claimState.isLoading
                        ? const SizedBox(height: 22, width: 22, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.black))
                        : Text(hasClaimable ? 'Claim $claimable Now' : 'No Bonuses Pending'),
                  ),
                ],
              );
            },
            loading: () => const Center(child: Padding(padding: EdgeInsets.all(32), child: CircularProgressIndicator())),
            error: (e, _) => Center(child: Text('Error loading referral program: $e')),
          ),
        ),
      ),
    );
  }
}
