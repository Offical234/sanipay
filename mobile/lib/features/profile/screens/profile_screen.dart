import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_spacing.dart';
import '../../../core/router/route_names.dart';
import '../../auth/providers/auth_provider.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authProvider).user;

    return Scaffold(
      backgroundColor: AppColors.darkBackground,
      appBar: AppBar(
        title: const Text('Account & Security'),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            children: [
              // User Card
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: AppColors.darkSurface,
                  borderRadius: AppSpacing.roundedLg,
                  border: Border.all(color: AppColors.darkBorder),
                ),
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 28,
                      backgroundColor: AppColors.primary.withOpacity(0.2),
                      child: const Icon(LucideIcons.user, size: 28, color: AppColors.primary),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            user?.fullName ?? 'SaniPay User',
                            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: AppColors.textLightPrimary),
                          ),
                          const SizedBox(height: 2),
                          Text(user?.email ?? '', style: const TextStyle(color: AppColors.textLightSecondary, fontSize: 12)),
                          Text(user?.phone ?? '', style: const TextStyle(color: AppColors.textLightSecondary, fontSize: 12)),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Security Group
              _buildSectionHeader('Security & Authorizations'),
              _buildSettingTile(
                icon: LucideIcons.lock,
                title: 'Change Account Password',
                subtitle: 'Update your account password',
                onTap: () {
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Password change dialog')));
                },
              ),
              _buildSettingTile(
                icon: LucideIcons.key,
                title: 'Transaction PIN',
                subtitle: 'Change or reset your 4-digit security PIN',
                onTap: () {
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('PIN reset dialog')));
                },
              ),
              const SizedBox(height: 24),

              // Preferences & Support Group
              _buildSectionHeader('Support & Information'),
              _buildSettingTile(
                icon: LucideIcons.helpCircle,
                title: 'Customer Support & Inquiries',
                subtitle: 'Submit tickets or report dispute transactions',
                onTap: () => context.push(RouteNames.support),
              ),
              _buildSettingTile(
                icon: LucideIcons.shieldCheck,
                title: 'Terms of Service & Privacy',
                subtitle: 'Read consumer data rights and policies',
                onTap: () {},
              ),
              const SizedBox(height: 32),

              // Logout Button
              OutlinedButton.icon(
                onPressed: () async {
                  await ref.read(authProvider.notifier).logout();
                  if (context.mounted) {
                    context.go(RouteNames.login);
                  }
                },
                icon: const Icon(LucideIcons.logOut, size: 18, color: AppColors.error),
                label: const Text('Sign Out', style: TextStyle(color: AppColors.error, fontWeight: FontWeight.w700)),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: AppColors.error),
                  minimumSize: const Size.fromHeight(52),
                  shape: RoundedRectangleBorder(borderRadius: AppSpacing.roundedMd),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Padding(
        padding: const EdgeInsets.only(bottom: 12, left: 4),
        child: Text(
          title,
          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.primary),
        ),
      ),
    );
  }

  Widget _buildSettingTile({
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: AppColors.darkSurface,
        borderRadius: AppSpacing.roundedMd,
        border: Border.all(color: AppColors.darkBorder),
      ),
      child: ListTile(
        leading: Icon(icon, color: AppColors.textLightPrimary, size: 20),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600, color: AppColors.textLightPrimary, fontSize: 14)),
        subtitle: Text(subtitle, style: const TextStyle(color: AppColors.textLightSecondary, fontSize: 12)),
        trailing: const Icon(LucideIcons.chevronRight, size: 18, color: AppColors.textLightSecondary),
        onTap: onTap,
      ),
    );
  }
}
