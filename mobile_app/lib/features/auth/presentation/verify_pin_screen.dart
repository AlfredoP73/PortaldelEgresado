import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
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
    final pin = _pinController.text.replaceAll(RegExp(r'\D'), '').trim();
    if (pin.length != 6) {
      setState(() => _errorMessage = 'El código PIN debe tener exactamente 6 dígitos.');
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      await ApiClient.instance.post('/auth/verify-pin', data: {
        'email': widget.email,
        'pin': pin,
      });

      if (mounted) {
        Navigator.pushReplacementNamed(
          context,
          '/reset_password',
          arguments: {'email': widget.email, 'pin': pin},
        );
      }
    } on DioException catch (e) {
      String msg = 'Código PIN inválido o expirado.';
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
    final pinLength = _pinController.text.replaceAll(RegExp(r'\D'), '').length;

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
                              'SEGURIDAD DE LA CUENTA · PASO 2 DE 3',
                              style: TextStyle(
                                color: Colors.white.withValues(alpha: 0.65),
                                fontSize: 10,
                                fontWeight: FontWeight.w800,
                                letterSpacing: 1.2,
                              ),
                            ),
                            const SizedBox(height: 2),
                            const Text(
                              'Verificar Código PIN',
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
                    Row(
                      children: [
                        Container(
                          width: 44,
                          height: 44,
                          decoration: BoxDecoration(
                            gradient: AppTheme.primaryGradient,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Icon(Icons.pin_outlined, color: Colors.white, size: 22),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Código de Verificación',
                                style: TextStyle(
                                  fontSize: 19,
                                  fontWeight: FontWeight.w900,
                                  color: context.primaryText,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                'Enviado a ${widget.email}',
                                style: TextStyle(fontSize: 12, color: context.secondaryText),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),
                    TextField(
                      controller: _pinController,
                      keyboardType: TextInputType.number,
                      maxLength: 6,
                      textAlign: TextAlign.center,
                      onChanged: (_) => setState(() {}),
                      style: TextStyle(
                        fontSize: 26,
                        letterSpacing: 10,
                        fontWeight: FontWeight.w900,
                        color: context.primaryText,
                      ),
                      decoration: InputDecoration(
                        counterText: '',
                        hintText: '000000',
                        hintStyle: TextStyle(color: context.tertiaryText, letterSpacing: 10),
                        filled: true,
                        fillColor: context.isDark ? AppTheme.inputFillDark : AppTheme.inputFillLight,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                          borderSide: BorderSide(color: context.borderColor),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                          borderSide: const BorderSide(color: AppTheme.brand500, width: 2),
                        ),
                      ),
                    ),
                    const SizedBox(height: 10),
                    // 6 Digit Progress Bars (Matches VerifyPin.tsx on web)
                    Row(
                      children: List.generate(6, (i) {
                        return Expanded(
                          child: Container(
                            height: 5,
                            margin: EdgeInsets.only(right: i < 5 ? 6 : 0),
                            decoration: BoxDecoration(
                              color: i < pinLength ? AppTheme.brand500 : context.borderColor,
                              borderRadius: BorderRadius.circular(999),
                            ),
                          ),
                        );
                      }),
                    ),
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
                          onPressed: _isLoading ? null : _verifyPin,
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
                                  'Verificar Código PIN',
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
