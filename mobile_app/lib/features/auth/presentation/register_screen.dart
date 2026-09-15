import 'package:flutter/material.dart';
import 'dart:ui';

import '../../../core/theme/app_theme.dart';
import '../../../core/network/api_client.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _nameController = TextEditingController();
  bool _isLoading = false;
  bool _obscurePassword = true;
  String? _errorMessage;
  double _passwordStrength = 0.0;
  bool _acceptPrivacy = false;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _nameController.dispose();
    super.dispose();
  }

  void _checkPasswordStrength(String password) {
    double strength = 0;
    if (password.length > 5) strength += 0.25;
    if (password.contains(RegExp(r'[A-Z]'))) strength += 0.25;
    if (password.contains(RegExp(r'[0-9]'))) strength += 0.25;
    if (password.contains(RegExp(r'[!@#$%^&*(),.?":{}|<>]'))) strength += 0.25;
    setState(() { _passwordStrength = strength; });
  }

  Color _getStrengthColor() {
    if (_passwordStrength <= 0.25) return AppTheme.statusRechazado;
    if (_passwordStrength <= 0.50) return AppTheme.statusEntrevistado;
    if (_passwordStrength <= 0.75) return AppTheme.primaryColor.withValues(alpha: 0.7);
    return AppTheme.primaryColor;
  }

  Future<void> _register() async {
    setState(() { _isLoading = true; _errorMessage = null; });
    if (!_acceptPrivacy) {
      setState(() { _errorMessage = 'Debes aceptar las políticas de privacidad y el tratamiento de datos para registrarte.'; });
      setState(() { _isLoading = false; });
      return;
    }

    try {
      await ApiClient.instance.post('/auth/register', data: {
        'email': _emailController.text.trim(),
        'password': _passwordController.text,
        'full_name': _nameController.text.trim(),
        'role_id': 3,
        'accept_privacy_policy': _acceptPrivacy,
        'authorize_data_treatment': _acceptPrivacy,
      });
      
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Registro exitoso. Por favor revisa tu correo para verificar tu cuenta antes de iniciar sesión.'),
          backgroundColor: AppTheme.statusContratado,
        ),
      );
      Navigator.pop(context);
    } catch (e) {
      setState(() { _errorMessage = 'Error al registrar el usuario'; });
    } finally {
      if (mounted) setState(() { _isLoading = false; });
    }
  }


  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      body: Stack(
        children: [
          // Background ambient glows
          Positioned(
            top: -150, right: -50,
            child: Container(
              width: 300, height: 300,
              decoration: BoxDecoration(shape: BoxShape.circle, color: AppTheme.primaryColor.withValues(alpha: 0.15)),
              child: BackdropFilter(filter: ImageFilter.blur(sigmaX: 100, sigmaY: 100), child: Container(color: Colors.transparent)),
            ),
          ),
          Positioned(
            bottom: -50, left: -100,
            child: Container(
              width: 250, height: 250,
              decoration: BoxDecoration(shape: BoxShape.circle, color: AppTheme.accentAmber.withValues(alpha: 0.1)),
              child: BackdropFilter(filter: ImageFilter.blur(sigmaX: 80, sigmaY: 80), child: Container(color: Colors.transparent)),
            ),
          ),
          SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Column(
              children: [
                SizedBox(height: 20),
                Container(
                  width: 80, height: 80,
                  decoration: BoxDecoration(
                    color: AppTheme.primaryColor,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Center(child: Text('🎓', style: TextStyle(fontSize: 40))),
                ),
                SizedBox(height: 20),
                Text('Únete al Portal',
                  style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w800)),
                SizedBox(height: 24),



                if (_errorMessage != null) ...[
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
                ],

                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 28),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.03),
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
                    boxShadow: [
                      BoxShadow(color: Colors.black.withValues(alpha: 0.3), blurRadius: 40, offset: const Offset(0, 20)),
                    ],
                  ),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    TextField(
                      controller: _nameController,
                      style: TextStyle(color: Colors.white, fontSize: 15),
                      decoration: AppTheme.inputDecorationDark(label: 'Nombre Completo', icon: Icons.person_outline),
                    ),
                    SizedBox(height: 18),
                    TextField(
                      controller: _emailController,
                      keyboardType: TextInputType.emailAddress,
                      style: TextStyle(color: Colors.white, fontSize: 15),
                      decoration: AppTheme.inputDecorationDark(label: 'Correo Electrónico', icon: Icons.email_outlined, hint: 'correo@upc.edu.co'),
                    ),
                    SizedBox(height: 18),
                    TextField(
                      controller: _passwordController,
                      obscureText: _obscurePassword,
                      onChanged: _checkPasswordStrength,
                      style: TextStyle(color: Colors.white, fontSize: 15),
                      decoration: AppTheme.inputDecorationDark(
                        label: 'Contraseña', icon: Icons.lock_outline_rounded,
                        suffixIcon: IconButton(
                          icon: Icon(_obscurePassword ? Icons.visibility_off_outlined : Icons.visibility_outlined, color: Colors.white.withValues(alpha: 0.5), size: 20),
                          onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                        ),
                      ),
                    ),
                    SizedBox(height: 12),
                    Row(
                      children: List.generate(4, (index) => Expanded(
                        child: Container(
                          height: 4,
                          margin: EdgeInsets.only(right: index < 3 ? 4 : 0),
                          decoration: BoxDecoration(
                            color: _passwordStrength > (index * 0.25) ? _getStrengthColor() : Colors.white.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(2),
                          ),
                        ),
                      )),
                    ),
                    SizedBox(height: 16),
                    Theme(
                      data: Theme.of(context).copyWith(
                        unselectedWidgetColor: Colors.white.withValues(alpha: 0.5),
                      ),
                      child: CheckboxListTile(
                        value: _acceptPrivacy,
                        onChanged: (val) {
                          setState(() {
                            _acceptPrivacy = val ?? false;
                          });
                        },
                        title: Text(
                          'Acepto la Política de Privacidad y autorizo el tratamiento de mis datos personales.',
                          style: TextStyle(color: Colors.white.withValues(alpha: 0.8), fontSize: 12, height: 1.3),
                        ),
                        controlAffinity: ListTileControlAffinity.leading,
                        activeColor: AppTheme.primaryColor,
                        contentPadding: EdgeInsets.zero,
                        dense: true,
                      ),
                    ),
                    SizedBox(height: 24),
                    SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: ElevatedButton(
                        onPressed: _isLoading ? null : _register,
                        child: _isLoading
                          ? SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : Text('Crear Cuenta'),
                      ),
                    ),
                  ]),
                ),
                SizedBox(height: 24),
                Center(
                  child: GestureDetector(
                    onTap: () => Navigator.pop(context),
                    child: RichText(text: TextSpan(
                      style: TextStyle(fontSize: 14, color: context.secondaryText),
                      children: [
                        TextSpan(text: '¿Ya tienes cuenta? '),
                        TextSpan(text: 'Inicia sesión', style: TextStyle(color: AppTheme.accentAmber, fontWeight: FontWeight.w700)),
                      ],
                    )),
                  ),
                ),
                SizedBox(height: 32),
              ],
            ),
            ), // SingleChildScrollView
          ), // Center
        ), // SafeArea
        ],
      ),
    );
  }
}
