import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/network/api_client.dart';

class PasswordDialog extends StatefulWidget {
  const PasswordDialog({super.key});

  @override
  State<PasswordDialog> createState() => _PasswordDialogState();
}

class _PasswordDialogState extends State<PasswordDialog> {
  final _currentCtrl = TextEditingController();
  final _newCtrl = TextEditingController();
  final _confirmCtrl = TextEditingController();

  bool _obscureCurrent = true;
  bool _obscureNew = true;
  bool _obscureConfirm = true;
  bool _isLoading = false;
  String? _errorMsg;

  @override
  void dispose() {
    _currentCtrl.dispose();
    _newCtrl.dispose();
    _confirmCtrl.dispose();
    super.dispose();
  }

  int get _strength {
    final pwd = _newCtrl.text;
    if (pwd.isEmpty) return 0;
    int s = 0;
    if (pwd.length >= 6) s++;
    if (pwd.length >= 10) s++;
    if (RegExp(r'[A-Z]').hasMatch(pwd) && RegExp(r'[a-z]').hasMatch(pwd)) s++;
    if (RegExp(r'\d').hasMatch(pwd) || RegExp(r'[^A-Za-z0-9]').hasMatch(pwd)) s++;
    return s;
  }

  Future<void> _submit() async {
    final currentPassword = _currentCtrl.text;
    final newPassword = _newCtrl.text;
    final confirmPassword = _confirmCtrl.text;

    if (currentPassword.isEmpty) {
      setState(() => _errorMsg = 'Ingresa tu contraseña actual.');
      return;
    }
    if (newPassword.length < 6) {
      setState(() => _errorMsg = 'La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (newPassword != confirmPassword) {
      setState(() => _errorMsg = 'Las contraseñas nuevas no coinciden.');
      return;
    }
    if (currentPassword == newPassword) {
      setState(() => _errorMsg = 'La nueva contraseña debe ser diferente a la actual.');
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMsg = null;
    });

    try {
      final res = await ApiClient.instance.post('/auth/change-password', data: {
        'current_password': currentPassword,
        'new_password': newPassword,
      });
      final msg = res.data is Map
          ? (res.data['message']?.toString() ?? '¡Contraseña actualizada correctamente!')
          : '¡Contraseña actualizada correctamente!';

      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(msg), backgroundColor: AppTheme.primaryColor),
        );
      }
    } on DioException catch (e) {
      String msg = 'Error al cambiar la contraseña.';
      if (e.response?.data != null && e.response?.data is Map) {
        msg = e.response?.data['detail']?.toString() ?? msg;
      }
      if (mounted) setState(() => _errorMsg = msg);
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final newPwd = _newCtrl.text;
    final confirmPwd = _confirmCtrl.text;
    final currentPwd = _currentCtrl.text;
    final strength = _strength;
    final strengthColors = [
      const Color(0xFFEF4444),
      const Color(0xFFF97316),
      const Color(0xFFF59E0B),
      AppTheme.brand500,
      const Color(0xFF10B981),
    ];

    final checks = [
      {'label': 'Mínimo 6 caracteres', 'met': newPwd.length >= 6},
      {'label': 'Mayúsculas y minúsculas', 'met': RegExp(r'[A-Z]').hasMatch(newPwd) && RegExp(r'[a-z]').hasMatch(newPwd)},
      {'label': 'Al menos un número o símbolo', 'met': RegExp(r'\d').hasMatch(newPwd) || RegExp(r'[^A-Za-z0-9]').hasMatch(newPwd)},
      {'label': 'Diferente a la contraseña actual', 'met': newPwd.isNotEmpty && newPwd != currentPwd},
      {'label': 'Confirmación coincide', 'met': confirmPwd.isNotEmpty && newPwd == confirmPwd},
    ];

    return Dialog(
      backgroundColor: context.surfaceColor,
      insetPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 24),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(22),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    gradient: AppTheme.primaryGradient,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.lock_outline_rounded, color: Colors.white, size: 20),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Cambiar Contraseña',
                        style: TextStyle(fontSize: 17, fontWeight: FontWeight.w900, color: context.primaryText),
                      ),
                      Text(
                        'Actualiza tu clave de acceso institucional',
                        style: TextStyle(fontSize: 12, color: context.secondaryText),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.close_rounded, size: 20),
                ),
              ],
            ),
            const Divider(height: 22),

            TextField(
              controller: _currentCtrl,
              obscureText: _obscureCurrent,
              onChanged: (_) => setState(() {}),
              decoration: AppTheme.inputDecoration(
                context,
                label: 'Contraseña actual',
                icon: Icons.key_rounded,
                suffixIcon: IconButton(
                  icon: Icon(_obscureCurrent ? Icons.visibility_outlined : Icons.visibility_off_outlined, size: 19),
                  onPressed: () => setState(() => _obscureCurrent = !_obscureCurrent),
                ),
              ),
            ),
            const SizedBox(height: 12),

            TextField(
              controller: _newCtrl,
              obscureText: _obscureNew,
              onChanged: (_) => setState(() {}),
              decoration: AppTheme.inputDecoration(
                context,
                label: 'Nueva contraseña',
                icon: Icons.lock_outline_rounded,
                suffixIcon: IconButton(
                  icon: Icon(_obscureNew ? Icons.visibility_outlined : Icons.visibility_off_outlined, size: 19),
                  onPressed: () => setState(() => _obscureNew = !_obscureNew),
                ),
              ),
            ),
            if (newPwd.isNotEmpty) ...[
              const SizedBox(height: 8),
              Row(
                children: List.generate(4, (i) {
                  return Expanded(
                    child: Container(
                      height: 5,
                      margin: EdgeInsets.only(right: i < 3 ? 4 : 0),
                      decoration: BoxDecoration(
                        color: i < strength ? strengthColors[strength] : context.borderColor,
                        borderRadius: BorderRadius.circular(999),
                      ),
                    ),
                  );
                }),
              ),
            ],
            const SizedBox(height: 12),

            TextField(
              controller: _confirmCtrl,
              obscureText: _obscureConfirm,
              onChanged: (_) => setState(() {}),
              decoration: AppTheme.inputDecoration(
                context,
                label: 'Confirmar nueva contraseña',
                icon: Icons.lock_reset_rounded,
                suffixIcon: IconButton(
                  icon: Icon(_obscureConfirm ? Icons.visibility_outlined : Icons.visibility_off_outlined, size: 19),
                  onPressed: () => setState(() => _obscureConfirm = !_obscureConfirm),
                ),
              ),
            ),
            const SizedBox(height: 14),

            // Security Verification Checklist (Matches AccountSettings.tsx right column)
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: context.mutedColor,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: context.borderColor),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'VERIFICACIÓN DE SEGURIDAD',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.8,
                      color: context.secondaryText,
                    ),
                  ),
                  const SizedBox(height: 8),
                  ...checks.map((c) {
                    final met = c['met'] == true;
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 5),
                      child: Row(
                        children: [
                          Icon(
                            met ? Icons.check_circle_rounded : Icons.radio_button_unchecked_rounded,
                            size: 15,
                            color: met ? AppTheme.brand500 : context.tertiaryText,
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              c['label'] as String,
                              style: TextStyle(
                                fontSize: 11.5,
                                fontWeight: met ? FontWeight.w700 : FontWeight.w500,
                                color: met ? context.primaryText : context.secondaryText,
                              ),
                            ),
                          ),
                        ],
                      ),
                    );
                  }),
                ],
              ),
            ),

            if (_errorMsg != null) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: const Color(0xFFFEF2F2),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0xFFFECACA)),
                ),
                child: Text(
                  _errorMsg!,
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFFDC2626)),
                ),
              ),
            ],

            const SizedBox(height: 18),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _isLoading ? null : _submit,
                icon: _isLoading
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                      )
                    : const Icon(Icons.check_circle_outline_rounded, size: 18),
                label: Text(_isLoading ? 'Actualizando...' : 'Actualizar Contraseña'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
