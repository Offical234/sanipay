import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'route_names.dart';
import '../../features/auth/screens/splash_screen.dart';
import '../../features/auth/screens/onboarding_screen.dart';
import '../../features/auth/screens/login_screen.dart';
import '../../features/auth/screens/register_screen.dart';
import '../../features/dashboard/screens/dashboard_shell.dart';
import '../../features/wallet/screens/wallet_screen.dart';
import '../../features/wallet/screens/transfer_screen.dart';
import '../../features/airtime/screens/airtime_screen.dart';
import '../../features/data/screens/data_screen.dart';
import '../../features/electricity/screens/electricity_screen.dart';
import '../../features/cable/screens/cable_screen.dart';
import '../../features/transactions/screens/transactions_screen.dart';
import '../../features/referral/screens/referral_screen.dart';
import '../../features/profile/screens/profile_screen.dart';
import '../../features/support/screens/support_screen.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: RouteNames.splash,
    routes: [
      GoRoute(
        path: RouteNames.splash,
        builder: (context, state) => const SplashScreen(),
      ),
      GoRoute(
        path: RouteNames.onboarding,
        builder: (context, state) => const OnboardingScreen(),
      ),
      GoRoute(
        path: RouteNames.login,
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: RouteNames.register,
        builder: (context, state) => const RegisterScreen(),
      ),
      GoRoute(
        path: RouteNames.dashboard,
        builder: (context, state) => const DashboardShell(),
      ),
      GoRoute(
        path: RouteNames.wallet,
        builder: (context, state) => const WalletScreen(),
      ),
      GoRoute(
        path: RouteNames.transfer,
        builder: (context, state) => const TransferScreen(),
      ),
      GoRoute(
        path: RouteNames.airtime,
        builder: (context, state) => const AirtimeScreen(),
      ),
      GoRoute(
        path: RouteNames.data,
        builder: (context, state) => const DataScreen(),
      ),
      GoRoute(
        path: RouteNames.electricity,
        builder: (context, state) => const ElectricityScreen(),
      ),
      GoRoute(
        path: RouteNames.cable,
        builder: (context, state) => const CableScreen(),
      ),
      GoRoute(
        path: RouteNames.history,
        builder: (context, state) => const TransactionsScreen(),
      ),
      GoRoute(
        path: RouteNames.referral,
        builder: (context, state) => const ReferralScreen(),
      ),
      GoRoute(
        path: RouteNames.profile,
        builder: (context, state) => const ProfileScreen(),
      ),
      GoRoute(
        path: RouteNames.support,
        builder: (context, state) => const SupportScreen(),
      ),
    ],
  );
});
