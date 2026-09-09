import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/router/route_names.dart';
import '../providers/auth_provider.dart';

class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();
  final _referralController = TextEditingController();

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _passwordController.dispose();
    _referralController.dispose();
    super.dispose();
  }

  Future<void> _handleRegister() async {
    if (!_formKey.currentState!.validate()) return;

    final success = await ref.read(authProvider.notifier).register(
          fullName: _nameController.text.trim(),
          email: _emailController.text.trim(),
          phone: _phoneController.text.trim(),
          password: _passwordController.text,
          referralCode: _referralController.text.trim().isNotEmpty ? _referralController.text.trim() : null,
        );

    if (success && mounted) {
      context.go(RouteNames.dashboard);
    } else if (mounted) {
      final error = ref.read(authProvider).errorMessage;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(error ?? 'Registration failed. Please try again.'),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);

    return Scaffold(
      backgroundColor: AppColors.darkBackground,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(LucideIcons.arrowLeft),
          onPressed: () => context.go(RouteNames.login),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Create Account',
                  style: TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.w800,
                    color: AppColors.textLightPrimary,
                  ),
                ),
                const SizedBox(height: 6),
                const Text(
                  'Join SaniPay for fast digital VTU services',
                  style: TextStyle(fontSize: 14, color: AppColors.textLightSecondary),
                ),
                const SizedBox(height: 28),

                TextFormField(
                  controller: _nameController,
                  style: const TextStyle(color: AppColors.textLightPrimary),
                  decoration: const InputDecoration(
                    labelText: 'Full Name',
                    prefixIcon: Icon(LucideIcons.user, size: 18, color: AppColors.textLightSecondary),
                  ),
                  validator: (val) => val == null || val.trim().isEmpty ? 'Enter your full name' : null,
                ),
                const SizedBox(height: 16),

                TextFormField(
                  controller: _emailController,
                  keyboardType: TextInputType.emailAddress,
                  style: const TextStyle(color: AppColors.textLightPrimary),
                  decoration: const InputDecoration(
                    labelText: 'Email Address',
                    prefixIcon: Icon(LucideIcons.mail, size: 18, color: AppColors.textLightSecondary),
                  ),
                  validator: (val) => val == null || !val.contains('@') ? 'Enter a valid email' : null,
                ),
                const SizedBox(height: 16),

                TextFormField(
                  controller: _phoneController,
                  keyboardType: TextInputType.phone,
                  style: const TextStyle(color: AppColors.textLightPrimary),
                  decoration: const InputDecoration(
                    labelText: 'Phone Number',
                    hintText: '08012345678',
                    prefixIcon: Icon(LucideIcons.phone, size: 18, color: AppColors.textLightSecondary),
                  ),
                  validator: (val) => val == null || val.length < 10 ? 'Enter a valid 11-digit phone number' : null,
                ),
                const SizedBox(height: 16),

                TextFormField(
                  controller: _passwordController,
                  obscureText: true,
                  style: const TextStyle(color: AppColors.textLightPrimary),
                  decoration: const InputDecoration(
                    labelText: 'Password',
                    prefixIcon: Icon(LucideIcons.lock, size: 18, color: AppColors.textLightSecondary),
                  ),
                  validator: (val) => val == null || val.length < 8 ? 'Password must be at least 8 characters' : null,
                ),
                const SizedBox(height: 16),

                TextFormField(
                  controller: _referralController,
                  style: const TextStyle(color: AppColors.textLightPrimary),
                  decoration: const InputDecoration(
                    labelText: 'Referral Code (Optional)',
                    hintText: 'e.g. SP-SANIPAY01',
                    prefixIcon: Icon(LucideIcons.gift, size: 18, color: AppColors.textLightSecondary),
                  ),
                ),
                const SizedBox(height: 32),

                ElevatedButton(
                  onPressed: authState.isLoading ? null : _handleRegister,
                  child: authState.isLoading
                      ? const SizedBox(
                          height: 22,
                          width: 22,
                          child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.black),
                        )
                      : const Text('Create Account'),
                ),
                const SizedBox(height: 24),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
