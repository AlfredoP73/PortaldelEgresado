import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/network/api_client.dart';
import '../../main/presentation/main_layout_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  bool _isLoading = true;
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
    _loadDashboardData();
  }

  Future<void> _loadDashboardData() async {
    setState(() => _isLoading = true);

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
      onRefresh: _loadDashboardData,
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
                  onPressed: _loadDashboardData,
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
            const SizedBox(height: 16),

            // ── 4 KPI Cards Grid (2x2 - Exact match to GraduateDashboard.tsx) ──
            GridView.count(
              crossAxisCount: 2,
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              childAspectRatio: 1.38,
              children: [
                _buildKpiCard(
                  context,
                  label: 'MIS POSTULACIONES',
                  value: '${_summary['total_applications'] ?? 0}',
                  subtitle: 'Aplicaciones enviadas',
                  icon: Icons.description_outlined,
                ),
                _buildKpiCard(
                  context,
                  label: 'TASA DE RESPUESTA',
                  value: '${_summary['response_rate'] ?? 0}%',
                  subtitle: 'Avanzan a entrevista',
                  icon: Icons.track_changes_rounded,
                ),
                _buildKpiCard(
                  context,
                  label: 'VISITAS AL PERFIL',
                  value: '${_summary['profile_views'] ?? 0}',
                  subtitle: 'Visualizaciones de empresas',
                  icon: Icons.visibility_outlined,
                ),
                _buildKpiCard(
                  context,
                  label: 'EXPECTATIVA SALARIAL',
                  value: _formatCurrency(_summary['expected_salary'] ?? _summary['program_average_salary'] ?? 0),
                  subtitle: 'Promedio de ofertas aplicadas',
                  icon: Icons.payments_outlined,
                ),
              ],
            ),
            const SizedBox(height: 20),

            // ── Chart 1: Mis Habilidades vs Mercado (Matches RadarChart in GraduateDashboard.tsx) ──
            _buildSkillsComparisonCard(context),
            const SizedBox(height: 16),

            // ── Chart 2: Línea de Tiempo de Postulaciones (Area LineChart) ──
            _buildApplicationsTimelineCard(context),
            const SizedBox(height: 16),

            // ── Chart 3: Distribución Salarial - Mi Programa (BarChart) ──
            _buildMarketSalariesCard(context),
            const SizedBox(height: 16),

            // ── Chart 4: Estado de mis Postulaciones (Donut + Percentage Breakdown) ──
            _buildApplicationsStatusCard(context),
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
      padding: const EdgeInsets.all(14),
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
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.6,
                    color: context.secondaryText,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: AppTheme.brand50,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(icon, color: AppTheme.primaryColor, size: 16),
              ),
            ],
          ),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(
              value,
              style: TextStyle(
                fontSize: 24,
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
              fontSize: 11,
              color: context.secondaryText,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSkillsComparisonCard(BuildContext context) {
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
                child: Text(
                  'Mis Habilidades vs Mercado',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: context.primaryText),
                ),
              ),
              _buildLegendDot(AppTheme.primaryColor, 'Tu Perfil'),
              const SizedBox(width: 10),
              _buildLegendDot(AppTheme.brand400, 'Mercado'),
            ],
          ),
          const SizedBox(height: 16),
          if (_skillsRadar.isEmpty)
            _buildEmptyChartState('Añade habilidades en tu perfil para comparar con el mercado.')
          else if (_skillsRadar.length >= 3)
            SizedBox(
              height: 220,
              child: RadarChart(
                RadarChartData(
                  radarShape: RadarShape.polygon,
                  dataSets: [
                    RadarDataSet(
                      fillColor: AppTheme.primaryColor.withValues(alpha: 0.35),
                      borderColor: AppTheme.primaryColor,
                      entryRadius: 3,
                      borderWidth: 2,
                      dataEntries: _skillsRadar
                          .map((e) => RadarEntry(value: (e['graduate'] as num? ?? 0).toDouble()))
                          .toList(),
                    ),
                    RadarDataSet(
                      fillColor: AppTheme.brand400.withValues(alpha: 0.20),
                      borderColor: AppTheme.brand400,
                      entryRadius: 2.5,
                      borderWidth: 2,
                      dataEntries: _skillsRadar
                          .map((e) => RadarEntry(value: (e['market'] as num? ?? 0).toDouble()))
                          .toList(),
                    ),
                  ],
                  radarBackgroundColor: Colors.transparent,
                  borderData: FlBorderData(show: false),
                  radarBorderData: BorderSide(color: context.borderColor),
                  titlePositionPercentageOffset: 0.18,
                  titleTextStyle: TextStyle(color: context.secondaryText, fontSize: 10.5, fontWeight: FontWeight.w600),
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
            )
          else
            Column(
              children: _skillsRadar.map((item) {
                final skill = item['skill']?.toString() ?? '';
                final grad = (item['graduate'] as num? ?? 0).toDouble();
                final mkt = (item['market'] as num? ?? 0).toDouble();
                return Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(skill, style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: context.primaryText)),
                          Text('Tú: ${grad.toInt()}% · Mercado: ${mkt.toInt()}%',
                              style: TextStyle(fontSize: 11, color: context.secondaryText)),
                        ],
                      ),
                      const SizedBox(height: 6),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(999),
                        child: LinearProgressIndicator(
                          value: (grad / 100).clamp(0.0, 1.0),
                          minHeight: 7,
                          backgroundColor: context.borderColor,
                          valueColor: const AlwaysStoppedAnimation<Color>(AppTheme.primaryColor),
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

  Widget _buildApplicationsTimelineCard(BuildContext context) {
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
          Text(
            'Línea de Tiempo de Postulaciones',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: context.primaryText),
          ),
          const SizedBox(height: 16),
          if (_applicationsTimeline.isEmpty)
            _buildEmptyChartState('Aún no registras actividad histórica de postulaciones.')
          else
            SizedBox(
              height: 180,
              child: LineChart(
                LineChartData(
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
                      isCurved: true,
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
          Text(
            'Distribución Salarial (Mi Programa)',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: context.primaryText),
          ),
          const SizedBox(height: 14),
          if (_marketSalaries.isEmpty)
            _buildEmptyChartState('Sin datos salariales registrados aún para tu programa.')
          else
            Column(
              children: _marketSalaries.map((s) {
                final range = s['range']?.toString() ?? '';
                final count = (s['count'] as num? ?? 0).toInt();
                final maxCount = _marketSalaries
                    .map((e) => (e['count'] as num? ?? 1).toInt())
                    .fold<int>(1, (a, b) => a > b ? a : b);
                final ratio = (count / maxCount).clamp(0.08, 1.0);

                return Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(range, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: context.primaryText)),
                          Text('$count ofertas', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: AppTheme.primaryColor)),
                        ],
                      ),
                      const SizedBox(height: 5),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(6),
                        child: LinearProgressIndicator(
                          value: ratio,
                          minHeight: 10,
                          backgroundColor: context.borderColor,
                          valueColor: const AlwaysStoppedAnimation<Color>(AppTheme.primaryColor),
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

  Widget _buildApplicationsStatusCard(BuildContext context) {
    final total = _applicationsByStatus.fold<int>(0, (sum, item) => sum + ((item['count'] as num? ?? 0).toInt()));
    final colors = [
      AppTheme.primaryColor,
      AppTheme.brand400,
      AppTheme.brand300,
      AppTheme.brand700,
      AppTheme.primaryDark,
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
          Text(
            'Estado de mis Postulaciones',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: context.primaryText),
          ),
          const SizedBox(height: 14),
          if (_applicationsByStatus.isEmpty || total == 0)
            _buildEmptyChartState('Postúlate a vacantes para visualizar la distribución por etapa.')
          else
            Wrap(
              spacing: 10,
              runSpacing: 10,
              children: List.generate(_applicationsByStatus.length, (i) {
                final item = _applicationsByStatus[i];
                final status = item['status']?.toString() ?? '';
                final count = (item['count'] as num? ?? 0).toInt();
                final pct = total > 0 ? ((count / total) * 100).round() : 0;
                final color = colors[i % colors.length];

                return Container(
                  width: (MediaQuery.of(context).size.width - 78) / 2,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: context.mutedColor,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: context.borderColor),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(width: 8, height: 8, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              status,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: context.secondaryText),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            '$pct%',
                            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: context.primaryText),
                          ),
                          Text(
                            '($count)',
                            style: TextStyle(fontSize: 11.5, color: context.secondaryText),
                          ),
                        ],
                      ),
                    ],
                  ),
                );
              }),
            ),
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
