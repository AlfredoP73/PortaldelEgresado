import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/network/api_client.dart';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _emailController = TextEditingController();
  bool _isLoading = false;
  String? _errorMessage;
  String? _successMessage;

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _sendPin() async {
    final email = _emailController.text.trim();
    if (email.isEmpty) {
      setState(() => _errorMessage = 'Por favor ingresa tu correo');
      return;
    }

    setState(() { _isLoading = true; _errorMessage = null; _successMessage = null; });
    try {
      final response = await ApiClient.instance.post('/auth/forgot-password', data: {
        'email': email,
      });
      
      setState(() { _successMessage = response.data['message']; });
      
      if (!mounted) return;
      // Navegar a VerifyPinScreen pasando el email como argumento
      Navigator.pushNamed(context, '/verify_pin', arguments: email);
      
    } catch (e) {
      setState(() { _errorMessage = 'No se pudo enviar el correo'; });
    } finally {
      if (mounted) setState(() { _isLoading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.bgDark,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: IconThemeData(color: Colors.white),
      ),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: EdgeInsets.symmetric(horizontal: 24),
            child: Column(
              children: [
                Icon(Icons.lock_reset, size: 80, color: AppTheme.primaryColor),
                SizedBox(height: 24),
                Text('Recuperar Contraseña',
                  style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w800)),
                SizedBox(height: 12),
                Text('Ingresa tu correo para recibir un PIN numérico de 6 dígitos.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: context.secondaryText, fontSize: 14)),
                SizedBox(height: 32),

                if (_errorMessage != null)
                  Container(
                    padding: EdgeInsets.all(12),
                    margin: EdgeInsets.only(bottom: 16),
                    decoration: BoxDecoration(
                      color: const Color(0xFF3D0D0D), borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xFFEF4444).withValues(alpha: 0.4)),
                    ),
                    child: Row(children: [
                      Icon(Icons.error_outline, size: 16, color: Color(0xFFEF4444)),
                      SizedBox(width: 8),
                      Expanded(child: Text(_errorMessage!, style: TextStyle(color: Colors.white, fontSize: 13))),
                    ]),
                  ),
                  
                if (_successMessage != null)
                  Container(
                    padding: EdgeInsets.all(12),
                    margin: EdgeInsets.only(bottom: 16),
                    decoration: BoxDecoration(
                      color: const Color(0xFF0F3D24), borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: AppTheme.primaryColor.withValues(alpha: 0.4)),
                    ),
                    child: Row(children: [
                      Icon(Icons.check_circle_outline, size: 16, color: AppTheme.primaryColor),
                      SizedBox(width: 8),
                      Expanded(child: Text(_successMessage!, style: TextStyle(color: Colors.white, fontSize: 13))),
                    ]),
                  ),

                Container(
                  padding: EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: AppTheme.surfaceDark,
                    borderRadius: BorderRadius.circular(24),
                  ),
                  child: Column(children: [
                    TextField(
                      controller: _emailController,
                      keyboardType: TextInputType.emailAddress,
                      style: TextStyle(color: Colors.white, fontSize: 15),
                      decoration: AppTheme.inputDecorationDark(label: 'Correo Electrónico', icon: Icons.email_outlined, hint: 'tu@correo.com'),
                    ),
                    SizedBox(height: 24),
                    SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: ElevatedButton(
                        onPressed: _isLoading ? null : _sendPin,
                        child: _isLoading
                          ? SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : Text('Enviar PIN'),
                      ),
                    ),
                  ]),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
