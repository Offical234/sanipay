import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_spacing.dart';
import '../../../core/utils/currency_formatter.dart';
import '../models/electricity_models.dart';
import '../providers/electricity_provider.dart';

class ElectricityScreen extends ConsumerStatefulWidget {
  const ElectricityScreen({super.key});

  @override
  ConsumerState<ElectricityScreen> createState() => _ElectricityScreenState();
}

class _ElectricityScreenState extends ConsumerState<ElectricityScreen> {
  final _meterController = TextEditingController();
  final _amountController = TextEditingController();
  final _phoneController = TextEditingController();
  final _pinController = TextEditingController();

  String _selectedDisco = 'ikeja-electric';
  String _meterType = 'PREPAID';
  MeterDetailsModel? _verifiedMeter;
  bool _isVerifying = false;

  final List<Map<String, String>> _discos = [
    {'code': 'ikeja-electric', 'name': 'Ikeja Electric (IKEDC)'},
    {'code': 'eko-electric', 'name': 'Eko Electric (EKEDC)'},
    {'code': 'abuja-electric', 'name': 'Abuja Electric (AEDC)'},
    {'code': 'ibadan-electric', 'name': 'Ibadan Electric (IBEDC)'},
    {'code': 'phed', 'name': 'Port Harcourt Electric (PHED)'},
    {'code': 'kano-electric', 'name': 'Kano Electric (KEDCO)'},
  ];

  @override
  void dispose() {
    _meterController.dispose();
    _amountController.dispose();
    _phoneController.dispose();
    _pinController.dispose();
    super.dispose();
  }

  Future<void> _handleVerifyMeter() async {
    final meter = _meterController.text.trim();
    if (meter.length < 8) {
      _showToast('Enter a valid meter number', isError: true);
      return;
    }

    setState(() => _isVerifying = true);
    try {
      final res = await ref.read(electricityProvider.notifier).verifyMeter(
            discoCode: _selectedDisco,
            meterNumber: meter,
            meterType: _meterType,
          );
      setState(() => _verifiedMeter = res);
      _showToast('Meter validated for ${_verifiedMeter?.customerName}');
    } catch (e) {
      _showToast('Meter lookup failed: $e', isError: true);
    } finally {
      setState(() => _isVerifying = false);
    }
  }

  Future<void> _handlePayElectricity() async {
    if (_verifiedMeter == null) {
      _showToast('Please verify your meter number first', isError: true);
      return;
    }
    final amountNaira = double.tryParse(_amountController.text) ?? 0;
    if (amountNaira < 500) {
      _showToast('Minimum electricity bill amount is ₦500', isError: true);
      return;
    }
    final phone = _phoneController.text.trim();
    if (phone.length < 10) {
      _showToast('Enter recipient phone number', isError: true);
      return;
    }
    final pin = _pinController.text.trim();
    if (pin.length != 4) {
      _showToast('Enter your 4-digit transaction PIN', isError: true);
      return;
    }

    final amountKobo = CurrencyFormatter.nairaToKobo(amountNaira);

    final res = await ref.read(electricityProvider.notifier).payElectricity(
          discoCode: _selectedDisco,
          meterNumber: _meterController.text.trim(),
          meterType: _meterType,
          amountKobo: amountKobo,
          phone: phone,
          pin: pin,
        );

    if (res != null && mounted) {
      _showTokenDialog(res);
    } else if (mounted) {
      final error = ref.read(electricityProvider).error;
      _showToast(error?.toString() ?? 'Electricity payment failed', isError: true);
    }
  }

  void _showTokenDialog(ElectricityPaymentResultModel res) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) {
        return AlertDialog(
          backgroundColor: AppColors.darkSurface,
          shape: RoundedRectangleBorder(borderRadius: AppSpacing.roundedMd),
          title: const Text('Electricity Payment Successful!', style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.w800)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Amount Paid: ${res.amountFormatted}', style: const TextStyle(color: AppColors.textLightPrimary, fontWeight: FontWeight.w600)),
              const SizedBox(height: 14),
              if (res.token != null) ...[
                const Text('Prepaid Token:', style: TextStyle(color: AppColors.textLightSecondary, fontSize: 12)),
                const SizedBox(height: 4),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.darkSurfaceCard,
                    borderRadius: AppSpacing.roundedSm,
                    border: Border.all(color: AppColors.primary),
                  ),
                  child: Text(
                    res.token!,
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w900,
                      color: AppColors.primary,
                      fontFamily: 'monospace',
                    ),
                  ),
                ),
              ],
              if (res.units != null) ...[
                const SizedBox(height: 10),
                Text('Units: ${res.units}', style: const TextStyle(color: AppColors.textLightSecondary, fontSize: 13)),
              ],
            ],
          ),
          actions: [
            ElevatedButton(
              onPressed: () {
                Navigator.pop(context);
                context.pop();
              },
              child: const Text('Done'),
            ),
          ],
        );
      },
    );
  }

  void _showToast(String msg, {bool isError = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), backgroundColor: isError ? AppColors.error : AppColors.success),
    );
  }

  @override
  Widget build(BuildContext context) {
    final payState = ref.watch(electricityProvider);

    return Scaffold(
      backgroundColor: AppColors.darkBackground,
      appBar: AppBar(
        title: const Text('Electricity Bill'),
        leading: IconButton(icon: const Icon(LucideIcons.arrowLeft), onPressed: () => context.pop()),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // DisCo Selector
              const Text('Select Electricity DisCo', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textLightPrimary)),
              const SizedBox(height: 10),
              DropdownButtonFormField<String>(
                value: _selectedDisco,
                dropdownColor: AppColors.darkSurface,
                style: const TextStyle(color: AppColors.textLightPrimary, fontSize: 14),
                items: _discos.map((d) {
                  return DropdownMenuItem(value: d['code'], child: Text(d['name']!));
                }).toList(),
                onChanged: (val) {
                  if (val != null) {
                    setState(() {
                      _selectedDisco = val;
                      _verifiedMeter = null;
                    });
                  }
                },
              ),
              const SizedBox(height: 18),

              // Meter Type Toggle
              Row(
                children: ['PREPAID', 'POSTPAID'].map((type) {
                  final isSelected = _meterType == type;
                  return Expanded(
                    child: GestureDetector(
                      onTap: () => setState(() {
                        _meterType = type;
                        _verifiedMeter = null;
                      }),
                      child: Container(
                        margin: const EdgeInsets.symmetric(horizontal: 4),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        decoration: BoxDecoration(
                          color: isSelected ? AppColors.warning.withOpacity(0.15) : AppColors.darkSurface,
                          borderRadius: AppSpacing.roundedMd,
                          border: Border.all(color: isSelected ? AppColors.warning : AppColors.darkBorder),
                        ),
                        child: Center(
                          child: Text(
                            type,
                            style: TextStyle(fontWeight: FontWeight.w700, color: isSelected ? AppColors.warning : AppColors.textLightSecondary),
                          ),
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 20),

              // Meter Number Input & Verify Button
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _meterController,
                      keyboardType: TextInputType.number,
                      style: const TextStyle(color: AppColors.textLightPrimary),
                      decoration: const InputDecoration(
                        labelText: 'Meter Number',
                        hintText: '01234567890',
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  ElevatedButton(
                    onPressed: _isVerifying ? null : _handleVerifyMeter,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.secondary,
                      minimumSize: const Size(90, 52),
                    ),
                    child: _isVerifying
                        ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black))
                        : const Text('Verify'),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Verified Customer Banner
              if (_verifiedMeter != null)
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: AppColors.success.withOpacity(0.12),
                    borderRadius: AppSpacing.roundedMd,
                    border: Border.all(color: AppColors.success.withOpacity(0.3)),
                  ),
                  child: Row(
                    children: [
                      const Icon(LucideIcons.checkCircle2, color: AppColors.success, size: 22),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _verifiedMeter!.customerName,
                              style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.textLightPrimary, fontSize: 14),
                            ),
                            if (_verifiedMeter!.customerAddress.isNotEmpty)
                              Text(_verifiedMeter!.customerAddress, style: const TextStyle(fontSize: 12, color: AppColors.textLightSecondary)),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              const SizedBox(height: 20),

              // Amount
              TextFormField(
                controller: _amountController,
                keyboardType: TextInputType.number,
                style: const TextStyle(color: AppColors.textLightPrimary),
                decoration: const InputDecoration(labelText: 'Recharge Amount (₦)', hintText: '2000'),
              ),
              const SizedBox(height: 16),

              // Recipient Phone
              TextFormField(
                controller: _phoneController,
                keyboardType: TextInputType.phone,
                style: const TextStyle(color: AppColors.textLightPrimary),
                decoration: const InputDecoration(labelText: 'Receipt Delivery Phone Number', hintText: '08012345678'),
              ),
              const SizedBox(height: 16),

              // PIN
              TextFormField(
                controller: _pinController,
                obscureText: true,
                keyboardType: TextInputType.number,
                maxLength: 4,
                style: const TextStyle(color: AppColors.textLightPrimary, letterSpacing: 4),
                decoration: const InputDecoration(labelText: '4-Digit PIN', hintText: '••••', counterText: ''),
              ),
              const SizedBox(height: 28),

              ElevatedButton(
                onPressed: payState.isLoading ? null : _handlePayElectricity,
                child: payState.isLoading
                    ? const SizedBox(height: 22, width: 22, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.black))
                    : const Text('Pay Electricity Bill'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
