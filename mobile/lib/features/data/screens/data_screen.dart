import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_spacing.dart';
import '../../../core/utils/phone_validator.dart';
import '../models/data_models.dart';
import '../providers/data_provider.dart';

class DataScreen extends ConsumerStatefulWidget {
  const DataScreen({super.key});

  @override
  ConsumerState<DataScreen> createState() => _DataScreenState();
}

class _DataScreenState extends ConsumerState<DataScreen> {
  final _phoneController = TextEditingController();
  final _pinController = TextEditingController();

  String _selectedNetwork = 'MTN';
  final List<String> _networks = ['MTN', 'AIRTEL', 'GLO', '9MOBILE'];
  DataPlanModel? _selectedPlan;

  @override
  void dispose() {
    _phoneController.dispose();
    _pinController.dispose();
    super.dispose();
  }

  void _onPhoneChanged(String phone) {
    final op = PhoneValidator.detectOperator(phone);
    if (op != TelecomOperator.unknown) {
      setState(() {
        _selectedNetwork = PhoneValidator.operatorName(op).toUpperCase();
        _selectedPlan = null;
      });
    }
  }

  Future<void> _handleBuyData() async {
    final phone = _phoneController.text.trim();
    final pin = _pinController.text.trim();

    if (phone.length < 10) {
      _showToast('Enter a valid recipient phone number', isError: true);
      return;
    }
    if (_selectedPlan == null) {
      _showToast('Please choose a data plan bundle', isError: true);
      return;
    }
    if (pin.length != 4) {
      _showToast('Enter your 4-digit transaction PIN', isError: true);
      return;
    }

    final success = await ref.read(dataPurchaseProvider.notifier).purchaseData(
          planId: _selectedPlan!.id,
          recipientPhone: phone,
          pin: pin,
        );

    if (success && mounted) {
      _showToast('Data bundle ${_selectedPlan!.name} activated on $phone!');
      context.pop();
    } else if (mounted) {
      final error = ref.read(dataPurchaseProvider).error;
      _showToast(error?.toString() ?? 'Data bundle purchase failed', isError: true);
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
    final plansAsync = ref.watch(dataPlansProvider(_selectedNetwork));
    final purchaseState = ref.watch(dataPurchaseProvider);

    return Scaffold(
      backgroundColor: AppColors.darkBackground,
      appBar: AppBar(
        title: const Text('Buy Mobile Data'),
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
              // Network Tabs
              Row(
                children: _networks.map((net) {
                  final isSelected = _selectedNetwork == net;
                  return Expanded(
                    child: GestureDetector(
                      onTap: () => setState(() {
                        _selectedNetwork = net;
                        _selectedPlan = null;
                      }),
                      child: Container(
                        margin: const EdgeInsets.symmetric(horizontal: 4),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        decoration: BoxDecoration(
                          color: isSelected ? AppColors.secondary.withOpacity(0.15) : AppColors.darkSurface,
                          borderRadius: AppSpacing.roundedMd,
                          border: Border.all(
                            color: isSelected ? AppColors.secondary : AppColors.darkBorder,
                            width: isSelected ? 1.5 : 1,
                          ),
                        ),
                        child: Center(
                          child: Text(
                            net,
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w800,
                              color: isSelected ? AppColors.secondary : AppColors.textLightSecondary,
                            ),
                          ),
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 20),

              // Recipient Phone Input
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
              const SizedBox(height: 24),

              // Data Plans Catalog Grid
              const Text(
                'Select Data Plan',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textLightPrimary),
              ),
              const SizedBox(height: 12),

              plansAsync.when(
                data: (plans) {
                  if (plans.isEmpty) {
                    return const Padding(
                      padding: EdgeInsets.symmetric(vertical: 32),
                      child: Center(
                        child: Text(
                          'No plans available for this network at the moment.',
                          style: TextStyle(color: AppColors.textLightSecondary),
                        ),
                      ),
                    );
                  }
                  return GridView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      crossAxisSpacing: 12,
                      mainAxisSpacing: 12,
                      childAspectRatio: 1.4,
                    ),
                    itemCount: plans.length,
                    itemBuilder: (context, index) {
                      final plan = plans[index];
                      final isSelected = _selectedPlan?.id == plan.id;

                      return GestureDetector(
                        onTap: () => setState(() => _selectedPlan = plan),
                        child: Container(
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: isSelected ? AppColors.primary.withOpacity(0.12) : AppColors.darkSurface,
                            borderRadius: AppSpacing.roundedMd,
                            border: Border.all(
                              color: isSelected ? AppColors.primary : AppColors.darkBorder,
                              width: isSelected ? 2 : 1,
                            ),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    plan.name,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w700,
                                      fontSize: 14,
                                      color: AppColors.textLightPrimary,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    plan.validity,
                                    style: const TextStyle(fontSize: 11, color: AppColors.textLightSecondary),
                                  ),
                                ],
                              ),
                              Text(
                                plan.sellingPriceFormatted,
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w900,
                                  color: AppColors.primary,
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  );
                },
                loading: () => const Center(child: Padding(padding: EdgeInsets.all(24), child: CircularProgressIndicator())),
                error: (e, _) => Center(child: Text('Error loading plans: $e')),
              ),
              const SizedBox(height: 24),

              // PIN Input
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
                onPressed: purchaseState.isLoading ? null : _handleBuyData,
                child: purchaseState.isLoading
                    ? const SizedBox(
                        height: 22,
                        width: 22,
                        child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.black),
                      )
                    : Text(
                        _selectedPlan != null
                            ? 'Buy ${_selectedPlan!.name} (${_selectedPlan!.sellingPriceFormatted})'
                            : 'Select a Data Plan',
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
