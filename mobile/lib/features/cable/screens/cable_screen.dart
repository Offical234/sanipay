import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_spacing.dart';
import '../models/cable_models.dart';
import '../providers/cable_provider.dart';

class CableScreen extends ConsumerStatefulWidget {
  const CableScreen({super.key});

  @override
  ConsumerState<CableScreen> createState() => _CableScreenState();
}

class _CableScreenState extends ConsumerState<CableScreen> {
  final _smartcardController = TextEditingController();
  final _phoneController = TextEditingController();
  final _pinController = TextEditingController();

  String _selectedProvider = 'dstv';
  SmartcardDetailsModel? _verifiedCard;
  bool _isVerifying = false;

  final List<Map<String, String>> _providers = [
    {'code': 'dstv', 'name': 'DStv'},
    {'code': 'gotv', 'name': 'GOtv'},
    {'code': 'startimes', 'name': 'Startimes'},
  ];

  final List<CableBouquetModel> _sampleBouquets = [
    CableBouquetModel(code: 'dstv-yanga', name: 'DStv Yanga', priceKobo: 510000, priceFormatted: '₦5,100.00'),
    CableBouquetModel(code: 'dstv-confam', name: 'DStv Confam', priceKobo: 930000, priceFormatted: '₦9,300.00'),
    CableBouquetModel(code: 'dstv-compact', name: 'DStv Compact', priceKobo: 1570000, priceFormatted: '₦15,700.00'),
  ];
  late CableBouquetModel _selectedBouquet;

  @override
  void initState() {
    super.initState();
    _selectedBouquet = _sampleBouquets.first;
  }

  @override
  void dispose() {
    _smartcardController.dispose();
    _phoneController.dispose();
    _pinController.dispose();
    super.dispose();
  }

  Future<void> _handleVerifyCard() async {
    final card = _smartcardController.text.trim();
    if (card.length < 8) {
      _showToast('Enter valid smartcard number', isError: true);
      return;
    }

    setState(() => _isVerifying = true);
    try {
      final res = await ref.read(cableProvider.notifier).verifySmartcard(
            providerCode: _selectedProvider,
            smartcardNumber: card,
          );
      setState(() => _verifiedCard = res);
      _showToast('Subscriber confirmed: ${_verifiedCard?.customerName}');
    } catch (e) {
      _showToast('Smartcard verification failed: $e', isError: true);
    } finally {
      setState(() => _isVerifying = false);
    }
  }

  Future<void> _handlePayCable() async {
    if (_verifiedCard == null) {
      _showToast('Please verify smartcard number first', isError: true);
      return;
    }
    final phone = _phoneController.text.trim();
    if (phone.length < 10) {
      _showToast('Enter phone number', isError: true);
      return;
    }
    final pin = _pinController.text.trim();
    if (pin.length != 4) {
      _showToast('Enter 4-digit PIN', isError: true);
      return;
    }

    final success = await ref.read(cableProvider.notifier).payCable(
          providerCode: _selectedProvider,
          smartcardNumber: _smartcardController.text.trim(),
          packageCode: _selectedBouquet.code,
          amountKobo: _selectedBouquet.priceKobo,
          phone: phone,
          pin: pin,
        );

    if (success && mounted) {
      _showToast('${_selectedBouquet.name} subscription renewed successfully!');
      context.pop();
    } else if (mounted) {
      final error = ref.read(cableProvider).error;
      _showToast(error?.toString() ?? 'Cable renewal failed', isError: true);
    }
  }

  void _showToast(String msg, {bool isError = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), backgroundColor: isError ? AppColors.error : AppColors.success),
    );
  }

  @override
  Widget build(BuildContext context) {
    final payState = ref.watch(cableProvider);

    return Scaffold(
      backgroundColor: AppColors.darkBackground,
      appBar: AppBar(
        title: const Text('Cable TV Subscription'),
        leading: IconButton(icon: const Icon(LucideIcons.arrowLeft), onPressed: () => context.pop()),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Provider Selector
              Row(
                children: _providers.map((p) {
                  final isSelected = _selectedProvider == p['code'];
                  return Expanded(
                    child: GestureDetector(
                      onTap: () => setState(() {
                        _selectedProvider = p['code']!;
                        _verifiedCard = null;
                      }),
                      child: Container(
                        margin: const EdgeInsets.symmetric(horizontal: 4),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        decoration: BoxDecoration(
                          color: isSelected ? AppColors.accent.withOpacity(0.15) : AppColors.darkSurface,
                          borderRadius: AppSpacing.roundedMd,
                          border: Border.all(color: isSelected ? AppColors.accent : AppColors.darkBorder),
                        ),
                        child: Center(
                          child: Text(
                            p['name']!,
                            style: TextStyle(fontWeight: FontWeight.w700, color: isSelected ? AppColors.accent : AppColors.textLightSecondary),
                          ),
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 20),

              // Smartcard Number & Verify
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _smartcardController,
                      keyboardType: TextInputType.number,
                      style: const TextStyle(color: AppColors.textLightPrimary),
                      decoration: const InputDecoration(labelText: 'Smartcard / IUC Number', hintText: '1023456789'),
                    ),
                  ),
                  const SizedBox(width: 10),
                  ElevatedButton(
                    onPressed: _isVerifying ? null : _handleVerifyCard,
                    style: ElevatedButton.styleFrom(backgroundColor: AppColors.secondary, minimumSize: const Size(90, 52)),
                    child: _isVerifying
                        ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black))
                        : const Text('Verify'),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              if (_verifiedCard != null)
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
                      Text(
                        _verifiedCard!.customerName,
                        style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.textLightPrimary, fontSize: 14),
                      ),
                    ],
                  ),
                ),
              const SizedBox(height: 20),

              // Bouquet Dropdown
              const Text('Select Bouquet Package', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textLightPrimary)),
              const SizedBox(height: 10),
              DropdownButtonFormField<CableBouquetModel>(
                value: _selectedBouquet,
                dropdownColor: AppColors.darkSurface,
                style: const TextStyle(color: AppColors.textLightPrimary, fontSize: 14),
                items: _sampleBouquets.map((b) {
                  return DropdownMenuItem(value: b, child: Text('${b.name} (${b.priceFormatted})'));
                }).toList(),
                onChanged: (val) {
                  if (val != null) setState(() => _selectedBouquet = val);
                },
              ),
              const SizedBox(height: 16),

              TextFormField(
                controller: _phoneController,
                keyboardType: TextInputType.phone,
                style: const TextStyle(color: AppColors.textLightPrimary),
                decoration: const InputDecoration(labelText: 'Customer Phone Number', hintText: '08012345678'),
              ),
              const SizedBox(height: 16),

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
                onPressed: payState.isLoading ? null : _handlePayCable,
                child: payState.isLoading
                    ? const SizedBox(height: 22, width: 22, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.black))
                    : Text('Pay ${_selectedBouquet.priceFormatted} Now'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
