import 'package:dio/dio.dart';
import '../config/app_config.dart';
import '../storage/secure_storage_service.dart';
import 'auth_interceptor.dart';
import 'api_exception.dart';

class ApiClient {
  late final Dio _dio;
  final SecureStorageService _storage;

  ApiClient({SecureStorageService? storage})
      : _storage = storage ?? SecureStorageService() {
    _dio = Dio(
      BaseOptions(
        baseUrl: AppConfig.apiBaseUrl,
        connectTimeout: AppConfig.connectTimeout,
        receiveTimeout: AppConfig.receiveTimeout,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    _dio.interceptors.add(AuthInterceptor(_storage));
  }

  Dio get dio => _dio;
  SecureStorageService get storage => _storage;

  Future<dynamic> get(String path, {Map<String, dynamic>? queryParameters}) async {
    try {
      final response = await _dio.get(path, queryParameters: queryParameters);
      return response.data;
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<dynamic> post(String path, {dynamic data}) async {
    try {
      final response = await _dio.post(path, data: data);
      return response.data;
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<dynamic> put(String path, {dynamic data}) async {
    try {
      final response = await _dio.put(path, data: data);
      return response.data;
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<dynamic> patch(String path, {dynamic data}) async {
    try {
      final response = await _dio.patch(path, data: data);
      return response.data;
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  ApiException _handleError(DioException error) {
    String message = 'A network error occurred. Please try again.';
    int? code = error.response?.statusCode;
    dynamic data = error.response?.data;

    if (error.type == DioExceptionType.connectionTimeout ||
        error.type == DioExceptionType.receiveTimeout) {
      message = 'Connection timed out. Please check your internet connection.';
    } else if (error.type == DioExceptionType.connectionError) {
      message = 'Unable to connect to SaniPay servers. Please verify network access.';
    } else if (error.response?.data != null && error.response?.data is Map) {
      final map = error.response!.data as Map;
      if (map['message'] is String) {
        message = map['message'] as String;
      } else if (map['message'] is List) {
        message = (map['message'] as List).join(', ');
      }
    }

    return ApiException(message: message, statusCode: code, data: data);
  }
}
