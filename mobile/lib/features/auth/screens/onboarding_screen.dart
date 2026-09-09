import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_spacing.dart';
import '../../../core/router/route_names.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final PageController _pageController = PageController();
  int _currentIndex = 0;

  final List<Map<String, dynamic>> _slides = [
    {
      'title': 'Instant Airtime & Data',
      'desc': 'Recharge MTN, Airtel, GLO, and 9mobile with real-time cashback discounts directly from your wallet.',
      'icon': LucideIcons.smartphone,
      'color': AppColors.primary,
    },
    {
      'title': 'Frictionless Bill Payments',
      'desc': 'Generate electricity prepaid meter tokens and renew DStv, GOtv, and Startimes bouquets in seconds.',
      'icon': LucideIcons.zap,
      'color': AppColors.secondary,
    },
    {
      'title': 'Earn On Every Referral',
      'desc': 'Share your unique SaniPay code and receive automatic ₦200 cash bonuses whenever your friends recharge.',
      'icon': LucideIcons.gift,
      'color': AppColors.accent,
    },
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.darkBackground,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          child: Column(
            children: [
              Align(
                alignment: Alignment.topRight,
                child: TextButton(
                  onPressed: () => context.go(RouteNames.login),
                  child: const Text(
                    'Skip',
                    style: TextStyle(color: AppColors.textLightSecondary, fontWeight: FontWeight.w600),
                  ),
                ),
              ),
              Expanded(
                child: PageView.builder(
                  controller: _pageController,
                  onPageChanged: (index) => setState(() => _currentIndex = index),
                  itemCount: _slides.length,
                  itemBuilder: (context, index) {
                    final slide = _slides[index];
                    return Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          width: 120,
                          height: 120,
                          decoration: BoxDecoration(
                            color: (slide['color'] as Color).withOpacity(0.12),
                            shape: BoxShape.circle,
                            border: Border.all(color: (slide['color'] as Color).withOpacity(0.3)),
                          ),
                          child: Center(
                            child: Icon(slide['icon'] as IconData, size: 56, color: slide['color'] as Color),
                          ),
                        ),
                        const SizedBox(height: 40),
                        Text(
                          slide['title'] as String,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.w800,
                            color: AppColors.textLightPrimary,
                          ),
                        ),
                        const SizedBox(height: 16),
                        Text(
                          slide['desc'] as String,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontSize: 14,
                            color: AppColors.textLightSecondary,
                            height: 1.5,
                          ),
                        ),
                      ],
                    );
                  },
                ),
              ),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(
                  _slides.length,
                  (index) => AnimatedContainer(
                    duration: const Duration(milliseconds: 250),
                    margin: const EdgeInsets.symmetric(horizontal: 4),
                    width: _currentIndex == index ? 24 : 8,
                    height: 8,
                    decoration: BoxDecoration(
                      color: _currentIndex == index ? AppColors.primary : AppColors.darkBorder,
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 32),
              ElevatedButton(
                onPressed: () {
                  if (_currentIndex < _slides.length - 1) {
                    _pageController.nextPage(
                      duration: const Duration(milliseconds: 300),
                      curve: Curves.easeInOut,
                    );
                  } else {
                    context.go(RouteNames.login);
                  }
                },
                child: Text(_currentIndex == _slides.length - 1 ? 'Get Started' : 'Continue'),
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }
}
