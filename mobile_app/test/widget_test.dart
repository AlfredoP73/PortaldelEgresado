import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:mobile_app/main.dart';
import 'package:mobile_app/core/theme/theme_provider.dart';
import 'package:mobile_app/features/auth/presentation/register_screen.dart';

void main() {
  testWidgets('Portal del Egresado smoke test renders LoginScreen', (WidgetTester tester) async {
    await tester.pumpWidget(
      ChangeNotifierProvider(
        create: (_) => ThemeProvider(),
        child: const EgresadoApp(),
      ),
    );

    expect(find.text('Bienvenido'), findsOneWidget);
    expect(find.text('Acceder al Portal'), findsOneWidget);
  });

  testWidgets('RegisterScreen is exclusively for Graduates and contains no Empresa registration', (WidgetTester tester) async {
    await tester.pumpWidget(
      ChangeNotifierProvider(
        create: (_) => ThemeProvider(),
        child: const MaterialApp(
          home: RegisterScreen(),
        ),
      ),
    );

    // Verify company registration is completely absent
    expect(find.text('Empresa Aliada'), findsNothing);
    expect(find.text('¿CÓMO DESEAS REGISTRARTE EN EL PORTAL?'), findsNothing);

    // Verify 2-step graduate registration is present
    expect(find.text('ETAPA 1/2'), findsOneWidget);
    expect(find.text('1. Credenciales'), findsOneWidget);
    expect(find.text('2. Privacidad'), findsOneWidget);
    expect(find.text('Registro Exclusivo de Egresados UPC'), findsOneWidget);
    expect(find.text('CORREO INSTITUCIONAL (@UNICESAR.EDU.CO)'), findsOneWidget);
  });
}

