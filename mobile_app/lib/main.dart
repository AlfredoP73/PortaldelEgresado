import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'core/theme/app_theme.dart';
import 'core/network/api_client.dart';
import 'core/theme/theme_provider.dart';
import 'features/auth/presentation/login_screen.dart';
import 'features/auth/presentation/register_screen.dart';
import 'features/auth/presentation/email_verification_screen.dart';
import 'features/auth/presentation/forgot_password_screen.dart';
import 'features/auth/presentation/verify_pin_screen.dart';
import 'features/auth/presentation/reset_password_screen.dart';
import 'features/main/presentation/main_layout_screen.dart';

import 'package:flutter_dotenv/flutter_dotenv.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await dotenv.load(fileName: ".env");
  
  // Inicializar interceptores de red (JWT token)
  await ApiClient.init();
  
  runApp(
    ChangeNotifierProvider(
      create: (_) => ThemeProvider(),
      child: const EgresadoApp(),
    ),
  );
}

class EgresadoApp extends StatelessWidget {
  const EgresadoApp({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<ThemeProvider>(
      builder: (context, themeProvider, child) {
        return MaterialApp(
          title: 'Portal del Egresado',
          debugShowCheckedModeBanner: false,
          themeMode: themeProvider.themeMode,
          theme: AppTheme.lightTheme,
          darkTheme: AppTheme.darkTheme,
          
          initialRoute: '/',
          routes: {
            '/': (context) => const LoginScreen(),
            '/register': (context) => const RegisterScreen(),
            '/verify_email': (context) => const EmailVerificationScreen(),
            '/forgot_password': (context) => const ForgotPasswordScreen(),
            '/dashboard': (context) => const MainLayoutScreen(),
          },
          onGenerateRoute: (settings) {
            if (settings.name == '/verify_pin') {
              final email = settings.arguments as String;
              return MaterialPageRoute(builder: (context) => VerifyPinScreen(email: email));
            }
            if (settings.name == '/reset_password') {
              final args = settings.arguments as Map<String, dynamic>;
              return MaterialPageRoute(builder: (context) => ResetPasswordScreen(email: args['email'], pin: args['pin']));
            }
            return null;
          },
        );
      },
    );
  }
}
