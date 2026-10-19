import 'package:flutter/material.dart';
import 'dart:math' as math;
import '../theme/app_theme.dart';

class ProgressRing extends StatelessWidget {
  final double progress; // 0.0 to 1.0
  final double size;
  final double strokeWidth;
  final Color color;
  final Color? backgroundColor;
  final bool showPercentage;

  const ProgressRing({
    super.key,
    required this.progress,
    this.size = 56.0,
    this.strokeWidth = 5.0,
    required this.color,
    this.backgroundColor,
    this.showPercentage = true,
  });

  @override
  Widget build(BuildContext context) {
    final bg = backgroundColor ?? (context.isDark ? AppTheme.borderDark : const Color(0xFFE5E7EB));
    final pct = (progress.clamp(0.0, 1.0) * 100).round();

    return SizedBox(
      width: size,
      height: size,
      child: Stack(
        alignment: Alignment.center,
        children: [
          CustomPaint(
            size: Size(size, size),
            painter: _RingPainter(
              progress: progress.clamp(0.0, 1.0),
              color: color,
              backgroundColor: bg,
              strokeWidth: strokeWidth,
            ),
          ),
          if (showPercentage)
            Text(
              '$pct%',
              style: TextStyle(
                fontSize: size * 0.24,
                fontWeight: FontWeight.w800,
                color: context.primaryText,
                letterSpacing: -0.3,
              ),
            ),
        ],
      ),
    );
  }
}

class _RingPainter extends CustomPainter {
  final double progress;
  final Color color;
  final Color backgroundColor;
  final double strokeWidth;

  _RingPainter({
    required this.progress,
    required this.color,
    required this.backgroundColor,
    required this.strokeWidth,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = (size.width - strokeWidth) / 2;

    final bgPaint = Paint()
      ..color = backgroundColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth;

    canvas.drawCircle(center, radius, bgPaint);

    final progressPaint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round;

    final sweepAngle = 2 * math.pi * progress;
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      -math.pi / 2,
      sweepAngle,
      false,
      progressPaint,
    );
  }

  @override
  bool shouldRepaint(covariant _RingPainter oldDelegate) {
    return oldDelegate.progress != progress ||
        oldDelegate.color != color ||
        oldDelegate.backgroundColor != backgroundColor ||
        oldDelegate.strokeWidth != strokeWidth;
  }
}
