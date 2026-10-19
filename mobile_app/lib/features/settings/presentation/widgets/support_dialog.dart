import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';

class SupportDialog extends StatelessWidget {
  const SupportDialog({super.key});

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: context.surfaceColor,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: Padding(
        padding: const EdgeInsets.all(22),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppTheme.brand50,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.support_agent_rounded, color: AppTheme.primaryColor, size: 22),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Oficina de Egresados UPC',
                    style: TextStyle(fontSize: 16.5, fontWeight: FontWeight.w800, color: context.primaryText),
                  ),
                ),
              ],
            ),
            const Divider(height: 22),
            _buildContactRow(context, Icons.mail_outline_rounded, 'Correo Institucional', 'portal.egresados.upc@gmail.com'),
            const SizedBox(height: 10),
            _buildContactRow(context, Icons.location_on_outlined, 'Sede Administrativa', 'Campus Sabanas · Valledupar, Cesar'),
            const SizedBox(height: 10),
            _buildContactRow(context, Icons.access_time_rounded, 'Horario de Atención', 'Lunes a Viernes · 8:00 AM - 6:00 PM'),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Cerrar'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildContactRow(BuildContext context, IconData icon, String label, String value) {
    return Row(
      children: [
        Icon(icon, color: AppTheme.primaryColor, size: 18),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: context.secondaryText)),
              Text(value, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: context.primaryText)),
            ],
          ),
        ),
      ],
    );
  }
}
