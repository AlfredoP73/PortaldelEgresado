import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';

class TermsDialog extends StatelessWidget {
  const TermsDialog({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.8,
      decoration: BoxDecoration(
        color: context.surfaceColor,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        children: [
          Container(
            margin: EdgeInsets.symmetric(vertical: 16),
            width: 40, height: 5,
            decoration: BoxDecoration(color: Color(0xFFE5E7EB), borderRadius: BorderRadius.circular(10)),
          ),
          Text('Términos y Condiciones', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: context.primaryText)),
          SizedBox(height: 16),
          Expanded(
            child: SingleChildScrollView(
              padding: EdgeInsets.symmetric(horizontal: 24),
              physics: const BouncingScrollPhysics(),
              child: Text(
                '''1. Aceptación de los Términos
Al acceder y utilizar esta aplicación, usted acepta estar sujeto a estos términos y condiciones.

2. Uso del Servicio
La aplicación "Portal del Egresado" tiene como propósito facilitar la conexión entre los egresados de la universidad y oportunidades laborales, así como mantener un seguimiento institucional.

3. Privacidad y Datos Personales
Su privacidad es importante para nosotros. Todos los datos personales y académicos recopilados serán tratados conforme a la Ley Estatutaria 1581 de 2012 de Protección de Datos Personales. Sus datos no serán vendidos ni compartidos con terceros sin su consentimiento explícito, excepto con las empresas a las que decida postularse.

4. Responsabilidades del Usuario
Usted es responsable de mantener la confidencialidad de su cuenta y contraseña. Además, se compromete a proveer información veraz y actualizada en su perfil profesional.

5. Modificaciones
Nos reservamos el derecho de modificar estos términos en cualquier momento. Los cambios entrarán en vigencia inmediatamente después de su publicación en la aplicación.

6. Contacto
Si tiene alguna duda sobre estos términos, puede contactar a la Oficina de Seguimiento a Egresados.

Última actualización: Agosto de 2026''',
                style: TextStyle(fontSize: 14, color: context.secondaryText, height: 1.6),
              ),
            ),
          ),
          Container(
            padding: EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: context.surfaceColor,
              boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10, offset: const Offset(0, -5))],
            ),
            child: SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => Navigator.pop(context),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primaryColor,
                  padding: EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: Text('Entendido', style: TextStyle(fontWeight: FontWeight.w700)),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
