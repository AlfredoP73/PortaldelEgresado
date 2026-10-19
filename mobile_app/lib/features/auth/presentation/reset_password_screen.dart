import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/network/api_client.dart';

class ResetPasswordScreen extends StatefulWidget {
  final String email;
  final String pin;
  const ResetPasswordScreen({super.key, required this.email, required this.pin});

  @override
  State<ResetPasswordScreen> createState() => _ResetPasswordScreenState();
}

class _ResetPasswordScreenState extends State<ResetPasswordScreen> {
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  bool _isLoading = false;
  bool _obscure1 = true;
  bool _obscure2 = true;
  String? _errorMessage;

  @override
  void dispose() {
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  int get _strength {
    final pwd = _passwordController.text;
    if (pwd.isEmpty) return 0;
    int s = 0;
    if (pwd.length >= 8) s++;
    if (RegExp(r'[A-Z]').hasMatch(pwd)) s++;
    if (RegExp(r'[0-9]').hasMatch(pwd)) s++;
    if (RegExp(r'[^A-Za-z0-9]').hasMatch(pwd)) s++;
    return s;
  }

  Future<void> _resetPassword() async {
    final password = _passwordController.text;
    final confirm = _confirmPasswordController.text;

    if (password.length < 8) {
      setState(() => _errorMessage = 'La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (password != confirm) {
      setState(() => _errorMessage = 'Las contraseñas no coinciden.');
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      await ApiClient.instance.post('/auth/reset-password', data: {
        'email': widget.email,
        'pin': widget.pin,
        'new_password': password,
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('¡Contraseña actualizada exitosamente!'),
            backgroundColor: AppTheme.primaryColor,
          ),
        );
        Navigator.pushNamedAndRemoveUntil(context, '/', (route) => false);
      }
    } on DioException catch (e) {
      String msg = 'Error al restablecer la contraseña.';
      if (e.response?.data != null && e.response?.data is Map) {
        msg = e.response?.data['detail']?.toString() ?? msg;
      }
      if (mounted) setState(() => _errorMessage = msg);
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final pwd = _passwordController.text;
    final confirm = _confirmPasswordController.text;
    final passwordsMatch = pwd.isNotEmpty && confirm.isNotEmpty && pwd == confirm;

    return Scaffold(
      backgroundColor: context.bgColor,
      body: SingleChildScrollView(
        child: Column(
          children: [
            Container(
              width: double.infinity,
              decoration: const BoxDecoration(
                gradient: AppTheme.heroBannerGradient,
                borderRadius: BorderRadius.only(
                  bottomLeft: Radius.circular(28),
                  bottomRight: Radius.circular(28),
                ),
              ),
              child: SafeArea(
                bottom: false,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 14, 20, 24),
                  child: Row(
                    children: [
                      IconButton(
                        onPressed: () => Navigator.pop(context),
                        icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white, size: 18),
                        style: IconButton.styleFrom(
                          backgroundColor: Colors.white.withValues(alpha: 0.1),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'SEGURIDAD DE LA CUENTA · PASO 3 DE 3',
                              style: TextStyle(
                                color: Colors.white.withValues(alpha: 0.65),
                                fontSize: 10,
                                fontWeight: FontWeight.w800,
                                letterSpacing: 1.2,
                              ),
                            ),
                            const SizedBox(height: 2),
                            const Text(
                              'Establecer Nueva Contraseña',
                              style: TextStyle(color: Colors.white, fontSize: 17, fontWeight: FontWeight.w800),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),

            Padding(
              padding: const EdgeInsets.all(20),
              child: Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: context.surfaceColor,
                  borderRadius: AppTheme.authCardRadius,
                  border: Border.all(color: context.borderColor),
                  boxShadow: AppTheme.premiumShadow,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'NUEVA CONTRASEÑA',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 1.0,
                        color: context.secondaryText,
                      ),
                    ),
                    const SizedBox(height: 6),
                    TextField(
                      controller: _passwordController,
                      obscureText: _obscure1,
                      onChanged: (_) => setState(() {}),
                      decoration: AppTheme.inputDecoration(
                        context,
                        label: 'Nueva contraseña',
                        hint: 'Mínimo 8 caracteres',
                        icon: Icons.lock_outline_rounded,
                        suffixIcon: IconButton(
                          icon: Icon(_obscure1 ? Icons.visibility_outlined : Icons.visibility_off_outlined, size: 20),
                          onPressed: () => setState(() => _obscure1 = !_obscure1),
                        ),
                      ),
                    ),
                    if (pwd.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      Row(
                        children: List.generate(4, (i) {
                          return Expanded(
                            child: Container(
                              height: 5,
                              margin: EdgeInsets.only(right: i < 3 ? 4 : 0),
                              decoration: BoxDecoration(
                                color: i < _strength ? AppTheme.brand500 : context.borderColor,
                                borderRadius: BorderRadius.circular(999),
                              ),
                            ),
                          );
                        }),
                      ),
                    ],
                    const SizedBox(height: 16),
                    Text(
                      'CONFIRMAR CONTRASEÑA',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 1.0,
                        color: context.secondaryText,
                      ),
                    ),
                    const SizedBox(height: 6),
                    TextField(
                      controller: _confirmPasswordController,
                      obscureText: _obscure2,
                      onChanged: (_) => setState(() {}),
                      decoration: AppTheme.inputDecoration(
                        context,
                        label: 'Confirmar contraseña',
                        hint: 'Repite tu nueva contraseña',
                        icon: Icons.lock_reset_rounded,
                        suffixIcon: IconButton(
                          icon: Icon(_obscure2 ? Icons.visibility_outlined : Icons.visibility_off_outlined, size: 20),
                          onPressed: () => setState(() => _obscure2 = !_obscure2),
                        ),
                      ),
                    ),
                    if (confirm.isNotEmpty) ...[
                      const SizedBox(height: 6),
                      Text(
                        passwordsMatch ? '✓ Las contraseñas coinciden' : '✗ Las contraseñas no coinciden',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: passwordsMatch ? AppTheme.brand500 : AppTheme.statusRechazado,
                        ),
                      ),
                    ],
                    if (_errorMessage != null) ...[
                      const SizedBox(height: 14),
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFEF2F2),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFFFECACA)),
                        ),
                        child: Text(
                          _errorMessage!,
                          style: const TextStyle(color: Color(0xFFDC2626), fontSize: 12.5, fontWeight: FontWeight.w600),
                        ),
                      ),
                    ],
                    const SizedBox(height: 24),
                    SizedBox(
                      width: double.infinity,
                      height: 50,
                      child: DecoratedBox(
                        decoration: BoxDecoration(
                          gradient: AppTheme.primaryGradient,
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: ElevatedButton(
                          onPressed: _isLoading ? null : _resetPassword,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.transparent,
                            shadowColor: Colors.transparent,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                          ),
                          child: _isLoading
                              ? const SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                                )
                              : const Text(
                                  'Actualizar Contraseña',
                                  style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
                                ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
