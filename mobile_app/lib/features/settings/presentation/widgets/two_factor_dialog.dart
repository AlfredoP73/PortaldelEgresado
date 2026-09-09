import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';

class TwoFactorDialog extends StatefulWidget {
  const TwoFactorDialog({super.key});

  @override
  State<TwoFactorDialog> createState() => _TwoFactorDialogState();
}

class _TwoFactorDialogState extends State<TwoFactorDialog> {
  bool _isLoading = false;
  bool _isConfigured = false;
  final TextEditingController _codeCtrl = TextEditingController();

  void _verifyCode() async {
    if (_codeCtrl.text.length < 6) return;
    setState(() => _isLoading = true);
    await Future.delayed(const Duration(seconds: 2));
    if (mounted) {
      setState(() {
        _isLoading = false;
        _isConfigured = true;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      backgroundColor: context.surfaceColor,
      child: Padding(
        padding: EdgeInsets.all(24.0),
        child: _isConfigured ? _buildSuccess() : _buildSetup(),
      ),
    );
  }

  Widget _buildSetup() {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(Icons.security_rounded, size: 48, color: AppTheme.primaryColor),
        SizedBox(height: 16),
        Text('Configurar 2FA', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: context.primaryText)),
        SizedBox(height: 8),
        Text('Hemos enviado un código de 6 dígitos a tu correo registrado. Introdúcelo para activar la seguridad en 2 pasos.',
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 13, color: context.secondaryText),
        ),
        SizedBox(height: 24),
        TextFormField(
          controller: _codeCtrl,
          keyboardType: TextInputType.number,
          maxLength: 6,
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 24, letterSpacing: 8, fontWeight: FontWeight.w800),
          decoration: InputDecoration(
            counterText: '',
            filled: true,
            fillColor: context.bgColor,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
          ),
        ),
        SizedBox(height: 24),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: _isLoading ? null : _verifyCode,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.primaryColor,
              padding: EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            child: _isLoading 
                ? SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: context.surfaceColor, strokeWidth: 2))
                : Text('Verificar Código', style: TextStyle(fontWeight: FontWeight.w700)),
          ),
        ),
      ],
    );
  }

  Widget _buildSuccess() {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 64, height: 64,
          decoration: BoxDecoration(color: Colors.green, shape: BoxShape.circle),
          child: Icon(Icons.check_rounded, size: 32, color: context.surfaceColor),
        ),
        SizedBox(height: 16),
        Text('¡Activado!', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: context.primaryText)),
        SizedBox(height: 8),
        Text('La autenticación en 2 pasos ha sido configurada correctamente.',
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 13, color: context.secondaryText),
        ),
        SizedBox(height: 24),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: () => Navigator.pop(context),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.primaryColor,
              padding: EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            child: Text('Cerrar', style: TextStyle(fontWeight: FontWeight.w700)),
          ),
        ),
      ],
    );
  }
}
