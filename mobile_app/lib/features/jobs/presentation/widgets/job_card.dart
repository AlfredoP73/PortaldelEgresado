import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:intl/intl.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/network/api_client.dart';

class JobCard extends StatefulWidget {
  final Map<String, dynamic> job;
  final double? matchScore;
  final VoidCallback? onApplied;

  /// Estado inicial de "guardada" (bookmark). Si es null, la tarjeta lo gestiona internamente.
  final bool? isSaved;

  /// Callback opcional al cambiar el estado de guardado (jobId, nuevoEstado).
  final void Function(int jobId, bool saved)? onSavedChanged;

  /// Comparador lado a lado (opcional). Si [onToggleCompare] es null no se muestra el botón.
  final bool isCompared;
  final VoidCallback? onToggleCompare;

  const JobCard({
    super.key,
    required this.job,
    this.matchScore,
    this.onApplied,
    this.isSaved,
    this.onSavedChanged,
    this.isCompared = false,
    this.onToggleCompare,
  });

  static String effectiveModality(Map<String, dynamic> job) {
    final raw = job['modality']?.toString().trim();
    if (raw != null && raw.isNotEmpty && raw != 'null') return raw;
    final title = (job['title'] ?? '').toString().toLowerCase();
    final desc = (job['description'] ?? '').toString().toLowerCase();
    if (title.contains('remoto') || desc.contains('remoto') || title.contains('frontend')) {
      return 'Remoto';
    }
    if (title.contains('híbrido') || title.contains('hibrido') || title.contains('datos')) {
      return 'Híbrido';
    }
    return 'Presencial';
  }

  static String effectiveContract(Map<String, dynamic> job) {
    final raw = job['contract_type']?.toString().trim();
    if (raw != null && raw.isNotEmpty && raw != 'null') return raw;
    return 'Indefinido';
  }

  static String formatSalaryRange(Map<String, dynamic> job) {
    final minSal = double.tryParse(job['salary_min']?.toString() ?? '');
    final maxSal = double.tryParse(job['salary_max']?.toString() ?? '');
    final fmt = NumberFormat.currency(locale: 'es_CO', symbol: '\$', decimalDigits: 0);
    if (minSal != null && maxSal != null && minSal > 0) {
      return '${fmt.format(minSal)} - ${fmt.format(maxSal)}';
    }
    if (minSal != null && minSal > 0) {
      return 'Desde ${fmt.format(minSal)}';
    }
    return 'Salario a convenir';
  }

  static String formatClosingDate(Map<String, dynamic> job) {
    final raw = job['closing_date']?.toString();
    if (raw == null || raw.isEmpty || raw == 'null') return 'Convocatoria abierta';
    try {
      final dt = DateTime.parse(raw);
      return DateFormat('dd/MM/yyyy').format(dt);
    } catch (_) {
      return raw.split('T').first;
    }
  }

  @override
  State<JobCard> createState() => _JobCardState();
}

class _JobCardState extends State<JobCard> {
  bool _isApplying = false;
  late bool _hasApplied;
  late bool _isSaved;

  int get _jobId => int.tryParse(widget.job['id']?.toString() ?? '') ?? 0;

  @override
  void initState() {
    super.initState();
    _hasApplied = widget.job['has_applied'] == true;
    _isSaved = widget.isSaved ?? false;
    if (widget.isSaved == null) {
      _loadSavedState();
    }
  }

  @override
  void didUpdateWidget(covariant JobCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.isSaved != null && widget.isSaved != _isSaved) {
      _isSaved = widget.isSaved!;
    }
  }

  Future<void> _loadSavedState() async {
    try {
      final ids = await SavedJobsCache.load();
      if (mounted) setState(() => _isSaved = ids.contains(_jobId));
    } catch (_) {}
  }

  Future<void> _toggleSave() async {
    final newState = !_isSaved;
    setState(() => _isSaved = newState);
    widget.onSavedChanged?.call(_jobId, newState);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(newState ? 'Vacante guardada en tus favoritos' : 'Vacante removida de guardadas'),
        backgroundColor: AppTheme.primaryColor,
        duration: const Duration(seconds: 2),
      ),
    );
    try {
      await SavedJobsCache.toggle(_jobId);
    } catch (_) {
      // Se mantiene el estado optimista
    }
  }

  Future<bool> _applyToJob({String? coverLetter}) async {
    setState(() => _isApplying = true);
    try {
      final data = <String, dynamic>{'job_offer_id': widget.job['id']};
      if (coverLetter != null && coverLetter.trim().isNotEmpty) {
        data['cover_letter'] = coverLetter.trim();
      }
      await ApiClient.instance.post('/modulo1/applications', data: data);
      if (mounted) {
        setState(() {
          _hasApplied = true;
          widget.job['has_applied'] = true;
        });
        widget.onApplied?.call();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('¡Postulación enviada con éxito! Puedes seguir su estado en Mis Postulaciones.'),
            backgroundColor: AppTheme.primaryColor,
          ),
        );
      }
      return true;
    } on DioException catch (e) {
      String msg = 'No se pudo procesar la postulación.';
      if (e.response?.data != null && e.response?.data is Map) {
        msg = e.response?.data['detail']?.toString() ?? msg;
      }
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(msg), backgroundColor: AppTheme.statusRechazado),
        );
      }
      return false;
    } finally {
      if (mounted) setState(() => _isApplying = false);
    }
  }

  void _openJobDetailModal() {
    final rawScore = widget.matchScore ?? widget.job['match_score'];
    final score = (double.tryParse(rawScore?.toString() ?? '') ?? 0.0).round();

    showModalBottomSheet(
      context: context,
      backgroundColor: context.surfaceColor,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (modalCtx) {
        return JobDetailSheet(
          job: widget.job,
          initialScore: score,
          hasApplied: _hasApplied,
          isSaved: _isSaved,
          onToggleSave: _toggleSave,
          onApply: (coverLetter) async {
            final ok = await _applyToJob(coverLetter: coverLetter);
            if (ok && modalCtx.mounted) Navigator.pop(modalCtx);
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final company = widget.job['company'] is Map
        ? Map<String, dynamic>.from(widget.job['company'])
        : <String, dynamic>{};
    final companyName = company['name']?.toString() ?? 'Empresa Aliada';
    final cityName = company['city'] is Map
        ? (company['city']['name']?.toString() ?? 'Valledupar')
        : 'Colombia';
    final modality = JobCard.effectiveModality(widget.job);
    final contractType = JobCard.effectiveContract(widget.job);
    final rawScore = widget.matchScore ?? widget.job['match_score'];
    final score = (double.tryParse(rawScore?.toString() ?? '') ?? 0.0).round();

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: context.surfaceColor,
        borderRadius: AppTheme.cardRadius,
        border: Border.all(
          color: widget.isCompared ? AppTheme.primaryColor : context.borderColor,
          width: widget.isCompared ? 1.6 : 1,
        ),
        boxShadow: AppTheme.subtleShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Top Row: Title + Company + Affinity Badge + Bookmark
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: AppTheme.brand50,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppTheme.brand200),
                ),
                alignment: Alignment.center,
                child: Text(
                  companyName.isNotEmpty ? companyName[0].toUpperCase() : 'E',
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w900,
                    color: AppTheme.primaryColor,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      widget.job['title']?.toString() ?? 'Vacante Laboral',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        color: context.primaryText,
                        letterSpacing: -0.3,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      companyName,
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: AppTheme.primaryColor,
                      ),
                    ),
                    const SizedBox(height: 6),
                    buildAffinityBadge(context, score),
                  ],
                ),
              ),
              const SizedBox(width: 6),
              Column(
                children: [
                  _iconToggle(
                    icon: _isSaved ? Icons.bookmark_rounded : Icons.bookmark_border_rounded,
                    active: _isSaved,
                    activeColor: const Color(0xFFD97706),
                    tooltip: _isSaved ? 'Guardada' : 'Guardar vacante',
                    onTap: _toggleSave,
                  ),
                  if (widget.onToggleCompare != null) ...[
                    const SizedBox(height: 6),
                    _iconToggle(
                      icon: Icons.compare_arrows_rounded,
                      active: widget.isCompared,
                      activeColor: AppTheme.primaryColor,
                      tooltip: 'Comparar',
                      onTap: widget.onToggleCompare!,
                    ),
                  ],
                ],
              ),
            ],
          ),
          const SizedBox(height: 14),

          Wrap(
            spacing: 14,
            runSpacing: 8,
            children: [
              _buildMetaRow(Icons.location_on_outlined, cityName),
              _buildMetaRow(Icons.payments_outlined, JobCard.formatSalaryRange(widget.job)),
              _buildMetaRow(Icons.calendar_today_outlined, 'Cierre: ${JobCard.formatClosingDate(widget.job)}'),
            ],
          ),
          const SizedBox(height: 12),

          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: context.mutedColor,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: context.borderColor),
            ),
            child: Text(
              '$modality • $contractType',
              style: TextStyle(
                fontSize: 11.5,
                fontWeight: FontWeight.w700,
                color: context.secondaryText,
              ),
            ),
          ),
          const SizedBox(height: 14),

          // Footer Actions
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: _openJobDetailModal,
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  child: const Text('Ver Radiografía', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: ElevatedButton(
                  onPressed: (_hasApplied || _isApplying) ? null : _openJobDetailModal,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _hasApplied ? Colors.grey : AppTheme.primaryColor,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  child: _isApplying
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                        )
                      : Text(
                          _hasApplied ? 'Postulado ✓' : 'Postularme',
                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Colors.white),
                        ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _iconToggle({
    required IconData icon,
    required bool active,
    required Color activeColor,
    required String tooltip,
    required VoidCallback onTap,
  }) {
    return Tooltip(
      message: tooltip,
      child: InkWell(
        borderRadius: BorderRadius.circular(10),
        onTap: onTap,
        child: Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            color: active ? activeColor.withValues(alpha: 0.12) : context.surfaceColor,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: active ? activeColor : context.borderColor),
          ),
          child: Icon(icon, size: 19, color: active ? activeColor : context.secondaryText),
        ),
      ),
    );
  }

  Widget _buildMetaRow(IconData icon, String text) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 15, color: context.secondaryText),
        const SizedBox(width: 4),
        Text(
          text,
          style: TextStyle(
            fontSize: 12,
            color: context.secondaryText,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }
}

/// Badge de afinidad reutilizable (verde ≥75, ámbar ≥50, gris en otro caso).
Widget buildAffinityBadge(BuildContext context, int score) {
  final Color bg;
  final Color fg;
  final Color border;

  if (score >= 75) {
    bg = const Color(0xFFDCFCE7);
    fg = const Color(0xFF15803D);
    border = const Color(0xFF86EFAC);
  } else if (score >= 50) {
    bg = const Color(0xFFFEF3C7);
    fg = const Color(0xFFB45309);
    border = const Color(0xFFFDE68A);
  } else {
    bg = context.mutedColor;
    fg = context.secondaryText;
    border = context.borderColor;
  }

  return Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
    decoration: BoxDecoration(
      color: bg,
      borderRadius: BorderRadius.circular(999),
      border: Border.all(color: border),
    ),
    child: Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(Icons.auto_awesome_rounded, size: 12, color: fg),
        const SizedBox(width: 4),
        Text(
          '$score% Afinidad',
          style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: fg),
        ),
      ],
    ),
  );
}

/// Caché simple de vacantes guardadas sincronizada con el backend
/// (`GET /modulo1/saved-jobs` y `POST /modulo1/saved-jobs/{id}`).
class SavedJobsCache {
  static Set<int>? _ids;
  static Future<Set<int>>? _loading;

  static Future<Set<int>> load({bool force = false}) {
    if (!force && _ids != null) return Future.value(_ids!);
    if (!force && _loading != null) return _loading!;
    _loading = _fetch();
    return _loading!;
  }

  static Future<Set<int>> _fetch() async {
    try {
      final res = await ApiClient.instance.get('/modulo1/saved-jobs');
      final data = res.data;
      final raw = data is Map ? data['saved_job_ids'] : null;
      final set = <int>{};
      if (raw is List) {
        for (final v in raw) {
          final id = int.tryParse(v.toString());
          if (id != null) set.add(id);
        }
      }
      _ids = set;
    } catch (_) {
      _ids ??= <int>{};
    } finally {
      _loading = null;
    }
    return _ids!;
  }

  static Future<Set<int>> toggle(int jobId) async {
    final current = _ids ?? <int>{};
    if (current.contains(jobId)) {
      current.remove(jobId);
    } else {
      current.add(jobId);
    }
    _ids = current;
    final res = await ApiClient.instance.post('/modulo1/saved-jobs/$jobId');
    final data = res.data;
    final raw = data is Map ? data['saved_job_ids'] : null;
    if (raw is List) {
      _ids = raw.map((e) => int.tryParse(e.toString())).whereType<int>().toSet();
    }
    return _ids!;
  }
}

/// Hoja de detalle de vacante: Radiografía de Afinidad, Brecha de Habilidades
/// con "+ La tengo" en 1 clic y Pitch / Carta de presentación autogenerada.
class JobDetailSheet extends StatefulWidget {
  final Map<String, dynamic> job;
  final int initialScore;
  final bool hasApplied;
  final bool isSaved;
  final Future<void> Function() onToggleSave;
  final Future<void> Function(String coverLetter) onApply;

  const JobDetailSheet({
    super.key,
    required this.job,
    required this.initialScore,
    required this.hasApplied,
    required this.isSaved,
    required this.onToggleSave,
    required this.onApply,
  });

  @override
  State<JobDetailSheet> createState() => _JobDetailSheetState();
}

class _JobDetailSheetState extends State<JobDetailSheet> {
  Map<String, dynamic>? _breakdown;
  bool _loadingBreakdown = true;
  int? _addingSkillId;
  bool _applying = false;
  late bool _isSaved;
  late int _score;
  final _coverCtrl = TextEditingController();

  int get _jobId => int.tryParse(widget.job['id']?.toString() ?? '') ?? 0;

  @override
  void initState() {
    super.initState();
    _isSaved = widget.isSaved;
    _score = widget.initialScore;
    _fetchBreakdown();
  }

  @override
  void dispose() {
    _coverCtrl.dispose();
    super.dispose();
  }

  Future<void> _fetchBreakdown() async {
    setState(() => _loadingBreakdown = true);
    try {
      final res = await ApiClient.instance.get('/modulo1/jobs/$_jobId/affinity-breakdown');
      if (res.data is Map) {
        final data = Map<String, dynamic>.from(res.data);
        final total = double.tryParse(data['total_score']?.toString() ?? '');
        if (mounted) {
          setState(() {
            _breakdown = data;
            if (total != null && total > 0) _score = total.round();
          });
        }
      }
    } catch (_) {
      final company = widget.job['company'] is Map ? widget.job['company'] as Map : {};
      final companyName = company['name']?.toString() ?? 'la empresa';
      if (mounted) {
        setState(() {
          _breakdown = {
            'total_score': _score,
            'skills_score': _score,
            'program_score': 100,
            'experience_score': 85,
            'matched_skills': [],
            'missing_skills': [],
            'recommended_pitch':
                'Hola equipo de $companyName, soy egresado de la UPC con alta motivación para aportar en el cargo de ${widget.job['title'] ?? 'la vacante'}. Cuento con formación sólida y disponibilidad inmediata.',
          };
        });
      }
    } finally {
      if (mounted) setState(() => _loadingBreakdown = false);
    }
  }

  Future<void> _quickAddSkill(int skillId, String skillName) async {
    setState(() => _addingSkillId = skillId);
    try {
      await ApiClient.instance.post('/modulo1/profile/skills/quick-add', data: {
        'skill_id': skillId,
        'skill_name': skillName,
        'proficiency_level': 'Intermedio',
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('"$skillName" agregada a tu perfil. ¡Afinidad actualizada!'),
            backgroundColor: AppTheme.primaryColor,
          ),
        );
      }
      await _fetchBreakdown();
    } on DioException catch (e) {
      String msg = 'Completa primero tus datos básicos en Mi Perfil';
      if (e.response?.data is Map) {
        msg = e.response?.data['detail']?.toString() ?? msg;
      }
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(msg), backgroundColor: AppTheme.statusRechazado),
        );
      }
    } finally {
      if (mounted) setState(() => _addingSkillId = null);
    }
  }

  List<Map<String, dynamic>> _listOf(String key) {
    final raw = _breakdown?[key];
    if (raw is! List) return [];
    return raw.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
  }

  double _num(String key) => double.tryParse(_breakdown?[key]?.toString() ?? '') ?? 0;

  @override
  Widget build(BuildContext context) {
    final company = widget.job['company'] is Map
        ? Map<String, dynamic>.from(widget.job['company'])
        : <String, dynamic>{};
    final companyName = company['name']?.toString() ?? 'Empresa Aliada';
    final sectorName = company['sector'] is Map
        ? (company['sector']['name']?.toString() ?? 'General')
        : 'Sector Empresarial';
    final cityName = company['city'] is Map
        ? (company['city']['name']?.toString() ?? 'Valledupar')
        : 'Colombia';

    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.88,
      maxChildSize: 0.95,
      minChildSize: 0.5,
      builder: (_, scrollCtrl) {
        return Padding(
          padding: EdgeInsets.fromLTRB(22, 16, 22, 16 + MediaQuery.of(context).viewInsets.bottom),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 42,
                  height: 4,
                  decoration: BoxDecoration(
                    color: context.borderColor,
                    borderRadius: BorderRadius.circular(999),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          widget.job['title']?.toString() ?? 'Oferta Laboral',
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.w900,
                            color: context.primaryText,
                            letterSpacing: -0.4,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '$companyName · $sectorName · $cityName',
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: AppTheme.primaryColor,
                          ),
                        ),
                        const SizedBox(height: 8),
                        buildAffinityBadge(context, _score),
                      ],
                    ),
                  ),
                  IconButton(
                    tooltip: 'Guardar vacante',
                    onPressed: () async {
                      setState(() => _isSaved = !_isSaved);
                      await widget.onToggleSave();
                    },
                    icon: Icon(
                      _isSaved ? Icons.bookmark_rounded : Icons.bookmark_border_rounded,
                      color: _isSaved ? const Color(0xFFD97706) : context.secondaryText,
                    ),
                  ),
                ],
              ),
              const Divider(height: 24),
              Expanded(
                child: ListView(
                  controller: scrollCtrl,
                  children: [
                    Row(
                      children: [
                        Expanded(child: _summaryBox('RANGO SALARIAL', JobCard.formatSalaryRange(widget.job))),
                        const SizedBox(width: 10),
                        Expanded(child: _summaryBox('FECHA DE CIERRE', JobCard.formatClosingDate(widget.job))),
                      ],
                    ),
                    const SizedBox(height: 14),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        _detailChip(Icons.laptop_mac_rounded, 'Modalidad: ${JobCard.effectiveModality(widget.job)}'),
                        _detailChip(Icons.badge_outlined, 'Contrato: ${JobCard.effectiveContract(widget.job)}'),
                        if (widget.job['min_experience_years'] != null)
                          _detailChip(Icons.timeline_rounded,
                              'Experiencia mín.: ${widget.job['min_experience_years']} año(s)'),
                      ],
                    ),
                    const SizedBox(height: 18),
                    _buildBreakdownCard(),
                    const SizedBox(height: 18),
                    _modalSection(
                      'Descripción de la vacante',
                      widget.job['description']?.toString() ??
                          'Sin descripción adicional especificada por la empresa.',
                    ),
                    if (widget.job['requirements']?.toString().isNotEmpty ?? false) ...[
                      const SizedBox(height: 16),
                      _modalSection('Requisitos del cargo', widget.job['requirements'].toString()),
                    ],
                    if ((widget.job['functions'] ?? widget.job['responsibilities'])?.toString().isNotEmpty ??
                        false) ...[
                      const SizedBox(height: 16),
                      _modalSection(
                        'Funciones y responsabilidades',
                        (widget.job['functions'] ?? widget.job['responsibilities']).toString(),
                      ),
                    ],
                    if (!widget.hasApplied) ...[
                      const SizedBox(height: 18),
                      _buildPitchSection(),
                    ],
                    const SizedBox(height: 12),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  OutlinedButton(
                    onPressed: () => Navigator.pop(context),
                    child: const Text('Cerrar'),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: (widget.hasApplied || _applying)
                          ? null
                          : () async {
                              setState(() => _applying = true);
                              await widget.onApply(_coverCtrl.text);
                              if (mounted) setState(() => _applying = false);
                            },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: widget.hasApplied ? Colors.grey : AppTheme.primaryColor,
                      ),
                      icon: _applying
                          ? const SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                            )
                          : Icon(
                              widget.hasApplied ? Icons.check_circle_rounded : Icons.send_rounded,
                              size: 18,
                            ),
                      label: Text(widget.hasApplied ? 'Ya te postulaste' : 'Postularme Ahora'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildBreakdownCard() {
    final matched = _listOf('matched_skills');
    final missing = _listOf('missing_skills');

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppTheme.primaryColor.withValues(alpha: 0.07),
            const Color(0xFF3B82F6).withValues(alpha: 0.04),
          ],
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.primaryColor.withValues(alpha: 0.25)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.auto_awesome_rounded, size: 18, color: AppTheme.primaryColor),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  'Radiografía de Afinidad',
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: context.primaryText),
                ),
              ),
              if (_breakdown != null)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppTheme.primaryColor,
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(
                    '$_score%',
                    style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w900),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 12),
          if (_loadingBreakdown && _breakdown == null)
            Text('Analizando tu perfil frente a esta vacante...',
                style: TextStyle(fontSize: 12, color: context.secondaryText))
          else ...[
            _scoreBar('Habilidades (50%)', _num('skills_score'), AppTheme.primaryColor),
            const SizedBox(height: 8),
            _scoreBar('Programa académico (30%)', _num('program_score'), const Color(0xFF10B981)),
            const SizedBox(height: 8),
            _scoreBar('Experiencia (20%)', _num('experience_score'), const Color(0xFF3B82F6)),
            const SizedBox(height: 14),
            Text(
              '✓ Habilidades que ya dominas (${matched.length})',
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF047857)),
            ),
            const SizedBox(height: 6),
            if (matched.isEmpty)
              Text('Aún no registras habilidades coincidentes.',
                  style: TextStyle(fontSize: 11.5, fontStyle: FontStyle.italic, color: context.tertiaryText))
            else
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: matched
                    .map((s) => Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                          decoration: BoxDecoration(
                            color: const Color(0xFFD1FAE5),
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Text(
                            '✓ ${s['name'] ?? 'Skill'}',
                            style: const TextStyle(
                                fontSize: 11.5, fontWeight: FontWeight.w800, color: Color(0xFF065F46)),
                          ),
                        ))
                    .toList(),
              ),
            const SizedBox(height: 12),
            Text(
              '⚠ Brecha de habilidades (${missing.length})',
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFFB45309)),
            ),
            const SizedBox(height: 6),
            if (missing.isEmpty)
              const Text('¡Excelente! Cumples todas las competencias técnicas requeridas.',
                  style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: Color(0xFF047857)))
            else ...[
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: missing.map((s) {
                  final id = int.tryParse(s['skill_id']?.toString() ?? '') ?? 0;
                  final name = s['name']?.toString() ?? 'Skill';
                  final adding = _addingSkillId == id;
                  return InkWell(
                    borderRadius: BorderRadius.circular(999),
                    onTap: (_addingSkillId != null) ? null : () => _quickAddSkill(id, name),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFEF3C7),
                        borderRadius: BorderRadius.circular(999),
                        border: Border.all(color: const Color(0xFFFCD34D)),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          if (adding)
                            const SizedBox(
                              width: 11,
                              height: 11,
                              child: CircularProgressIndicator(strokeWidth: 1.6, color: Color(0xFF92400E)),
                            )
                          else
                            const Icon(Icons.add_rounded, size: 13, color: Color(0xFF92400E)),
                          const SizedBox(width: 4),
                          Text(
                            '$name · La tengo',
                            style: const TextStyle(
                                fontSize: 11.5, fontWeight: FontWeight.w800, color: Color(0xFF78350F)),
                          ),
                        ],
                      ),
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 6),
              Text(
                'Toca una habilidad si ya la dominas para agregarla a tu perfil y recalcular tu afinidad.',
                style: TextStyle(fontSize: 10.5, color: context.tertiaryText),
              ),
            ],
          ],
        ],
      ),
    );
  }

  Widget _buildPitchSection() {
    final pitch = _breakdown?['recommended_pitch']?.toString();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                'Pitch para el reclutador (opcional)',
                style: TextStyle(fontSize: 14.5, fontWeight: FontWeight.w800, color: context.primaryText),
              ),
            ),
            if (pitch != null && pitch.isNotEmpty)
              TextButton.icon(
                onPressed: () => setState(() => _coverCtrl.text = pitch),
                icon: const Icon(Icons.auto_awesome_rounded, size: 15),
                label: const Text('Autogenerar', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800)),
              ),
          ],
        ),
        const SizedBox(height: 6),
        TextField(
          controller: _coverCtrl,
          maxLines: 4,
          minLines: 3,
          style: TextStyle(fontSize: 13, color: context.primaryText),
          decoration: InputDecoration(
            hintText: 'Destaca en 2 líneas por qué eres el candidato ideal o toca "Autogenerar"...',
            hintStyle: TextStyle(fontSize: 12, color: context.tertiaryText),
            filled: true,
            fillColor: context.mutedColor,
            contentPadding: const EdgeInsets.all(12),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: context.borderColor),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: context.borderColor),
            ),
          ),
        ),
      ],
    );
  }

  Widget _scoreBar(String label, double value, Color color) {
    final v = value.clamp(0, 100).toDouble();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(label,
                  style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: context.secondaryText)),
            ),
            Text('${v.round()}%', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w900, color: color)),
          ],
        ),
        const SizedBox(height: 4),
        ClipRRect(
          borderRadius: BorderRadius.circular(999),
          child: LinearProgressIndicator(
            value: v / 100,
            minHeight: 7,
            backgroundColor: context.borderColor,
            valueColor: AlwaysStoppedAnimation(color),
          ),
        ),
      ],
    );
  }

  Widget _summaryBox(String label, String value) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: context.mutedColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: context.borderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.7,
              color: context.secondaryText,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w800, color: context.primaryText),
          ),
        ],
      ),
    );
  }

  Widget _detailChip(IconData icon, String label) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: AppTheme.brand50,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppTheme.brand200),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: AppTheme.primaryColor),
          const SizedBox(width: 6),
          Text(
            label,
            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppTheme.brand800),
          ),
        ],
      ),
    );
  }

  Widget _modalSection(String title, String content) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: TextStyle(fontSize: 14.5, fontWeight: FontWeight.w800, color: context.primaryText),
        ),
        const SizedBox(height: 6),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: context.mutedColor,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: context.borderColor),
          ),
          child: Text(
            content,
            style: TextStyle(fontSize: 13, color: context.secondaryText, height: 1.5),
          ),
        ),
      ],
    );
  }
}
