import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SecureStorageService {
  static const _accessTokenKey = 'sanipay_access_token';
  static const _refreshTokenKey = 'sanipay_refresh_token';
  static const _userJsonKey = 'sanipay_user_json';
  static const _biometricEnabledKey = 'sanipay_biometrics_enabled';

  final FlutterSecureStorage _storage;

  SecureStorageService({FlutterSecureStorage? storage})
      : _storage = storage ??
            const FlutterSecureStorage(
              aOptions: AndroidOptions(encryptedSharedPreferences: true),
              iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
            );

  Future<void> saveTokens({required String accessToken, required String refreshToken}) async {
    await _storage.write(key: _accessTokenKey, value: accessToken);
    await _storage.write(key: _refreshTokenKey, value: refreshToken);
  }

  Future<String?> getAccessToken() => _storage.read(key: _accessTokenKey);
  Future<String?> getRefreshToken() => _storage.read(key: _refreshTokenKey);

  Future<void> saveUserJson(String json) => _storage.write(key: _userJsonKey, value: json);
  Future<String?> getUserJson() => _storage.read(key: _userJsonKey);

  Future<void> setBiometricsEnabled(bool enabled) =>
      _storage.write(key: _biometricEnabledKey, value: enabled.toString());
  Future<bool> isBiometricsEnabled() async {
    final val = await _storage.read(key: _biometricEnabledKey);
    return val == 'true';
  }

  Future<void> clearAll() async {
    await _storage.deleteAll();
  }
}
