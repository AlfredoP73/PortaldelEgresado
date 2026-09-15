import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/network/api_client.dart';

class PrivacySettingsScreen extends StatefulWidget {
  const PrivacySettingsScreen({super.key});

  @override
  State<PrivacySettingsScreen> createState() => _PrivacySettingsScreenState();
}

class _PrivacySettingsScreenState extends State<PrivacySettingsScreen> {
  bool _isLoading = false;
  String? _errorMessage;

  Future<void> _acceptPolicy() async {
    setState(() { _isLoading = true; _errorMessage = null; });
    try {
      await ApiClient.instance.post('/auth/privacy/accept-policy', data: {});
      if (!mounted) return;
      Navigator.pushReplacementNamed(context, '/dashboard');
    } catch (e) {
      setState(() { _errorMessage = 'Ocurrió un error al aceptar las políticas. Intenta nuevamente.'; });
    } finally {
      if (mounted) setState(() { _isLoading = false; });
    }
  }

  Future<void> _logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('jwt_token');
    if (!mounted) return;
    Navigator.pushReplacementNamed(context, '/');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.bgDark,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 20),
              Container(
                width: 80, height: 80,
                decoration: BoxDecoration(
                  color: AppTheme.primaryColor.withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: const Center(
                  child: Icon(Icons.privacy_tip_outlined, color: AppTheme.primaryColor, size: 40),
                ),
              ),
              const SizedBox(height: 24),
              const Text(
                'Actualización de Privacidad',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 16),
              Text(
                'Para continuar usando la plataforma, debes aceptar nuestra política de tratamiento de datos personales y aviso de privacidad actualizados.',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.white.withValues(alpha: 0.7), fontSize: 15, height: 1.5),
              ),
              const SizedBox(height: 32),

              if (_errorMessage != null)
                Container(
                  padding: const EdgeInsets.all(12),
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(
                    color: const Color(0xFF3D0D0D),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFFEF4444).withValues(alpha: 0.4)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.error_outline, size: 16, color: Color(0xFFEF4444)),
                      const SizedBox(width: 8),
                      Expanded(child: Text(_errorMessage!, style: const TextStyle(color: Colors.white, fontSize: 13))),
                    ],
                  ),
                ),

              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: AppTheme.surfaceDark,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: Colors.white.withValues(alpha: 0.05)),
                  ),
                  child: SingleChildScrollView(
                    child: Text(
                      'Al aceptar, autorizas a la Universidad Popular del Cesar (UPC) a recolectar, '
                      'almacenar, usar y circular tus datos personales con la finalidad de ofrecerte '
                      'servicios de intermediación laboral, seguimiento a egresados y envío de información '
                      'académica e institucional.\n\n'
                      'Tus datos serán tratados de acuerdo con la Ley 1581 de 2012 de Protección '
                      'de Datos Personales (Colombia). Puedes revocar este consentimiento en cualquier '
                      'momento desde la configuración de tu cuenta.',
                      style: TextStyle(color: Colors.white.withValues(alpha: 0.7), fontSize: 14, height: 1.6),
                    ),
                  ),
                ),
              ),

              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: _isLoading ? null : _acceptPolicy,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primaryColor,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: _isLoading
                    ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Text('Aceptar y Continuar', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
              ),
              const SizedBox(height: 16),
              TextButton(
                onPressed: _logout,
                child: Text('Rechazar y salir', style: TextStyle(color: Colors.white.withValues(alpha: 0.54), fontSize: 14)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
