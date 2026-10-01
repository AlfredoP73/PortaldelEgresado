import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  // ── Brand Colors ──
  static const Color primaryColor = Color(0xFF087443); // Corporate Green
  static const Color primaryDark = Color(0xFF064E3B); // Deep Institutional Green
  static const Color accentAmber = Color(0xFFF59E0B); // Amber

  // ── Backgrounds ──
  static const Color bgLight = Color(0xFFF3F4F6); // Web: bg-main (light)
  static const Color bgDark = Color(0xFF0B0F17); // Web: bg-main (dark)
  static const Color surfaceLight = Colors.white;
  static const Color surfaceDark = Color(0xFF131A26); // Web: bg-surface (dark)
  static const Color mutedLight = Color(0xFFF8FAFC); 
  static const Color mutedDark = Color(0xFF1A2332); 

  // ── Accent Colors ──
  static const Color accentPink = Color(0xFFE91E63);
  static const Color accentBlue = Color(0xFF3B82F6); 
  static const Color accentPurple = Color(0xFF8B5CF6); 

  // ── Gradients ──
  static const LinearGradient primaryGradient = LinearGradient(
    colors: [Color(0xFF065F37), Color(0xFF087443)], // brand-700 to brand-600
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
  
  static const LinearGradient darkGradient = LinearGradient(
    colors: [bgDark, surfaceDark],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
  );

  // ── Text Colors ──
  static const Color textPrimary = Color(0xFF0F172A); // slate-900
  static const Color textSecondary = Color(0xFF64748B); // slate-500
  
  // ── Semantic Status Colors ──
  static const Color statusPostulado = Color(0xFF64748B);
  static const Color statusEntrevistado = Color(0xFFF59E0B);
  static const Color statusContratado = primaryColor;
  static const Color statusRechazado = Color(0xFFEF4444);

  // ── Bottom Nav ──
  static const Color bottomNavColor = Color(0xFFFFFFFF);

  // ── Standard Shadows and Radii ──
  static List<BoxShadow> get premiumShadow {
    return [
      BoxShadow(
        color: Colors.black.withValues(alpha: 0.08),
        blurRadius: 24,
        offset: const Offset(0, 8),
      ),
    ];
  }

  static List<BoxShadow> get subtleShadow {
    return [
      BoxShadow(
        color: Colors.black.withValues(alpha: 0.04),
        blurRadius: 10,
        offset: const Offset(0, 4),
      ),
    ];
  }

  static BorderRadius get cardRadius => BorderRadius.circular(20);
  static BorderRadius get buttonRadius => BorderRadius.circular(12);

  static String _capitalize(String text) {
    if (text.isEmpty) return text;
    return text.substring(0, 1).toUpperCase() + text.substring(1).toLowerCase();
  }

  // ── Input Decoration (Light) ──
  static InputDecoration inputDecorationLight({
    required String label,
    required IconData icon,
    String? hint,
    Widget? suffixIcon,
  }) {
    return InputDecoration(
      labelText: _capitalize(label),
      labelStyle: const TextStyle(
        color: textSecondary,
        fontSize: 14,
        fontWeight: FontWeight.w500,
      ),
      floatingLabelStyle: const TextStyle(
        color: primaryDark,
        fontSize: 14,
        fontWeight: FontWeight.w800,
      ),
      hintText: hint,
      hintStyle: TextStyle(color: textSecondary.withValues(alpha: 0.6), fontSize: 14),
      prefixIcon: Padding(
        padding: const EdgeInsets.only(left: 20.0, right: 12.0),
        child: Icon(icon, color: textSecondary.withValues(alpha: 0.7), size: 22),
      ),
      suffixIcon: suffixIcon,
      filled: true,
      fillColor: Colors.white,
      contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFFE4E7EC)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFFE4E7EC)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: primaryColor, width: 2),
      ),
    );
  }

  // ── Input Decoration (Dark) ──
  static InputDecoration inputDecorationDark({
    required String label,
    required IconData icon,
    String? hint,
    Widget? suffixIcon,
  }) {
    return InputDecoration(
      labelText: _capitalize(label),
      labelStyle: TextStyle(
        color: Colors.white.withValues(alpha: 0.5),
        fontSize: 14,
        fontWeight: FontWeight.w500,
      ),
      floatingLabelStyle: const TextStyle(
        color: Colors.white,
        fontSize: 14,
        fontWeight: FontWeight.w800,
      ),
      hintText: hint,
      hintStyle: TextStyle(color: Colors.white.withValues(alpha: 0.3), fontSize: 14),
      prefixIcon: Padding(
        padding: const EdgeInsets.only(left: 20.0, right: 12.0),
        child: Icon(icon, color: Colors.white.withValues(alpha: 0.5), size: 22),
      ),
      suffixIcon: suffixIcon,
      filled: true,
      fillColor: const Color(0xFF1A2332), // mutedDark
      contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFF1E293B)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFF1E293B)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: primaryColor, width: 2),
      ),
    );
  }

  // ── Adaptive Input Decoration ──
  static InputDecoration inputDecoration(
    BuildContext context, {
    required String label,
    required IconData icon,
    String? hint,
    Widget? suffixIcon,
  }) {
    return context.isDark
        ? inputDecorationDark(label: label, icon: icon, hint: hint, suffixIcon: suffixIcon)
        : inputDecorationLight(label: label, icon: icon, hint: hint, suffixIcon: suffixIcon);
  }

  // ── Global Theme ──
  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: primaryDark,
        brightness: Brightness.light,
        surface: bgLight,
      ),
      scaffoldBackgroundColor: bgLight,
      cardColor: surfaceLight,
      textTheme: GoogleFonts.plusJakartaSansTextTheme(ThemeData.light().textTheme).apply(
        bodyColor: textPrimary,
        displayColor: textPrimary,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
        iconTheme: IconThemeData(color: textPrimary),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primaryColor,
          foregroundColor: Colors.white,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: buttonRadius,
          ),
          padding: const EdgeInsets.symmetric(vertical: 16),
          textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
        ),
      ),
    );
  }

  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: primaryDark,
        brightness: Brightness.dark,
        surface: bgDark,
      ),
      scaffoldBackgroundColor: bgDark,
      cardColor: surfaceDark,
      textTheme: GoogleFonts.plusJakartaSansTextTheme(ThemeData.dark().textTheme).apply(
        bodyColor: Colors.white,
        displayColor: Colors.white,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
        iconTheme: IconThemeData(color: Colors.white),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primaryColor,
          foregroundColor: Colors.white,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: buttonRadius,
          ),
          padding: const EdgeInsets.symmetric(vertical: 16),
          textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
        ),
      ),
    );
  }
}

extension ThemeExtension on BuildContext {
  ThemeData get theme => Theme.of(this);
  Color get bgColor => theme.scaffoldBackgroundColor;
  Color get surfaceColor => theme.cardColor;
  Color get primaryText => theme.textTheme.bodyLarge?.color ?? AppTheme.textPrimary;
  Color get secondaryText => theme.brightness == Brightness.dark ? Colors.white70 : AppTheme.textSecondary;
  bool get isDark => theme.brightness == Brightness.dark;
}
