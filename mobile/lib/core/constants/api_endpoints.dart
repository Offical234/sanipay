class ApiEndpoints {
  // Authentication
  static const String register = '/auth/register';
  static const String login = '/auth/login';
  static const String verifyOtp = '/auth/verify-otp';
  static const String resendOtp = '/auth/resend-otp';
  static const String refreshToken = '/auth/refresh';

  // User Profile
  static const String userProfile = '/users/me';
  static const String changePassword = '/users/me/password';
  static const String setTransactionPin = '/users/me/transaction-pin';

  // Wallet
  static const String wallet = '/wallet/me';
  static const String walletTransfer = '/wallet/transfer';
  static const String walletTransactions = '/wallet/transactions';
  static const String initializePayment = '/payments/initialize';

  // Services: Airtime & Data
  static const String purchaseAirtime = '/airtime/purchase';
  static const String dataPlans = '/data/plans';
  static const String purchaseData = '/data/purchase';

  // Services: Electricity & Cable
  static const String verifyMeter = '/electricity/verify';
  static const String payElectricity = '/electricity/pay';
  static const String verifySmartcard = '/cable/verify';
  static const String payCable = '/cable/pay';

  // Transactions
  static const String transactions = '/transactions';

  // Referrals
  static const String referralSummary = '/referrals/summary';
  static const String referralHistory = '/referrals/history';
  static const String claimReferral = '/referrals/claim';

  // Support & Notifications
  static const String supportTickets = '/support/tickets';
  static const String notifications = '/notifications';
  static const String readAllNotifications = '/notifications/read-all';
}
