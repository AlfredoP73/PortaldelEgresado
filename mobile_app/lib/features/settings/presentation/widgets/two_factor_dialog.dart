import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';

class TwoFactorDialog extends StatefulWidget {
  const TwoFactorDialog({super.key});

  @override
  State<TwoFactorDialog> createState() => _TwoFactorDialogState();
}

class _TwoFactorDialogState extends State<TwoFactorDialog> {
  final TextEditingController _codeCtrl = TextEditingController();
  bool _isConfigured = false;

  @override
  void dispose() {
    _codeCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      backgroundColor: context.surfaceColor,
      child: Padding(
        padding: const EdgeInsets.all(22),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppTheme.brand50,
                shape: BoxShape.circle,
              ),
              child: Icon(
                _isConfigured ? Icons.check_circle_rounded : Icons.security_rounded,
                size: 32,
                color: AppTheme.primaryColor,
              ),
            ),
            const SizedBox(height: 14),
            Text(
              _isConfigured ? '¡Verificación Activada!' : 'Seguridad en 2 Pasos',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: context.primaryText),
            ),
            const SizedBox(height: 8),
            Text(
              _isConfigured
                  ? 'Tu cuenta institucional cuenta con verificación por correo activo.'
                  : 'Introduce el código enviado a tu correo institucional.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 12.5, color: context.secondaryText),
            ),
            if (!_isConfigured) ...[
              const SizedBox(height: 16),
              TextField(
                controller: _codeCtrl,
                keyboardType: TextInputType.number,
                maxLength: 6,
                textAlign: TextAlign.center,
                decoration: AppTheme.inputDecoration(
                  context,
                  label: 'Código de 6 dígitos',
                  icon: Icons.pin_outlined,
                ),
              ),
            ],
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () {
                  if (_isConfigured) {
                    Navigator.pop(context);
                  } else if (_codeCtrl.text.trim().length == 6) {
                    setState(() => _isConfigured = true);
                  }
                },
                child: Text(_isConfigured ? 'Cerrar' : 'Verificar'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
