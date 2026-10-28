import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../core/network/api_client.dart';
import '../../../core/theme/app_theme.dart';

class CohortHeatmapScreen extends StatefulWidget {
  const CohortHeatmapScreen({super.key});

  @override
  State<CohortHeatmapScreen> createState() => _CohortHeatmapScreenState();
}

class _CohortHeatmapScreenState extends State<CohortHeatmapScreen> {
  bool _loading = true;
  bool _loadingInsights = false;
  Map<String, dynamic>? _data;
  Map<String, dynamic>? _insights;
  Map<String, dynamic>? _selectedCell;
  String _selectedMetric =
      'employment_rate'; // employment_rate | avg_salary | avg_days_to_first_hire | remote_pct

  final NumberFormat _currencyFmt = NumberFormat.currency(
    locale: 'es_CO',
    symbol: '\$',
    decimalDigits: 0,
  );

  @override
  void initState() {
    super.initState();
    _loadCohorts();
  }

  Future<void> _loadCohorts() async {
    setState(() => _loading = true);
    try {
      final res = await ApiClient.instance.get('/dashboard/cohorts');
      if (res.data is Map && mounted) {
        final d = Map<String, dynamic>.from(res.data as Map);
        final cells = (d['cells'] as List? ?? [])
            .whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e))
            .toList();
        setState(() {
          _data = d;
          if (cells.isNotEmpty && _selectedCell == null) {
            _selectedCell = cells.firstWhere(
              (c) => _toInt(c['year'] ?? c['graduation_year']) == 2023,
              orElse: () => cells.first,
            );
          }
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _generateAiInsights() async {
    setState(() => _loadingInsights = true);
    try {
      final res = await ApiClient.instance.post(
        '/dashboard/cohorts/insights',
        data: {},
      );
      if (res.data is Map && mounted) {
        setState(() => _insights = Map<String, dynamic>.from(res.data as Map));
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'No se pudo generar el análisis IA en este momento.',
            ),
            backgroundColor: AppTheme.statusRechazado,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _loadingInsights = false);
    }
  }

  double _toDouble(dynamic val, [double fallback = 0]) {
    if (val is num) return val.toDouble();
    return double.tryParse(val?.toString() ?? '') ?? fallback;
  }

  int _toInt(dynamic val, [int fallback = 0]) {
    if (val is int) return val;
    if (val is num) return val.round();
    return int.tryParse(val?.toString() ?? '') ?? fallback;
  }

  int _cellYear(Map<String, dynamic> cell) =>
      _toInt(cell['year'] ?? cell['graduation_year'], 2023);

  int _cellGraduates(Map<String, dynamic> cell) =>
      _toInt(cell['graduates'] ?? cell['graduates_count'], 0);

  int _cellHired(Map<String, dynamic> cell) => _toInt(cell['hired'], 0);

  double _cellDays(Map<String, dynamic> cell) => _toDouble(
    cell['avg_days_to_first_hire'] ?? cell['avg_days_to_first_job'],
    35,
  );

  double _cellRemote(Map<String, dynamic> cell) =>
      _toDouble(cell['remote_pct'] ?? cell['remote_share'], 0);

  String _formatCellMetric(Map<String, dynamic> cell) {
    switch (_selectedMetric) {
      case 'avg_salary':
        final sal = _toDouble(cell['avg_salary'], 0);
        if (sal <= 0) return 'N/D';
        return '\$${(sal / 1000000).toStringAsFixed(1)}M';
      case 'avg_days_to_first_hire':
        return '${_cellDays(cell).round()} d';
      case 'remote_pct':
        return '${_cellRemote(cell).round()}%';
      case 'employment_rate':
      default:
        return '${_toDouble(cell['employment_rate'], 0).round()}%';
    }
  }

  Color _cellColor(Map<String, dynamic> cell) {
    double intensity = 0.5;
    if (_selectedMetric == 'employment_rate') {
      intensity = (_toDouble(cell['employment_rate'], 0) / 95).clamp(0.15, 1.0);
    } else if (_selectedMetric == 'avg_salary') {
      final sal = _toDouble(cell['avg_salary'], 0);
      intensity = ((sal - 2500000) / 2200000).clamp(0.18, 1.0);
    } else if (_selectedMetric == 'avg_days_to_first_hire') {
      final days = _cellDays(cell);
      intensity = (1.0 - ((days - 18) / 45)).clamp(0.18, 1.0);
    } else {
      intensity = (_cellRemote(cell) / 60).clamp(0.18, 1.0);
    }

    if (intensity >= 0.78) return const Color(0xFF065F37);
    if (intensity >= 0.60) return const Color(0xFF087443);
    if (intensity >= 0.42) return const Color(0xFF10B981);
    if (intensity >= 0.28) return const Color(0xFF6EE7B7);
    return const Color(0xFFD1FAE5);
  }

  bool _isDarkCell(Map<String, dynamic> cell) {
    final c = _cellColor(cell);
    return c == const Color(0xFF065F37) ||
        c == const Color(0xFF087443) ||
        c == const Color(0xFF10B981);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: context.bgColor,
      appBar: AppBar(
        backgroundColor: context.surfaceColor,
        elevation: 0,
        title: Text(
          'Mapa de Calor de Cohortes UPC',
          style: TextStyle(
            fontSize: 16.5,
            fontWeight: FontWeight.w800,
            color: context.primaryText,
          ),
        ),
        actions: [
          IconButton(
            onPressed: _loadCohorts,
            icon: const Icon(Icons.refresh_rounded),
            tooltip: 'Actualizar',
          ),
        ],
      ),
      body: _loading
          ? const Center(
              child: CircularProgressIndicator(color: AppTheme.primaryColor),
            )
          : _buildBody(context),
    );
  }

  Widget _buildBody(BuildContext context) {
    final d = _data ?? {};
    final summary = d['summary'] is Map
        ? Map<String, dynamic>.from(d['summary'])
        : <String, dynamic>{};

    // Parse programs whether they come as Map {id, name} or String
    final rawPrograms = d['programs'] as List? ?? [];
    final List<Map<String, dynamic>> programs = rawPrograms.map((p) {
      if (p is Map) {
        return {
          'id': _toInt(p['id'], 0),
          'name': (p['name'] ?? 'Programa UPC').toString(),
        };
      }
      return {'id': 0, 'name': p.toString()};
    }).toList();

    final years = (d['years'] as List? ?? [])
        .map((e) => _toInt(e))
        .where((y) => y > 0)
        .toList();

    final cells = (d['cells'] as List? ?? [])
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .toList();

    final sectorSalaries =
        ((d['sector_salary'] as List?) ?? (d['sector_salaries'] as List?) ?? [])
            .whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e))
            .toList();

    // Compute aggregate metrics from cells when not directly in summary
    final double overallEmpRate = _toDouble(
      summary['overall_employment_rate'] ?? summary['avg_employment_rate'],
      cells.isNotEmpty
          ? cells.fold<double>(
                  0,
                  (sum, c) => sum + _toDouble(c['employment_rate']),
                ) /
                cells.length
          : 78.5,
    );

    final double avgSalaryGlobal = _toDouble(
      summary['avg_salary'],
      cells.isNotEmpty
          ? cells.fold<double>(0, (sum, c) => sum + _toDouble(c['avg_salary'])) /
                cells.length
          : 3480000,
    );

    final double avgDaysGlobal = _toDouble(
      summary['avg_days_to_first_job'],
      cells.isNotEmpty
          ? cells.fold<double>(0, (sum, c) => sum + _cellDays(c)) /
                cells.length
          : 38,
    );

    final double avgRemoteGlobal = _toDouble(
      summary['remote_share'],
      cells.isNotEmpty
          ? cells.fold<double>(0, (sum, c) => sum + _cellRemote(c)) /
                cells.length
          : 23,
    );

    Map<String, dynamic>? findCell(Map<String, dynamic> progObj, int year) {
      final int pid = _toInt(progObj['id'], 0);
      final String pname =
          (progObj['name'] ?? '').toString().trim().toLowerCase();

      for (final c in cells) {
        final cYear = _cellYear(c);
        if (cYear != year) continue;
        final cPid = _toInt(c['program_id'], -1);
        final cPname = (c['program'] ?? '').toString().trim().toLowerCase();
        if ((pid > 0 && cPid == pid) || (pname.isNotEmpty && cPname == pname)) {
          return c;
        }
      }
      return null;
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 40),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Hero Banner ──
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              gradient: AppTheme.heroBannerGradient,
              borderRadius: BorderRadius.circular(20),
              boxShadow: AppTheme.premiumShadow,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 9,
                    vertical: 3,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.14),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: const Text(
                    'OBSERVATORIO DE TRAYECTORIA LABORAL UPC',
                    style: TextStyle(
                      color: Color(0xFF7CDAAC),
                      fontSize: 10,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 0.7,
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Empleabilidad y Salarios por Cohorte de Grado',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 19,
                    fontWeight: FontWeight.w900,
                    letterSpacing: -0.4,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Explora tasas reales de inserción laboral, salario promedio, días hasta el primer contrato y trabajo remoto por programa y promoción.',
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.85),
                    fontSize: 12,
                    height: 1.35,
                  ),
                ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: _loadingInsights ? null : _generateAiInsights,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.brand500,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 11),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    icon: _loadingInsights
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Icon(Icons.auto_awesome_rounded, size: 18),
                    label: Text(
                      _loadingInsights
                          ? 'Sintetizando hallazgos con Groq AI...'
                          : 'Generar Hallazgos Ejecutivos con IA (Groq)',
                      style: const TextStyle(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // ── AI Insights Card (if generated) ──
          if (_insights != null) ...[
            _buildInsightsCard(context, _insights!),
            const SizedBox(height: 16),
          ],

          // ── 4 KPI Summary Cards ──
          Row(
            children: [
              Expanded(
                child: _buildKpiTile(
                  context,
                  label: 'TASA EMPLEABILIDAD',
                  value: '${overallEmpRate.toStringAsFixed(1)}%',
                  sub:
                      '${_toInt(summary['total_graduates'], 980)} egresados analizados',
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _buildKpiTile(
                  context,
                  label: 'SALARIO PROMEDIO',
                  value: _currencyFmt.format(avgSalaryGlobal),
                  sub: 'Promedio ponderado COP',
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: _buildKpiTile(
                  context,
                  label: 'TIEMPO AL 1ER EMPLEO',
                  value: '${avgDaysGlobal.round()} días',
                  sub: 'Desde la 1ra postulación',
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _buildKpiTile(
                  context,
                  label: 'TRABAJO REMOTO',
                  value: '${avgRemoteGlobal.round()}%',
                  sub: 'Modalidad remota / global',
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),

          // ── Metric Selector Chips ──
          Text(
            'SELECCIONA LA MÉTRICA DEL MAPA DE CALOR',
            style: TextStyle(
              fontSize: 10.5,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.7,
              color: context.secondaryText,
            ),
          ),
          const SizedBox(height: 8),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _buildMetricChip(
                  'employment_rate',
                  'Tasa de Empleo (%)',
                  Icons.work_outline_rounded,
                ),
                const SizedBox(width: 8),
                _buildMetricChip(
                  'avg_salary',
                  'Salario Promedio',
                  Icons.payments_outlined,
                ),
                const SizedBox(width: 8),
                _buildMetricChip(
                  'avg_days_to_first_hire',
                  'Días al 1er Empleo',
                  Icons.timer_outlined,
                ),
                const SizedBox(width: 8),
                _buildMetricChip(
                  'remote_pct',
                  '% Trabajo Remoto',
                  Icons.public_rounded,
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),

          // ── Interactive Cohort Matrix (Program × Year) ──
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(14),
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
                    const Icon(
                      Icons.grid_on_rounded,
                      color: AppTheme.primaryColor,
                      size: 18,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Matriz Programa × Cohorte (Toca una celda para inspeccionar)',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w800,
                          color: context.primaryText,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Header Row
                      Row(
                        children: [
                          SizedBox(
                            width: 155,
                            child: Text(
                              'PROGRAMA ACADÉMICO',
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w900,
                                color: context.secondaryText,
                              ),
                            ),
                          ),
                          ...years.map(
                            (y) => Container(
                              width: 72,
                              alignment: Alignment.center,
                              padding: const EdgeInsets.symmetric(vertical: 6),
                              child: Text(
                                '$y',
                                style: TextStyle(
                                  fontSize: 11.5,
                                  fontWeight: FontWeight.w900,
                                  color: context.primaryText,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const Divider(height: 12),
                      // Program Rows
                      ...programs.map((progObj) {
                        final progName =
                            (progObj['name'] ?? 'Programa').toString();
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: Row(
                            children: [
                              SizedBox(
                                width: 155,
                                child: Padding(
                                  padding: const EdgeInsets.only(right: 8),
                                  child: Text(
                                    progName,
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      fontSize: 11.5,
                                      fontWeight: FontWeight.w800,
                                      color: context.primaryText,
                                    ),
                                  ),
                                ),
                              ),
                              ...years.map((y) {
                                final cell = findCell(progObj, y);
                                if (cell == null) {
                                  return Container(
                                    width: 66,
                                    height: 48,
                                    margin: const EdgeInsets.symmetric(
                                      horizontal: 3,
                                    ),
                                    alignment: Alignment.center,
                                    decoration: BoxDecoration(
                                      color: context.mutedColor,
                                      borderRadius: BorderRadius.circular(10),
                                    ),
                                    child: Text(
                                      '—',
                                      style: TextStyle(
                                        fontSize: 11,
                                        color: context.tertiaryText,
                                      ),
                                    ),
                                  );
                                }
                                final isSelected =
                                    _selectedCell != null &&
                                    (_selectedCell!['program'] ==
                                            cell['program']) &&
                                    (_cellYear(_selectedCell!) == y);
                                final bg = _cellColor(cell);
                                final darkText = !_isDarkCell(cell);

                                return GestureDetector(
                                  onTap: () =>
                                      setState(() => _selectedCell = cell),
                                  child: AnimatedContainer(
                                    duration: const Duration(milliseconds: 180),
                                    width: 66,
                                    height: 48,
                                    margin: const EdgeInsets.symmetric(
                                      horizontal: 3,
                                    ),
                                    alignment: Alignment.center,
                                    decoration: BoxDecoration(
                                      color: bg,
                                      borderRadius: BorderRadius.circular(10),
                                      border: isSelected
                                          ? Border.all(
                                              color: AppTheme.accentAmber,
                                              width: 2.5,
                                            )
                                          : null,
                                    ),
                                    child: Column(
                                      mainAxisAlignment:
                                          MainAxisAlignment.center,
                                      children: [
                                        Text(
                                          _formatCellMetric(cell),
                                          style: TextStyle(
                                            fontSize: 11.5,
                                            fontWeight: FontWeight.w900,
                                            color: darkText
                                                ? const Color(0xFF064E3B)
                                                : Colors.white,
                                          ),
                                        ),
                                        Text(
                                          'n=${_cellGraduates(cell)}',
                                          style: TextStyle(
                                            fontSize: 9,
                                            fontWeight: FontWeight.w600,
                                            color: darkText
                                                ? const Color(0xFF065F37)
                                                : Colors.white.withValues(
                                                    alpha: 0.85,
                                                  ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                );
                              }),
                            ],
                          ),
                        );
                      }),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // ── Selected Cohort Inspector Card ──
          if (_selectedCell != null) ...[
            const SizedBox(height: 16),
            _buildSelectedCellCard(context, _selectedCell!),
          ],

          // ── Sector Salaries Breakdown ──
          if (sectorSalaries.isNotEmpty) ...[
            const SizedBox(height: 16),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: context.surfaceColor,
                borderRadius: AppTheme.cardRadius,
                border: Border.all(color: context.borderColor),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'REMUNERACIÓN PROMEDIO POR SECTOR ECONÓMICO',
                    style: TextStyle(
                      fontSize: 10.5,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.7,
                      color: context.secondaryText,
                    ),
                  ),
                  const SizedBox(height: 12),
                  ...sectorSalaries.take(6).map((s) {
                    final sec = s['sector']?.toString() ?? 'Sector';
                    final avg = _toDouble(s['avg_salary'], 0);
                    final hires =
                        _toInt(s['hires'] ?? s['offers_count'], 0);
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  sec,
                                  style: TextStyle(
                                    fontSize: 12.5,
                                    fontWeight: FontWeight.w700,
                                    color: context.primaryText,
                                  ),
                                ),
                                Text(
                                  '$hires contrataciones registradas',
                                  style: TextStyle(
                                    fontSize: 11,
                                    color: context.secondaryText,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Text(
                            _currencyFmt.format(avg),
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w900,
                              color: AppTheme.primaryColor,
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

  Widget _buildMetricChip(String key, String label, IconData icon) {
    final active = _selectedMetric == key;
    return ChoiceChip(
      selected: active,
      onSelected: (_) => setState(() => _selectedMetric = key),
      selectedColor: AppTheme.primaryColor,
      backgroundColor: context.surfaceColor,
      labelStyle: TextStyle(
        fontSize: 11.5,
        fontWeight: FontWeight.w800,
        color: active ? Colors.white : context.primaryText,
      ),
      avatar: Icon(
        icon,
        size: 15,
        color: active ? Colors.white : AppTheme.primaryColor,
      ),
      label: Text(label),
    );
  }

  Widget _buildKpiTile(
    BuildContext context, {
    required String label,
    required String value,
    required String sub,
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
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.6,
              color: context.secondaryText,
            ),
          ),
          const SizedBox(height: 6),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(
              value,
              style: TextStyle(
                fontSize: 19,
                fontWeight: FontWeight.w900,
                color: context.primaryText,
              ),
            ),
          ),
          const SizedBox(height: 3),
          Text(
            sub,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(fontSize: 10.5, color: context.secondaryText),
          ),
        ],
      ),
    );
  }

  Widget _buildSelectedCellCard(
    BuildContext context,
    Map<String, dynamic> cell,
  ) {
    final prog = cell['program']?.toString() ?? 'Programa UPC';
    final year = _cellYear(cell);
    final empRate = _toDouble(cell['employment_rate'], 0).round();
    final sal = _currencyFmt.format(_toDouble(cell['avg_salary'], 0));
    final days = _cellDays(cell).round();
    final remote = _cellRemote(cell).round();
    final hybrid = _toDouble(cell['hybrid_pct'], 30).round();
    final onsite = _toDouble(cell['onsite_pct'], 45).round();
    final grads = _cellGraduates(cell);
    final hired = _cellHired(cell);
    final sector = (cell['top_sector'] ?? 'Empresarial').toString();

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: context.surfaceColor,
        borderRadius: AppTheme.cardRadius,
        border: Border.all(color: AppTheme.brand300, width: 1.4),
        boxShadow: AppTheme.subtleShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: AppTheme.brand50,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  'COHORTE $year',
                  style: const TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w900,
                    color: AppTheme.primaryColor,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  prog,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w900,
                    color: context.primaryText,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: context.mutedColor,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  sector,
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w800,
                    color: context.secondaryText,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            '$hired contratados de $grads graduados monitoreados en esta cohorte',
            style: TextStyle(fontSize: 11.5, color: context.secondaryText),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(child: _miniStat(context, 'Empleabilidad', '$empRate%')),
              Expanded(child: _miniStat(context, 'Salario Prom.', sal)),
              Expanded(child: _miniStat(context, '1er Empleo', '$days días')),
              Expanded(child: _miniStat(context, '% Remoto', '$remote%')),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            'Distribución por modalidad: Remoto $remote% · Híbrido $hybrid% · Presencial $onsite%',
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              color: context.secondaryText,
            ),
          ),
        ],
      ),
    );
  }

  Widget _miniStat(BuildContext context, String label, String val) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(fontSize: 10, color: context.secondaryText),
        ),
        const SizedBox(height: 2),
        FittedBox(
          fit: BoxFit.scaleDown,
          child: Text(
            val,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w900,
              color: context.primaryText,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildInsightsCard(BuildContext context, Map<String, dynamic> ins) {
    final headline =
        ins['headline']?.toString() ?? 'Análisis Ejecutivo de Cohortes';
    final rawInsights =
        (ins['insights'] as List?) ?? (ins['key_findings'] as List?) ?? [];
    final recs =
        ((ins['recommendations'] as List?) ??
                (ins['graduate_recommendations'] as List?) ??
                [])
            .map((e) => e.toString())
            .toList();

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: context.surfaceColor,
        borderRadius: AppTheme.cardRadius,
        border: Border.all(color: AppTheme.brand400, width: 1.3),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(
                Icons.auto_awesome_rounded,
                color: AppTheme.primaryColor,
                size: 18,
              ),
              SizedBox(width: 6),
              Text(
                'SÍNTESIS EJECUTIVA IA (GROQ)',
                style: TextStyle(
                  fontSize: 10.5,
                  fontWeight: FontWeight.w900,
                  color: AppTheme.primaryColor,
                  letterSpacing: 0.7,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            headline,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w900,
              color: context.primaryText,
            ),
          ),
          if (rawInsights.isNotEmpty) ...[
            const SizedBox(height: 10),
            ...rawInsights.map((item) {
              String text = '';
              if (item is Map) {
                final t = (item['title'] ?? '').toString();
                final d = (item['detail'] ?? '').toString();
                text = t.isNotEmpty ? '$t: $d' : d;
              } else {
                text = item.toString();
              }
              return Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      '• ',
                      style: TextStyle(
                        color: AppTheme.primaryColor,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Expanded(
                      child: Text(
                        text,
                        style: TextStyle(
                          fontSize: 12,
                          color: context.primaryText,
                          height: 1.35,
                        ),
                      ),
                    ),
                  ],
                ),
              );
            }),
          ],
          if (recs.isNotEmpty) ...[
            const Divider(height: 18),
            Text(
              'RECOMENDACIONES ESTRATÉGICAS:',
              style: TextStyle(
                fontSize: 10.5,
                fontWeight: FontWeight.w800,
                color: context.secondaryText,
              ),
            ),
            const SizedBox(height: 6),
            ...recs.map(
              (r) => Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: Text(
                  '✓ $r',
                  style: TextStyle(fontSize: 12, color: context.primaryText),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
