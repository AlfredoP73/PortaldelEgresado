import 'package:flutter/foundation.dart';
import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ApiClient {
  // ===========================================================================
  // ENDPOINTS IMPLANTADOS AUTOMÁTICAMENTE POR EL DESPLIEGUE (deploy.ps1 / deploy_s3.ps1)
  // ===========================================================================
  static const String activeArchitecture = 'ARCH2_ECS_MICROSERVICES';
  static const String deployedHost = 'http://alb-portal-api-1118805484.us-east-1.elb.amazonaws.com';
  static const String authServiceHost = 'http://alb-portal-api-1118805484.us-east-1.elb.amazonaws.com';
  static const String graduatesServiceHost = 'http://alb-portal-api-1118805484.us-east-1.elb.amazonaws.com';
  static const String companiesServiceHost = 'http://alb-portal-api-1118805484.us-east-1.elb.amazonaws.com';
  static const String matchmakingServiceHost = 'http://alb-portal-api-1118805484.us-east-1.elb.amazonaws.com';
  static const String dashboardServiceHost = 'http://alb-portal-api-1118805484.us-east-1.elb.amazonaws.com';
  // ===========================================================================

  static String _normalizeHost(String raw) {
    String clean = raw.trim();
    if (!kIsWeb && clean.contains('localhost')) {
      clean = clean.replaceAll('localhost', '10.0.2.2');
    }
    while (clean.endsWith('/')) {
      clean = clean.substring(0, clean.length - 1);
    }
    return clean;
  }

  /// URL base general (/api) implantada por el despliegue activo
  static String get baseUrl {
    final clean = _normalizeHost(deployedHost);
    return clean.endsWith('/api') ? clean : '$clean/api';
  }

  static String _formatApiUrl(String host) {
    final clean = _normalizeHost(host);
    return clean.endsWith('/api') ? clean : '$clean/api';
  }

  static String get authServiceUrl => _formatApiUrl(authServiceHost);
  static String get graduatesServiceUrl => _formatApiUrl(graduatesServiceHost);
  static String get companiesServiceUrl => _formatApiUrl(companiesServiceHost);
  static String get dashboardServiceUrl => _formatApiUrl(dashboardServiceHost);

  /// Root URL sin `/api` para rutas `/matching/...` y descargas del microservicio Matchmaking
  static String get rootUrl {
    final clean = _normalizeHost(matchmakingServiceHost);
    if (clean.endsWith('/matching')) {
      return clean.substring(0, clean.length - 9);
    }
    if (clean.endsWith('/api')) {
      return clean.substring(0, clean.length - 4);
    }
    return clean;
  }

  static String get wsRootUrl {
    final root = rootUrl;
    if (root.startsWith('https://')) {
      return root.replaceFirst('https://', 'wss://');
    }
    return root.replaceFirst('http://', 'ws://');
  }

  static final Dio _dio = Dio(
    BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 15),
      headers: {
        'Content-Type': 'application/json',
      },
    ),
  );

  static Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    // Limpiar cualquier URL antigua guardada en caché local del navegador/dispositivo
    await prefs.remove('custom_api_base_url');
    await prefs.remove('last_env_api_url');

    _dio.options.baseUrl = baseUrl;

    _dio.interceptors.clear();
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final path = options.path;
          if (path.startsWith('http://') || path.startsWith('https://')) {
            options.baseUrl = '';
          } else if (path.startsWith('/matching')) {
            options.baseUrl = rootUrl;
          } else if (path.startsWith('/auth')) {
            options.baseUrl = authServiceUrl;
          } else if (path.startsWith('/modulo1')) {
            options.baseUrl = graduatesServiceUrl;
          } else if (path.startsWith('/modulo2')) {
            options.baseUrl = companiesServiceUrl;
          } else if (path.startsWith('/graduate/dashboard') ||
              path.startsWith('/company/dashboard') ||
              path.startsWith('/dashboard')) {
            options.baseUrl = dashboardServiceUrl;
          } else {
            options.baseUrl = baseUrl;
          }

          final token = prefs.getString('jwt_token');
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }

          if (kIsWeb && options.method.toUpperCase() == 'GET') {
            final timestamp = DateTime.now().millisecondsSinceEpoch;
            final char = options.path.contains('?') ? '&' : '?';
            options.path = '${options.path}${char}t=$timestamp';
          }

          debugPrint('[ApiClient] -> ${options.method} ${options.baseUrl}${options.path}');
          return handler.next(options);
        },
        onError: (DioException e, handler) {
          debugPrint(
            '[ApiClient ERROR] ${e.requestOptions.method} ${e.requestOptions.uri} -> '
            'Status: ${e.response?.statusCode ?? "NO_RESPONSE"} | Type: ${e.type} | Message: ${e.message}',
          );
          return handler.next(e);
        },
      ),
    );
  }

  static Dio get instance => _dio;
}
