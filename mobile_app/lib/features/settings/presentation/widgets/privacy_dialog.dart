import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';

class PrivacyDialog extends StatelessWidget {
  const PrivacyDialog({super.key});

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
          Text('Política de Privacidad', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: context.primaryText)),
          SizedBox(height: 16),
          Expanded(
            child: SingleChildScrollView(
              padding: EdgeInsets.symmetric(horizontal: 24),
              physics: const BouncingScrollPhysics(),
              child: Text(
                '''1. Tratamiento de Datos Personales
De acuerdo con lo establecido por la Ley Estatutaria 1581 de 2012 y el Decreto 1377 de 2013, le informamos que la Universidad Popular del Cesar actuará como Responsable del Tratamiento de sus datos personales.

2. Finalidad del Tratamiento
Los datos personales proporcionados serán utilizados para las siguientes finalidades:
- Mantener comunicación sobre eventos, servicios y beneficios para los egresados.
- Gestionar su perfil profesional y académico en el Portal de Egresados.
- Facilitar procesos de intermediación laboral (Matchmaking) con empresas aliadas.
- Realizar estudios estadísticos sobre el impacto y empleabilidad de los egresados.

3. Derechos del Titular
Como titular de sus datos personales, usted tiene derecho a:
- Conocer, actualizar y rectificar sus datos personales frente a los Responsables o Encargados del Tratamiento.
- Solicitar prueba de la autorización otorgada, salvo cuando expresamente se exceptúe como requisito para el Tratamiento.
- Ser informado respecto del uso que se le ha dado a sus datos personales.
- Presentar quejas ante la Superintendencia de Industria y Comercio por infracciones a lo dispuesto en la ley.
- Revocar la autorización y/o solicitar la supresión del dato cuando en el Tratamiento no se respeten los principios, derechos y garantías constitucionales y legales.
- Acceder en forma gratuita a sus datos personales que hayan sido objeto de Tratamiento.

4. Medidas de Seguridad
La Universidad adopta las medidas técnicas, humanas y administrativas necesarias para garantizar la seguridad de los datos personales y evitar su alteración, pérdida, consulta, uso o acceso no autorizado o fraudulento.

5. Aceptación
Al registrarse y utilizar el Portal del Egresado, usted manifiesta que ha leído, entendido y aceptado de manera libre y expresa la presente política de tratamiento de datos personales.''',
                style: TextStyle(fontSize: 14, color: context.secondaryText, height: 1.6),
              ),
            ),
          ),
          Container(
            padding: EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: context.surfaceColor,
              boxShadow: [BoxShadow(color: context.isDark ? Colors.black.withValues(alpha: 0.05) : Colors.black.withValues(alpha: 0.02), blurRadius: 10, offset: const Offset(0, -5))],
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
