import 'package:flutter/foundation.dart';
import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:flutter_dotenv/flutter_dotenv.dart';

class ApiClient {
  static String get _baseUrl {
    String? envUrl = dotenv.env['API_BASE_URL'];
    if (envUrl != null && envUrl.isNotEmpty) {
      return envUrl;
    }
    if (kIsWeb) {
      return 'http://localhost:8080/api';
    }
    // 10.0.2.2 es la IP especial del emulador Android para acceder a localhost del host
    return 'http://10.0.2.2:8080/api';
  }

  static final Dio _dio = Dio(
    BaseOptions(
      baseUrl: _baseUrl, 
      connectTimeout: const Duration(seconds: 5),
      receiveTimeout: const Duration(seconds: 3),
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    ),
  );

  static Future<void> init() async {
    // Interceptor para inyectar automáticamente el JWT Token si existe
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final prefs = await SharedPreferences.getInstance();
          final token = prefs.getString('jwt_token');
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          
          // Anti-cache global para peticiones GET en Web
          if (kIsWeb && options.method.toUpperCase() == 'GET') {
            final timestamp = DateTime.now().millisecondsSinceEpoch;
            final char = options.path.contains('?') ? '&' : '?';
            options.path = '${options.path}${char}t=$timestamp';
          }
          
          return handler.next(options);
        },
      ),
    );
  }

  static Dio get instance => _dio;
}
