import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/network/api_client.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> with SingleTickerProviderStateMixin {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isLoading = false;
  bool _obscurePassword = true;
  String? _errorMessage;
  late AnimationController _animController;
  late Animation<double> _fadeIn;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(vsync: this, duration: const Duration(milliseconds: 900));
    _fadeIn = CurvedAnimation(parent: _animController, curve: Curves.easeOutCubic);
    _animController.forward();
  }

  @override
  void dispose() {
    _animController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    setState(() { _isLoading = true; _errorMessage = null; });
    try {
      final response = await ApiClient.instance.post('/auth/login', data: {
        'email': _emailController.text.trim(),
        'password': _passwordController.text,
      });
      final token = response.data['access_token'];
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('jwt_token', token);
      if (!mounted) return;
      Navigator.pushReplacementNamed(context, '/dashboard');
    } catch (e) {
      setState(() { _errorMessage = 'Credenciales incorrectas'; });
    } finally {
      if (mounted) setState(() { _isLoading = false; });
    }
  }



  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.bgDark,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: EdgeInsets.symmetric(horizontal: 24),
            child: FadeTransition(
              opacity: _fadeIn,
              child: Column(
                children: [
                  SizedBox(height: 40),
                  // ── Logo ──
                  Container(
                    width: 100, height: 100,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(24),
                      boxShadow: [
                        BoxShadow(color: Colors.black.withValues(alpha: 0.2), blurRadius: 20, offset: const Offset(0, 8)),
                      ],
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(24),
                      child: Image.asset(
                        'assets/images/logo.png',
                        fit: BoxFit.contain,
                      ),
                    ),
                  ),
                  SizedBox(height: 20),
                  Text('Universidad Popular del Cesar',
                    style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w800)),
                  SizedBox(height: 4),
                  Text('Oficina de Seguimiento a Egresados',
                    style: TextStyle(color: AppTheme.primaryColor.withValues(alpha: 0.8), fontSize: 13)),
                  SizedBox(height: 28),

                  // ── Badge ──
                  Container(
                    padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    decoration: BoxDecoration(
                      color: AppTheme.primaryColor.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(50),
                      border: Border.all(color: AppTheme.primaryColor),
                    ),
                    child: Row(mainAxisSize: MainAxisSize.min, children: [
                      Container(
                        width: 6, height: 6,
                        decoration: BoxDecoration(shape: BoxShape.circle, color: AppTheme.primaryColor,
                          boxShadow: [BoxShadow(color: AppTheme.primaryColor.withValues(alpha: 0.6), blurRadius: 6)]),
                      ),
                      SizedBox(width: 8),
                      Text('PORTAL DE EGRESADOS Y EMPLEABILIDAD',
                        style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w700, letterSpacing: 0.8)),
                    ]),
                  ),
                  SizedBox(height: 32),

                  // ── Headline ──
                  RichText(
                    textAlign: TextAlign.center,
                    text: const TextSpan(
                      style: TextStyle(fontSize: 32, fontWeight: FontWeight.w800, height: 1.2, color: Colors.white, letterSpacing: -0.5),
                      children: [
                        TextSpan(text: 'Conectando\n'),
                        TextSpan(text: 'talento ', style: TextStyle(color: AppTheme.primaryColor)),
                        TextSpan(text: 'con el futuro.'),
                      ],
                    ),
                  ),
                  SizedBox(height: 32),



                  // ── Login Card ──
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
                    padding: EdgeInsets.symmetric(horizontal: 24, vertical: 28),
                    decoration: BoxDecoration(
                      color: AppTheme.surfaceDark,
                      borderRadius: BorderRadius.circular(24),
                      boxShadow: [
                        BoxShadow(color: Colors.black.withValues(alpha: 0.5), blurRadius: 40, offset: const Offset(0, 20)),
                      ],
                    ),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Row(children: [
                        Container(
                          width: 40, height: 40,
                          decoration: BoxDecoration(
                            color: AppTheme.primaryColor.withValues(alpha: 0.15),
                            shape: BoxShape.circle,
                          ),
                          child: Icon(Icons.login_rounded, size: 20, color: AppTheme.primaryColor),
                        ),
                        SizedBox(width: 14),
                        Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text('Bienvenido', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: Colors.white)),
                          Text('Ingresa tus credenciales', style: TextStyle(fontSize: 13, color: context.secondaryText)),
                        ]),
                      ]),
                      SizedBox(height: 28),
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
                        style: TextStyle(color: Colors.white, fontSize: 15),
                        decoration: AppTheme.inputDecorationDark(
                          label: 'Contraseña', icon: Icons.lock_outline_rounded, hint: '••••••••',
                          suffixIcon: IconButton(
                            icon: Icon(_obscurePassword ? Icons.visibility_off_outlined : Icons.visibility_outlined, color: Colors.white.withValues(alpha: 0.5), size: 20),
                            onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                          ),
                        ),
                      ),
                      SizedBox(height: 12),
                      Align(
                        alignment: Alignment.centerRight,
                        child: GestureDetector(
                          onTap: () => Navigator.pushNamed(context, '/forgot_password'),
                          child: Text(
                            '¿Olvidaste tu contraseña?',
                            style: TextStyle(
                              color: AppTheme.accentAmber,
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ),
                      SizedBox(height: 28),
                      SizedBox(
                        width: double.infinity,
                        height: 52,
                        child: ElevatedButton(
                          onPressed: _isLoading ? null : _login,
                          child: _isLoading
                            ? SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                            : Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                                Text('Acceder al Portal'),
                                SizedBox(width: 8),
                                Icon(Icons.arrow_forward_rounded, size: 20),
                              ]),
                        ),
                      ),
                    ]),
                  ),
                  SizedBox(height: 24),
                  Center(
                    child: GestureDetector(
                      onTap: () => Navigator.pushNamed(context, '/register'),
                      child: RichText(text: TextSpan(
                        style: TextStyle(fontSize: 14, color: context.secondaryText),
                        children: [
                          TextSpan(text: '¿No tienes cuenta? '),
                          TextSpan(text: 'Regístrate gratis', style: TextStyle(color: AppTheme.accentAmber, fontWeight: FontWeight.w700)),
                        ],
                      )),
                    ),
                  ),
                  SizedBox(height: 32),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
