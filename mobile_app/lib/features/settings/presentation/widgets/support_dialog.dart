import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';

class SupportDialog extends StatelessWidget {
  const SupportDialog({super.key});

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      backgroundColor: context.surfaceColor,
      child: Padding(
        padding: EdgeInsets.all(24.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 64, height: 64,
              decoration: BoxDecoration(
                color: AppTheme.primaryColor.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(Icons.support_agent_rounded, size: 32, color: AppTheme.primaryColor),
            ),
            SizedBox(height: 16),
            Text('Soporte Técnico', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: context.primaryText)),
            SizedBox(height: 8),
            Text('¿Tienes problemas con la plataforma? Contáctanos a través de nuestros canales oficiales.', 
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 13, color: context.secondaryText),
            ),
            SizedBox(height: 24),
            
            _contactRow(context, Icons.email_outlined, 'egresados@unicesar.edu.co'),
            SizedBox(height: 12),
            _contactRow(context, Icons.phone_outlined, '+57 300 123 4567'),
            SizedBox(height: 12),
            _contactRow(context, Icons.location_on_outlined, 'Sede Principal, Bloque A'),
            
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
            )
          ],
        ),
      ),
    );
  }

  Widget _contactRow(BuildContext context, IconData icon, String text) {
    return Row(
      children: [
        Icon(icon, color: AppTheme.primaryColor, size: 20),
        SizedBox(width: 12),
        Text(text, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: context.primaryText)),
      ],
    );
  }
}
