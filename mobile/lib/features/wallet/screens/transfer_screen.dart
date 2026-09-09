import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_spacing.dart';
import '../../../core/utils/currency_formatter.dart';
import '../providers/wallet_provider.dart';

class TransferScreen extends ConsumerStatefulWidget {
  const TransferScreen({super.key});

  @override
  ConsumerState<TransferScreen> createState() => _TransferScreenState();
}

class _TransferScreenState extends ConsumerState<TransferScreen> {
  final _formKey = GlobalKey<FormState>();
  final _recipientController = TextEditingController();
  final _amountController = TextEditingController();
  final _pinController = TextEditingController();

  @override
  void dispose() {
    _recipientController.dispose();
    _amountController.dispose();
    _pinController.dispose();
    super.dispose();
  }

  Future<void> _handleTransfer() async {
    if (!_formKey.currentState!.validate()) return;

    final amountNaira = double.tryParse(_amountController.text) ?? 0;
    final amountKobo = CurrencyFormatter.nairaToKobo(amountNaira);

    final success = await ref.read(walletTransferProvider.notifier).transferFunds(
          recipientIdentifier: _recipientController.text.trim(),
          amountKobo: amountKobo,
          pin: _pinController.text.trim(),
        );

    if (success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Transfer completed successfully!'),
          backgroundColor: AppColors.success,
        ),
      );
      context.pop();
    } else if (mounted) {
      final error = ref.read(walletTransferProvider).error;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(error?.toString() ?? 'Transfer failed.'),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final transferState = ref.watch(walletTransferProvider);

    return Scaffold(
      backgroundColor: AppColors.darkBackground,
      appBar: AppBar(
        title: const Text('Send Money (P2P)'),
        leading: IconButton(
          icon: const Icon(LucideIcons.arrowLeft),
          onPressed: () => context.pop(),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Transfer to another SaniPay user with zero transaction fee.',
                  style: TextStyle(color: AppColors.textLightSecondary, fontSize: 13),
                ),
                const SizedBox(height: 24),

                TextFormField(
                  controller: _recipientController,
                  style: const TextStyle(color: AppColors.textLightPrimary),
                  decoration: const InputDecoration(
                    labelText: 'Recipient Email or Phone Number',
                    hintText: 'e.g. friend@example.com or 08012345678',
                    prefixIcon: Icon(LucideIcons.userCheck, size: 18, color: AppColors.textLightSecondary),
                  ),
                  validator: (val) => val == null || val.trim().isEmpty ? 'Enter recipient' : null,
                ),
                const SizedBox(height: 16),

                TextFormField(
                  controller: _amountController,
                  keyboardType: TextInputType.number,
                  style: const TextStyle(color: AppColors.textLightPrimary),
                  decoration: const InputDecoration(
                    labelText: 'Amount (₦)',
                    hintText: '1000',
                    prefixIcon: Icon(LucideIcons.dollarSign, size: 18, color: AppColors.textLightSecondary),
                  ),
                  validator: (val) {
                    final amount = double.tryParse(val ?? '') ?? 0;
                    if (amount < 100) return 'Minimum transfer is ₦100';
                    return null;
                  },
                ),
                const SizedBox(height: 16),

                TextFormField(
                  controller: _pinController,
                  obscureText: true,
                  keyboardType: TextInputType.number,
                  maxLength: 4,
                  style: const TextStyle(color: AppColors.textLightPrimary, letterSpacing: 4),
                  decoration: const InputDecoration(
                    labelText: '4-Digit Transaction PIN',
                    hintText: '••••',
                    counterText: '',
                    prefixIcon: Icon(LucideIcons.lock, size: 18, color: AppColors.textLightSecondary),
                  ),
                  validator: (val) => val == null || val.length != 4 ? 'Enter 4-digit PIN' : null,
                ),
                const SizedBox(height: 32),

                ElevatedButton(
                  onPressed: transferState.isLoading ? null : _handleTransfer,
                  child: transferState.isLoading
                      ? const SizedBox(
                          height: 22,
                          width: 22,
                          child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.black),
                        )
                      : const Text('Send Funds Now'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
