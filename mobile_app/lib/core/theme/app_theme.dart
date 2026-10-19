import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  // ── Web Brand Green Palette (Exact match to frontend/src/index.css) ──
  static const Color brand50 = Color(0xFFEAF7F1);
  static const Color brand100 = Color(0xFFD1EFE2);
  static const Color brand200 = Color(0xFFA8E0C7);
  static const Color brand300 = Color(0xFF74CDA7);
  static const Color brand400 = Color(0xFF3DB381);
  static const Color brand500 = Color(0xFF22A86E); // Bright institutional emerald
  static const Color primaryColor = Color(0xFF087443); // brand-600 Corporate Green
  static const Color brand700 = Color(0xFF065F37);
  static const Color brand800 = Color(0xFF0E4832);
  static const Color primaryDark = Color(0xFF064E3B); // brand-900 Deep Institutional Green
  static const Color brand950 = Color(0xFF051510);

  // ── Accent & Semantic Colors ──
  static const Color accentAmber = Color(0xFFF59E0B);
  static const Color accentPink = Color(0xFFEF4444); // Replaced off-brand pink with web red-500
  static const Color accentBlue = Color(0xFF3B82F6);
  static const Color accentPurple = Color(0xFF8B5CF6);
  static const Color accentEmerald = Color(0xFF10B981);

  // ── Backgrounds & Surfaces (Exact match to --bg-main, --bg-surface, --bg-muted) ──
  static const Color bgLight = Color(0xFFF3F4F6);
  static const Color bgDark = Color(0xFF0B0F17);
  static const Color surfaceLight = Color(0xFFFFFFFF);
  static const Color surfaceDark = Color(0xFF131A26);
  static const Color mutedLight = Color(0xFFF8FAFC);
  static const Color mutedDark = Color(0xFF1A2332);
  static const Color inputFillLight = Color(0xFFF5F8F7);
  static const Color inputFillDark = Color(0xFF101620);

  // ── Borders (Exact match to --border-color & --border-input) ──
  static const Color borderLight = Color(0xFFE4E7EC);
  static const Color borderDark = Color(0xFF1E293B);
  static const Color borderInputLight = Color(0xFFD0D5DD);
  static const Color borderInputDark = Color(0xFF334155);

  // ── Text Colors (Exact match to --text-main, --text-secondary, --text-muted) ──
  static const Color textPrimary = Color(0xFF172033);
  static const Color textSecondary = Color(0xFF667085);
  static const Color textTertiary = Color(0xFF98A2B3);
  static const Color textPrimaryDark = Color(0xFFF8FAFC);
  static const Color textSecondaryDark = Color(0xFF94A3B8);
  static const Color textTertiaryDark = Color(0xFF64748B);

  // ── Semantic Status Colors (Matching Web GraduateApplications & JobBoard) ──
  static const Color statusPostulado = Color(0xFF10B981); // Emerald
  static const Color statusEvaluacion = Color(0xFF3B82F6); // Blue (HdV Vista)
  static const Color statusEntrevistado = Color(0xFF8B5CF6); // Violet (En proceso)
  static const Color statusContratado = Color(0xFF087443); // Corporate Green
  static const Color statusRechazado = Color(0xFFEF4444); // Red

  // ── Web Gradients ──
  static const LinearGradient primaryGradient = LinearGradient(
    colors: [Color(0xFF22A86E), Color(0xFF0E4832)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient heroBannerGradient = LinearGradient(
    colors: [
      Color(0xFF051510),
      Color(0xFF09291A),
      Color(0xFF0D3D26),
      Color(0xFF115040),
    ],
    stops: [0.0, 0.35, 0.70, 1.0],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient progressGradient = LinearGradient(
    colors: [Color(0xFF22A86E), Color(0xFF45C388), Color(0xFF7CDAAC)],
    begin: Alignment.centerLeft,
    end: Alignment.centerRight,
  );

  static const LinearGradient darkGradient = LinearGradient(
    colors: [bgDark, surfaceDark],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
  );

  // ── Bottom Nav ──
  static const Color bottomNavColor = Color(0xFFFFFFFF);

  // ── Standard Web Shadows and Radii ──
  static List<BoxShadow> get premiumShadow {
    return [
      BoxShadow(
        color: const Color(0xFF101828).withValues(alpha: 0.08),
        blurRadius: 24,
        offset: const Offset(0, 8),
      ),
      BoxShadow(
        color: const Color(0xFF101828).withValues(alpha: 0.03),
        blurRadius: 8,
        offset: const Offset(0, 2),
      ),
    ];
  }

  static List<BoxShadow> get subtleShadow {
    return [
      BoxShadow(
        color: const Color(0xFF101828).withValues(alpha: 0.06),
        blurRadius: 3,
        offset: const Offset(0, 1),
      ),
      BoxShadow(
        color: const Color(0xFF101828).withValues(alpha: 0.04),
        blurRadius: 2,
        offset: const Offset(0, 1),
      ),
    ];
  }

  static BorderRadius get cardRadius => BorderRadius.circular(16);
  static BorderRadius get authCardRadius => BorderRadius.circular(22);
  static BorderRadius get buttonRadius => BorderRadius.circular(12);

  // ── Input Decoration (Light) ──
  static InputDecoration inputDecorationLight({
    required String label,
    required IconData icon,
    String? hint,
    Widget? suffixIcon,
  }) {
    return InputDecoration(
      labelText: label,
      labelStyle: const TextStyle(
        color: textSecondary,
        fontSize: 13,
        fontWeight: FontWeight.w600,
      ),
      floatingLabelStyle: const TextStyle(
        color: primaryColor,
        fontSize: 13,
        fontWeight: FontWeight.w700,
      ),
      hintText: hint,
      hintStyle: const TextStyle(color: textTertiary, fontSize: 14),
      prefixIcon: Padding(
        padding: const EdgeInsets.only(left: 16.0, right: 12.0),
        child: Icon(icon, color: textTertiary, size: 20),
      ),
      suffixIcon: suffixIcon,
      filled: true,
      fillColor: inputFillLight,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: borderLight, width: 1.5),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: borderLight, width: 1.5),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: brand500, width: 2),
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
      labelText: label,
      labelStyle: const TextStyle(
        color: textSecondaryDark,
        fontSize: 13,
        fontWeight: FontWeight.w600,
      ),
      floatingLabelStyle: const TextStyle(
        color: brand400,
        fontSize: 13,
        fontWeight: FontWeight.w700,
      ),
      hintText: hint,
      hintStyle: const TextStyle(color: textTertiaryDark, fontSize: 14),
      prefixIcon: Padding(
        padding: const EdgeInsets.only(left: 16.0, right: 12.0),
        child: Icon(icon, color: textTertiaryDark, size: 20),
      ),
      suffixIcon: suffixIcon,
      filled: true,
      fillColor: inputFillDark,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: borderInputDark, width: 1.5),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: borderInputDark, width: 1.5),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: brand500, width: 2),
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

  // ── Global Light Theme (Web Inter font + Corporate Green SaaS) ──
  static ThemeData get lightTheme {
    final baseText = GoogleFonts.interTextTheme(ThemeData.light().textTheme);
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      colorScheme: ColorScheme.fromSeed(
        seedColor: primaryColor,
        primary: primaryColor,
        secondary: brand500,
        brightness: Brightness.light,
        surface: surfaceLight,
      ),
      scaffoldBackgroundColor: bgLight,
      cardColor: surfaceLight,
      dividerColor: borderLight,
      textTheme: baseText.apply(
        bodyColor: textPrimary,
        displayColor: textPrimary,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: false,
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
          padding: const EdgeInsets.symmetric(vertical: 15, horizontal: 20),
          textStyle: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 14),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: textPrimary,
          side: const BorderSide(color: borderLight),
          shape: RoundedRectangleBorder(
            borderRadius: buttonRadius,
          ),
          padding: const EdgeInsets.symmetric(vertical: 15, horizontal: 20),
          textStyle: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 14),
        ),
      ),
    );
  }

  // ── Global Dark Theme ──
  static ThemeData get darkTheme {
    final baseText = GoogleFonts.interTextTheme(ThemeData.dark().textTheme);
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      colorScheme: ColorScheme.fromSeed(
        seedColor: primaryColor,
        primary: brand500,
        secondary: brand400,
        brightness: Brightness.dark,
        surface: surfaceDark,
      ),
      scaffoldBackgroundColor: bgDark,
      cardColor: surfaceDark,
      dividerColor: borderDark,
      textTheme: baseText.apply(
        bodyColor: textPrimaryDark,
        displayColor: textPrimaryDark,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: false,
        iconTheme: IconThemeData(color: textPrimaryDark),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primaryColor,
          foregroundColor: Colors.white,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: buttonRadius,
          ),
          padding: const EdgeInsets.symmetric(vertical: 15, horizontal: 20),
          textStyle: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 14),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: textPrimaryDark,
          side: const BorderSide(color: borderDark),
          shape: RoundedRectangleBorder(
            borderRadius: buttonRadius,
          ),
          padding: const EdgeInsets.symmetric(vertical: 15, horizontal: 20),
          textStyle: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 14),
        ),
      ),
    );
  }
}

extension ThemeExtension on BuildContext {
  ThemeData get theme => Theme.of(this);
  bool get isDark => theme.brightness == Brightness.dark;
  Color get bgColor => theme.scaffoldBackgroundColor;
  Color get surfaceColor => theme.cardColor;
  Color get mutedColor => isDark ? AppTheme.mutedDark : AppTheme.mutedLight;
  Color get borderColor => isDark ? AppTheme.borderDark : AppTheme.borderLight;
  Color get primaryText => isDark ? AppTheme.textPrimaryDark : AppTheme.textPrimary;
  Color get secondaryText => isDark ? AppTheme.textSecondaryDark : AppTheme.textSecondary;
  Color get tertiaryText => isDark ? AppTheme.textTertiaryDark : AppTheme.textTertiary;
}
