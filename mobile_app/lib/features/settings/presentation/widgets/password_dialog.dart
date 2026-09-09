import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';

class PasswordDialog extends StatefulWidget {
  const PasswordDialog({super.key});

  @override
  State<PasswordDialog> createState() => _PasswordDialogState();
}

class _PasswordDialogState extends State<PasswordDialog> {
  final _formKey = GlobalKey<FormState>();
  bool _isLoading = false;
  bool _obscure1 = true;
  bool _obscure2 = true;
  bool _obscure3 = true;

  void _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _isLoading = true);
    await Future.delayed(const Duration(seconds: 2)); // Simulate API call
    if (mounted) {
      Navigator.pop(context, true);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      backgroundColor: context.surfaceColor,
      child: Padding(
        padding: EdgeInsets.all(24.0),
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Cambiar Contraseña', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: context.primaryText)),
              SizedBox(height: 8),
              Text('Tu nueva contraseña debe tener al menos 8 caracteres.', style: TextStyle(fontSize: 13, color: context.secondaryText)),
              SizedBox(height: 24),
              
              _passField('Contraseña actual', _obscure1, () => setState(() => _obscure1 = !_obscure1)),
              SizedBox(height: 16),
              _passField('Nueva contraseña', _obscure2, () => setState(() => _obscure2 = !_obscure2)),
              SizedBox(height: 16),
              _passField('Confirmar nueva contraseña', _obscure3, () => setState(() => _obscure3 = !_obscure3)),
              
              SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _isLoading ? null : _submit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primaryColor,
                    padding: EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: _isLoading 
                      ? SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: context.surfaceColor, strokeWidth: 2))
                      : Text('Actualizar', style: TextStyle(fontWeight: FontWeight.w700)),
                ),
              ),
              SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: Text('Cancelar', style: TextStyle(color: context.secondaryText, fontWeight: FontWeight.w600)),
                ),
              )
            ],
          ),
        ),
      ),
    );
  }

  Widget _passField(String label, bool isObscure, VoidCallback onToggle) {
    return TextFormField(
      obscureText: isObscure,
      decoration: AppTheme.inputDecoration(context,  label: label.toUpperCase(),
        icon: Icons.lock_outline_rounded,
      ).copyWith(
        suffixIcon: IconButton(
          icon: Icon(isObscure ? Icons.visibility_off_outlined : Icons.visibility_outlined, color: context.secondaryText),
          onPressed: onToggle,
        )
      ),
      validator: (v) => v!.isEmpty ? 'Campo requerido' : null,
    );
  }
}
