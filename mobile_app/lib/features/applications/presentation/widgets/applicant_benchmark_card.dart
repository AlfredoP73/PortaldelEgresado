import 'package:flutter/material.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/theme/app_theme.dart';

class ApplicantBenchmarkCard extends StatefulWidget {
  final int jobOfferId;
  final String? jobTitle;

  const ApplicantBenchmarkCard({
    super.key,
    required this.jobOfferId,
    this.jobTitle,
  });

  @override
  State<ApplicantBenchmarkCard> createState() => _ApplicantBenchmarkCardState();
}

class _ApplicantBenchmarkCardState extends State<ApplicantBenchmarkCard> {
  bool _loading = true;
  String? _error;
  Map<String, dynamic>? _data;
  String? _addingSkill;
  final Set<String> _addedSkills = {};

  @override
  void initState() {
    super.initState();
    _fetchBenchmark();
  }

  Future<void> _fetchBenchmark() async {
    if (widget.jobOfferId <= 0) {
      setState(() {
        _loading = false;
        _error = 'Vacante inválida para generar radiografía.';
      });
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final res = await ApiClient.instance.get(
        '/matching/benchmark/${widget.jobOfferId}',
        queryParameters: {'include_ai': true},
      );
      if (res.data is Map && mounted) {
        setState(() {
          _data = Map<String, dynamic>.from(res.data as Map);
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _loading = false;
          _error = 'No se pudo cargar la radiografía en vivo.';
        });
      }
    }
  }

  Future<void> _quickAddSkill(String skillName) async {
    setState(() => _addingSkill = skillName);
    try {
      await ApiClient.instance.post(
        '/modulo1/profile/skills/quick-add',
        data: {'skill_name': skillName, 'level': 'Intermedio'},
      );
      if (mounted) {
        setState(() => _addedSkills.add(skillName));
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              '¡Habilidad "$skillName" añadida a tu perfil! Actualizando radiografía...',
            ),
            backgroundColor: AppTheme.primaryColor,
          ),
        );
        await _fetchBenchmark();
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('No se pudo añadir la habilidad automáticamente.'),
            backgroundColor: AppTheme.statusRechazado,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _addingSkill = null);
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

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: context.surfaceColor,
          borderRadius: AppTheme.cardRadius,
          border: Border.all(color: context.borderColor),
          boxShadow: AppTheme.subtleShadow,
        ),
        child: Row(
          children: [
            const SizedBox(
              width: 22,
              height: 22,
              child: CircularProgressIndicator(
                strokeWidth: 2.5,
                color: AppTheme.primaryColor,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Calculando Radiografía de Competencia en Vivo...',
                    style: TextStyle(
                      fontSize: 13.5,
                      fontWeight: FontWeight.w800,
                      color: context.primaryText,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Comparando tu perfil de forma anónima frente a los demás postulantes de esta vacante.',
                    style: TextStyle(
                      fontSize: 11.5,
                      color: context.secondaryText,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    }

    if (_error != null || _data == null) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: context.surfaceColor,
          borderRadius: AppTheme.cardRadius,
          border: Border.all(color: context.borderColor),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Expanded(
              child: Text(
                _error ?? 'Sin datos de benchmarking disponibles.',
                style: TextStyle(fontSize: 12.5, color: context.secondaryText),
              ),
            ),
            TextButton.icon(
              onPressed: _fetchBenchmark,
              icon: const Icon(Icons.refresh_rounded, size: 16),
              label: const Text('Reintentar'),
            ),
          ],
        ),
      );
    }

    final d = _data!;
    final myRank = _toInt(d['my_rank'], 1);
    final totalApplicants = _toInt(d['total_applicants'], 1);
    final percentile = _toInt(d['percentile'], 50);
    final competitiveness = d['competitiveness']?.toString() ?? 'Competitivo';
    final myScore = _toDouble(d['my_score'], 0);
    final avgScore = _toDouble(d['avg_score'], 0);
    final topScore = _toDouble(d['top_score'], 0);

    // Parse breakdown (List of {key, label, mine, avg, top} or Map criteria_comparison)
    final Map<String, Map<String, dynamic>> criteria = {};
    if (d['breakdown'] is List) {
      for (final item in (d['breakdown'] as List)) {
        if (item is Map) {
          final k = (item['key'] ?? '').toString();
          if (k.isNotEmpty) {
            criteria[k] = Map<String, dynamic>.from(item);
          }
        }
      }
    } else if (d['criteria_comparison'] is Map) {
      final cc = d['criteria_comparison'] as Map;
      for (final entry in cc.entries) {
        if (entry.value is Map) {
          criteria[entry.key.toString()] = Map<String, dynamic>.from(
            entry.value as Map,
          );
        }
      }
    }

    // Parse my_gaps (List of Map {skill, required_level} or String)
    final List<String> gaps = [];
    for (final g in (d['my_gaps'] as List? ?? [])) {
      if (g is Map) {
        final sName = (g['skill'] ?? g['name'] ?? '').toString();
        if (sName.isNotEmpty) gaps.add(sName);
      } else if (g != null) {
        gaps.add(g.toString());
      }
    }

    final strengths =
        (d['strengths'] as List? ?? []).map((e) => e.toString()).toList();
    final levers = (d['improvement_levers'] as List? ?? [])
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .toList();

    // Parse ai_tips (Map {summary, tips: [...]} or List)
    final List<String> aiTips = [];
    String aiSummaryText = '';
    if (d['ai_tips'] is Map) {
      final at = d['ai_tips'] as Map;
      aiSummaryText = (at['summary'] ?? '').toString();
      for (final t in (at['tips'] as List? ?? [])) {
        aiTips.add(t.toString());
      }
    } else if (d['ai_tips'] is List) {
      for (final t in (d['ai_tips'] as List)) {
        aiTips.add(t.toString());
      }
    }

    // Parse stage_distribution (List of {status, count} or Map)
    final Map<String, int> stageDist = {};
    if (d['stage_distribution'] is List) {
      for (final st in (d['stage_distribution'] as List)) {
        if (st is Map) {
          final k = (st['status'] ?? 'POSTULADO').toString();
          stageDist[k] = _toInt(st['count'], 0);
        }
      }
    } else if (d['stage_distribution'] is Map) {
      final sd = d['stage_distribution'] as Map;
      for (final entry in sd.entries) {
        stageDist[entry.key.toString()] = _toInt(entry.value, 0);
      }
    }

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: context.surfaceColor,
        borderRadius: AppTheme.cardRadius,
        border: Border.all(
          color: AppTheme.brand300.withValues(alpha: 0.65),
          width: 1.2,
        ),
        boxShadow: AppTheme.subtleShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Header ──
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  gradient: AppTheme.primaryGradient,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(
                  Icons.radar_rounded,
                  color: Colors.white,
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 7,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: AppTheme.brand50,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: const Text(
                            'EN VIVO · ANÓNIMO',
                            style: TextStyle(
                              fontSize: 9.5,
                              fontWeight: FontWeight.w900,
                              color: AppTheme.primaryColor,
                              letterSpacing: 0.7,
                            ),
                          ),
                        ),
                        const SizedBox(width: 6),
                        Flexible(
                          child: Text(
                            competitiveness,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w800,
                              color: AppTheme.brand500,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Radiografía de Competencia en Vivo',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w900,
                        color: context.primaryText,
                        letterSpacing: -0.3,
                      ),
                    ),
                    Text(
                      'Tu posición real frente a los demás candidatos postulados a esta oferta',
                      style: TextStyle(
                        fontSize: 11.5,
                        color: context.secondaryText,
                      ),
                    ),
                  ],
                ),
              ),
              IconButton(
                onPressed: _fetchBenchmark,
                icon: const Icon(Icons.refresh_rounded, size: 18),
                tooltip: 'Recalcular radiografía',
              ),
            ],
          ),
          const SizedBox(height: 16),

          // ── 3 Top KPIs: Posición, Percentil, Mi Score vs Top ──
          Row(
            children: [
              Expanded(
                child: _buildMetricTile(
                  context,
                  label: 'TU POSICIÓN',
                  value: '#$myRank de $totalApplicants',
                  sub: 'Candidatos en la vacante',
                  highlight: true,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _buildMetricTile(
                  context,
                  label: 'PERCENTIL',
                  value:
                      'Top ${100 - percentile <= 0 ? 1 : (100 - percentile)}%',
                  sub: 'Superas al $percentile%',
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _buildMetricTile(
                  context,
                  label: 'TU PUNTAJE',
                  value: '${myScore.round()}%',
                  sub:
                      'Media ${avgScore.round()}% · Líder ${topScore.round()}%',
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // ── Desglose por Criterio (Tu perfil vs Media del Pool vs Top) ──
          Text(
            'COMPARATIVA POR CRITERIO FRENTE AL POOL',
            style: TextStyle(
              fontSize: 10.5,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.7,
              color: context.secondaryText,
            ),
          ),
          const SizedBox(height: 10),
          _buildCriterionRow(
            context,
            label: 'Habilidades Técnicas (50%)',
            data: criteria['skills'] ?? {},
          ),
          const SizedBox(height: 8),
          _buildCriterionRow(
            context,
            label: 'Experiencia Relevante (30%)',
            data: criteria['experience'] ?? {},
          ),
          const SizedBox(height: 8),
          _buildCriterionRow(
            context,
            label: 'Afinidad de Programa UPC (20%)',
            data: criteria['program'] ?? {},
          ),

          // ── Distribución Anónima del Embudo ──
          if (stageDist.isNotEmpty) ...[
            const SizedBox(height: 16),
            Text(
              'DISTRIBUCIÓN ANÓNIMA DEL EMBUDO ACTUAL',
              style: TextStyle(
                fontSize: 10.5,
                fontWeight: FontWeight.w800,
                letterSpacing: 0.7,
                color: context.secondaryText,
              ),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: stageDist.entries.map((entry) {
                return Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 9,
                    vertical: 5,
                  ),
                  decoration: BoxDecoration(
                    color: context.mutedColor,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: context.borderColor),
                  ),
                  child: Text(
                    '${entry.key}: ${entry.value}',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: context.primaryText,
                    ),
                  ),
                );
              }).toList(),
            ),
          ],

          // ── Brechas de Habilidades con botón 1-Tap ──
          if (gaps.isNotEmpty) ...[
            const SizedBox(height: 16),
            Text(
              'HABILIDADES QUE TIENEN LOS LÍDERES Y TE FALTAN',
              style: TextStyle(
                fontSize: 10.5,
                fontWeight: FontWeight.w800,
                letterSpacing: 0.7,
                color: context.secondaryText,
              ),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: gaps.map((skill) {
                final isAdded = _addedSkills.contains(skill);
                final isBusy = _addingSkill == skill;
                return InkWell(
                  borderRadius: BorderRadius.circular(10),
                  onTap: (isAdded || isBusy)
                      ? null
                      : () => _quickAddSkill(skill),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: isAdded
                          ? const Color(0xFFDCFCE7)
                          : const Color(0xFFFEF3C7),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                        color: isAdded
                            ? const Color(0xFF86EFAC)
                            : const Color(0xFFFDE68A),
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (isBusy)
                          const SizedBox(
                            width: 12,
                            height: 12,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Color(0xFFB45309),
                            ),
                          )
                        else
                          Icon(
                            isAdded
                                ? Icons.check_circle_rounded
                                : Icons.add_circle_outline_rounded,
                            size: 14,
                            color: isAdded
                                ? const Color(0xFF15803D)
                                : const Color(0xFFB45309),
                          ),
                        const SizedBox(width: 5),
                        Text(
                          isAdded ? '$skill (Añadida)' : '$skill · + Añadir',
                          style: TextStyle(
                            fontSize: 11.5,
                            fontWeight: FontWeight.w800,
                            color: isAdded
                                ? const Color(0xFF15803D)
                                : const Color(0xFF92400E),
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              }).toList(),
            ),
          ],

          // ── Palancas de Mejora ──
          if (levers.isNotEmpty) ...[
            const SizedBox(height: 16),
            Text(
              'SIMULADOR DE IMPACTO SI MEJORAS TU PERFIL HOY',
              style: TextStyle(
                fontSize: 10.5,
                fontWeight: FontWeight.w800,
                letterSpacing: 0.7,
                color: context.secondaryText,
              ),
            ),
            const SizedBox(height: 8),
            ...levers.take(3).map((lv) {
              final action =
                  (lv['title'] ?? lv['action'] ?? 'Mejorar competencia')
                      .toString();
              final gain = _toDouble(
                lv['estimated_gain'] ?? lv['estimated_score_gain'],
                5,
              );
              return Container(
                margin: const EdgeInsets.only(bottom: 6),
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 8,
                ),
                decoration: BoxDecoration(
                  color: AppTheme.brand50.withValues(
                    alpha: context.isDark ? 0.14 : 0.7,
                  ),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppTheme.brand200),
                ),
                child: Row(
                  children: [
                    const Icon(
                      Icons.trending_up_rounded,
                      size: 16,
                      color: AppTheme.primaryColor,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        action,
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: context.primaryText,
                        ),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 7,
                        vertical: 2,
                      ),
                      decoration: BoxDecoration(
                        color: AppTheme.primaryColor,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        '+${gain.round()} pts',
                        style: const TextStyle(
                          fontSize: 10.5,
                          fontWeight: FontWeight.w800,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ],
                ),
              );
            }),
          ],

          // ── Consejos tácticos de Groq AI ──
          if (aiTips.isNotEmpty || strengths.isNotEmpty) ...[
            const SizedBox(height: 16),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    AppTheme.primaryDark.withValues(alpha: 0.95),
                    AppTheme.primaryColor.withValues(alpha: 0.90),
                  ],
                ),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(
                        Icons.auto_awesome_rounded,
                        color: Color(0xFF7CDAAC),
                        size: 16,
                      ),
                      SizedBox(width: 6),
                      Text(
                        'RECOMENDACIONES TÁCTICAS DE IA (GROQ)',
                        style: TextStyle(
                          fontSize: 10.5,
                          fontWeight: FontWeight.w900,
                          color: Color(0xFF7CDAAC),
                          letterSpacing: 0.7,
                        ),
                      ),
                    ],
                  ),
                  if (aiSummaryText.isNotEmpty) ...[
                    const SizedBox(height: 6),
                    Text(
                      aiSummaryText,
                      style: TextStyle(
                        fontSize: 11.5,
                        color: Colors.white.withValues(alpha: 0.92),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                  const SizedBox(height: 8),
                  ...(aiTips.isNotEmpty ? aiTips : strengths).take(3).map(
                    (tip) => Padding(
                      padding: const EdgeInsets.only(bottom: 5),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            '• ',
                            style: TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          Expanded(
                            child: Text(
                              tip,
                              style: const TextStyle(
                                fontSize: 12,
                                color: Colors.white,
                                height: 1.35,
                              ),
                            ),
                          ),
                        ],
                      ),
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

  Widget _buildMetricTile(
    BuildContext context, {
    required String label,
    required String value,
    required String sub,
    bool highlight = false,
  }) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: highlight
            ? AppTheme.brand50.withValues(alpha: context.isDark ? 0.16 : 0.85)
            : context.mutedColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: highlight ? AppTheme.brand300 : context.borderColor,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: 9.5,
              fontWeight: FontWeight.w800,
              color: highlight ? AppTheme.primaryColor : context.secondaryText,
              letterSpacing: 0.5,
            ),
          ),
          const SizedBox(height: 4),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(
              value,
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w900,
                color: highlight ? AppTheme.primaryColor : context.primaryText,
              ),
            ),
          ),
          const SizedBox(height: 2),
          Text(
            sub,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(fontSize: 9.5, color: context.secondaryText),
          ),
        ],
      ),
    );
  }

  Widget _buildCriterionRow(
    BuildContext context, {
    required String label,
    required Map<String, dynamic> data,
  }) {
    final mine = _toDouble(data['mine'], 0);
    final avg = _toDouble(data['avg'], 0);
    final top = _toDouble(data['top'], 0);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Expanded(
              child: Text(
                label,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: context.primaryText,
                ),
              ),
            ),
            Text(
              'Tú: ${mine.round()}%  |  Media: ${avg.round()}%  |  Top: ${top.round()}%',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                color: context.secondaryText,
              ),
            ),
          ],
        ),
        const SizedBox(height: 4),
        ClipRRect(
          borderRadius: BorderRadius.circular(999),
          child: LinearProgressIndicator(
            value: (mine / 100).clamp(0.0, 1.0),
            minHeight: 7,
            backgroundColor: context.mutedColor,
            valueColor: AlwaysStoppedAnimation<Color>(
              mine >= avg ? AppTheme.primaryColor : AppTheme.accentAmber,
            ),
          ),
        ),
      ],
    );
  }
}
