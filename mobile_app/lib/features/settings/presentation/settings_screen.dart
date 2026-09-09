import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/theme/theme_provider.dart';
import '../../../core/theme/app_theme.dart';
import 'widgets/password_dialog.dart';
import 'widgets/terms_dialog.dart';
import 'widgets/support_dialog.dart';
import 'widgets/two_factor_dialog.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  bool _jobAlerts = true;
  bool _emailNotifications = true;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: context.bgColor,
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Header ──
            Padding(
              padding: EdgeInsets.fromLTRB(20, 20, 20, 20),
              child: Row(
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      gradient: AppTheme.primaryGradient,
                      borderRadius: BorderRadius.circular(14),
                      boxShadow: [
                        BoxShadow(color: AppTheme.primaryColor.withValues(alpha: 0.3), blurRadius: 10)
                      ],
                    ),
                    child: Icon(Icons.settings_suggest_rounded, color: context.surfaceColor, size: 24),
                  ),
                  SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Ajustes',
                          style: TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.w900,
                            color: context.primaryText,
                          ),
                        ),
                        SizedBox(height: 2),
                        Text(
                          'Configuración de la aplicación',
                          style: TextStyle(fontSize: 13, color: context.secondaryText.withValues(alpha: 0.8)),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            Expanded(
              child: ListView(
                padding: EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                physics: const BouncingScrollPhysics(),
                children: [
                  _sectionTitle('Notificaciones'),
                  _settingSwitch(
                    title: 'Alertas de empleo',
                    subtitle: 'Notificaciones push para vacantes que encajan con tu perfil',
                    icon: Icons.notifications_active_outlined,
                    value: _jobAlerts,
                    onChanged: (val) => setState(() => _jobAlerts = val),
                  ),
                  _settingSwitch(
                    title: 'Boletines por correo',
                    subtitle: 'Recibe noticias del portal y seguimientos por correo',
                    icon: Icons.email_outlined,
                    value: _emailNotifications,
                    onChanged: (val) => setState(() => _emailNotifications = val),
                  ),
                  
                  SizedBox(height: 32),
                  _sectionTitle('Seguridad'),
                  _settingAction(
                    title: 'Cambiar Contraseña',
                    subtitle: 'Actualiza tu contraseña de acceso',
                    icon: Icons.lock_outline_rounded,
                    onTap: () {
                      showDialog(
                        context: context,
                        builder: (ctx) => const PasswordDialog(),
                      );
                    },
                  ),
                  _settingAction(
                    title: 'Autenticación en 2 pasos',
                    subtitle: 'Añade una capa extra de seguridad a tu cuenta',
                    icon: Icons.security_rounded,
                    onTap: () {
                      showDialog(
                        context: context,
                        builder: (ctx) => const TwoFactorDialog(),
                      );
                    },
                  ),

                  SizedBox(height: 32),
                  _sectionTitle('Apariencia'),
                  _settingSwitch(
                    title: 'Modo Oscuro',
                    subtitle: 'Tema oscuro en toda la aplicación',
                    icon: Icons.dark_mode_outlined,
                    value: Provider.of<ThemeProvider>(context).isDarkMode,
                    onChanged: (val) {
                      Provider.of<ThemeProvider>(context, listen: false).toggleTheme(val);
                    },
                  ),
                  
                  SizedBox(height: 32),
                  _sectionTitle('Acerca de'),
                  _settingAction(
                    title: 'Términos y Condiciones',
                    subtitle: 'Acuerdos de uso del portal',
                    icon: Icons.description_outlined,
                    onTap: () {
                      showModalBottomSheet(
                        context: context,
                        isScrollControlled: true,
                        backgroundColor: Colors.transparent,
                        builder: (ctx) => const TermsDialog(),
                      );
                    },
                  ),
                  _settingAction(
                    title: 'Soporte Técnico',
                    subtitle: 'Centro de ayuda y contacto',
                    icon: Icons.help_outline_rounded,
                    onTap: () {
                      showDialog(
                        context: context,
                        builder: (ctx) => const SupportDialog(),
                      );
                    },
                  ),

                  SizedBox(height: 120), // Para el navbar flotante
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _sectionTitle(String title) {
    return Padding(
      padding: EdgeInsets.only(bottom: 16, left: 4),
      child: Text(
        title.toUpperCase(),
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w900,
          color: context.secondaryText,
          letterSpacing: 1.2,
        ),
      ),
    );
  }

  Widget _settingSwitch({
    required String title,
    required String subtitle,
    required IconData icon,
    required bool value,
    required ValueChanged<bool> onChanged,
  }) {
    return Container(
      margin: EdgeInsets.only(bottom: 16),
      padding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: context.surfaceColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: context.isDark ? Colors.white.withValues(alpha: 0.05) : Color(0xFFE5E7EB)),
        boxShadow: [
          BoxShadow(color: context.isDark ? Colors.white.withValues(alpha: 0.02) : Colors.black.withValues(alpha: 0.02), blurRadius: 10, offset: const Offset(0, 4))
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: context.bgColor,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: AppTheme.primaryColor, size: 22),
          ),
          SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15, color: context.primaryText)),
                SizedBox(height: 4),
                Text(subtitle, style: TextStyle(fontSize: 12, color: context.secondaryText)),
              ],
            ),
          ),
          Switch(
            value: value,
            onChanged: onChanged,
            activeThumbColor: AppTheme.primaryColor,
            activeTrackColor: AppTheme.primaryColor.withValues(alpha: 0.2),
          ),
        ],
      ),
    );
  }

  Widget _settingAction({
    required String title,
    required String subtitle,
    required IconData icon,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: EdgeInsets.only(bottom: 16),
        padding: EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        decoration: BoxDecoration(
          color: context.surfaceColor,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: context.isDark ? Colors.white.withValues(alpha: 0.05) : Color(0xFFE5E7EB)),
          boxShadow: [
            BoxShadow(color: context.isDark ? Colors.white.withValues(alpha: 0.02) : Colors.black.withValues(alpha: 0.02), blurRadius: 10, offset: const Offset(0, 4))
          ],
        ),
        child: Row(
          children: [
            Container(
              padding: EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: context.bgColor,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: AppTheme.primaryColor, size: 22),
            ),
            SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15, color: context.primaryText)),
                  SizedBox(height: 4),
                  Text(subtitle, style: TextStyle(fontSize: 12, color: context.secondaryText)),
                ],
              ),
            ),
            Icon(Icons.arrow_forward_ios_rounded, size: 14, color: context.secondaryText),
          ],
        ),
      ),
    );
  }
}
