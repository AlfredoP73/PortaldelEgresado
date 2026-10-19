import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/network/api_client.dart';

class PrivacySettingsScreen extends StatefulWidget {
  const PrivacySettingsScreen({super.key});

  @override
  State<PrivacySettingsScreen> createState() => _PrivacySettingsScreenState();
}

class _PrivacySettingsScreenState extends State<PrivacySettingsScreen> {
  final _subjectCtrl = TextEditingController();
  final _messageCtrl = TextEditingController();

  bool _acceptPrivacy = true;
  bool _authorizeData = true;
  bool _isSubmitting = false;

  @override
  void dispose() {
    _subjectCtrl.dispose();
    _messageCtrl.dispose();
    super.dispose();
  }

  Future<void> _acceptPolicyGate() async {
    if (!_acceptPrivacy || !_authorizeData) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Debes aceptar ambas casillas para continuar al portal.'),
          backgroundColor: AppTheme.statusRechazado,
        ),
      );
      return;
    }

    setState(() => _isSubmitting = true);
    try {
      await ApiClient.instance.post('/auth/privacy/accept-policy', data: {});
      if (mounted) {
        Navigator.pushReplacementNamed(context, '/dashboard');
      }
    } on DioException catch (e) {
      String msg = 'Error al registrar el consentimiento.';
      if (e.response?.data != null && e.response?.data is Map) {
        msg = e.response?.data['detail']?.toString() ?? msg;
      }
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(msg), backgroundColor: AppTheme.statusRechazado),
        );
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  Future<void> _submitPqrs() async {
    final subject = _subjectCtrl.text.trim();
    final message = _messageCtrl.text.trim();
    if (subject.isEmpty || message.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Completa el asunto y el detalle de tu solicitud PQRS.')),
      );
      return;
    }

    setState(() => _isSubmitting = true);
    try {
      final res = await ApiClient.instance.post('/auth/privacy/pqrs', data: {
        'subject': subject,
        'message': message,
      });
      final detail = res.data is Map
          ? (res.data['message'] ?? 'Solicitud PQRS radicada exitosamente.')
          : 'Solicitud PQRS radicada exitosamente.';
      _subjectCtrl.clear();
      _messageCtrl.clear();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(detail.toString()), backgroundColor: AppTheme.primaryColor),
        );
      }
    } on DioException catch (e) {
      String msg = 'Error al enviar solicitud PQRS.';
      if (e.response?.data != null && e.response?.data is Map) {
        msg = e.response?.data['detail']?.toString() ?? msg;
      }
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(msg), backgroundColor: AppTheme.statusRechazado),
        );
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  Future<void> _revokeAuthorization() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: context.surfaceColor,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        title: const Text('¿Revocar Autorización?', style: TextStyle(fontWeight: FontWeight.w800)),
        content: const Text(
          'Al revocar la autorización de tratamiento de datos (Ley 1581 de 2012), tu cuenta quedará desactivada y se cerrará tu sesión actual.',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancelar')),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.accentAmber),
            child: const Text('Sí, revocar', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
    if (confirm != true) return;

    setState(() => _isSubmitting = true);
    try {
      await ApiClient.instance.post('/auth/privacy/revoke', data: {'reason': 'Revocatoria voluntaria'});
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('jwt_token');
      if (mounted) {
        Navigator.pushNamedAndRemoveUntil(context, '/', (route) => false);
      }
    } on DioException catch (e) {
      String msg = 'No se pudo revocar la autorización.';
      if (e.response?.data != null && e.response?.data is Map) {
        msg = e.response?.data['detail']?.toString() ?? msg;
      }
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(msg), backgroundColor: AppTheme.statusRechazado),
        );
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  Future<void> _deleteAccount() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: context.surfaceColor,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        title: const Text('¿Suprimir Datos Personales?', style: TextStyle(fontWeight: FontWeight.w800)),
        content: const Text(
          '¿Estás seguro de solicitar la supresión de tus datos personales? Si no tienes obligaciones legales pendientes con la Universidad, tu cuenta será anonimizada o desactivada.',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancelar')),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.statusRechazado),
            child: const Text('Solicitar Supresión', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
    if (confirm != true) return;

    setState(() => _isSubmitting = true);
    try {
      await ApiClient.instance.post('/auth/privacy/delete-account', data: {});
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('jwt_token');
      if (mounted) {
        Navigator.pushNamedAndRemoveUntil(context, '/', (route) => false);
      }
    } on DioException catch (e) {
      String msg = 'No se pudo procesar la solicitud de supresión.';
      if (e.response?.data != null && e.response?.data is Map) {
        msg = e.response?.data['detail']?.toString() ?? msg;
      }
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(msg), backgroundColor: AppTheme.statusRechazado),
        );
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final args = ModalRoute.of(context)?.settings.arguments;
    final bool isBlocker = args is Map && args['isBlocker'] == true;

    return Scaffold(
      backgroundColor: context.bgColor,
      appBar: AppBar(
        backgroundColor: context.surfaceColor,
        elevation: 0,
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: AppTheme.brand50,
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.shield_outlined, color: AppTheme.primaryColor, size: 20),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                isBlocker ? 'Consentimiento Ley 1581' : 'Gestión de Privacidad (Habeas Data)',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                  color: context.primaryText,
                ),
              ),
            ),
          ],
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: isBlocker ? _buildBlockerView(context) : _buildHabeasDataCenter(context),
      ),
    );
  }

  Widget _buildBlockerView(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: context.surfaceColor,
        borderRadius: AppTheme.cardRadius,
        border: Border.all(color: context.borderColor),
        boxShadow: AppTheme.subtleShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Actualización de Políticas de Privacidad y Tratamiento de Datos',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 8),
          Text(
            'En cumplimiento de la Ley Estatutaria 1581 de 2012 y el Decreto 1377 de 2013, la Universidad Popular del Cesar requiere tu autorización expresa e informada para el tratamiento de tus datos personales en el Portal de Egresados.',
            style: TextStyle(fontSize: 13, color: context.secondaryText, height: 1.45),
          ),
          const SizedBox(height: 16),
          Material(
            color: Colors.transparent,
            child: Column(
              children: [
                CheckboxListTile(
                  value: _acceptPrivacy,
                  onChanged: (v) => setState(() => _acceptPrivacy = v ?? false),
                  activeColor: AppTheme.primaryColor,
                  contentPadding: EdgeInsets.zero,
                  controlAffinity: ListTileControlAffinity.leading,
                  title: const Text(
                    'He leído y acepto el Aviso de Privacidad de la Universidad Popular del Cesar.',
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                  ),
                ),
                CheckboxListTile(
                  value: _authorizeData,
                  onChanged: (v) => setState(() => _authorizeData = v ?? false),
                  activeColor: AppTheme.primaryColor,
                  contentPadding: EdgeInsets.zero,
                  controlAffinity: ListTileControlAffinity.leading,
                  title: const Text(
                    'Autorizo de manera previa, expresa e informada a la UPC para el Tratamiento de mis Datos Personales conforme a la Ley 1581 de 2012.',
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _isSubmitting ? null : _acceptPolicyGate,
              child: _isSubmitting
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : const Text('Aceptar y Continuar al Portal'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHabeasDataCenter(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Intro Card
        Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: AppTheme.brand50,
            borderRadius: AppTheme.cardRadius,
            border: Border.all(color: AppTheme.brand200),
          ),
          child: const Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(Icons.verified_user_rounded, color: AppTheme.primaryColor, size: 22),
              SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Derechos de los Titulares (Ley 1581 de 2012)',
                      style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: AppTheme.brand800),
                    ),
                    SizedBox(height: 4),
                    Text(
                      'Como egresado titular de la información tienes derecho a conocer, actualizar, rectificar y solicitar la supresión de tus datos personales o revocar la autorización otorgada.',
                      style: TextStyle(fontSize: 12.5, color: AppTheme.brand700, height: 1.4),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),

        // 1. Consultas y Reclamos (PQRS)
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: context.surfaceColor,
            borderRadius: AppTheme.cardRadius,
            border: Border.all(color: context.borderColor),
            boxShadow: AppTheme.subtleShadow,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Row(
                children: [
                  Icon(Icons.mark_chat_unread_outlined, color: AppTheme.primaryColor, size: 20),
                  SizedBox(width: 8),
                  Text(
                    'Consultas y Reclamos (PQRS de Datos)',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                'Radica una consulta o reclamo formal sobre el tratamiento de tus datos personales ante el Oficial de Protección de Datos.',
                style: TextStyle(fontSize: 12.5, color: context.secondaryText),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _subjectCtrl,
                decoration: AppTheme.inputDecoration(
                  context,
                  label: 'Asunto de la solicitud',
                  hint: 'Ej. Actualización o consulta de historial',
                  icon: Icons.subject_rounded,
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _messageCtrl,
                maxLines: 3,
                decoration: AppTheme.inputDecoration(
                  context,
                  label: 'Descripción detallada',
                  hint: 'Describe tu consulta o reclamo conforme al Art. 14 y 15 de la Ley 1581...',
                  icon: Icons.description_outlined,
                ),
              ),
              const SizedBox(height: 14),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: _isSubmitting ? null : _submitPqrs,
                  icon: const Icon(Icons.send_rounded, size: 17),
                  label: const Text('Radicar Solicitud PQRS'),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),

        // 2. Revocar Autorización y Suprimir Datos
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: context.surfaceColor,
            borderRadius: AppTheme.cardRadius,
            border: Border.all(color: context.borderColor),
            boxShadow: AppTheme.subtleShadow,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Row(
                children: [
                  Icon(Icons.gpp_maybe_outlined, color: AppTheme.accentAmber, size: 22),
                  SizedBox(width: 8),
                  Text(
                    'Control de Autorización y Supresión',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                'Puedes revocar el consentimiento otorgado o solicitar la supresión definitiva de tu cuenta si no existe un deber legal o contractual de permanecer en la base de datos institucional.',
                style: TextStyle(fontSize: 12.5, color: context.secondaryText, height: 1.4),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: _isSubmitting ? null : _revokeAuthorization,
                  icon: const Icon(Icons.block_rounded, color: AppTheme.accentAmber, size: 18),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: AppTheme.accentAmber),
                    foregroundColor: AppTheme.accentAmber,
                  ),
                  label: const Text('Revocar Autorización de Tratamiento', style: TextStyle(fontWeight: FontWeight.w700)),
                ),
              ),
              const SizedBox(height: 10),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: _isSubmitting ? null : _deleteAccount,
                  icon: const Icon(Icons.delete_forever_rounded, color: AppTheme.statusRechazado, size: 18),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: AppTheme.statusRechazado),
                    foregroundColor: AppTheme.statusRechazado,
                  ),
                  label: const Text('Solicitar Supresión de Datos Personales', style: TextStyle(fontWeight: FontWeight.w700)),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
