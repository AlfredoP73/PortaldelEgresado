import 'dart:async';
import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/network/api_client.dart';
import '../../main/presentation/main_layout_screen.dart';
import '../../copilot/presentation/ai_copilot_screen.dart';
import '../../cohorts/presentation/cohort_heatmap_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => DashboardScreenState();
}

class DashboardScreenState extends State<DashboardScreen> {
  bool _isLoading = true;
  Timer? _autoRefreshTimer;
  String _userName = 'Egresado';
  double _profileProgress = 0.0;
  String _nextStepLabel = 'Completa tus datos básicos';

  Map<String, dynamic> _summary = {
    'total_applications': 0,
    'response_rate': 0,
    'profile_views': 0,
    'expected_salary': 0,
  };

  List<Map<String, dynamic>> _skillsRadar = [];
  List<Map<String, dynamic>> _applicationsTimeline = [];
  List<Map<String, dynamic>> _marketSalaries = [];
  List<Map<String, dynamic>> _applicationsByStatus = [];
  List<dynamic> _recentActivity = [];

  @override
  void initState() {
    super.initState();
    loadDashboardData();
    // Auto-actualización periódica en segundo plano cada 20 segundos sin bloquear la pantalla
    _autoRefreshTimer = Timer.periodic(const Duration(seconds: 20), (_) {
      if (mounted) {
        loadDashboardData(silent: true);
      }
    });
  }

  @override
  void dispose() {
    _autoRefreshTimer?.cancel();
    super.dispose();
  }

  Future<void> loadDashboardData({bool silent = false}) async {
    if (!silent) {
      setState(() => _isLoading = true);
    }

    // 1. Profile & Completeness (Matches ProfileCompleteness.tsx weights)
    try {
      final profileRes = await ApiClient.instance.get('/modulo1/profile');
      if (profileRes.data is Map) {
        final data = profileRes.data as Map<String, dynamic>;
        final firstName = data['first_name']?.toString() ?? '';
        if (firstName.isNotEmpty) {
          _userName = firstName.split(' ').first;
        }

        double progress = 0.0;
        String? missingStep;

        final hasBasic = firstName.isNotEmpty &&
            (data['last_name']?.toString().isNotEmpty ?? false) &&
            (data['phone']?.toString().isNotEmpty ?? false) &&
            (data['profile_summary']?.toString().isNotEmpty ?? false);
        if (hasBasic) {
          progress += 0.20;
        } else {
          missingStep ??= 'Completa tus datos básicos y resumen profesional (+20%)';
        }

        if (data['profile_picture_url']?.toString().isNotEmpty ?? false) {
          progress += 0.15;
        } else {
          missingStep ??= 'Sube tu foto de perfil institucional (+15%)';
        }

        if (data['cv_url']?.toString().isNotEmpty ?? false) {
          progress += 0.20;
        } else {
          missingStep ??= 'Adjunta tu Hoja de Vida en PDF (+20%)';
        }

        final skills = data['skills'] as List? ?? [];
        if (skills.isNotEmpty) {
          progress += 0.25;
        } else {
          missingStep ??= 'Añade tus habilidades y competencias (+25%)';
        }

        final exps = data['experiences'] as List? ?? [];
        final acads = data['academic_histories'] as List? ?? [];
        if (exps.isNotEmpty || acads.isNotEmpty) {
          progress += 0.20;
        } else {
          missingStep ??= 'Registra tu experiencia laboral o formación (+20%)';
        }

        _profileProgress = progress.clamp(0.0, 1.0);
        _nextStepLabel = missingStep ?? '¡Tu hoja de vida está al 100%!';
      }
    } catch (_) {}

    // 2. Graduate Dashboard Metrics & Charts (Matches GraduateDashboard.tsx)
    try {
      final dashRes = await ApiClient.instance.get('/graduate/dashboard');
      if (dashRes.data is Map) {
        final d = dashRes.data as Map<String, dynamic>;
        if (d['summary'] is Map) {
          _summary = Map<String, dynamic>.from(d['summary']);
        }
        if (d['skills_radar'] is List) {
          _skillsRadar = List<Map<String, dynamic>>.from(
            (d['skills_radar'] as List).map((e) => Map<String, dynamic>.from(e as Map)),
          );
        }
        if (d['applications_timeline'] is List) {
          _applicationsTimeline = List<Map<String, dynamic>>.from(
            (d['applications_timeline'] as List).map((e) => Map<String, dynamic>.from(e as Map)),
          );
        }
        if (d['market_salaries'] is List) {
          _marketSalaries = List<Map<String, dynamic>>.from(
            (d['market_salaries'] as List).map((e) => Map<String, dynamic>.from(e as Map)),
          );
        }
        if (d['applications_by_status'] is List) {
          _applicationsByStatus = List<Map<String, dynamic>>.from(
            (d['applications_by_status'] as List).map((e) => Map<String, dynamic>.from(e as Map)),
          );
        }
      }
    } catch (_) {}

    // 3. Recent Applications
    try {
      final appsRes = await ApiClient.instance.get('/modulo1/my-applications');
      if (appsRes.data is List) {
        _recentActivity = (appsRes.data as List).take(3).toList();
      }
    } catch (_) {}

    if (mounted) {
      setState(() => _isLoading = false);
    }
  }

  String _formatCurrency(dynamic value) {
    final numVal = (value is num) ? value : (num.tryParse(value?.toString() ?? '0') ?? 0);
    if (numVal <= 0) return '\$0';
    final formatter = NumberFormat.currency(locale: 'es_CO', symbol: '\$', decimalDigits: 0);
    return formatter.format(numVal);
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(color: AppTheme.primaryColor),
      );
    }

    return RefreshIndicator(
      color: AppTheme.primaryColor,
      onRefresh: () => loadDashboardData(silent: true),
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 104),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Page Header (Matches GraduateDashboard.tsx) ──
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Hola, $_userName 👋',
                        style: TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.w800,
                          color: context.primaryText,
                          letterSpacing: -0.5,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Resumen de tu actividad, postulaciones y competitividad en el mercado laboral.',
                        style: TextStyle(
                          fontSize: 13,
                          color: context.secondaryText,
                          height: 1.35,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                OutlinedButton.icon(
                  onPressed: () => loadDashboardData(silent: false),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  icon: const Icon(Icons.refresh_rounded, size: 16),
                  label: const Text('Actualizar', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // ── Fuerza del Perfil Card (Matches ProfileCompleteness.tsx) ──
            _buildProfileStrengthCard(context),
            const SizedBox(height: 14),

            // ── Nuevos Módulos de IA (Groq) y Mapa de Calor de Cohortes ──
            Row(
              children: [
                Expanded(
                  child: InkWell(
                    borderRadius: BorderRadius.circular(16),
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const AICopilotScreen()),
                      );
                    },
                    child: Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        gradient: AppTheme.primaryGradient,
                        borderRadius: BorderRadius.circular(16),
                        boxShadow: AppTheme.subtleShadow,
                      ),
                      child: const Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Icon(Icons.auto_awesome_rounded, color: Colors.white, size: 20),
                              Icon(Icons.arrow_forward_rounded, color: Colors.white70, size: 16),
                            ],
                          ),
                          SizedBox(height: 8),
                          Text(
                            'Copiloto IA 360°',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 13.5,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                          SizedBox(height: 2),
                          Text(
                            'Diagnóstico, método STAR y Coach con Groq AI',
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(color: Colors.white70, fontSize: 10.5),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: InkWell(
                    borderRadius: BorderRadius.circular(16),
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const CohortHeatmapScreen()),
                      );
                    },
                    child: Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: context.surfaceColor,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppTheme.brand300),
                        boxShadow: AppTheme.subtleShadow,
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Icon(Icons.grid_on_rounded, color: AppTheme.primaryColor, size: 20),
                              Icon(Icons.arrow_forward_rounded, color: context.secondaryText, size: 16),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Mapa de Cohortes',
                            style: TextStyle(
                              color: context.primaryText,
                              fontSize: 13.5,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'Empleabilidad y salarios reales por promoción',
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(color: context.secondaryText, fontSize: 10.5),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // ── 4 KPI Cards (Two Rows - Pixel-perfect without GridView spacing bugs) ──
            Row(
              children: [
                Expanded(
                  child: _buildKpiCard(
                    context,
                    label: 'MIS POSTULACIONES',
                    value: '${_summary['total_applications'] ?? 0}',
                    subtitle: 'Aplicaciones enviadas',
                    icon: Icons.description_outlined,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildKpiCard(
                    context,
                    label: 'TASA DE RESPUESTA',
                    value: '${_summary['response_rate'] ?? 0}%',
                    subtitle: 'Avanzan a entrevista',
                    icon: Icons.track_changes_rounded,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _buildKpiCard(
                    context,
                    label: 'VISITAS AL PERFIL',
                    value: '${_summary['profile_views'] ?? 0}',
                    subtitle: 'Visualizaciones de empresas',
                    icon: Icons.visibility_outlined,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildKpiCard(
                    context,
                    label: 'EXPECTATIVA SALARIAL',
                    value: _formatCurrency(_summary['expected_salary'] ?? _summary['program_average_salary'] ?? 0),
                    subtitle: 'Promedio de ofertas aplicadas',
                    icon: Icons.payments_outlined,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // ── NUEVO: Índice de Competitividad Laboral (Gauge & Readiness Score) ──
            _buildCompetitivenessScoreCard(context),
            const SizedBox(height: 16),

            // ── Chart 1: Mis Habilidades vs Mercado (Radar + Breakdown por Competencia) ──
            _buildSkillsComparisonCard(context),
            const SizedBox(height: 16),

            // ── NUEVO: Embudo de Conversión Laboral (Pipeline de Selección) ──
            _buildApplicationsFunnelCard(context),
            const SizedBox(height: 16),

            // ── Chart 2: Estado de mis Postulaciones (Donut Chart + Desglose) ──
            _buildApplicationsStatusCard(context),
            const SizedBox(height: 16),

            // ── Chart 3: Línea de Tiempo de Postulaciones (Area LineChart) ──
            _buildApplicationsTimelineCard(context),
            const SizedBox(height: 16),

            // ── Chart 4: Distribución Salarial - Mi Programa (Benchmark & Rangos) ──
            _buildMarketSalariesCard(context),
            const SizedBox(height: 16),

            // ── Actividad Reciente & Acceso Rápido ──
            _buildRecentActivitySection(context),
          ],
        ),
      ),
    );
  }

  Widget _buildProfileStrengthCard(BuildContext context) {
    final pct = (_profileProgress * 100).round();
    final Color statusColor = pct < 30
        ? AppTheme.statusRechazado
        : pct < 60
            ? AppTheme.accentAmber
            : pct < 90
                ? AppTheme.brand500
                : AppTheme.accentEmerald;
    final String statusLabel = pct < 30
        ? 'Perfil débil'
        : pct < 60
            ? 'En progreso'
            : pct < 90
                ? 'Perfil sólido'
                : '¡Perfil estelar!';

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: context.surfaceColor,
        borderRadius: AppTheme.cardRadius,
        border: Border.all(color: context.borderColor),
        boxShadow: AppTheme.subtleShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppTheme.brand50,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.verified_user_outlined, color: AppTheme.primaryColor, size: 18),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Fuerza del Perfil Institucional',
                      style: TextStyle(
                        fontSize: 14.5,
                        fontWeight: FontWeight.w800,
                        color: context.primaryText,
                      ),
                    ),
                    Text(
                      statusLabel,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: statusColor,
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: statusColor.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  '$pct%',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w900,
                    color: statusColor,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ClipRRect(
            borderRadius: BorderRadius.circular(999),
            child: LinearProgressIndicator(
              value: _profileProgress,
              minHeight: 8,
              backgroundColor: context.borderColor,
              valueColor: AlwaysStoppedAnimation<Color>(statusColor),
            ),
          ),
          const SizedBox(height: 12),
          InkWell(
            borderRadius: BorderRadius.circular(12),
            onTap: () => MainLayoutScreen.switchTab(context, 4),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: AppTheme.brand500.withValues(alpha: 0.07),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppTheme.brand500.withValues(alpha: 0.2)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.bolt_rounded, color: AppTheme.brand500, size: 18),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _nextStepLabel,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: context.primaryText,
                      ),
                    ),
                  ),
                  const Text(
                    'Ir al Perfil →',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w800,
                      color: AppTheme.primaryColor,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildKpiCard(
    BuildContext context, {
    required String label,
    required String value,
    required String subtitle,
    required IconData icon,
  }) {
    return Container(
      height: 106,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: context.surfaceColor,
        borderRadius: AppTheme.cardRadius,
        border: Border.all(color: context.borderColor),
        boxShadow: AppTheme.subtleShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 9.5,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.6,
                    color: context.secondaryText,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.all(5),
                decoration: BoxDecoration(
                  color: AppTheme.brand50,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(icon, color: AppTheme.primaryColor, size: 15),
              ),
            ],
          ),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(
              value,
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w900,
                color: context.primaryText,
                letterSpacing: -0.6,
              ),
            ),
          ),
          Text(
            subtitle,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 10.5,
              color: context.secondaryText,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCompetitivenessScoreCard(BuildContext context) {
    final profileScore = (_profileProgress * 100).round();

    double skillsMatch = 75.0;
    if (_skillsRadar.isNotEmpty) {
      double totalRatio = 0.0;
      for (final s in _skillsRadar) {
        final grad = (s['graduate'] as num? ?? 0).toDouble();
        final mkt = (s['market'] as num? ?? 1).toDouble();
        totalRatio += (grad / (mkt > 0 ? mkt : 1.0)).clamp(0.0, 1.3);
      }
      skillsMatch = ((totalRatio / _skillsRadar.length) * 85).clamp(40.0, 100.0);
    }

    final int totalApps = (_summary['total_applications'] as num? ?? 0).toInt();
    final double activityScore = totalApps > 0 ? (totalApps >= 3 ? 95.0 : 80.0) : 45.0;

    final int overallScore = ((profileScore * 0.40) + (skillsMatch * 0.35) + (activityScore * 0.25)).round().clamp(15, 100);

    final Color scoreColor = overallScore >= 80
        ? AppTheme.accentEmerald
        : overallScore >= 60
            ? AppTheme.primaryColor
            : overallScore >= 40
                ? AppTheme.accentAmber
                : AppTheme.statusRechazado;

    final String rankLabel = overallScore >= 80
        ? 'Perfil Muy Competitivo'
        : overallScore >= 60
            ? 'Competitividad Moderada'
            : 'En Fortalecimiento';

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: context.surfaceColor,
        borderRadius: AppTheme.cardRadius,
        border: Border.all(color: context.borderColor),
        boxShadow: AppTheme.subtleShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(7),
                decoration: BoxDecoration(
                  color: AppTheme.brand50,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.auto_graph_rounded, color: AppTheme.primaryColor, size: 18),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Índice de Competitividad Laboral',
                      style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: context.primaryText),
                    ),
                    Text(
                      'Puntaje global según tu CV, habilidades y demanda',
                      style: TextStyle(fontSize: 11.5, color: context.secondaryText),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                decoration: BoxDecoration(
                  color: scoreColor.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  rankLabel,
                  style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: scoreColor),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              // Circular Gauge
              SizedBox(
                width: 76,
                height: 76,
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    SizedBox(
                      width: 76,
                      height: 76,
                      child: CircularProgressIndicator(
                        value: overallScore / 100,
                        strokeWidth: 7.5,
                        strokeCap: StrokeCap.round,
                        backgroundColor: context.borderColor.withValues(alpha: 0.5),
                        valueColor: AlwaysStoppedAnimation<Color>(scoreColor),
                      ),
                    ),
                    Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          '$overallScore',
                          style: TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.w900,
                            letterSpacing: -0.5,
                            color: context.primaryText,
                          ),
                        ),
                        Text(
                          '/ 100',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            color: context.secondaryText,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildScoreSubMetric(
                      context,
                      label: 'Completitud de Hoja de Vida',
                      percentage: profileScore,
                      color: AppTheme.primaryColor,
                    ),
                    const SizedBox(height: 8),
                    _buildScoreSubMetric(
                      context,
                      label: 'Match de Habilidades Demandadas',
                      percentage: skillsMatch.round(),
                      color: AppTheme.brand400,
                    ),
                    const SizedBox(height: 8),
                    _buildScoreSubMetric(
                      context,
                      label: 'Tracción & Actividad',
                      percentage: activityScore.round(),
                      color: AppTheme.accentPurple,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildScoreSubMetric(
    BuildContext context, {
    required String label,
    required int percentage,
    required Color color,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: context.secondaryText)),
            Text('$percentage%', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: context.primaryText)),
          ],
        ),
        const SizedBox(height: 4),
        ClipRRect(
          borderRadius: BorderRadius.circular(999),
          child: LinearProgressIndicator(
            value: (percentage / 100).clamp(0.0, 1.0),
            minHeight: 5,
            backgroundColor: context.borderColor.withValues(alpha: 0.5),
            valueColor: AlwaysStoppedAnimation<Color>(color),
          ),
        ),
      ],
    );
  }

  Widget _buildSkillsComparisonCard(BuildContext context) {
    double avgMatch = 0.0;
    if (_skillsRadar.isNotEmpty) {
      double sum = 0.0;
      for (final s in _skillsRadar) {
        final grad = (s['graduate'] as num? ?? 0).toDouble();
        final mkt = (s['market'] as num? ?? 1).toDouble();
        sum += ((grad / (mkt > 0 ? mkt : 1.0)) * 100).clamp(0.0, 150.0);
      }
      avgMatch = (sum / _skillsRadar.length).clamp(0.0, 100.0);
    }

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: context.surfaceColor,
        borderRadius: AppTheme.cardRadius,
        border: Border.all(color: context.borderColor),
        boxShadow: AppTheme.subtleShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Mis Habilidades vs Mercado',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: context.primaryText),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Comparación entre tu nivel y la demanda activa',
                      style: TextStyle(fontSize: 11.5, color: context.secondaryText),
                    ),
                  ],
                ),
              ),
              _buildLegendDot(AppTheme.primaryColor, 'Tú'),
              const SizedBox(width: 8),
              _buildLegendDot(AppTheme.accentAmber, 'Mercado'),
            ],
          ),
          const SizedBox(height: 16),
          if (_skillsRadar.isEmpty)
            _buildEmptyChartState('Añade habilidades en tu perfil para comparar con la demanda del mercado.')
          else ...[
            if (_skillsRadar.length >= 3)
              SizedBox(
                height: 210,
                child: RadarChart(
                  RadarChartData(
                    radarShape: RadarShape.polygon,
                    dataSets: [
                      RadarDataSet(
                        fillColor: AppTheme.primaryColor.withValues(alpha: 0.35),
                        borderColor: AppTheme.primaryColor,
                        entryRadius: 3.5,
                        borderWidth: 2,
                        dataEntries: _skillsRadar
                            .map((e) => RadarEntry(value: (e['graduate'] as num? ?? 0).toDouble()))
                            .toList(),
                      ),
                      RadarDataSet(
                        fillColor: AppTheme.accentAmber.withValues(alpha: 0.20),
                        borderColor: AppTheme.accentAmber,
                        entryRadius: 3,
                        borderWidth: 2,
                        dataEntries: _skillsRadar
                            .map((e) => RadarEntry(value: (e['market'] as num? ?? 0).toDouble()))
                            .toList(),
                      ),
                    ],
                    radarBackgroundColor: Colors.transparent,
                    borderData: FlBorderData(show: false),
                    radarBorderData: BorderSide(color: context.borderColor),
                    titlePositionPercentageOffset: 0.20,
                    titleTextStyle: TextStyle(color: context.secondaryText, fontSize: 11, fontWeight: FontWeight.w700),
                    getTitle: (index, angle) {
                      final skill = _skillsRadar[index]['skill']?.toString() ?? '';
                      return RadarChartTitle(text: skill);
                    },
                    tickCount: 4,
                    ticksTextStyle: const TextStyle(color: Colors.transparent, fontSize: 8),
                    tickBorderData: BorderSide(color: context.borderColor.withValues(alpha: 0.6)),
                    gridBorderData: BorderSide(color: context.borderColor.withValues(alpha: 0.6)),
                  ),
                ),
              ),
            const SizedBox(height: 14),
            // Breakdown list below chart to eliminate unused space and add rich insights
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: context.mutedColor,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: context.borderColor.withValues(alpha: 0.6)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Desglose por Competencia',
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: context.primaryText),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppTheme.primaryColor.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          'Afinidad Promedio: ${avgMatch.round()}%',
                          style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: AppTheme.primaryColor),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  ..._skillsRadar.map((item) {
                    final skill = item['skill']?.toString() ?? '';
                    final grad = (item['graduate'] as num? ?? 0).toDouble();
                    final mkt = (item['market'] as num? ?? 0).toDouble();
                    final diff = (grad - mkt).toInt();
                    final bool isLeader = diff >= 0;

                    return Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(skill, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: context.primaryText)),
                              Row(
                                children: [
                                  Text(
                                    'Tú: ${grad.toInt()}% · Mercado: ${mkt.toInt()}%',
                                    style: TextStyle(fontSize: 11, color: context.secondaryText),
                                  ),
                                  const SizedBox(width: 6),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                                    decoration: BoxDecoration(
                                      color: isLeader
                                          ? AppTheme.accentEmerald.withValues(alpha: 0.15)
                                          : AppTheme.accentAmber.withValues(alpha: 0.15),
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                    child: Text(
                                      isLeader ? '+$diff% Lideras' : '$diff% Brecha',
                                      style: TextStyle(
                                        fontSize: 9.5,
                                        fontWeight: FontWeight.w800,
                                        color: isLeader ? AppTheme.accentEmerald : AppTheme.accentAmber,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          ClipRRect(
                            borderRadius: BorderRadius.circular(999),
                            child: SizedBox(
                              height: 6,
                              child: Stack(
                                children: [
                                  LinearProgressIndicator(
                                    value: (mkt / 100).clamp(0.0, 1.0),
                                    backgroundColor: context.borderColor,
                                    valueColor: const AlwaysStoppedAnimation<Color>(AppTheme.accentAmber),
                                  ),
                                  LinearProgressIndicator(
                                    value: (grad / 100).clamp(0.0, 1.0),
                                    backgroundColor: Colors.transparent,
                                    valueColor: const AlwaysStoppedAnimation<Color>(AppTheme.primaryColor),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    );
                  }),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildApplicationsFunnelCard(BuildContext context) {
    final int totalApps = (_summary['total_applications'] as num? ?? 0).toInt();
    final int offersViewed = (_summary['offers_viewed'] as num? ?? (totalApps * 3)).toInt().clamp(totalApps > 0 ? totalApps : 1, 9999);
    final int profileViews = (_summary['profile_views'] as num? ?? (totalApps * 5)).toInt().clamp(totalApps, 9999);
    final int interviews = (_summary['interviews'] as num? ?? 0).toInt();
    final num responseRate = _summary['response_rate'] ?? 0;

    final steps = [
      {'title': 'Ofertas Exploradas', 'count': offersViewed, 'icon': Icons.search_rounded, 'color': AppTheme.brand400},
      {'title': 'Postulaciones Enviadas', 'count': totalApps, 'icon': Icons.send_rounded, 'color': AppTheme.primaryColor},
      {'title': 'Visualizaciones de Perfil', 'count': profileViews, 'icon': Icons.visibility_outlined, 'color': AppTheme.accentBlue},
      {'title': 'Entrevistas Asignadas', 'count': interviews, 'icon': Icons.handshake_outlined, 'color': AppTheme.accentEmerald},
    ];

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: context.surfaceColor,
        borderRadius: AppTheme.cardRadius,
        border: Border.all(color: context.borderColor),
        boxShadow: AppTheme.subtleShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Embudo de Postulación & Empleo',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: context.primaryText),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Conversión de tus aplicaciones en cada etapa',
                      style: TextStyle(fontSize: 11.5, color: context.secondaryText),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: AppTheme.accentEmerald.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  '$responseRate% Avance',
                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: AppTheme.accentEmerald),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Column(
            children: List.generate(steps.length, (i) {
              final step = steps[i];
              final count = (step['count'] as num).toInt();
              final Color color = step['color'] as Color;
              final IconData icon = step['icon'] as IconData;
              final maxStepVal = offersViewed > 0 ? offersViewed : 1;
              final double ratio = (count / maxStepVal).clamp(0.08, 1.0);

              return Column(
                children: [
                  Row(
                    children: [
                      Container(
                        width: 32,
                        height: 32,
                        decoration: BoxDecoration(
                          color: color.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Icon(icon, color: color, size: 16),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  step['title'] as String,
                                  style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: context.primaryText),
                                ),
                                Text(
                                  '$count',
                                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w900, color: color),
                                ),
                              ],
                            ),
                            const SizedBox(height: 4),
                            ClipRRect(
                              borderRadius: BorderRadius.circular(4),
                              child: LinearProgressIndicator(
                                value: ratio,
                                minHeight: 6,
                                backgroundColor: context.borderColor.withValues(alpha: 0.5),
                                valueColor: AlwaysStoppedAnimation<Color>(color),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  if (i < steps.length - 1)
                    Padding(
                      padding: const EdgeInsets.only(left: 15, top: 2, bottom: 2),
                      child: Align(
                        alignment: Alignment.centerLeft,
                        child: Container(
                          width: 2,
                          height: 10,
                          color: context.borderColor,
                        ),
                      ),
                    ),
                ],
              );
            }),
          ),
        ],
      ),
    );
  }

  Widget _buildApplicationsStatusCard(BuildContext context) {
    final total = _applicationsByStatus.fold<int>(0, (sum, item) => sum + ((item['count'] as num? ?? 0).toInt()));

    Color getStatusColor(String status, int index) {
      final s = status.toUpperCase();
      if (s.contains('POSTULAD')) return AppTheme.primaryColor;
      if (s.contains('REVISION') || s.contains('EVALUA') || s.contains('VIST')) return AppTheme.accentBlue;
      if (s.contains('ENTREVIST')) return AppTheme.accentPurple;
      if (s.contains('SELECCION') || s.contains('CONTRAT') || s.contains('FINAL')) return AppTheme.accentEmerald;
      if (s.contains('RECHAZ') || s.contains('DESCART')) return AppTheme.statusRechazado;
      final colors = [
        AppTheme.primaryColor,
        AppTheme.accentBlue,
        AppTheme.accentAmber,
        AppTheme.accentPurple,
        AppTheme.brand400,
      ];
      return colors[index % colors.length];
    }

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: context.surfaceColor,
        borderRadius: AppTheme.cardRadius,
        border: Border.all(color: context.borderColor),
        boxShadow: AppTheme.subtleShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Estado de mis Postulaciones',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: context.primaryText),
              ),
              if (total > 0)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: AppTheme.brand50,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    '$total aplicaciones',
                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppTheme.primaryColor),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 14),
          if (_applicationsByStatus.isEmpty || total == 0)
            _buildEmptyChartState('Postúlate a vacantes para visualizar la distribución por etapa del proceso.')
          else
            Row(
              children: [
                // Donut Chart
                SizedBox(
                  width: 120,
                  height: 120,
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      PieChart(
                        PieChartData(
                          sectionsSpace: 2.5,
                          centerSpaceRadius: 36,
                          startDegreeOffset: -90,
                          sections: List.generate(_applicationsByStatus.length, (i) {
                            final item = _applicationsByStatus[i];
                            final count = (item['count'] as num? ?? 0).toDouble();
                            final color = getStatusColor(item['status']?.toString() ?? '', i);
                            return PieChartSectionData(
                              color: color,
                              value: count,
                              title: '',
                              radius: 18,
                            );
                          }),
                        ),
                      ),
                      Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            '$total',
                            style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: context.primaryText),
                          ),
                          Text(
                            'Total',
                            style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w700, color: context.secondaryText),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 16),
                // Legend and Percentages
                Expanded(
                  child: Column(
                    children: List.generate(_applicationsByStatus.length, (i) {
                      final item = _applicationsByStatus[i];
                      final status = item['status']?.toString() ?? '';
                      final count = (item['count'] as num? ?? 0).toInt();
                      final pct = total > 0 ? ((count / total) * 100).round() : 0;
                      final color = getStatusColor(status, i);

                      return Padding(
                        padding: const EdgeInsets.only(bottom: 7),
                        child: Row(
                          children: [
                            Container(width: 9, height: 9, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                status,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: context.primaryText),
                              ),
                            ),
                            Text(
                              '$count',
                              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: context.primaryText),
                            ),
                            const SizedBox(width: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                              decoration: BoxDecoration(
                                color: color.withValues(alpha: 0.12),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                '$pct%',
                                style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: color),
                              ),
                            ),
                          ],
                        ),
                      );
                    }),
                  ),
                ),
              ],
            ),
        ],
      ),
    );
  }

  Widget _buildApplicationsTimelineCard(BuildContext context) {
    final int totalInPeriod = _applicationsTimeline.fold(0, (sum, item) => sum + ((item['count'] as num? ?? 0).toInt()));

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: context.surfaceColor,
        borderRadius: AppTheme.cardRadius,
        border: Border.all(color: context.borderColor),
        boxShadow: AppTheme.subtleShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Línea de Tiempo de Postulaciones',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: context.primaryText),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Historial cronológico de postulaciones',
                      style: TextStyle(fontSize: 11.5, color: context.secondaryText),
                    ),
                  ],
                ),
              ),
              if (_applicationsTimeline.isNotEmpty)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: AppTheme.brand50,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    '$totalInPeriod registros',
                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppTheme.primaryColor),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 16),
          if (_applicationsTimeline.isEmpty)
            _buildEmptyChartState('Aún no registras actividad histórica de postulaciones.')
          else
            SizedBox(
              height: 180,
              child: LineChart(
                LineChartData(
                  minY: 0,
                  gridData: FlGridData(
                    show: true,
                    drawVerticalLine: false,
                    getDrawingHorizontalLine: (_) => FlLine(color: context.borderColor, strokeWidth: 1, dashArray: [4, 4]),
                  ),
                  titlesData: FlTitlesData(
                    rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                    topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                    leftTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        reservedSize: 28,
                        getTitlesWidget: (val, _) => Text(
                          val.toInt().toString(),
                          style: TextStyle(fontSize: 10, color: context.secondaryText),
                        ),
                      ),
                    ),
                    bottomTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        getTitlesWidget: (val, _) {
                          final idx = val.toInt();
                          if (idx < 0 || idx >= _applicationsTimeline.length) return const SizedBox.shrink();
                          final label = _applicationsTimeline[idx]['date']?.toString() ?? '';
                          return Padding(
                            padding: const EdgeInsets.only(top: 6),
                            child: Text(
                              label.length > 6 ? label.substring(label.length - 5) : label,
                              style: TextStyle(fontSize: 10, color: context.secondaryText),
                            ),
                          );
                        },
                      ),
                    ),
                  ),
                  borderData: FlBorderData(show: false),
                  lineBarsData: [
                    LineChartBarData(
                      spots: List.generate(_applicationsTimeline.length, (i) {
                        final c = (_applicationsTimeline[i]['count'] as num? ?? 0).toDouble();
                        return FlSpot(i.toDouble(), c);
                      }),
                      isCurved: _applicationsTimeline.length > 1,
                      color: AppTheme.primaryColor,
                      barWidth: 3,
                      dotData: const FlDotData(show: true),
                      belowBarData: BarAreaData(
                        show: true,
                        color: AppTheme.primaryColor.withValues(alpha: 0.16),
                      ),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildMarketSalariesCard(BuildContext context) {
    num maxSal = 1;
    for (final s in _marketSalaries) {
      final c = (s['count'] as num? ?? 0);
      if (c > maxSal) maxSal = c;
    }

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: context.surfaceColor,
        borderRadius: AppTheme.cardRadius,
        border: Border.all(color: context.borderColor),
        boxShadow: AppTheme.subtleShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Distribución Salarial (Mi Programa)',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: context.primaryText),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Rangos salariales observados en vacantes para tu carrera',
                      style: TextStyle(fontSize: 11.5, color: context.secondaryText),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: AppTheme.brand50,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: const Text(
                  'COP / Mes',
                  style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: AppTheme.primaryColor),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          if (_marketSalaries.isEmpty)
            _buildEmptyChartState('Sin datos salariales registrados aún para tu programa.')
          else ...[
            // 3 KPI Cards Row for Min, Avg, Max
            Row(
              children: _marketSalaries.map((s) {
                final range = s['range']?.toString() ?? '';
                final salaryVal = (s['count'] as num? ?? 0);
                final bool isAvg = range == 'Avg';
                final String label = range == 'Min' ? 'Piso Mínimo' : range == 'Avg' ? 'Promedio' : 'Techo Máximo';
                final Color cardColor = isAvg ? AppTheme.primaryColor : context.primaryText;

                return Expanded(
                  child: Container(
                    margin: const EdgeInsets.symmetric(horizontal: 3),
                    padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
                    decoration: BoxDecoration(
                      color: isAvg ? AppTheme.primaryColor.withValues(alpha: 0.08) : context.mutedColor,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                        color: isAvg ? AppTheme.primaryColor.withValues(alpha: 0.3) : context.borderColor,
                      ),
                    ),
                    child: Column(
                      children: [
                        Text(
                          label,
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            color: isAvg ? AppTheme.primaryColor : context.secondaryText,
                          ),
                        ),
                        const SizedBox(height: 4),
                        FittedBox(
                          fit: BoxFit.scaleDown,
                          child: Text(
                            _formatCurrency(salaryVal),
                            style: TextStyle(
                              fontSize: 13.5,
                              fontWeight: FontWeight.w900,
                              color: cardColor,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              }).toList(),
            ),
            const SizedBox(height: 16),
            // Comparative Visual Tracks
            Column(
              children: _marketSalaries.map((s) {
                final range = s['range']?.toString() ?? '';
                final salaryVal = (s['count'] as num? ?? 0);
                final ratio = maxSal > 0 ? (salaryVal / maxSal).clamp(0.15, 1.0) : 0.5;
                final bool isAvg = range == 'Avg';
                final String rangeName = range == 'Min'
                    ? 'Salario Mínimo en Ofertas'
                    : range == 'Avg'
                        ? 'Salario Promedio del Mercado'
                        : 'Salario Máximo Ofertado';
                final Color barColor = isAvg
                    ? AppTheme.primaryColor
                    : (range == 'Min' ? AppTheme.brand300 : AppTheme.accentEmerald);

                return Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(rangeName, style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: context.primaryText)),
                          Text(
                            _formatCurrency(salaryVal),
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w800,
                              color: isAvg ? AppTheme.primaryColor : context.primaryText,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 5),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(6),
                        child: LinearProgressIndicator(
                          value: ratio.toDouble(),
                          minHeight: 8,
                          backgroundColor: context.borderColor.withValues(alpha: 0.5),
                          valueColor: AlwaysStoppedAnimation<Color>(barColor),
                        ),
                      ),
                    ],
                  ),
                );
              }).toList(),
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: AppTheme.brand50,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  const Icon(Icons.lightbulb_outline_rounded, color: AppTheme.primaryColor, size: 16),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Consejo: Egresados con habilidades certificadas y experiencia previa negocian ofertas en el tercio superior.',
                      style: TextStyle(fontSize: 11, color: context.primaryText, height: 1.3),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildRecentActivitySection(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: context.surfaceColor,
        borderRadius: AppTheme.cardRadius,
        border: Border.all(color: context.borderColor),
        boxShadow: AppTheme.subtleShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Postulaciones Recientes',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: context.primaryText),
              ),
              TextButton(
                onPressed: () => MainLayoutScreen.switchTab(context, 3),
                child: const Text(
                  'Ver todas →',
                  style: TextStyle(color: AppTheme.primaryColor, fontWeight: FontWeight.w700, fontSize: 12.5),
                ),
              ),
            ],
          ),
          if (_recentActivity.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 12),
              child: Text(
                'Aún no te has postulado a vacantes. Explora las ofertas recomendadas.',
                style: TextStyle(fontSize: 12.5, color: context.secondaryText),
              ),
            )
          else
            Column(
              children: _recentActivity.map((item) {
                final job = item['job_offer'] ?? {};
                final company = job['company'] ?? {};
                final status = item['status']?.toString() ?? 'POSTULADO';

                return Container(
                  margin: const EdgeInsets.only(top: 10),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: context.mutedColor,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: context.borderColor),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 38,
                        height: 38,
                        decoration: BoxDecoration(
                          color: AppTheme.brand50,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(Icons.work_outline_rounded, color: AppTheme.primaryColor, size: 18),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              job['title']?.toString() ?? 'Vacante',
                              style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w800, color: context.primaryText),
                            ),
                            Text(
                              company['name']?.toString() ?? 'Empresa Aliada',
                              style: TextStyle(fontSize: 12, color: context.secondaryText),
                            ),
                          ],
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppTheme.brand50,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          status,
                          style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: AppTheme.primaryColor),
                        ),
                      ),
                    ],
                  ),
                );
              }).toList(),
            ),
        ],
      ),
    );
  }

  Widget _buildLegendDot(Color color, String label) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(width: 8, height: 8, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
        const SizedBox(width: 4),
        Text(label, style: TextStyle(fontSize: 11, color: context.secondaryText, fontWeight: FontWeight.w600)),
      ],
    );
  }

  Widget _buildEmptyChartState(String text) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
      decoration: BoxDecoration(
        color: context.mutedColor,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        text,
        textAlign: TextAlign.center,
        style: TextStyle(fontSize: 12.5, color: context.secondaryText),
      ),
    );
  }
}
