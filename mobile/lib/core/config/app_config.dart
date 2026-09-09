class AppConfig {
  static const String appName = 'SaniPay';
  static const String appTagline = 'Fast VTU & Digital Utility Payments';
  static const String appVersion = '1.0.0';

  // Base API configuration (Defaults to local machine host for Android emulator or LAN IP)
  // For Android emulator: 10.0.2.2 points to host localhost:3000
  // For iOS simulator: localhost:3000
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:3000/api/v1',
  );

  static const Duration connectTimeout = Duration(seconds: 15);
  static const Duration receiveTimeout = Duration(seconds: 15);

  // Deep linking host
  static const String deepLinkHost = 'https://sanipay.ng';
}
