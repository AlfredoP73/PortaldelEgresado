import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/network/api_client.dart';

class VerifyPinScreen extends StatefulWidget {
  final String email;
  const VerifyPinScreen({super.key, required this.email});

  @override
  State<VerifyPinScreen> createState() => _VerifyPinScreenState();
}

class _VerifyPinScreenState extends State<VerifyPinScreen> {
  final _pinController = TextEditingController();
  bool _isLoading = false;
  String? _errorMessage;

  @override
  void dispose() {
    _pinController.dispose();
    super.dispose();
  }

  Future<void> _verifyPin() async {
    final pin = _pinController.text.trim();
    if (pin.length != 6) {
      setState(() => _errorMessage = 'El PIN debe tener 6 dígitos');
      return;
    }

    setState(() { _isLoading = true; _errorMessage = null; });
    try {
      await ApiClient.instance.post('/auth/verify-pin', data: {
        'email': widget.email,
        'pin': pin,
      });
      
      if (!mounted) return;
      // Navegar a ResetPasswordScreen pasando email y pin
      Navigator.pushNamed(context, '/reset_password', arguments: {
        'email': widget.email,
        'pin': pin,
      });
      
    } catch (e) {
      setState(() { _errorMessage = 'PIN incorrecto o expirado'; });
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
                Icon(Icons.password, size: 80, color: AppTheme.primaryColor),
                SizedBox(height: 24),
                Text('Verificar PIN',
                  style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w800)),
                SizedBox(height: 12),
                Text('Ingresa el código que enviamos a\n${widget.email}',
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

                Container(
                  padding: EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: AppTheme.surfaceDark,
                    borderRadius: BorderRadius.circular(24),
                  ),
                  child: Column(children: [
                    TextField(
                      controller: _pinController,
                      keyboardType: TextInputType.number,
                      maxLength: 6,
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Colors.white, fontSize: 24, letterSpacing: 8),
                      decoration: AppTheme.inputDecorationDark(label: 'PIN', icon: Icons.pin, hint: '000000'),
                    ),
                    SizedBox(height: 24),
                    SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: ElevatedButton(
                        onPressed: _isLoading ? null : _verifyPin,
                        child: _isLoading
                          ? SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : Text('Verificar'),
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
