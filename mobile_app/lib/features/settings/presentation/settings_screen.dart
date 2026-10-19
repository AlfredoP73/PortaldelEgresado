import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:jwt_decoder/jwt_decoder.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/theme_provider.dart';
import 'widgets/password_dialog.dart';
import 'widgets/privacy_dialog.dart';
import 'widgets/support_dialog.dart';
import 'widgets/terms_dialog.dart';
import '../../../core/services/push_notification_service.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  String _userEmail = 'egresado@unicesar.edu.co';

  @override
  void initState() {
    super.initState();
    _loadSessionEmail();
  }

  Future<void> _loadSessionEmail() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('jwt_token');
      if (token != null && token.isNotEmpty) {
        final decoded = JwtDecoder.decode(token);
        final sub = decoded['sub']?.toString() ?? decoded['email']?.toString();
        if (sub != null && sub.isNotEmpty && mounted) {
          setState(() => _userEmail = sub);
        }
      }
    } catch (_) {}
  }

  Future<void> _logout() async {
    await PushNotificationService.unregisterTokenFromBackend();
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('jwt_token');
    await prefs.remove('user_data');
    if (mounted) {
      Navigator.pushNamedAndRemoveUntil(context, '/', (route) => false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final themeProvider = Provider.of<ThemeProvider>(context);

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
                gradient: AppTheme.primaryGradient,
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.vpn_key_rounded, color: Colors.white, size: 18),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                'Mi Cuenta y Seguridad',
                style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: context.primaryText),
              ),
            ),
          ],
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Top Session Summary Banner (Matches AccountSettings.tsx 3-column banner) ──
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: context.surfaceColor,
                borderRadius: AppTheme.cardRadius,
                border: Border.all(color: context.borderColor),
                boxShadow: AppTheme.subtleShadow,
              ),
              child: Column(
                children: [
                  _buildSessionSummaryRow(
                    icon: Icons.mail_outline_rounded,
                    iconBg: AppTheme.brand50,
                    iconColor: AppTheme.primaryColor,
                    label: 'CUENTA ACTIVA',
                    value: _userEmail,
                  ),
                  const Divider(height: 20),
                  _buildSessionSummaryRow(
                    icon: Icons.verified_user_outlined,
                    iconBg: const Color(0xFFECFDF5),
                    iconColor: AppTheme.accentEmerald,
                    label: 'ESTADO DE SEGURIDAD',
                    value: 'Protegida · Hash Bcrypt + JWT',
                  ),
                  const Divider(height: 20),
                  _buildSessionSummaryRow(
                    icon: Icons.school_outlined,
                    iconBg: const Color(0xFFEFF6FF),
                    iconColor: AppTheme.accentBlue,
                    label: 'ROL EN EL PORTAL',
                    value: 'Egresado Institucional (@unicesar.edu.co)',
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // ── Institutional Protection Note (Matches AccountSettings.tsx) ──
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppTheme.brand50,
                borderRadius: AppTheme.cardRadius,
                border: Border.all(color: AppTheme.brand200),
              ),
              child: const Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(Icons.shield_outlined, color: AppTheme.primaryColor, size: 20),
                  SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Identificador Institucional Permanente',
                          style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: AppTheme.brand800),
                        ),
                        SizedBox(height: 4),
                        Text(
                          'Tu correo @unicesar.edu.co está vinculado al registro oficial de grados de la Universidad Popular del Cesar.',
                          style: TextStyle(fontSize: 12, color: AppTheme.brand700, height: 1.4),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // ── Section: Seguridad y Privacidad ──
            Text(
              'SEGURIDAD Y PROTECCIÓN DE DATOS',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w800,
                letterSpacing: 0.9,
                color: context.secondaryText,
              ),
            ),
            const SizedBox(height: 8),
            Container(
              decoration: BoxDecoration(
                color: context.surfaceColor,
                borderRadius: AppTheme.cardRadius,
                border: Border.all(color: context.borderColor),
                boxShadow: AppTheme.subtleShadow,
              ),
              child: Column(
                children: [
                  _buildSettingTile(
                    icon: Icons.lock_reset_rounded,
                    title: 'Cambiar Contraseña de Acceso',
                    subtitle: 'Actualiza tu clave con verificación de seguridad en tiempo real',
                    onTap: () {
                      showDialog(context: context, builder: (_) => const PasswordDialog());
                    },
                  ),
                  const Divider(height: 1),
                  _buildSettingTile(
                    icon: Icons.gpp_good_outlined,
                    title: 'Gestión de Privacidad (Habeas Data)',
                    subtitle: 'PQRS de datos, revocatoria de autorización y Ley 1581',
                    onTap: () => Navigator.pushNamed(context, '/privacy_settings'),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // ── Section: Apariencia ──
            Text(
              'APARIENCIA Y VISUALIZACIÓN',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w800,
                letterSpacing: 0.9,
                color: context.secondaryText,
              ),
            ),
            const SizedBox(height: 8),
            Container(
              decoration: BoxDecoration(
                color: context.surfaceColor,
                borderRadius: AppTheme.cardRadius,
                border: Border.all(color: context.borderColor),
                boxShadow: AppTheme.subtleShadow,
              ),
              child: Material(
                color: Colors.transparent,
                child: SwitchListTile(
                  value: context.isDark,
                  activeThumbColor: AppTheme.primaryColor,
                  onChanged: (val) => themeProvider.toggleTheme(val),
                  secondary: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: AppTheme.brand50,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(
                      context.isDark ? Icons.dark_mode_rounded : Icons.light_mode_rounded,
                      color: AppTheme.primaryColor,
                      size: 20,
                    ),
                  ),
                  title: Text(
                    'Modo Oscuro',
                    style: TextStyle(fontSize: 14.5, fontWeight: FontWeight.w800, color: context.primaryText),
                  ),
                  subtitle: Text(
                    'Alternar entre interfaz corporativa clara y oscura',
                    style: TextStyle(fontSize: 12, color: context.secondaryText),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 20),

            // ── Section: Información Legal y Soporte ──
            Text(
              'INFORMACIÓN INSTITUCIONAL',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w800,
                letterSpacing: 0.9,
                color: context.secondaryText,
              ),
            ),
            const SizedBox(height: 8),
            Container(
              decoration: BoxDecoration(
                color: context.surfaceColor,
                borderRadius: AppTheme.cardRadius,
                border: Border.all(color: context.borderColor),
                boxShadow: AppTheme.subtleShadow,
              ),
              child: Material(
                color: Colors.transparent,
                child: Column(
                  children: [
                    _buildSettingTile(
                      icon: Icons.privacy_tip_outlined,
                      title: 'Aviso de Privacidad UPC',
                      subtitle: 'Política institucional de tratamiento de datos personales',
                      onTap: () {
                        showModalBottomSheet(
                          context: context,
                          isScrollControlled: true,
                          backgroundColor: Colors.transparent,
                          builder: (_) => const PrivacyDialog(),
                        );
                      },
                    ),
                    const Divider(height: 1),
                    _buildSettingTile(
                      icon: Icons.description_outlined,
                      title: 'Términos y Condiciones de Uso',
                      subtitle: 'Reglamento del Portal de Egresados y Empleabilidad',
                      onTap: () {
                        showModalBottomSheet(
                          context: context,
                          isScrollControlled: true,
                          backgroundColor: Colors.transparent,
                          builder: (_) => const TermsDialog(),
                        );
                      },
                    ),
                    const Divider(height: 1),
                    _buildSettingTile(
                      icon: Icons.support_agent_rounded,
                      title: 'Soporte Técnico e Institucional',
                      subtitle: 'Canales de atención de la Oficina de Egresados UPC',
                      onTap: () {
                        showDialog(context: context, builder: (_) => const SupportDialog());
                      },
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Logout Button
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: _logout,
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppTheme.statusRechazado,
                  side: const BorderSide(color: Color(0xFFFECACA)),
                  backgroundColor: const Color(0xFFFEF2F2),
                  padding: const EdgeInsets.symmetric(vertical: 15),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                icon: const Icon(Icons.logout_rounded, color: AppTheme.statusRechazado, size: 19),
                label: const Text(
                  'Cerrar Sesión en este Dispositivo',
                  style: TextStyle(fontWeight: FontWeight.w800, color: AppTheme.statusRechazado),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSessionSummaryRow({
    required IconData icon,
    required Color iconBg,
    required Color iconColor,
    required String label,
    required String value,
  }) {
    return Row(
      children: [
        Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: iconBg,
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, color: iconColor, size: 20),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 0.7,
                  color: context.secondaryText,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                value,
                style: TextStyle(
                  fontSize: 13.5,
                  fontWeight: FontWeight.w800,
                  color: context.primaryText,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildSettingTile({
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return ListTile(
      onTap: onTap,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      leading: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: AppTheme.brand50,
          borderRadius: BorderRadius.circular(10),
        ),
        child: Icon(icon, color: AppTheme.primaryColor, size: 20),
      ),
      title: Text(
        title,
        style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: context.primaryText),
      ),
      subtitle: Text(
        subtitle,
        style: TextStyle(fontSize: 12, color: context.secondaryText),
      ),
      trailing: Icon(Icons.chevron_right_rounded, color: context.tertiaryText),
    );
  }
}
