import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/network/api_client.dart';

class ResetPasswordScreen extends StatefulWidget {
  final String email;
  final String pin;
  
  const ResetPasswordScreen({
    super.key, 
    required this.email,
    required this.pin,
  });

  @override
  State<ResetPasswordScreen> createState() => _ResetPasswordScreenState();
}

class _ResetPasswordScreenState extends State<ResetPasswordScreen> {
  final _passwordController = TextEditingController();
  final _confirmController = TextEditingController();
  bool _isLoading = false;
  bool _obscurePassword = true;
  String? _errorMessage;
  String? _successMessage;

  @override
  void dispose() {
    _passwordController.dispose();
    _confirmController.dispose();
    super.dispose();
  }

  Future<void> _resetPassword() async {
    final password = _passwordController.text;
    final confirm = _confirmController.text;
    
    if (password.length < 6) {
      setState(() => _errorMessage = 'La contraseña debe tener al menos 6 caracteres');
      return;
    }
    
    if (password != confirm) {
      setState(() => _errorMessage = 'Las contraseñas no coinciden');
      return;
    }

    setState(() { _isLoading = true; _errorMessage = null; _successMessage = null; });
    try {
      final response = await ApiClient.instance.post('/auth/reset-password', data: {
        'email': widget.email,
        'pin': widget.pin,
        'new_password': password,
      });
      
      setState(() { _successMessage = response.data['message']; });
      
      if (!mounted) return;
      // Mostrar toast o algo similar y redirigir al login
      Future.delayed(Duration(seconds: 2), () {
        if (mounted) {
          Navigator.of(context).popUntil(ModalRoute.withName('/'));
        }
      });
      
    } catch (e) {
      setState(() { _errorMessage = 'Error al actualizar contraseña. PIN expirado o inválido.'; });
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
                Icon(Icons.lock_outline, size: 80, color: AppTheme.primaryColor),
                SizedBox(height: 24),
                Text('Nueva Contraseña',
                  style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w800)),
                SizedBox(height: 12),
                Text('Crea una nueva contraseña segura.',
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
                      controller: _passwordController,
                      obscureText: _obscurePassword,
                      style: TextStyle(color: Colors.white, fontSize: 15),
                      decoration: AppTheme.inputDecorationDark(
                        label: 'Nueva contraseña', icon: Icons.lock_outline, hint: '••••••••',
                        suffixIcon: IconButton(
                          icon: Icon(_obscurePassword ? Icons.visibility_off_outlined : Icons.visibility_outlined, color: Colors.white.withValues(alpha: 0.5), size: 20),
                          onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                        ),
                      ),
                    ),
                    SizedBox(height: 18),
                    TextField(
                      controller: _confirmController,
                      obscureText: _obscurePassword,
                      style: TextStyle(color: Colors.white, fontSize: 15),
                      decoration: AppTheme.inputDecorationDark(label: 'Confirmar contraseña', icon: Icons.lock_outline, hint: '••••••••'),
                    ),
                    SizedBox(height: 24),
                    SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: ElevatedButton(
                        onPressed: _isLoading ? null : _resetPassword,
                        child: _isLoading
                          ? SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : Text('Actualizar contraseña'),
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
