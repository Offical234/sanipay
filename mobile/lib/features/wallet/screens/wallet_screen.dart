import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_spacing.dart';
import '../../../core/router/route_names.dart';
import '../providers/wallet_provider.dart';

class WalletScreen extends ConsumerStatefulWidget {
  const WalletScreen({super.key});

  @override
  ConsumerState<WalletScreen> createState() => _WalletScreenState();
}

class _WalletScreenState extends ConsumerState<WalletScreen> {
  final _amountController = TextEditingController();

  @override
  void dispose() {
    _amountController.dispose();
    super.dispose();
  }

  void _showFundWalletBottomSheet() {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.darkSurface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) {
        return Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Fund SaniPay Wallet',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                  color: AppColors.textLightPrimary,
                ),
              ),
              const SizedBox(height: 6),
              const Text(
                'Choose your preferred deposit method',
                style: TextStyle(color: AppColors.textLightSecondary, fontSize: 13),
              ),
              const SizedBox(height: 24),

              // Card / Paystack Option
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withOpacity(0.12),
                    borderRadius: AppSpacing.roundedSm,
                  ),
                  child: const Icon(LucideIcons.creditCard, color: AppColors.primary),
                ),
                title: const Text('Debit Card / Online Bank Checkout', style: TextStyle(fontWeight: FontWeight.w600, color: AppColors.textLightPrimary)),
                subtitle: const Text('Instant funding via Paystack / Flutterwave', style: TextStyle(fontSize: 12, color: AppColors.textLightSecondary)),
                trailing: const Icon(LucideIcons.chevronRight, size: 18, color: AppColors.textLightSecondary),
                onTap: () {
                  Navigator.pop(context);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Connecting to payment gateway checkout...')),
                  );
                },
              ),
              const Divider(color: AppColors.darkBorder),

              // Bank Transfer / DVA Option
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppColors.secondary.withOpacity(0.12),
                    borderRadius: AppSpacing.roundedSm,
                  ),
                  child: const Icon(LucideIcons.landmark, color: AppColors.secondary),
                ),
                title: const Text('Direct Bank Transfer (Virtual Account)', style: TextStyle(fontWeight: FontWeight.w600, color: AppColors.textLightPrimary)),
                subtitle: const Text('Transfer to dedicated Wema / Providus virtual account', style: TextStyle(fontSize: 12, color: AppColors.textLightSecondary)),
                trailing: const Icon(LucideIcons.chevronRight, size: 18, color: AppColors.textLightSecondary),
                onTap: () {
                  Navigator.pop(context);
                  _showVirtualAccountDialog();
                },
              ),
            ],
          ),
        );
      },
    );
  }

  void _showVirtualAccountDialog() {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          backgroundColor: AppColors.darkSurface,
          shape: RoundedRectangleBorder(borderRadius: AppSpacing.roundedMd),
          title: const Text('Dedicated Virtual Account', style: TextStyle(color: AppColors.textLightPrimary)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Transfer to this account for automatic instant funding:', style: TextStyle(color: AppColors.textLightSecondary, fontSize: 13)),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.darkSurfaceCard,
                  borderRadius: AppSpacing.roundedSm,
                  border: Border.all(color: AppColors.primary.withOpacity(0.3)),
                ),
                child: const Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Bank: Wema Bank / SaniPay', style: TextStyle(fontSize: 13, color: AppColors.textLightSecondary)),
                    SizedBox(height: 4),
                    Text('Account Number: 8012345678', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppColors.primary, letterSpacing: 1.2)),
                    SizedBox(height: 4),
                    Text('Account Name: SaniPay / Customer Wallet', style: TextStyle(fontSize: 13, color: AppColors.textLightPrimary)),
                  ],
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Close', style: TextStyle(color: AppColors.primary)),
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final walletAsync = ref.watch(walletProvider);

    return Scaffold(
      backgroundColor: AppColors.darkBackground,
      appBar: AppBar(
        title: const Text('My Wallet'),
        leading: IconButton(
          icon: const Icon(LucideIcons.arrowLeft),
          onPressed: () => context.pop(),
        ),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: AppColors.darkSurface,
                  borderRadius: AppSpacing.roundedLg,
                  border: Border.all(color: AppColors.darkBorder),
                ),
                child: Column(
                  children: [
                    const Text(
                      'Total Available Balance',
                      style: TextStyle(color: AppColors.textLightSecondary, fontSize: 13),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      walletAsync.value?.balanceFormatted ?? '₦0.00',
                      style: const TextStyle(
                        fontSize: 36,
                        fontWeight: FontWeight.w900,
                        color: AppColors.primary,
                        letterSpacing: -0.5,
                      ),
                    ),
                    const SizedBox(height: 24),
                    Row(
                      children: [
                        Expanded(
                          child: ElevatedButton.icon(
                            onPressed: _showFundWalletBottomSheet,
                            icon: const Icon(LucideIcons.plus, size: 16),
                            label: const Text('Fund Wallet'),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: () => context.push(RouteNames.transfer),
                            icon: const Icon(LucideIcons.send, size: 16),
                            label: const Text('P2P Transfer'),
                            style: OutlinedButton.styleFrom(
                              foregroundColor: AppColors.textLightPrimary,
                              side: const BorderSide(color: AppColors.darkBorder),
                              minimumSize: const Size(0, 52),
                              shape: RoundedRectangleBorder(borderRadius: AppSpacing.roundedMd),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
