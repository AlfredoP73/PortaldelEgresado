import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../core/network/api_client.dart';
import '../../../core/theme/app_theme.dart';

class AICopilotScreen extends StatefulWidget {
  final int initialTab;
  const AICopilotScreen({super.key, this.initialTab = 0});

  @override
  State<AICopilotScreen> createState() => _AICopilotScreenState();
}

class _AICopilotScreenState extends State<AICopilotScreen> {
  // Status & Profile
  String _providerLabel = 'Groq AI · Llama 3.3';
  Map<String, dynamic> _rawProfile = {};

  // Tab 1: Diagnóstico 360°
  final TextEditingController _targetRoleCtrl = TextEditingController(text: 'Ingeniero de Software / Analista Profesional');
  bool _analyzing = false;
  Map<String, dynamic>? _analysis;
  bool _applyingSummary = false;
  String? _addingSkill;
  final Set<String> _addedSkills = {};

  // Tab 2: Reescritor STAR
  String _rewriteFieldType = 'summary';
  final TextEditingController _rewriteInputCtrl = TextEditingController();
  final TextEditingController _rewriteRoleCtrl = TextEditingController(text: 'Ingeniero / Analista Senior');
  bool _rewriting = false;
  Map<String, dynamic>? _rewriteResult;

  // Tab 3: Chat Coach
  final TextEditingController _chatCtrl = TextEditingController();
  bool _sendingChat = false;
  final List<Map<String, String>> _messages = [
    {
      'role': 'assistant',
      'content':
          '¡Hola! Soy tu Copiloto IA de Empleabilidad UPC. Ya analicé tu perfil profesional. ¿Quieres optimizar tu hoja de vida para filtros ATS, preparar una entrevista con el método STAR o negociar tu salario?',
    },
  ];
  List<String> _followUpSuggestions = [
    '¿Qué habilidades técnicas debería priorizar este mes?',
    '¿Cómo justifico mi expectativa salarial en una entrevista?',
    'Dame un pitch de 60 segundos para presentarme.',
  ];

  @override
  void initState() {
    super.initState();
    _initData();
  }

  @override
  void dispose() {
    _targetRoleCtrl.dispose();
    _rewriteInputCtrl.dispose();
    _rewriteRoleCtrl.dispose();
    _chatCtrl.dispose();
    super.dispose();
  }

  Future<void> _initData() async {
    try {
      final statusRes = await ApiClient.instance.get('/modulo1/ai/status');
      if (statusRes.data is Map && mounted) {
        final s = statusRes.data as Map;
        final enabled = s['ai_enabled'] == true;
        final model = s['primary_model']?.toString() ?? 'llama-3.3-70b-versatile';
        setState(() {
          _providerLabel = enabled ? 'Groq AI ($model)' : 'Motor Heurístico Inteligente UPC';
        });
      }
    } catch (_) {}

    try {
      final profRes = await ApiClient.instance.get('/modulo1/profile');
      if (profRes.data is Map && mounted) {
        final p = Map<String, dynamic>.from(profRes.data as Map);
        setState(() {
          _rawProfile = p;
          if (_rewriteInputCtrl.text.isEmpty && (p['profile_summary']?.toString().isNotEmpty ?? false)) {
            _rewriteInputCtrl.text = p['profile_summary'].toString();
          }
        });
      }
    } catch (_) {}

    await _runDiagnosis();
  }

  Future<void> _runDiagnosis() async {
    setState(() => _analyzing = true);
    try {
      final res = await ApiClient.instance.post(
        '/modulo1/ai/coach/analyze',
        data: {
          'target_role': _targetRoleCtrl.text.trim(),
          'target_sector': 'Tecnología e Innovación',
        },
      );
      if (res.data is Map && mounted) {
        setState(() => _analysis = Map<String, dynamic>.from(res.data as Map));
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('No se pudo ejecutar el diagnóstico IA en este momento.'),
            backgroundColor: AppTheme.statusRechazado,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _analyzing = false);
    }
  }

  Future<void> _applySummaryToProfile(String newSummary) async {
    if (newSummary.trim().isEmpty) return;
    setState(() => _applyingSummary = true);
    try {
      await ApiClient.instance.post(
        '/modulo1/profile',
        data: {
          'first_name': _rawProfile['first_name'] ?? 'Egresado',
          'last_name': _rawProfile['last_name'] ?? 'UPC',
          'phone': _rawProfile['phone'] ?? '',
          'profile_summary': newSummary.trim(),
          'availability_status': _rawProfile['availability_status'] ?? 'OPEN_TO_WORK',
          'expected_salary': _rawProfile['expected_salary'],
        },
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('¡Resumen profesional actualizado en tu Hoja de Vida!'),
            backgroundColor: AppTheme.primaryColor,
          ),
        );
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('No se pudo aplicar el resumen al perfil.'),
            backgroundColor: AppTheme.statusRechazado,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _applyingSummary = false);
    }
  }

  Future<void> _quickAddSkill(String skillName, String level) async {
    setState(() => _addingSkill = skillName);
    try {
      await ApiClient.instance.post(
        '/modulo1/profile/skills/quick-add',
        data: {
          'skill_name': skillName,
          'level': level.isEmpty ? 'INTERMEDIATE' : level.toUpperCase(),
        },
      );
      if (mounted) {
        setState(() => _addedSkills.add(skillName));
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('¡Habilidad "$skillName" añadida a tu perfil!'),
            backgroundColor: AppTheme.primaryColor,
          ),
        );
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Error al añadir habilidad al perfil.'),
            backgroundColor: AppTheme.statusRechazado,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _addingSkill = null);
    }
  }

  Future<void> _runRewrite() async {
    if (_rewriteInputCtrl.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Escribe o pega un borrador para optimizarlo con IA.'),
          backgroundColor: AppTheme.accentAmber,
        ),
      );
      return;
    }
    setState(() => _rewriting = true);
    try {
      final res = await ApiClient.instance.post(
        '/modulo1/ai/coach/rewrite',
        data: {
          'field_type': _rewriteFieldType,
          'current_text': _rewriteInputCtrl.text.trim(),
          'target_role': _rewriteRoleCtrl.text.trim(),
          'tone': 'ejecutivo y orientado a logros cuantificables (STAR)',
        },
      );
      if (res.data is Map && mounted) {
        setState(() => _rewriteResult = Map<String, dynamic>.from(res.data as Map));
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('No se pudo reescribir el texto en este momento.'),
            backgroundColor: AppTheme.statusRechazado,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _rewriting = false);
    }
  }

  Future<void> _sendChatMessage([String? preset]) async {
    final text = (preset ?? _chatCtrl.text).trim();
    if (text.isEmpty || _sendingChat) return;

    if (preset == null) _chatCtrl.clear();
    setState(() {
      _messages.add({'role': 'user', 'content': text});
      _sendingChat = true;
    });

    try {
      final history = _messages
          .take(_messages.length - 1)
          .map((m) => {'role': m['role'] ?? 'user', 'content': m['content'] ?? ''})
          .toList();
      final res = await ApiClient.instance.post(
        '/modulo1/ai/coach/chat',
        data: {
          'message': text,
          'target_role': _targetRoleCtrl.text.trim(),
          'history': history,
        },
      );
      if (res.data is Map && mounted) {
        final d = res.data as Map;
        final reply = d['reply']?.toString() ?? 'Aquí tienes mis recomendaciones profesionales.';
        final sugs = (d['follow_up_suggestions'] as List? ?? []).map((e) => e.toString()).toList();
        setState(() {
          _messages.add({'role': 'assistant', 'content': reply});
          if (sugs.isNotEmpty) _followUpSuggestions = sugs;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _messages.add({
            'role': 'assistant',
            'content': 'No pude conectar con el motor de IA en este instante. Intenta nuevamente en unos segundos.',
          });
        });
      }
    } finally {
      if (mounted) setState(() => _sendingChat = false);
    }
  }

  int _toInt(dynamic val, [int fallback = 0]) {
    if (val is int) return val;
    if (val is num) return val.round();
    return int.tryParse(val?.toString() ?? '') ?? fallback;
  }

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 3,
      initialIndex: widget.initialTab.clamp(0, 2),
      child: Scaffold(
        backgroundColor: context.bgColor,
        appBar: AppBar(
          backgroundColor: context.surfaceColor,
          elevation: 0,
          title: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Copiloto IA del Egresado',
                style: TextStyle(fontSize: 16.5, fontWeight: FontWeight.w900, color: context.primaryText),
              ),
              Text(
                _providerLabel,
                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppTheme.brand500),
              ),
            ],
          ),
          bottom: TabBar(
            indicatorColor: AppTheme.primaryColor,
            labelColor: AppTheme.primaryColor,
            unselectedLabelColor: context.secondaryText,
            labelStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800),
            tabs: const [
              Tab(icon: Icon(Icons.radar_rounded, size: 18), text: 'Diagnóstico 360°'),
              Tab(icon: Icon(Icons.auto_fix_high_rounded, size: 18), text: 'Reescritor STAR'),
              Tab(icon: Icon(Icons.forum_outlined, size: 18), text: 'Coach IA'),
            ],
          ),
        ),
        body: TabBarView(
          children: [
            _buildDiagnosisTab(context),
            _buildRewriterTab(context),
            _buildCoachChatTab(context),
          ],
        ),
      ),
    );
  }

  // ===========================================================================
  // TAB 1: DIAGNÓSTICO 360°
  // ===========================================================================
  Widget _buildDiagnosisTab(BuildContext context) {
    final d = _analysis;
    final overallScore = _toInt(d?['overall_score'], 0);
    final levelLabel = d?['level_label']?.toString() ?? 'En evaluación';
    final headlineSuggestion = d?['headline_suggestion']?.toString() ?? '';
    final improvedSummary = d?['improved_summary']?.toString() ?? '';
    final sections = (d?['sections'] as List? ?? [])
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .toList();
    final quickWins = (d?['quick_wins'] as List? ?? []).map((e) => e.toString()).toList();
    final skillsToAdd = (d?['skills_to_add'] as List? ?? [])
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .toList();
    final plan30 = (d?['action_plan_30_days'] as List? ?? [])
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .toList();

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 36),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Target Role Input Bar
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: context.surfaceColor,
              borderRadius: AppTheme.cardRadius,
              border: Border.all(color: context.borderColor),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'ROL OBJETIVO PARA EL DIAGNÓSTICO ATS E IA',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 0.7,
                    color: context.secondaryText,
                  ),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: _targetRoleCtrl,
                  style: TextStyle(fontSize: 13.5, color: context.primaryText),
                  decoration: InputDecoration(
                    hintText: 'Ej: Desarrollador Full Stack, Analista de Datos...',
                    prefixIcon: const Icon(Icons.work_outline_rounded, size: 18),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
                const SizedBox(height: 10),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: _analyzing ? null : _runDiagnosis,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primaryColor,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    icon: _analyzing
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                          )
                        : const Icon(Icons.auto_awesome_rounded, size: 18),
                    label: Text(
                      _analyzing ? 'Analizando perfil con Groq AI...' : 'Auditar mi Perfil en 360°',
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          if (_analyzing && d == null)
            const Center(
              child: Padding(
                padding: EdgeInsets.all(32),
                child: CircularProgressIndicator(color: AppTheme.primaryColor),
              ),
            )
          else if (d != null) ...[
            // Overall Score Hero Card
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
                  Row(
                    children: [
                      Container(
                        width: 68,
                        height: 68,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: Colors.white.withValues(alpha: 0.14),
                          border: Border.all(color: const Color(0xFF45C388), width: 3),
                        ),
                        alignment: Alignment.center,
                        child: Text(
                          '$overallScore',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 24,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: const Color(0xFF45C388).withValues(alpha: 0.22),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                levelLabel.toUpperCase(),
                                style: const TextStyle(
                                  color: Color(0xFF7CDAAC),
                                  fontSize: 10,
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                            ),
                            const SizedBox(height: 6),
                            const Text(
                              'Índice de Competitividad Profesional',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 16,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                            if (headlineSuggestion.isNotEmpty) ...[
                              const SizedBox(height: 4),
                              Text(
                                'Titular sugerido: "$headlineSuggestion"',
                                style: TextStyle(
                                  color: Colors.white.withValues(alpha: 0.85),
                                  fontSize: 11.5,
                                  fontStyle: FontStyle.italic,
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Improved Summary with 1-Click Apply
            if (improvedSummary.isNotEmpty) ...[
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: context.surfaceColor,
                  borderRadius: AppTheme.cardRadius,
                  border: Border.all(color: AppTheme.brand300, width: 1.3),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.auto_fix_high_rounded, color: AppTheme.primaryColor, size: 18),
                        SizedBox(width: 6),
                        Text(
                          'RESUMEN PROFESIONAL OPTIMIZADO POR IA',
                          style: TextStyle(
                            fontSize: 10.5,
                            fontWeight: FontWeight.w900,
                            color: AppTheme.primaryColor,
                            letterSpacing: 0.6,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      improvedSummary,
                      style: TextStyle(fontSize: 12.5, color: context.primaryText, height: 1.45),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: ElevatedButton.icon(
                            onPressed: _applyingSummary ? null : () => _applySummaryToProfile(improvedSummary),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppTheme.primaryColor,
                              foregroundColor: Colors.white,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            ),
                            icon: const Icon(Icons.check_circle_outline_rounded, size: 16),
                            label: Text(
                              _applyingSummary ? 'Aplicando...' : 'Aplicar a mi Hoja de Vida',
                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        IconButton(
                          tooltip: 'Copiar resumen',
                          onPressed: () {
                            Clipboard.setData(ClipboardData(text: improvedSummary));
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Resumen copiado al portapapeles')),
                            );
                          },
                          icon: const Icon(Icons.copy_rounded, size: 18),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
            ],

            // Recommended Skills to Add (1-Tap)
            if (skillsToAdd.isNotEmpty) ...[
              Text(
                'HABILIDADES RECOMENDADAS PARA TU ROL (1-CLIC)',
                style: TextStyle(
                  fontSize: 10.5,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 0.7,
                  color: context.secondaryText,
                ),
              ),
              const SizedBox(height: 8),
              ...skillsToAdd.map((sk) {
                final name = sk['name']?.toString() ?? 'Skill';
                final level = sk['suggested_level']?.toString() ?? 'INTERMEDIATE';
                final reason = sk['reason']?.toString() ?? '';
                final added = _addedSkills.contains(name);
                final busy = _addingSkill == name;

                return Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: context.surfaceColor,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: context.borderColor),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '$name ($level)',
                              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: context.primaryText),
                            ),
                            if (reason.isNotEmpty)
                              Text(
                                reason,
                                style: TextStyle(fontSize: 11.5, color: context.secondaryText),
                              ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      ElevatedButton(
                        onPressed: (added || busy) ? null : () => _quickAddSkill(name, level),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: added ? const Color(0xFF15803D) : AppTheme.primaryColor,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        ),
                        child: Text(
                          added ? 'Añadida' : '+ Añadir',
                          style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800),
                        ),
                      ),
                    ],
                  ),
                );
              }),
              const SizedBox(height: 12),
            ],

            // 7 Section Evaluations
            if (sections.isNotEmpty) ...[
              Text(
                'AUDITORÍA POR SECCIÓN DE TU HOJA DE VIDA',
                style: TextStyle(
                  fontSize: 10.5,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 0.7,
                  color: context.secondaryText,
                ),
              ),
              const SizedBox(height: 8),
              ...sections.map((sec) {
                final title = sec['title']?.toString() ?? 'Sección';
                final score = _toInt(sec['score'], 0);
                final diagnosis = sec['diagnosis']?.toString() ?? '';
                final improvements = (sec['improvements'] as List? ?? []).map((e) => e.toString()).toList();
                return Container(
                  margin: const EdgeInsets.only(bottom: 10),
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: context.surfaceColor,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: context.borderColor),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            title,
                            style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w800, color: context.primaryText),
                          ),
                          Text(
                            '$score/100',
                            style: TextStyle(
                              fontSize: 12.5,
                              fontWeight: FontWeight.w900,
                              color: score >= 75 ? AppTheme.primaryColor : AppTheme.accentAmber,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(999),
                        child: LinearProgressIndicator(
                          value: (score / 100).clamp(0.0, 1.0),
                          minHeight: 6,
                          backgroundColor: context.mutedColor,
                          valueColor: AlwaysStoppedAnimation<Color>(
                            score >= 75 ? AppTheme.primaryColor : AppTheme.accentAmber,
                          ),
                        ),
                      ),
                      if (diagnosis.isNotEmpty) ...[
                        const SizedBox(height: 8),
                        Text(diagnosis, style: TextStyle(fontSize: 12, color: context.secondaryText)),
                      ],
                      if (improvements.isNotEmpty) ...[
                        const SizedBox(height: 6),
                        ...improvements.map(
                          (imp) => Padding(
                            padding: const EdgeInsets.only(bottom: 3),
                            child: Text(
                              '• $imp',
                              style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: context.primaryText),
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                );
              }),
            ],

            // Quick Wins & 30-Day Plan
            if (quickWins.isNotEmpty || plan30.isNotEmpty) ...[
              const SizedBox(height: 10),
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
                      'VICTORIAS RÁPIDAS Y PLAN DE 30 DÍAS',
                      style: TextStyle(
                        fontSize: 10.5,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 0.7,
                        color: context.secondaryText,
                      ),
                    ),
                    const SizedBox(height: 8),
                    ...quickWins.map(
                      (q) => Padding(
                        padding: const EdgeInsets.only(bottom: 5),
                        child: Text('⚡ $q', style: TextStyle(fontSize: 12, color: context.primaryText)),
                      ),
                    ),
                    if (plan30.isNotEmpty) ...[
                      const Divider(height: 16),
                      ...plan30.map((w) {
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 6),
                          child: Text(
                            'Semana ${w['week']}: ${w['focus']} — ${w['deliverable']}',
                            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: context.primaryText),
                          ),
                        );
                      }),
                    ],
                  ],
                ),
              ),
            ],
          ],
        ],
      ),
    );
  }

  // ===========================================================================
  // TAB 2: REESCRITOR STAR
  // ===========================================================================
  Widget _buildRewriterTab(BuildContext context) {
    final fields = const {
      'summary': 'Resumen Profesional',
      'experience': 'Experiencia Laboral (STAR)',
      'project': 'Proyecto Destacado',
      'cover_letter': 'Carta de Presentación',
      'headline': 'Titular Profesional',
    };

    final improved = _rewriteResult?['improved_text']?.toString() ?? '';
    final changes = (_rewriteResult?['key_changes'] as List? ?? []).map((e) => e.toString()).toList();

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
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
                  '¿QUÉ SECCIÓN QUIERES TRANSFORMAR CON EL MÉTODO STAR?',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 0.7,
                    color: context.secondaryText,
                  ),
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: fields.entries.map((entry) {
                    final selected = _rewriteFieldType == entry.key;
                    return ChoiceChip(
                      selected: selected,
                      selectedColor: AppTheme.primaryColor,
                      labelStyle: TextStyle(
                        fontSize: 11.5,
                        fontWeight: FontWeight.w800,
                        color: selected ? Colors.white : context.primaryText,
                      ),
                      label: Text(entry.value),
                      onSelected: (_) => setState(() => _rewriteFieldType = entry.key),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _rewriteRoleCtrl,
                  style: TextStyle(fontSize: 13, color: context.primaryText),
                  decoration: InputDecoration(
                    labelText: 'Rol o vacante objetivo',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _rewriteInputCtrl,
                  maxLines: 5,
                  style: TextStyle(fontSize: 13, color: context.primaryText),
                  decoration: InputDecoration(
                    labelText: 'Tu texto o borrador actual',
                    hintText: 'Escribe tus funciones o logros para convertirlos en verbos de impacto y métricas STAR...',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: _rewriting ? null : _runRewrite,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primaryColor,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    icon: _rewriting
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                          )
                        : const Icon(Icons.auto_fix_high_rounded, size: 18),
                    label: Text(
                      _rewriting ? 'Reescribiendo con Groq AI...' : 'Optimizar Texto con Método STAR',
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800),
                    ),
                  ),
                ),
              ],
            ),
          ),

          if (improved.isNotEmpty) ...[
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: context.surfaceColor,
                borderRadius: AppTheme.cardRadius,
                border: Border.all(color: AppTheme.brand300, width: 1.4),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.auto_awesome_rounded, color: AppTheme.primaryColor, size: 18),
                      SizedBox(width: 6),
                      Text(
                        'VERSIÓN OPTIMIZADA LISTA PARA RECLUTADORES',
                        style: TextStyle(
                          fontSize: 10.5,
                          fontWeight: FontWeight.w900,
                          color: AppTheme.primaryColor,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  SelectableText(
                    improved,
                    style: TextStyle(fontSize: 13, color: context.primaryText, height: 1.45),
                  ),
                  if (changes.isNotEmpty) ...[
                    const Divider(height: 18),
                    ...changes.map(
                      (c) => Padding(
                        padding: const EdgeInsets.only(bottom: 4),
                        child: Text('✓ $c', style: TextStyle(fontSize: 11.5, color: context.secondaryText)),
                      ),
                    ),
                  ],
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () {
                            Clipboard.setData(ClipboardData(text: improved));
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Texto copiado al portapapeles')),
                            );
                          },
                          icon: const Icon(Icons.copy_rounded, size: 16),
                          label: const Text('Copiar texto'),
                        ),
                      ),
                      if (_rewriteFieldType == 'summary') ...[
                        const SizedBox(width: 8),
                        Expanded(
                          child: ElevatedButton.icon(
                            onPressed: _applyingSummary ? null : () => _applySummaryToProfile(improved),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppTheme.primaryColor,
                              foregroundColor: Colors.white,
                            ),
                            icon: const Icon(Icons.save_outlined, size: 16),
                            label: const Text('Guardar en Perfil'),
                          ),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  // ===========================================================================
  // TAB 3: COACH IA CONVERSACIONAL
  // ===========================================================================
  Widget _buildCoachChatTab(BuildContext context) {
    return Column(
      children: [
        // Quick Suggestions Strip
        Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          color: context.surfaceColor,
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: _followUpSuggestions.map((s) {
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ActionChip(
                    backgroundColor: AppTheme.brand50,
                    label: Text(
                      s,
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: AppTheme.primaryColor,
                      ),
                    ),
                    onPressed: () => _sendChatMessage(s),
                  ),
                );
              }).toList(),
            ),
          ),
        ),

        // Messages List
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: _messages.length + (_sendingChat ? 1 : 0),
            itemBuilder: (context, index) {
              if (index == _messages.length) {
                return const Align(
                  alignment: Alignment.centerLeft,
                  child: Padding(
                    padding: EdgeInsets.all(8.0),
                    child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.primaryColor),
                  ),
                );
              }
              final msg = _messages[index];
              final isUser = msg['role'] == 'user';
              return Align(
                alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
                child: Container(
                  margin: const EdgeInsets.only(bottom: 10),
                  padding: const EdgeInsets.all(13),
                  constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.82),
                  decoration: BoxDecoration(
                    color: isUser ? AppTheme.primaryColor : context.surfaceColor,
                    borderRadius: BorderRadius.circular(16),
                    border: isUser ? null : Border.all(color: context.borderColor),
                  ),
                  child: Text(
                    msg['content'] ?? '',
                    style: TextStyle(
                      fontSize: 13,
                      color: isUser ? Colors.white : context.primaryText,
                      height: 1.4,
                    ),
                  ),
                ),
              );
            },
          ),
        ),

        // Chat Input Bar
        SafeArea(
          top: false,
          child: Container(
            padding: const EdgeInsets.fromLTRB(12, 8, 12, 10),
            decoration: BoxDecoration(
              color: context.surfaceColor,
              border: Border(top: BorderSide(color: context.borderColor)),
            ),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _chatCtrl,
                    onSubmitted: (_) => _sendChatMessage(),
                    style: TextStyle(fontSize: 13.5, color: context.primaryText),
                    decoration: InputDecoration(
                      hintText: 'Pregúntale a tu Coach IA sobre tu carrera...',
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(999)),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                CircleAvatar(
                  backgroundColor: AppTheme.primaryColor,
                  child: IconButton(
                    icon: const Icon(Icons.send_rounded, color: Colors.white, size: 18),
                    onPressed: _sendingChat ? null : () => _sendChatMessage(),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

