import 'dart:io';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../network/api_client.dart';

@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  try {
    await Firebase.initializeApp();
  } catch (_) {}
  debugPrint('[PushNotificationService] Mensaje en segundo plano: ${message.messageId}');
}

class PushNotificationService {
  static final FirebaseMessaging _messaging = FirebaseMessaging.instance;
  static String? _fcmToken;

  static String? get fcmToken => _fcmToken;

  static Future<void> initialize() async {
    try {
      if (kIsWeb) {
        return;
      }
      await Firebase.initializeApp();
      FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

      final settings = await _messaging.requestPermission(
        alert: true,
        badge: true,
        sound: true,
        provisional: false,
      );

      if (settings.authorizationStatus == AuthorizationStatus.authorized ||
          settings.authorizationStatus == AuthorizationStatus.provisional) {
        debugPrint('[PushNotificationService] Permiso de notificaciones concedido');
        // ignore: deprecated_member_use
        _fcmToken = await _messaging.getToken();
        debugPrint('[PushNotificationService] FCM Token: $_fcmToken');

        await registerTokenWithBackend();

        // ignore: deprecated_member_use
        _messaging.onTokenRefresh.listen((newToken) async {
          _fcmToken = newToken;
          await registerTokenWithBackend();
        });

        FirebaseMessaging.onMessage.listen((RemoteMessage message) {
          debugPrint('[PushNotificationService] Mensaje en primer plano: ${message.notification?.title}');
        });
      }
    } catch (e) {
      debugPrint('[PushNotificationService] Error de inicialización: $e');
    }
  }

  static Future<void> registerTokenWithBackend() async {
    if (_fcmToken == null || _fcmToken!.isEmpty) return;
    try {
      final prefs = await SharedPreferences.getInstance();
      final jwtToken = prefs.getString('jwt_token');
      if (jwtToken == null || jwtToken.isEmpty) return;

      final platform = kIsWeb ? 'web' : (Platform.isIOS ? 'ios' : 'android');
      await ApiClient.instance.post(
        '/auth/devices',
        data: {
          'token': _fcmToken,
          'platform': platform,
        },
      );
      debugPrint('[PushNotificationService] Token de dispositivo registrado exitosamente en Auth');
    } catch (e) {
      debugPrint('[PushNotificationService] Error registrando token en backend: $e');
    }
  }

  static Future<void> unregisterTokenFromBackend() async {
    if (_fcmToken == null || _fcmToken!.isEmpty) return;
    try {
      await ApiClient.instance.delete('/auth/devices/$_fcmToken');
      debugPrint('[PushNotificationService] Token desvinculado al cerrar sesión');
    } catch (e) {
      debugPrint('[PushNotificationService] Error desvinculando token: $e');
    }
  }
}
