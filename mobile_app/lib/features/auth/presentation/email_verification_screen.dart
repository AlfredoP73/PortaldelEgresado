import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/network/api_client.dart';

class EmailVerificationScreen extends StatefulWidget {
  const EmailVerificationScreen({super.key});

  @override
  State<EmailVerificationScreen> createState() => _EmailVerificationScreenState();
}

class _EmailVerificationScreenState extends State<EmailVerificationScreen> {
  bool _isResending = false;
  String? _message;

  Future<void> _resendEmail(String email) async {
    setState(() { _isResending = true; _message = null; });
    try {
      await ApiClient.instance.post('/auth/resend-verification', data: {'email': email});
      setState(() { _message = 'Correo reenviado con éxito.'; });
    } catch (e) {
      setState(() { _message = 'Hubo un error al reenviar el correo.'; });
    } finally {
      if (mounted) setState(() { _isResending = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    final String email = ModalRoute.of(context)?.settings.arguments as String? ?? 'tu correo';

    return Scaffold(
      body: Container(
        decoration: BoxDecoration(gradient: AppTheme.darkGradient),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: EdgeInsets.symmetric(horizontal: 24),
              child: Column(children: [
                // Logo
                Container(
                  width: 72, height: 72,
                  decoration: BoxDecoration(
                    gradient: AppTheme.primaryGradient, borderRadius: BorderRadius.circular(20),
                    boxShadow: [BoxShadow(color: AppTheme.primaryColor.withValues(alpha: 0.4), blurRadius: 24, offset: const Offset(0, 8))],
                  ),
                  child: Icon(Icons.school_rounded, size: 38, color: context.surfaceColor),
                ),
                SizedBox(height: 20),
                Text('Universidad Popular del Cesar',
                  style: TextStyle(color: context.primaryText, fontSize: 20, fontWeight: FontWeight.w800)),
                SizedBox(height: 36),

                // Card
                Container(
                  padding: EdgeInsets.all(32),
                  decoration: BoxDecoration(
                    color: context.surfaceColor, borderRadius: BorderRadius.circular(24),
                    boxShadow: [
                      BoxShadow(color: AppTheme.primaryColor.withValues(alpha: 0.08), blurRadius: 40, offset: const Offset(0, 16)),
                      BoxShadow(color: Colors.black.withValues(alpha: 0.06), blurRadius: 12, offset: const Offset(0, 4)),
                    ],
                  ),
                  child: Column(children: [
                    Container(
                      width: 76, height: 76,
                      decoration: BoxDecoration(
                        color: AppTheme.primaryColor.withValues(alpha: 0.1), shape: BoxShape.circle,
                      ),
                      child: Icon(Icons.mark_email_read_rounded, color: AppTheme.primaryColor, size: 40),
                    ),
                    SizedBox(height: 24),
                    Text('¡Revisa tu bandeja!',
                      style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: context.primaryText)),
                    SizedBox(height: 12),
                    Text('Hemos enviado un enlace de activación a:', textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 14, color: context.secondaryText)),
                    SizedBox(height: 10),
                    Container(
                      padding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      decoration: BoxDecoration(
                        color: context.bgColor, borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Color(0xFFE5E7EB)),
                      ),
                      child: Row(mainAxisSize: MainAxisSize.min, children: [
                        Icon(Icons.email_outlined, size: 18, color: AppTheme.primaryColor),
                        SizedBox(width: 10),
                        Flexible(child: Text(email,
                          style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: context.primaryText),
                          overflow: TextOverflow.ellipsis)),
                      ]),
                    ),
                    SizedBox(height: 16),
                    Text('Haz clic en el enlace del correo para\nactivar tu cuenta.', textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 13, color: context.secondaryText, height: 1.5)),

                    if (_message != null) ...[
                      SizedBox(height: 16),
                      Container(
                        padding: EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: _message!.contains('éxito') ? AppTheme.primaryColor.withValues(alpha: 0.1) : Color(0xFFFEF2F2),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: _message!.contains('éxito') ? AppTheme.primaryColor.withValues(alpha: 0.3) : Color(0xFFFECACA)),
                        ),
                        child: Row(mainAxisSize: MainAxisSize.min, children: [
                          Icon(_message!.contains('éxito') ? Icons.check_circle_outline : Icons.error_outline,
                            size: 16, color: _message!.contains('éxito') ? AppTheme.primaryColor : Color(0xFFEF4444)),
                          SizedBox(width: 8),
                          Text(_message!, style: TextStyle(fontSize: 13,
                            color: _message!.contains('éxito') ? AppTheme.primaryColor : Color(0xFFDC2626))),
                        ]),
                      ),
                    ],
                    SizedBox(height: 28),

                    SizedBox(width: double.infinity, child: OutlinedButton.icon(
                      onPressed: _isResending ? null : () => _resendEmail(email),
                      icon: _isResending
                        ? SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.primaryColor))
                        : Icon(Icons.refresh_rounded, size: 18),
                      label: Text(_isResending ? 'Reenviando...' : 'Reenviar correo'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppTheme.primaryColor,
                        side: BorderSide(color: Color(0xFFE5E7EB)),
                        padding: EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                    )),
                    SizedBox(height: 12),
                    SizedBox(width: double.infinity, child: ElevatedButton(
                      onPressed: () => Navigator.pushReplacementNamed(context, '/'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.primaryColor, foregroundColor: Colors.white,
                        padding: EdgeInsets.symmetric(vertical: 18),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)), elevation: 0,
                      ),
                      child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                        Text('Ir al Inicio de Sesión', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                        SizedBox(width: 8),
                        Icon(Icons.arrow_forward_rounded, size: 20),
                      ]),
                    )),
                  ]),
                ),
                SizedBox(height: 32),
              ]),
            ),
          ),
        ),
      ),
    );
  }
}
