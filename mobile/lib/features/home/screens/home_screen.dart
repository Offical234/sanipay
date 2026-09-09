import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_spacing.dart';
import '../../../core/router/route_names.dart';
import '../../auth/providers/auth_provider.dart';
import '../../wallet/providers/wallet_provider.dart';
import '../../transactions/providers/transactions_provider.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  bool _isBalanceVisible = true;

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authProvider).user;
    final walletAsync = ref.watch(walletProvider);
    final txnsAsync = ref.watch(transactionsProvider);

    return Scaffold(
      backgroundColor: AppColors.darkBackground,
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(walletProvider);
            ref.invalidate(transactionsProvider);
          },
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Top Header with greeting
                Row(
                  mainAxisAlignment: MainAxisAlignment.between,
                  children: [
                    Row(
                      children: [
                        CircleAvatar(
                          radius: 20,
                          backgroundColor: AppColors.primary.withOpacity(0.2),
                          child: const Icon(LucideIcons.user, color: AppColors.primary, size: 20),
                        ),
                        const SizedBox(width: 12),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Hello,',
                              style: TextStyle(fontSize: 12, color: AppColors.textLightSecondary),
                            ),
                            Text(
                              user?.fullName ?? user?.email.split('@').first ?? 'Customer',
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w700,
                                color: AppColors.textLightPrimary,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                    IconButton(
                      icon: const Icon(LucideIcons.bell, color: AppColors.textLightPrimary),
                      onPressed: () {},
                    ),
                  ],
                ),
                const SizedBox(height: 24),

                // Wallet Balance Card
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(22),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF064E3B), Color(0xFF042F2E)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: AppSpacing.roundedLg,
                    border: Border.all(color: AppColors.primary.withOpacity(0.35)),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.4),
                        blurRadius: 20,
                        offset: const Offset(0, 8),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.between,
                        children: [
                          const Text(
                            'Wallet Balance',
                            style: TextStyle(fontSize: 13, color: AppColors.primaryLight, fontWeight: FontWeight.w600),
                          ),
                          IconButton(
                            padding: EdgeInsets.zero,
                            constraints: const BoxConstraints(),
                            icon: Icon(
                              _isBalanceVisible ? LucideIcons.eye : LucideIcons.eyeOff,
                              color: AppColors.primaryLight,
                              size: 18,
                            ),
                            onPressed: () => setState(() => _isBalanceVisible = !_isBalanceVisible),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      Text(
                        _isBalanceVisible
                          ? (walletAsync.value?.balanceFormatted ?? '₦0.00')
                          : '••••••••',
                        style: const TextStyle(
                          fontSize: 30,
                          fontWeight: FontWeight.w900,
                          color: Colors.white,
                          letterSpacing: -0.5,
                        ),
                      ),
                      const SizedBox(height: 20),

                      // Quick actions inside card
                      Row(
                        children: [
                          Expanded(
                            child: ElevatedButton.icon(
                              onPressed: () => context.push(RouteNames.wallet),
                              icon: const Icon(LucideIcons.plusCircle, size: 16, color: Colors.black),
                              label: const Text('Fund Wallet', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppColors.primary,
                                foregroundColor: Colors.black,
                                minimumSize: const Size(0, 42),
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: () => context.push(RouteNames.transfer),
                              icon: const Icon(LucideIcons.send, size: 16, color: Colors.white),
                              label: const Text('Transfer', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                              style: OutlinedButton.styleFrom(
                                foregroundColor: Colors.white,
                                side: const BorderSide(color: Colors.white38),
                                minimumSize: const Size(0, 42),
                                shape: RoundedRectangleBorder(borderRadius: AppSpacing.roundedMd),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 28),

                // Quick Services Grid
                const Text(
                  'Quick Services',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textLightPrimary,
                  ),
                ),
                const SizedBox(height: 16),

                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    _buildServiceItem(
                      context,
                      title: 'Airtime',
                      icon: LucideIcons.smartphone,
                      color: AppColors.primary,
                      route: RouteNames.airtime,
                    ),
                    _buildServiceItem(
                      context,
                      title: 'Data Bundle',
                      icon: LucideIcons.wifi,
                      color: AppColors.secondary,
                      route: RouteNames.data,
                    ),
                    _buildServiceItem(
                      context,
                      title: 'Electricity',
                      icon: LucideIcons.zap,
                      color: AppColors.warning,
                      route: RouteNames.electricity,
                    ),
                    _buildServiceItem(
                      context,
                      title: 'Cable TV',
                      icon: LucideIcons.tv,
                      color: AppColors.accent,
                      route: RouteNames.cable,
                    ),
                  ],
                ),
                const SizedBox(height: 28),

                // Referral Banner
                GestureDetector(
                  onTap: () => context.push(RouteNames.referral),
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppColors.darkSurfaceCard,
                      borderRadius: AppSpacing.roundedMd,
                      border: Border.all(color: AppColors.primary.withOpacity(0.25)),
                    ),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: AppColors.primary.withOpacity(0.15),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(LucideIcons.gift, color: AppColors.primary, size: 20),
                        ),
                        const SizedBox(width: 14),
                        const Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Invite Friends, Earn ₦200',
                                style: TextStyle(
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.textLightPrimary,
                                  fontSize: 14,
                                ),
                              ),
                              SizedBox(height: 2),
                              Text(
                                'Get instant cash reward on their first recharge.',
                                style: TextStyle(color: AppColors.textLightSecondary, fontSize: 12),
                              ),
                            ],
                          ),
                        ),
                        const Icon(LucideIcons.chevronRight, color: AppColors.textLightSecondary, size: 18),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 28),

                // Recent Transactions Header
                Row(
                  mainAxisAlignment: MainAxisAlignment.between,
                  children: [
                    const Text(
                      'Recent Activity',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textLightPrimary,
                      ),
                    ),
                    GestureDetector(
                      onTap: () => context.push(RouteNames.history),
                      child: const Text(
                        'See All',
                        style: TextStyle(
                          color: AppColors.primary,
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),

                txnsAsync.when(
                  data: (txns) {
                    if (txns.isEmpty) {
                      return const Padding(
                        padding: EdgeInsets.symmetric(vertical: 24),
                        child: Center(
                          child: Text(
                            'No transactions yet. Recharge airtime or fund wallet!',
                            style: TextStyle(color: AppColors.textLightSecondary, fontSize: 13),
                          ),
                        ),
                      );
                    }
                    return Column(
                      children: txns.take(4).map((tx) {
                        return Container(
                          margin: const EdgeInsets.only(bottom: 10),
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: AppColors.darkSurface,
                            borderRadius: AppSpacing.roundedMd,
                            border: Border.all(color: AppColors.darkBorder),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.between,
                            children: [
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    tx.type.replaceAll('_', ' '),
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w600,
                                      color: AppColors.textLightPrimary,
                                      fontSize: 14,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    tx.reference,
                                    style: const TextStyle(
                                      color: AppColors.textLightSecondary,
                                      fontSize: 11,
                                      fontFamily: 'monospace',
                                    ),
                                  ),
                                ],
                              ),
                              Text(
                                tx.amountFormatted,
                                style: TextStyle(
                                  fontWeight: FontWeight.w800,
                                  color: tx.status == 'SUCCESS' ? AppColors.primary : AppColors.error,
                                  fontSize: 14,
                                ),
                              ),
                            ],
                          ),
                        );
                      }).toList(),
                    );
                  },
                  loading: () => const Center(child: CircularProgressIndicator()),
                  error: (e, _) => Center(child: Text('Error loading transactions: $e')),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildServiceItem(
    BuildContext context, {
    required String title,
    required IconData icon,
    required Color color,
    required String route,
  }) {
    return GestureDetector(
      onTap: () => context.push(route),
      child: Column(
        children: [
          Container(
            width: 60,
            height: 60,
            decoration: BoxDecoration(
              color: color.withOpacity(0.12),
              borderRadius: AppSpacing.roundedMd,
              border: Border.all(color: color.withOpacity(0.3)),
            ),
            child: Center(
              child: Icon(icon, color: color, size: 26),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            title,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: AppColors.textLightPrimary,
            ),
          ),
        ],
      ),
    );
  }
}
