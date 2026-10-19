import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/network/api_client.dart';

class EmailVerificationScreen extends StatefulWidget {
  const EmailVerificationScreen({super.key});

  @override
  State<EmailVerificationScreen> createState() => _EmailVerificationScreenState();
}

class _EmailVerificationScreenState extends State<EmailVerificationScreen> {
  bool _isResending = false;

  Future<void> _resendEmail(String email) async {
    if (email.isEmpty) return;
    setState(() => _isResending = true);
    try {
      await ApiClient.instance.post('/auth/resend-verification', data: {'email': email});
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Correo de activación reenviado a $email'),
            backgroundColor: AppTheme.primaryColor,
          ),
        );
      }
    } on DioException catch (e) {
      String msg = 'Error al reenviar el correo.';
      if (e.response?.data != null && e.response?.data is Map) {
        msg = e.response?.data['detail']?.toString() ?? msg;
      }
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(msg), backgroundColor: AppTheme.statusRechazado),
        );
      }
    } finally {
      if (mounted) setState(() => _isResending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final args = ModalRoute.of(context)?.settings.arguments;
    String email = '';
    String customMessage = '';

    if (args is String) {
      email = args;
    } else if (args is Map) {
      email = args['email']?.toString() ?? '';
      customMessage = args['message']?.toString() ?? '';
    }

    return Scaffold(
      backgroundColor: context.bgColor,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Container(
              padding: const EdgeInsets.all(28),
              decoration: BoxDecoration(
                color: context.surfaceColor,
                borderRadius: AppTheme.authCardRadius,
                border: Border.all(color: context.borderColor),
                boxShadow: AppTheme.premiumShadow,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 68,
                    height: 68,
                    decoration: BoxDecoration(
                      color: AppTheme.brand50,
                      shape: BoxShape.circle,
                      border: Border.all(color: AppTheme.brand200),
                    ),
                    child: const Icon(
                      Icons.mark_email_read_rounded,
                      color: AppTheme.brand500,
                      size: 34,
                    ),
                  ),
                  const SizedBox(height: 20),
                  Text(
                    '¡Activa tu cuenta en tu correo!',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w900,
                      color: context.primaryText,
                      letterSpacing: -0.4,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    customMessage.isNotEmpty
                        ? customMessage
                        : 'Enviamos un enlace de activación y verificación a tu correo institucional. Haz clic en él para activar tu cuenta.',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 13.5,
                      color: context.secondaryText,
                      height: 1.5,
                    ),
                  ),
                  if (email.isNotEmpty) ...[
                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      decoration: BoxDecoration(
                        color: AppTheme.brand50,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: AppTheme.brand200),
                      ),
                      child: Text(
                        email,
                        style: const TextStyle(
                          fontWeight: FontWeight.w800,
                          color: AppTheme.brand700,
                          fontSize: 13.5,
                        ),
                      ),
                    ),
                  ],
                  const SizedBox(height: 28),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () => Navigator.pushNamedAndRemoveUntil(context, '/', (route) => false),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.primaryColor,
                        padding: const EdgeInsets.symmetric(vertical: 15),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: const Text(
                        'Volver al inicio de sesión',
                        style: TextStyle(fontWeight: FontWeight.w700, color: Colors.white),
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton(
                      onPressed: _isResending ? null : () => _resendEmail(email),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 15),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: _isResending
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Text(
                              'No recibí el correo, reenviar',
                              style: TextStyle(fontWeight: FontWeight.w700),
                            ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
