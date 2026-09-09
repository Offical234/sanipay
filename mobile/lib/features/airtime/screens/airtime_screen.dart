import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_spacing.dart';
import '../../../core/utils/currency_formatter.dart';
import '../../../core/utils/phone_validator.dart';
import '../providers/airtime_provider.dart';

class AirtimeScreen extends ConsumerStatefulWidget {
  const AirtimeScreen({super.key});

  @override
  ConsumerState<AirtimeScreen> createState() => _AirtimeScreenState();
}

class _AirtimeScreenState extends ConsumerState<AirtimeScreen> {
  final _phoneController = TextEditingController();
  final _amountController = TextEditingController();
  final _pinController = TextEditingController();

  String _selectedNetwork = 'MTN';
  final List<String> _networks = ['MTN', 'AIRTEL', 'GLO', '9MOBILE'];
  final List<int> _quickAmounts = [100, 200, 500, 1000, 2000, 5000];

  @override
  void dispose() {
    _phoneController.dispose();
    _amountController.dispose();
    _pinController.dispose();
    super.dispose();
  }

  void _onPhoneChanged(String phone) {
    final op = PhoneValidator.detectOperator(phone);
    if (op != TelecomOperator.unknown) {
      setState(() {
        _selectedNetwork = PhoneValidator.operatorName(op).toUpperCase();
      });
    }
  }

  Future<void> _handleBuyAirtime() async {
    final phone = _phoneController.text.trim();
    final amountNaira = double.tryParse(_amountController.text) ?? 0;
    final pin = _pinController.text.trim();

    if (phone.length < 10) {
      _showToast('Please enter a valid phone number', isError: true);
      return;
    }
    if (amountNaira < 50) {
      _showToast('Minimum airtime recharge is ₦50', isError: true);
      return;
    }
    if (pin.length != 4) {
      _showToast('Enter your 4-digit transaction PIN', isError: true);
      return;
    }

    final amountKobo = CurrencyFormatter.nairaToKobo(amountNaira);

    final success = await ref.read(airtimePurchaseProvider.notifier).purchaseAirtime(
          networkCode: _selectedNetwork,
          recipientPhone: phone,
          amountKobo: amountKobo,
          pin: pin,
        );

    if (success && mounted) {
      _showToast('Airtime recharge of ₦$amountNaira to $phone was successful!');
      context.pop();
    } else if (mounted) {
      final error = ref.read(airtimePurchaseProvider).error;
      _showToast(error?.toString() ?? 'Airtime purchase failed', isError: true);
    }
  }

  void _showToast(String msg, {bool isError = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg),
        backgroundColor: isError ? AppColors.error : AppColors.success,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final purchaseState = ref.watch(airtimePurchaseProvider);

    return Scaffold(
      backgroundColor: AppColors.darkBackground,
      appBar: AppBar(
        title: const Text('Buy Airtime'),
        leading: IconButton(
          icon: const Icon(LucideIcons.arrowLeft),
          onPressed: () => context.pop(),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Network Selector
              const Text(
                'Select Telecom Network',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textLightPrimary),
              ),
              const SizedBox(height: 12),

              Row(
                children: _networks.map((net) {
                  final isSelected = _selectedNetwork == net;
                  return Expanded(
                    child: GestureDetector(
                      onTap: () => setState(() => _selectedNetwork = net),
                      child: Container(
                        margin: const EdgeInsets.symmetric(horizontal: 4),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        decoration: BoxDecoration(
                          color: isSelected ? AppColors.primary.withOpacity(0.15) : AppColors.darkSurface,
                          borderRadius: AppSpacing.roundedMd,
                          border: Border.all(
                            color: isSelected ? AppColors.primary : AppColors.darkBorder,
                            width: isSelected ? 1.5 : 1,
                          ),
                        ),
                        child: Center(
                          child: Text(
                            net,
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w800,
                              color: isSelected ? AppColors.primary : AppColors.textLightSecondary,
                            ),
                          ),
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 24),

              // Phone Number Input
              TextFormField(
                controller: _phoneController,
                keyboardType: TextInputType.phone,
                onChanged: _onPhoneChanged,
                style: const TextStyle(color: AppColors.textLightPrimary),
                decoration: const InputDecoration(
                  labelText: 'Recipient Phone Number',
                  hintText: '08012345678',
                  prefixIcon: Icon(LucideIcons.phone, size: 18, color: AppColors.textLightSecondary),
                ),
              ),
              const SizedBox(height: 20),

              // Amount Input
              TextFormField(
                controller: _amountController,
                keyboardType: TextInputType.number,
                style: const TextStyle(color: AppColors.textLightPrimary),
                decoration: const InputDecoration(
                  labelText: 'Amount (₦)',
                  hintText: '500',
                  prefixIcon: Icon(LucideIcons.dollarSign, size: 18, color: AppColors.textLightSecondary),
                ),
              ),
              const SizedBox(height: 14),

              // Quick Amount Chips
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: _quickAmounts.map((amt) {
                  return ActionChip(
                    label: Text('₦$amt'),
                    backgroundColor: AppColors.darkSurface,
                    labelStyle: const TextStyle(color: AppColors.textLightPrimary, fontSize: 12),
                    side: const BorderSide(color: AppColors.darkBorder),
                    onPressed: () {
                      _amountController.text = amt.toString();
                    },
                  );
                }).toList(),
              ),
              const SizedBox(height: 20),

              // Transaction PIN
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
              ),
              const SizedBox(height: 32),

              ElevatedButton(
                onPressed: purchaseState.isLoading ? null : _handleBuyAirtime,
                child: purchaseState.isLoading
                    ? const SizedBox(
                        height: 22,
                        width: 22,
                        child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.black),
                      )
                    : const Text('Recharge Airtime'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
