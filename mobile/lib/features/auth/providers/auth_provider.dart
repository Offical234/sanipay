import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../core/storage/secure_storage_service.dart';
import '../models/auth_models.dart';

final apiClientProvider = Provider<ApiClient>((ref) => ApiClient());
final storageServiceProvider = Provider<SecureStorageService>((ref) => SecureStorageService());

class AuthState {
  final bool isLoading;
  final bool isAuthenticated;
  final UserModel? user;
  final String? errorMessage;

  AuthState({
    this.isLoading = false,
    this.isAuthenticated = false,
    this.user,
    this.errorMessage,
  });

  AuthState copyWith({
    bool? isLoading,
    bool? isAuthenticated,
    UserModel? user,
    String? errorMessage,
  }) {
    return AuthState(
      isLoading: isLoading ?? this.isLoading,
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
      user: user ?? this.user,
      errorMessage: errorMessage,
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  final ApiClient _api;
  final SecureStorageService _storage;

  AuthNotifier(this._api, this._storage) : super(AuthState()) {
    checkInitialAuth();
  }

  Future<void> checkInitialAuth() async {
    state = state.copyWith(isLoading: true);
    final token = await _storage.getAccessToken();
    if (token != null && token.isNotEmpty) {
      final userJson = await _storage.getUserJson();
      if (userJson != null) {
        try {
          final user = UserModel.fromJson(jsonDecode(userJson) as Map<String, dynamic>);
          state = state.copyWith(isLoading: false, isAuthenticated: true, user: user);
          return;
        } catch (_) {}
      }
    }
    state = state.copyWith(isLoading: false, isAuthenticated: false);
  }

  Future<bool> login(String identifier, String password) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final res = await _api.post(ApiEndpoints.login, data: {
        'email': identifier.contains('@') ? identifier.trim() : null,
        'phone': !identifier.contains('@') ? identifier.trim() : null,
        'password': password,
      });

      final data = res['data'] as Map<String, dynamic>;
      final user = UserModel.fromJson(data['user'] as Map<String, dynamic>);
      final accessToken = data['accessToken'] as String;
      final refreshToken = data['refreshToken'] as String;

      await _storage.saveTokens(accessToken: accessToken, refreshToken: refreshToken);
      await _storage.saveUserJson(jsonEncode(user.toJson()));

      state = state.copyWith(isLoading: false, isAuthenticated: true, user: user);
      return true;
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.toString());
      return false;
    }
  }

  Future<bool> register({
    required String fullName,
    required String email,
    required String phone,
    required String password,
    String? referralCode,
  }) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final res = await _api.post(ApiEndpoints.register, data: {
        'fullName': fullName.trim(),
        'email': email.trim(),
        'phone': phone.trim(),
        'password': password,
        'referralCode': referralCode?.trim(),
      });

      final data = res['data'] as Map<String, dynamic>;
      final user = UserModel.fromJson(data['user'] as Map<String, dynamic>);
      final accessToken = data['accessToken'] as String;
      final refreshToken = data['refreshToken'] as String;

      await _storage.saveTokens(accessToken: accessToken, refreshToken: refreshToken);
      await _storage.saveUserJson(jsonEncode(user.toJson()));

      state = state.copyWith(isLoading: false, isAuthenticated: true, user: user);
      return true;
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.toString());
      return false;
    }
  }

  Future<void> logout() async {
    await _storage.clearAll();
    state = AuthState();
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  final api = ref.watch(apiClientProvider);
  final storage = ref.watch(storageServiceProvider);
  return AuthNotifier(api, storage);
});
