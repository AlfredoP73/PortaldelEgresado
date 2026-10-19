import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';

class TermsDialog extends StatelessWidget {
  const TermsDialog({super.key});

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
                  child: const Icon(Icons.description_outlined, color: AppTheme.primaryColor, size: 20),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Términos y Condiciones de Uso',
                    style: TextStyle(fontSize: 16.5, fontWeight: FontWeight.w800, color: context.primaryText),
                  ),
                ),
              ],
            ),
            const Divider(height: 22),
            Flexible(
              child: SingleChildScrollView(
                child: Text(
                  'El Portal del Egresado y Bolsa de Empleo Institucional de la Universidad Popular del Cesar es de uso exclusivo para graduados verificados en el registro oficial de la institución y empresas legalmente constituidas.\n\n'
                  '1. Veracidad de la información: El egresado garantiza que la información académica, laboral y los documentos adjuntos en su hoja de vida son verídicos.\n'
                  '2. Confidencialidad: Las credenciales de acceso son personales e intransferibles.\n'
                  '3. gratuidad: Todos los servicios de intermediación laboral para los egresados de la UPC son completamente gratuitos.',
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
