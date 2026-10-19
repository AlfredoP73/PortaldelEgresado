import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';

class PrivacyDialog extends StatelessWidget {
  const PrivacyDialog({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: context.surfaceColor,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: const EdgeInsets.fromLTRB(22, 16, 22, 24),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: context.borderColor,
                  borderRadius: BorderRadius.circular(999),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppTheme.brand50,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.privacy_tip_outlined, color: AppTheme.primaryColor, size: 20),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Aviso de Privacidad y Ley 1581 de 2012',
                    style: TextStyle(fontSize: 16.5, fontWeight: FontWeight.w800, color: context.primaryText),
                  ),
                ),
              ],
            ),
            const Divider(height: 22),
            Flexible(
              child: SingleChildScrollView(
                child: Text(
                  'La Universidad Popular del Cesar (UPC), en cumplimiento de la Ley Estatutaria 1581 de 2012 y el Decreto 1377 de 2013, informa que los datos personales suministrados en el Portal del Egresado serán tratados con fines institucionales, académicos, de acreditación de alta calidad y de intermediación laboral con empresas aliadas verificadas.\n\n'
                  'Como titular de la información tienes derecho a conocer, actualizar, rectificar y suprimir tus datos, así como a revocar la autorización otorgada a través del módulo de Gestión de Privacidad (Habeas Data).',
                  style: TextStyle(fontSize: 13, color: context.secondaryText, height: 1.5),
                ),
              ),
            ),
            const SizedBox(height: 18),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Entendido'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
