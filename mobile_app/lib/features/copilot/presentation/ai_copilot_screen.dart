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
  String _providerLabel = 'Conectando con Motor IA UPC...';
  bool _isGroqConnected = false;
  Map<String, dynamic> _rawProfile = {};

  // Tab 1: Diagnóstico 360°
  final TextEditingController _targetRoleCtrl = TextEditingController(
    text: 'Ingeniero de Software / Analista Profesional',
  );
  bool _analyzing = false;
  Map<String, dynamic>? _analysis;
  bool _applyingSummary = false;
  String? _addingSkill;
  final Set<String> _addedSkills = {};

  // Tab 2: Reescritor STAR
  String _rewriteFieldType = 'experience';
  final TextEditingController _rewriteInputCtrl = TextEditingController();
  final TextEditingController _rewriteRoleCtrl = TextEditingController(
    text: 'Ingeniero / Analista Profesional',
  );
  final TextEditingController _rewriteCompanyCtrl = TextEditingController();
  bool _rewriting = false;
  Map<String, dynamic>? _rewriteResult;

  // Tab 3: Chat Coach
  final TextEditingController _chatCtrl = TextEditingController();
  final ScrollController _chatScrollCtrl = ScrollController();
  bool _sendingChat = false;
  final List<Map<String, String>> _messages = [
    {
      'role': 'assistant',
      'content':
          '¡Hola! Soy tu **Copiloto IA de Empleabilidad UPC**. Analizo tu expediente real para ayudarte a destacar ante reclutadores, superar filtros ATS, redactar logros con metodología STAR y recomendar rutas de aprendizaje. ¿Qué aspecto de tu carrera impulsamos hoy?',
    },
  ];
  List<String> _followUpSuggestions = [
    '¿Qué habilidades me recomiendas agregar según mi carrera?',
    '¿Qué cursos de internet me recomiendas para ciencia de datos?',
    'Ayúdame a redactar un logro con metodología STAR',
    '¿Cómo negocio mi salario para mi próximo empleo?',
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
    _rewriteCompanyCtrl.dispose();
    _chatCtrl.dispose();
    _chatScrollCtrl.dispose();
    super.dispose();
  }

  Future<void> _initData() async {
    try {
      final statusRes = await ApiClient.instance.get('/modulo1/ai/status');
      if (statusRes.data is Map && mounted) {
        final s = statusRes.data as Map;
        final enabled = s['ai_enabled'] == true || s['enabled'] == true;
        final model =
            s['primary_model']?.toString() ??
            s['model']?.toString() ??
            'openai/gpt-oss-120b';
        setState(() {
          _isGroqConnected = enabled;
          _providerLabel = enabled
              ? 'Conectado a Groq ($model)'
              : 'Motor Experto UPC Activo';
        });
      }
    } catch (_) {}

    try {
      final profRes = await ApiClient.instance.get('/modulo1/profile');
      if (profRes.data is Map && mounted) {
        final p = Map<String, dynamic>.from(profRes.data as Map);
        setState(() {
          _rawProfile = p;
          if (_rewriteInputCtrl.text.isEmpty &&
              (p['profile_summary']?.toString().isNotEmpty ?? false)) {
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
        final data = Map<String, dynamic>.from(res.data as Map);
        final src = data['source']?.toString() ?? '';
        final mdl = data['model']?.toString() ?? 'openai/gpt-oss-120b';
        setState(() {
          _analysis = data;
          if (src == 'groq') {
            _isGroqConnected = true;
            _providerLabel = 'Conectado a Groq ($mdl)';
          }
        });
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'No se pudo ejecutar el diagnóstico IA en este momento.',
            ),
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
          'availability_status':
              _rawProfile['availability_status'] ?? 'OPEN_TO_WORK',
          'preferred_modality': _rawProfile['preferred_modality'],
          'expected_salary': _rawProfile['expected_salary'],
        },
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              '¡Resumen profesional actualizado en tu Hoja de Vida!',
            ),
            backgroundColor: AppTheme.primaryColor,
          ),
        );
        _runDiagnosis();
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
        data: {'skill_name': skillName, 'level': 'Intermedio'},
      );
      if (mounted) {
        setState(() => _addedSkills.add(skillName));
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('¡Habilidad "$skillName" añadida a tu perfil!'),
            backgroundColor: AppTheme.primaryColor,
          ),
        );
        _runDiagnosis();
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
          'field': _rewriteFieldType,
          'field_type': _rewriteFieldType,
          'text': _rewriteInputCtrl.text.trim(),
          'current_text': _rewriteInputCtrl.text.trim(),
          'target_role': _rewriteRoleCtrl.text.trim(),
          'context': {
            'position': _rewriteRoleCtrl.text.trim(),
            'company': _rewriteCompanyCtrl.text.trim(),
          },
          'tone': 'ejecutivo y orientado a logros cuantificables (STAR)',
        },
      );
      if (res.data is Map && mounted) {
        setState(
          () => _rewriteResult = Map<String, dynamic>.from(res.data as Map),
        );
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

    _scrollToBottom();

    try {
      final history = _messages
          .take(_messages.length - 1)
          .map(
            (m) => {'role': m['role'] ?? 'user', 'content': m['content'] ?? ''},
          )
          .toList();
      final fullMessages = _messages
          .map(
            (m) => {'role': m['role'] ?? 'user', 'content': m['content'] ?? ''},
          )
          .toList();

      final res = await ApiClient.instance.post(
        '/modulo1/ai/coach/chat',
        data: {
          'messages': fullMessages,
          'message': text,
          'target_role': _targetRoleCtrl.text.trim(),
          'history': history,
        },
      );
      if (res.data is Map && mounted) {
        final d = res.data as Map;
        final reply =
            d['reply']?.toString() ??
            'Aquí tienes mis recomendaciones profesionales.';
        final rawSugs =
            (d['suggestions'] as List?) ??
            (d['follow_up_suggestions'] as List?) ??
            [];
        final askedLower = _messages
            .where((m) => m['role'] == 'user')
            .map((m) => (m['content'] ?? '').trim().toLowerCase())
            .toSet();
        final sugs = rawSugs
            .map((e) => e.toString())
            .where((s) => !askedLower.contains(s.trim().toLowerCase()))
            .toList();

        setState(() {
          _messages.add({'role': 'assistant', 'content': reply});
          if (sugs.isNotEmpty) _followUpSuggestions = sugs;
          if (d['source'] == 'groq') {
            _isGroqConnected = true;
            _providerLabel =
                'Conectado a Groq (${d['model'] ?? 'openai/gpt-oss-120b'})';
          }
        });
        _scrollToBottom();
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _messages.add({
            'role': 'assistant',
            'content':
                'No pude conectar con el motor de IA en este instante. Intenta nuevamente en unos segundos.',
          });
        });
      }
    } finally {
      if (mounted) setState(() => _sendingChat = false);
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_chatScrollCtrl.hasClients) {
        _chatScrollCtrl.animateTo(
          _chatScrollCtrl.position.maxScrollExtent + 120,
          duration: const Duration(milliseconds: 280),
          curve: Curves.easeOut,
        );
      }
    });
  }

  int _toInt(dynamic val, [int fallback = 0]) {
    if (val is int) return val;
    if (val is num) return val.round();
    return int.tryParse(val?.toString() ?? '') ?? fallback;
  }

  String _translateSkillLevel(String rawLevel) {
    final upper = rawLevel.trim().toUpperCase();
    if (upper.contains('ADV') || upper.contains('AVANZ')) {
      return 'Nivel Avanzado';
    }
    if (upper.contains('BAS') || upper.contains('INIT')) {
      return 'Nivel Básico';
    }
    return 'Nivel Intermedio';
  }

  IconData _sectionIcon(String key, String label) {
    final k = '$key $label'.toLowerCase();
    if (k.contains('summary') || k.contains('resumen')) {
      return Icons.description_outlined;
    }
    if (k.contains('experience') || k.contains('experiencia')) {
      return Icons.work_outline_rounded;
    }
    if (k.contains('skill') || k.contains('habilidad')) {
      return Icons.bolt_rounded;
    }
    if (k.contains('project') || k.contains('portafolio')) {
      return Icons.folder_special_outlined;
    }
    if (k.contains('cert')) {
      return Icons.workspace_premium_outlined;
    }
    if (k.contains('edu') || k.contains('académic')) {
      return Icons.school_outlined;
    }
    return Icons.visibility_outlined;
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
          titleSpacing: 0,
          title: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Copiloto IA del Egresado',
                style: TextStyle(
                  fontSize: 16.5,
                  fontWeight: FontWeight.w900,
                  color: context.primaryText,
                ),
              ),
              const SizedBox(height: 2),
              Row(
                children: [
                  Container(
                    width: 7,
                    height: 7,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: _isGroqConnected
                          ? const Color(0xFF10B981)
                          : AppTheme.brand500,
                    ),
                  ),
                  const SizedBox(width: 5),
                  Flexible(
                    child: Text(
                      _providerLabel,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: AppTheme.brand500,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
          bottom: TabBar(
            indicatorColor: AppTheme.primaryColor,
            indicatorWeight: 3,
            labelColor: AppTheme.primaryColor,
            unselectedLabelColor: context.secondaryText,
            labelStyle: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w800,
            ),
            tabs: const [
              Tab(
                icon: Icon(Icons.radar_rounded, size: 18),
                text: 'Diagnóstico 360°',
              ),
              Tab(
                icon: Icon(Icons.auto_fix_high_rounded, size: 18),
                text: 'Reescritor STAR',
              ),
              Tab(
                icon: Icon(Icons.forum_outlined, size: 18),
                text: 'Coach IA',
              ),
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
  // TAB 1: DIAGNÓSTICO 360° (DISEÑO EJECUTIVO MÓVIL)
  // ===========================================================================
  Widget _buildDiagnosisTab(BuildContext context) {
    final d = _analysis;
    final overallScore = _toInt(d?['overall_score'], 0);
    final levelLabel =
        (d?['level'] ?? d?['level_label'] ?? 'En evaluación').toString();
    final headlineText = d?['headline']?.toString() ?? '';
    final headlineSuggestion =
        (d?['suggested_headline'] ?? d?['headline_suggestion'] ?? '')
            .toString();
    final improvedSummary = d?['improved_summary']?.toString() ?? '';

    final sections = (d?['sections'] as List? ?? [])
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .toList();

    final rawQuickWins = d?['quick_wins'] as List? ?? [];
    final quickWins = rawQuickWins.map<Map<String, String>>((item) {
      if (item is Map) {
        return {
          'title':
              (item['title'] ?? item['label'] ?? 'Victoria Rápida').toString(),
          'detail': (item['detail'] ?? item['description'] ?? '').toString(),
          'impact': (item['impact'] ?? 'high').toString().toLowerCase(),
          'section': (item['section'] ?? 'Perfil').toString(),
        };
      }
      return {
        'title': 'Acción Recomendada',
        'detail': item.toString(),
        'impact': 'high',
        'section': 'Perfil',
      };
    }).toList();

    final skillsToAdd = (d?['skills_to_add'] as List? ?? [])
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .toList();

    final keywords = (d?['keywords'] as List? ?? [])
        .map((e) => e.toString())
        .where((s) => s.trim().isNotEmpty)
        .toList();

    final rawPlan =
        (d?['plan_30_days'] as List?) ??
        (d?['action_plan_30_days'] as List?) ??
        [];
    final plan30 = rawPlan
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .toList();

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 40),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 1. Buscador de Rol Objetivo
          Container(
            padding: const EdgeInsets.all(15),
            decoration: BoxDecoration(
              color: context.surfaceColor,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: context.borderColor),
              boxShadow: AppTheme.subtleShadow,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(
                        color: AppTheme.primaryColor.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Icon(
                        Icons.track_changes_rounded,
                        size: 15,
                        color: AppTheme.primaryColor,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'ROL OBJETIVO PARA AUDITORÍA ATS & IA',
                        style: TextStyle(
                          fontSize: 10.5,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 0.6,
                          color: context.secondaryText,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: _targetRoleCtrl,
                  style: TextStyle(
                    fontSize: 13.5,
                    fontWeight: FontWeight.w600,
                    color: context.primaryText,
                  ),
                  decoration: InputDecoration(
                    hintText:
                        'Ej: Desarrollador Full Stack, Analista de Datos...',
                    prefixIcon: const Icon(
                      Icons.work_outline_rounded,
                      size: 18,
                    ),
                    filled: true,
                    fillColor: context.bgColor,
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 11,
                    ),
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
                const SizedBox(height: 10),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: _analyzing ? null : _runDiagnosis,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primaryColor,
                      foregroundColor: Colors.white,
                      elevation: 0,
                      padding: const EdgeInsets.symmetric(vertical: 13),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    icon: _analyzing
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
                      _analyzing
                          ? 'Auditando expediente con IA...'
                          : 'Auditar mi Perfil en 360°',
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w800,
                      ),
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
                padding: EdgeInsets.all(40),
                child: CircularProgressIndicator(color: AppTheme.primaryColor),
              ),
            )
          else if (d != null) ...[
            // 2. Tarjeta Hero de Índice de Competitividad + Titular ATS + Palabras Clave
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                gradient: AppTheme.heroBannerGradient,
                borderRadius: BorderRadius.circular(22),
                boxShadow: AppTheme.premiumShadow,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      // Circular Score Gauge
                      SizedBox(
                        width: 76,
                        height: 76,
                        child: Stack(
                          alignment: Alignment.center,
                          children: [
                            SizedBox(
                              width: 72,
                              height: 72,
                              child: CircularProgressIndicator(
                                value: (overallScore / 100).clamp(0.05, 1.0),
                                strokeWidth: 6.5,
                                backgroundColor: Colors.white.withValues(
                                  alpha: 0.16,
                                ),
                                valueColor: AlwaysStoppedAnimation<Color>(
                                  overallScore >= 75
                                      ? const Color(0xFF34D399)
                                      : overallScore >= 50
                                      ? const Color(0xFFFBBF24)
                                      : const Color(0xFF6EE7B7),
                                ),
                              ),
                            ),
                            Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(
                                  '$overallScore',
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 23,
                                    fontWeight: FontWeight.w900,
                                    height: 1.05,
                                  ),
                                ),
                                Text(
                                  '/ 100',
                                  style: TextStyle(
                                    color: Colors.white.withValues(alpha: 0.75),
                                    fontSize: 10,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 15),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Wrap(
                              spacing: 6,
                              runSpacing: 4,
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 9,
                                    vertical: 3.5,
                                  ),
                                  decoration: BoxDecoration(
                                    color: const Color(
                                      0xFF34D399,
                                    ).withValues(alpha: 0.22),
                                    borderRadius: BorderRadius.circular(999),
                                    border: Border.all(
                                      color: const Color(
                                        0xFF6EE7B7,
                                      ).withValues(alpha: 0.45),
                                    ),
                                  ),
                                  child: Text(
                                    'NIVEL ${levelLabel.toUpperCase()}',
                                    style: const TextStyle(
                                      color: Color(0xFFA7F3D0),
                                      fontSize: 10,
                                      fontWeight: FontWeight.w900,
                                      letterSpacing: 0.5,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 6),
                            const Text(
                              'Índice de Competitividad Profesional',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 15.5,
                                fontWeight: FontWeight.w900,
                                height: 1.2,
                              ),
                            ),
                            if (headlineText.isNotEmpty) ...[
                              const SizedBox(height: 4),
                              Text(
                                headlineText,
                                style: TextStyle(
                                  color: Colors.white.withValues(alpha: 0.88),
                                  fontSize: 11.5,
                                  height: 1.35,
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ],
                  ),
                  if (headlineSuggestion.isNotEmpty) ...[
                    const SizedBox(height: 14),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 10,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.22),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: Colors.white.withValues(alpha: 0.16),
                        ),
                      ),
                      child: Row(
                        children: [
                          const Icon(
                            Icons.workspace_premium_rounded,
                            color: Color(0xFF6EE7B7),
                            size: 17,
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'TITULAR SUGERIDO POR IA',
                                  style: TextStyle(
                                    color: Color(0xFF6EE7B7),
                                    fontSize: 9.5,
                                    fontWeight: FontWeight.w900,
                                    letterSpacing: 0.6,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  headlineSuggestion,
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 12,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          IconButton(
                            visualDensity: VisualDensity.compact,
                            onPressed: () {
                              Clipboard.setData(
                                ClipboardData(text: headlineSuggestion),
                              );
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text(
                                    'Titular copiado al portapapeles',
                                  ),
                                ),
                              );
                            },
                            icon: const Icon(
                              Icons.copy_rounded,
                              color: Colors.white70,
                              size: 16,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                  if (keywords.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    const Text(
                      'PALABRAS CLAVE ATS DETECTADAS / RECOMENDADAS',
                      style: TextStyle(
                        color: Color(0xFFA7F3D0),
                        fontSize: 9.5,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 0.6,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: keywords.map((kw) {
                        return Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8.5,
                            vertical: 3.5,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.13),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(
                              color: Colors.white.withValues(alpha: 0.2),
                            ),
                          ),
                          child: Text(
                            '#$kw',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 16),

            // 3. Resumen Ejecutivo Optimizado por IA (Con 1-Clic)
            if (improvedSummary.isNotEmpty) ...[
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: context.surfaceColor,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: AppTheme.brand300, width: 1.3),
                  boxShadow: AppTheme.subtleShadow,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Row(
                          children: [
                            Icon(
                              Icons.auto_fix_high_rounded,
                              color: AppTheme.primaryColor,
                              size: 18,
                            ),
                            SizedBox(width: 6),
                            Text(
                              'RESUMEN PROFESIONAL OPTIMIZADO POR IA',
                              style: TextStyle(
                                fontSize: 10.5,
                                fontWeight: FontWeight.w900,
                                color: AppTheme.primaryColor,
                                letterSpacing: 0.5,
                              ),
                            ),
                          ],
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 7,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: AppTheme.primaryColor.withValues(
                              alpha: 0.1,
                            ),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: const Text(
                            'Listo para ATS',
                            style: TextStyle(
                              fontSize: 9.5,
                              fontWeight: FontWeight.w800,
                              color: AppTheme.primaryColor,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: context.bgColor,
                        borderRadius: BorderRadius.circular(12),
                        border: const Border(
                          left: BorderSide(
                            color: AppTheme.primaryColor,
                            width: 3.5,
                          ),
                        ),
                      ),
                      child: Text(
                        '"$improvedSummary"',
                        style: TextStyle(
                          fontSize: 12.5,
                          fontStyle: FontStyle.italic,
                          color: context.primaryText,
                          height: 1.48,
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: ElevatedButton.icon(
                            onPressed: _applyingSummary
                                ? null
                                : () => _applySummaryToProfile(improvedSummary),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppTheme.primaryColor,
                              foregroundColor: Colors.white,
                              elevation: 0,
                              padding: const EdgeInsets.symmetric(vertical: 11),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(11),
                              ),
                            ),
                            icon: const Icon(
                              Icons.check_circle_outline_rounded,
                              size: 16,
                            ),
                            label: Text(
                              _applyingSummary
                                  ? 'Guardando...'
                                  : 'Aplicar a mi Hoja de Vida',
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        OutlinedButton.icon(
                          onPressed: () {
                            Clipboard.setData(
                              ClipboardData(text: improvedSummary),
                            );
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text(
                                  'Resumen copiado al portapapeles',
                                ),
                              ),
                            );
                          },
                          style: OutlinedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 11,
                            ),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(11),
                            ),
                          ),
                          icon: const Icon(Icons.copy_rounded, size: 15),
                          label: const Text(
                            'Copiar',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 18),
            ],

            // 4. Victorias Rápidas Prioritarias (Tarjetas Ejecutivas Limpias)
            if (quickWins.isNotEmpty) ...[
              _buildSectionHeader(
                context,
                icon: Icons.bolt_rounded,
                title: 'VICTORIAS RÁPIDAS DE MAYOR IMPACTO',
                subtitle: 'Acciones inmediatas para subir tu puntaje ATS',
              ),
              const SizedBox(height: 10),
              ...quickWins.asMap().entries.map((entry) {
                final idx = entry.key + 1;
                final qw = entry.value;
                final isHigh = (qw['impact'] ?? 'high').contains('high');
                return Container(
                  margin: const EdgeInsets.only(bottom: 10),
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: context.surfaceColor,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: context.borderColor),
                    boxShadow: AppTheme.subtleShadow,
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        width: 32,
                        height: 32,
                        decoration: BoxDecoration(
                          color: isHigh
                              ? const Color(0xFFFEF3C7)
                              : const Color(0xFFD1FAE5),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        alignment: Alignment.center,
                        child: Text(
                          '#$idx',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w900,
                            color: isHigh
                                ? const Color(0xFFB45309)
                                : const Color(0xFF065F46),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Expanded(
                                  child: Text(
                                    qw['title'] ?? 'Victoria Rápida',
                                    style: TextStyle(
                                      fontSize: 13.5,
                                      fontWeight: FontWeight.w800,
                                      color: context.primaryText,
                                    ),
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 7,
                                    vertical: 2.5,
                                  ),
                                  decoration: BoxDecoration(
                                    color: isHigh
                                        ? const Color(0xFFFEF3C7)
                                        : const Color(0xFFE0F2FE),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Text(
                                    isHigh ? 'IMPACTO ALTO' : 'IMPACTO MEDIO',
                                    style: TextStyle(
                                      fontSize: 9,
                                      fontWeight: FontWeight.w900,
                                      color: isHigh
                                          ? const Color(0xFFB45309)
                                          : const Color(0xFF0369A1),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 5),
                            Text(
                              qw['detail'] ?? '',
                              style: TextStyle(
                                fontSize: 12,
                                color: context.secondaryText,
                                height: 1.4,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                );
              }),
              const SizedBox(height: 12),
            ],

            // 5. Habilidades Recomendadas (1-Clic)
            if (skillsToAdd.isNotEmpty) ...[
              _buildSectionHeader(
                context,
                icon: Icons.psychology_outlined,
                title: 'HABILIDADES CLAVE RECOMENDADAS (1-CLIC)',
                subtitle: 'Aumentan tu compatibilidad en el Matchmaking UPC',
              ),
              const SizedBox(height: 10),
              ...skillsToAdd.map((sk) {
                final name = sk['name']?.toString() ?? 'Habilidad';
                final rawLevel =
                    (sk['level'] ?? sk['suggested_level'] ?? 'INTERMEDIATE')
                        .toString();
                final niceLevel = _translateSkillLevel(rawLevel);
                final reason = sk['reason']?.toString() ?? '';
                final added = _addedSkills.contains(name);
                final busy = _addingSkill == name;

                return Container(
                  margin: const EdgeInsets.only(bottom: 9),
                  padding: const EdgeInsets.all(13),
                  decoration: BoxDecoration(
                    color: context.surfaceColor,
                    borderRadius: BorderRadius.circular(15),
                    border: Border.all(color: context.borderColor),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 36,
                        height: 36,
                        decoration: BoxDecoration(
                          color: AppTheme.primaryColor.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(
                          Icons.code_rounded,
                          color: AppTheme.primaryColor,
                          size: 18,
                        ),
                      ),
                      const SizedBox(width: 11),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Wrap(
                              spacing: 6,
                              runSpacing: 4,
                              crossAxisAlignment: WrapCrossAlignment.center,
                              children: [
                                Text(
                                  name,
                                  style: TextStyle(
                                    fontSize: 13.5,
                                    fontWeight: FontWeight.w800,
                                    color: context.primaryText,
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 7,
                                    vertical: 2,
                                  ),
                                  decoration: BoxDecoration(
                                    color: AppTheme.primaryColor.withValues(
                                      alpha: 0.1,
                                    ),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Text(
                                    niceLevel,
                                    style: const TextStyle(
                                      fontSize: 9.5,
                                      fontWeight: FontWeight.w800,
                                      color: AppTheme.primaryColor,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            if (reason.isNotEmpty) ...[
                              const SizedBox(height: 3),
                              Text(
                                reason,
                                style: TextStyle(
                                  fontSize: 11.5,
                                  color: context.secondaryText,
                                  height: 1.35,
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      ElevatedButton(
                        onPressed: (added || busy)
                            ? null
                            : () => _quickAddSkill(name, rawLevel),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: added
                              ? const Color(0xFF15803D)
                              : AppTheme.primaryColor,
                          foregroundColor: Colors.white,
                          elevation: 0,
                          padding: const EdgeInsets.symmetric(
                            horizontal: 11,
                            vertical: 8,
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                          ),
                        ),
                        child: Text(
                          added ? '✓ Lista' : '+ Añadir',
                          style: const TextStyle(
                            fontSize: 11.5,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                    ],
                  ),
                );
              }),
              const SizedBox(height: 14),
            ],

            // 6. Desglose de las 7 Dimensiones del Perfil Profesional
            if (sections.isNotEmpty) ...[
              _buildSectionHeader(
                context,
                icon: Icons.analytics_outlined,
                title: 'DESGLOSE DE LAS 7 DIMENSIONES DE TU PERFIL',
                subtitle: 'Diagnóstico detallado por sección y acción sugerida',
              ),
              const SizedBox(height: 10),
              ...sections.map((sec) {
                final key = sec['key']?.toString() ?? '';
                final title =
                    (sec['label'] ?? sec['title'] ?? 'Dimensión del Perfil')
                        .toString();
                final score = _toInt(sec['score'], 0);
                final findingsList =
                    (sec['findings'] as List? ?? [])
                        .map((e) => e.toString())
                        .toList();
                final singleDiag = sec['diagnosis']?.toString() ?? '';
                final diagnosis = findingsList.isNotEmpty
                    ? findingsList.first
                    : singleDiag;

                final actionsList =
                    ((sec['actions'] as List?) ??
                            (sec['improvements'] as List?) ??
                            [])
                        .map((e) => e.toString())
                        .toList();

                final Color statusColor = score >= 75
                    ? const Color(0xFF059669)
                    : score >= 50
                    ? const Color(0xFF0284C7)
                    : score >= 35
                    ? const Color(0xFFD97706)
                    : const Color(0xFFE11D48);

                final String statusLabel = score >= 75
                    ? 'Óptimo'
                    : score >= 50
                    ? 'Competitivo'
                    : score >= 35
                    ? 'Por Mejorar'
                    : 'Prioritario';

                return Container(
                  margin: const EdgeInsets.only(bottom: 11),
                  padding: const EdgeInsets.all(15),
                  decoration: BoxDecoration(
                    color: context.surfaceColor,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: context.borderColor),
                    boxShadow: AppTheme.subtleShadow,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            width: 34,
                            height: 34,
                            decoration: BoxDecoration(
                              color: statusColor.withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Icon(
                              _sectionIcon(key, title),
                              color: statusColor,
                              size: 18,
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              title,
                              style: TextStyle(
                                fontSize: 13.5,
                                fontWeight: FontWeight.w800,
                                color: context.primaryText,
                              ),
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 3,
                            ),
                            decoration: BoxDecoration(
                              color: statusColor.withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(999),
                            ),
                            child: Text(
                              '$statusLabel · $score/100',
                              style: TextStyle(
                                fontSize: 10.5,
                                fontWeight: FontWeight.w900,
                                color: statusColor,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(999),
                        child: LinearProgressIndicator(
                          value: (score / 100).clamp(0.04, 1.0),
                          minHeight: 7,
                          backgroundColor: context.mutedColor,
                          valueColor: AlwaysStoppedAnimation<Color>(
                            statusColor,
                          ),
                        ),
                      ),
                      if (diagnosis.isNotEmpty) ...[
                        const SizedBox(height: 9),
                        Text(
                          diagnosis,
                          style: TextStyle(
                            fontSize: 12,
                            color: context.secondaryText,
                            height: 1.38,
                          ),
                        ),
                      ],
                      if (actionsList.isNotEmpty) ...[
                        const SizedBox(height: 8),
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: statusColor.withValues(alpha: 0.07),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(
                              color: statusColor.withValues(alpha: 0.2),
                            ),
                          ),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Icon(
                                Icons.tips_and_updates_outlined,
                                size: 15,
                                color: statusColor,
                              ),
                              const SizedBox(width: 7),
                              Expanded(
                                child: Text(
                                  actionsList.first,
                                  style: TextStyle(
                                    fontSize: 11.5,
                                    fontWeight: FontWeight.w700,
                                    color: context.primaryText,
                                    height: 1.35,
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
              }),
              const SizedBox(height: 12),
            ],

            // 7. Plan de Acción a 30 Días (Hoja de Ruta Semanal)
            if (plan30.isNotEmpty) ...[
              _buildSectionHeader(
                context,
                icon: Icons.calendar_month_outlined,
                title: 'PLAN DE ACCIÓN DE EMPLEABILIDAD A 30 DÍAS',
                subtitle: 'Ruta semanal estructurada por el Copiloto IA',
              ),
              const SizedBox(height: 10),
              ...plan30.map((w) {
                final weekNum = _toInt(w['week'], 1);
                final goal =
                    (w['goal'] ?? w['focus'] ?? 'Objetivo Semanal').toString();
                final tasksList =
                    (w['tasks'] as List? ?? [])
                        .map((e) => e.toString())
                        .toList();
                final singleDeliv = w['deliverable']?.toString() ?? '';
                if (tasksList.isEmpty && singleDeliv.isNotEmpty) {
                  tasksList.add(singleDeliv);
                }

                return Container(
                  margin: const EdgeInsets.only(bottom: 10),
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: context.surfaceColor,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: context.borderColor),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 9,
                              vertical: 3.5,
                            ),
                            decoration: BoxDecoration(
                              color: AppTheme.primaryColor,
                              borderRadius: BorderRadius.circular(7),
                            ),
                            child: Text(
                              'SEMANA $weekNum',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 10,
                                fontWeight: FontWeight.w900,
                                letterSpacing: 0.5,
                              ),
                            ),
                          ),
                          const SizedBox(width: 9),
                          Expanded(
                            child: Text(
                              goal,
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w800,
                                color: context.primaryText,
                              ),
                            ),
                          ),
                        ],
                      ),
                      if (tasksList.isNotEmpty) ...[
                        const SizedBox(height: 9),
                        ...tasksList.map(
                          (t) => Padding(
                            padding: const EdgeInsets.only(bottom: 5),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Padding(
                                  padding: EdgeInsets.only(top: 2),
                                  child: Icon(
                                    Icons.check_circle_rounded,
                                    size: 14,
                                    color: AppTheme.primaryColor,
                                  ),
                                ),
                                const SizedBox(width: 7),
                                Expanded(
                                  child: Text(
                                    t,
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: context.secondaryText,
                                      height: 1.35,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                );
              }),
            ],
          ],
        ],
      ),
    );
  }

  Widget _buildSectionHeader(
    BuildContext context, {
    required IconData icon,
    required String title,
    required String subtitle,
  }) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(7),
          decoration: BoxDecoration(
            color: AppTheme.primaryColor.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(9),
          ),
          child: Icon(icon, size: 16, color: AppTheme.primaryColor),
        ),
        const SizedBox(width: 9),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 0.5,
                  color: context.primaryText,
                ),
              ),
              Text(
                subtitle,
                style: TextStyle(fontSize: 11, color: context.secondaryText),
              ),
            ],
          ),
        ),
      ],
    );
  }

  // ===========================================================================
  // TAB 2: REESCRITOR STAR
  // ===========================================================================
  Widget _buildRewriterTab(BuildContext context) {
    final fields = const {
      'experience': 'Experiencia Laboral (STAR)',
      'summary': 'Resumen Profesional',
      'project': 'Proyecto de Portafolio',
      'cover_letter': 'Carta de Presentación',
      'headline': 'Titular Profesional',
    };

    final improved =
        (_rewriteResult?['improved'] ?? _rewriteResult?['improved_text'] ?? '')
            .toString();
    final changes =
        ((_rewriteResult?['changes'] as List?) ??
                (_rewriteResult?['key_changes'] as List?) ??
                [])
            .map((e) => e.toString())
            .toList();
    final warnings =
        (_rewriteResult?['warnings'] as List? ?? [])
            .map((e) => e.toString())
            .toList();

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: context.surfaceColor,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: context.borderColor),
              boxShadow: AppTheme.subtleShadow,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '¿QUÉ SECCIÓN QUIERES TRANSFORMAR CON EL MÉTODO STAR?',
                  style: TextStyle(
                    fontSize: 10.5,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 0.6,
                    color: context.secondaryText,
                  ),
                ),
                const SizedBox(height: 10),
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
                      onSelected: (_) =>
                          setState(() => _rewriteFieldType = entry.key),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _rewriteRoleCtrl,
                  style: TextStyle(fontSize: 13, color: context.primaryText),
                  decoration: InputDecoration(
                    labelText: 'Cargo / Rol Objetivo (Opcional)',
                    prefixIcon: const Icon(Icons.badge_outlined, size: 18),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: _rewriteCompanyCtrl,
                  style: TextStyle(fontSize: 13, color: context.primaryText),
                  decoration: InputDecoration(
                    labelText: 'Empresa / Entidad (Opcional)',
                    prefixIcon: const Icon(Icons.business_outlined, size: 18),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: _rewriteInputCtrl,
                  maxLines: 5,
                  style: TextStyle(fontSize: 13, color: context.primaryText),
                  decoration: InputDecoration(
                    labelText: 'Tu texto o borrador actual',
                    hintText:
                        'Ej: Hice reportes en Excel, apoyé en el desarrollo de una API con Python y atendí usuarios...',
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
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
                      elevation: 0,
                      padding: const EdgeInsets.symmetric(vertical: 13),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    icon: _rewriting
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Icon(Icons.auto_fix_high_rounded, size: 18),
                    label: Text(
                      _rewriting
                          ? 'Reescribiendo con IA (Método STAR)...'
                          : 'Optimizar Redacción con IA',
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w800,
                      ),
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
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: AppTheme.brand300, width: 1.4),
                boxShadow: AppTheme.subtleShadow,
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
                        'VERSIÓN MEJORADA DE ALTO IMPACTO (STAR)',
                        style: TextStyle(
                          fontSize: 10.5,
                          fontWeight: FontWeight.w900,
                          color: AppTheme.primaryColor,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: context.bgColor,
                      borderRadius: BorderRadius.circular(12),
                      border: const Border(
                        left: BorderSide(
                          color: AppTheme.primaryColor,
                          width: 3.5,
                        ),
                      ),
                    ),
                    child: SelectableText(
                      improved,
                      style: TextStyle(
                        fontSize: 13,
                        color: context.primaryText,
                        height: 1.45,
                      ),
                    ),
                  ),
                  if (changes.isNotEmpty) ...[
                    const Divider(height: 20),
                    Text(
                      'MEJORAS APLICADAS:',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w900,
                        color: context.secondaryText,
                      ),
                    ),
                    const SizedBox(height: 6),
                    ...changes.map(
                      (c) => Padding(
                        padding: const EdgeInsets.only(bottom: 4),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Icon(
                              Icons.check_rounded,
                              size: 15,
                              color: AppTheme.primaryColor,
                            ),
                            const SizedBox(width: 6),
                            Expanded(
                              child: Text(
                                c,
                                style: TextStyle(
                                  fontSize: 11.5,
                                  color: context.secondaryText,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                  if (warnings.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFEF3C7),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Row(
                        children: [
                          const Icon(
                            Icons.warning_amber_rounded,
                            size: 16,
                            color: Color(0xFFB45309),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              warnings.first,
                              style: const TextStyle(
                                fontSize: 11.5,
                                color: Color(0xFF92400E),
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ],
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
                              const SnackBar(
                                content: Text('Texto copiado al portapapeles'),
                              ),
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
                            onPressed: _applyingSummary
                                ? null
                                : () => _applySummaryToProfile(improved),
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
  // TAB 3: COACH IA CONVERSACIONAL (CON TABLAS Y FORMATO MARKDOWN RICO)
  // ===========================================================================
  Widget _buildCoachChatTab(BuildContext context) {
    return Column(
      children: [
        // Quick Suggestions Strip
        Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: context.surfaceColor,
            border: Border(bottom: BorderSide(color: context.borderColor)),
          ),
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: _followUpSuggestions.map((s) {
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ActionChip(
                    backgroundColor: AppTheme.brand50,
                    side: BorderSide(
                      color: AppTheme.primaryColor.withValues(alpha: 0.25),
                    ),
                    label: Text(
                      s,
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
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
            controller: _chatScrollCtrl,
            padding: const EdgeInsets.all(14),
            itemCount: _messages.length + (_sendingChat ? 1 : 0),
            itemBuilder: (context, index) {
              if (index == _messages.length) {
                return Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  child: Row(
                    children: [
                      const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: AppTheme.primaryColor,
                        ),
                      ),
                      const SizedBox(width: 10),
                      Text(
                        'El Copiloto IA está redactando una estrategia para tu perfil...',
                        style: TextStyle(
                          fontSize: 12,
                          fontStyle: FontStyle.italic,
                          color: context.secondaryText,
                        ),
                      ),
                    ],
                  ),
                );
              }
              final msg = _messages[index];
              final isUser = msg['role'] == 'user';
              return Align(
                alignment: isUser
                    ? Alignment.centerRight
                    : Alignment.centerLeft,
                child: Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.all(14),
                  constraints: BoxConstraints(
                    maxWidth:
                        MediaQuery.of(context).size.width *
                        (isUser ? 0.82 : 0.94),
                  ),
                  decoration: BoxDecoration(
                    color: isUser ? AppTheme.primaryColor : context.surfaceColor,
                    borderRadius: BorderRadius.only(
                      topLeft: const Radius.circular(18),
                      topRight: const Radius.circular(18),
                      bottomLeft: Radius.circular(isUser ? 18 : 4),
                      bottomRight: Radius.circular(isUser ? 4 : 18),
                    ),
                    border: isUser
                        ? null
                        : Border.all(color: context.borderColor),
                    boxShadow: AppTheme.subtleShadow,
                  ),
                  child: _buildFormattedMarkdown(
                    context,
                    msg['content'] ?? '',
                    isUser,
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
                    style: TextStyle(
                      fontSize: 13.5,
                      color: context.primaryText,
                    ),
                    decoration: InputDecoration(
                      hintText:
                          'Pregúntame sobre cursos, CV, entrevistas o salarios...',
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 10,
                      ),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(999),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                CircleAvatar(
                  backgroundColor: AppTheme.primaryColor,
                  child: IconButton(
                    icon: const Icon(
                      Icons.send_rounded,
                      color: Colors.white,
                      size: 18,
                    ),
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

  // ===========================================================================
  // RENDERIZADOR MARKDOWN NATIVO FLUTTER (SOPORTA TABLAS, ENCABEZADOS Y LISTAS)
  // ===========================================================================
  Widget _buildFormattedMarkdown(
    BuildContext context,
    String raw,
    bool isUser,
  ) {
    List<String> parseRow(String line) {
      String clean = line.trim();
      if (clean.startsWith('|')) clean = clean.substring(1);
      if (clean.endsWith('|')) clean = clean.substring(0, clean.length - 1);
      return clean.split('|').map((c) => c.trim()).toList();
    }

    bool isTableSeparator(String line) {
      final t = line.trim();
      if (!t.contains('|') || !t.contains('-')) return false;
      final cells = parseRow(t);
      return cells.isNotEmpty &&
          cells.every((c) => RegExp(r'^:?-{2,}:?$').hasMatch(c));
    }

    final lines = raw.split('\n');
    final List<Widget> widgets = [];
    int i = 0;

    while (i < lines.length) {
      final line = lines[i];
      final trimmed = line.trim();

      if (trimmed.isEmpty) {
        widgets.add(const SizedBox(height: 6));
        i++;
        continue;
      }

      // Horizontal Rule (---)
      if (RegExp(r'^(-{3,}|\*{3,}|_{3,})$').hasMatch(trimmed)) {
        widgets.add(Divider(height: 16, color: context.borderColor));
        i++;
        continue;
      }

      // Markdown Table
      if (trimmed.contains('|') &&
          i + 1 < lines.length &&
          isTableSeparator(lines[i + 1])) {
        final headers = parseRow(trimmed);
        i += 2;
        final List<List<String>> rows = [];
        while (i < lines.length && lines[i].trim().contains('|')) {
          if (!isTableSeparator(lines[i])) {
            rows.add(parseRow(lines[i]));
          }
          i++;
        }

        widgets.add(
          Container(
            margin: const EdgeInsets.symmetric(vertical: 8),
            decoration: BoxDecoration(
              color: context.bgColor,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: context.borderColor),
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: DataTable(
                  headingRowHeight: 36,
                  dataRowMinHeight: 36,
                  dataRowMaxHeight: 68,
                  columnSpacing: 16,
                  horizontalMargin: 12,
                  headingRowColor: WidgetStateProperty.all(
                    AppTheme.primaryColor.withValues(alpha: 0.12),
                  ),
                  columns: headers
                      .map(
                        (h) => DataColumn(
                          label: Text(
                            h.replaceAll('**', ''),
                            style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w900,
                              color: AppTheme.primaryColor,
                            ),
                          ),
                        ),
                      )
                      .toList(),
                  rows: rows.map((r) {
                    return DataRow(
                      cells: List.generate(headers.length, (cIdx) {
                        final cellText = cIdx < r.length ? r[cIdx] : '';
                        return DataCell(
                          ConstrainedBox(
                            constraints: const BoxConstraints(maxWidth: 210),
                            child: Padding(
                              padding: const EdgeInsets.symmetric(vertical: 4),
                              child: _buildInlineRichText(
                                context,
                                cellText,
                                isUser,
                                fontSize: 11.5,
                              ),
                            ),
                          ),
                        );
                      }),
                    );
                  }).toList(),
                ),
              ),
            ),
          ),
        );
        continue;
      }

      // Headings (#, ##, ###)
      final hdMatch = RegExp(r'^(#{1,4})\s+(.*)$').firstMatch(trimmed);
      if (hdMatch != null) {
        final headingText = hdMatch.group(2) ?? '';
        widgets.add(
          Padding(
            padding: const EdgeInsets.only(top: 8, bottom: 4),
            child: Row(
              children: [
                Container(
                  width: 4,
                  height: 16,
                  decoration: BoxDecoration(
                    color: AppTheme.primaryColor,
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
                const SizedBox(width: 7),
                Expanded(
                  child: Text(
                    headingText.replaceAll('**', ''),
                    style: TextStyle(
                      fontSize: 13.5,
                      fontWeight: FontWeight.w900,
                      color: isUser ? Colors.white : context.primaryText,
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
        i++;
        continue;
      }

      // Bullet list (- , • , * )
      if (trimmed.startsWith('- ') ||
          trimmed.startsWith('• ') ||
          (trimmed.startsWith('* ') && !trimmed.startsWith('**'))) {
        widgets.add(
          Padding(
            padding: const EdgeInsets.only(bottom: 4, left: 2),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '• ',
                  style: TextStyle(
                    fontWeight: FontWeight.w900,
                    color: isUser ? Colors.white : AppTheme.primaryColor,
                  ),
                ),
                Expanded(
                  child: _buildInlineRichText(
                    context,
                    trimmed.substring(2),
                    isUser,
                  ),
                ),
              ],
            ),
          ),
        );
        i++;
        continue;
      }

      // Numbered list (1. , 2. )
      final numMatch = RegExp(r'^(\d+)\.\s+(.*)$').firstMatch(trimmed);
      if (numMatch != null) {
        widgets.add(
          Padding(
            padding: const EdgeInsets.only(bottom: 5, left: 2),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 18,
                  height: 18,
                  margin: const EdgeInsets.only(top: 1, right: 7),
                  decoration: BoxDecoration(
                    color: isUser
                        ? Colors.white24
                        : AppTheme.primaryColor.withValues(alpha: 0.14),
                    shape: BoxShape.circle,
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    numMatch.group(1) ?? '1',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w900,
                      color: isUser ? Colors.white : AppTheme.primaryColor,
                    ),
                  ),
                ),
                Expanded(
                  child: _buildInlineRichText(
                    context,
                    numMatch.group(2) ?? '',
                    isUser,
                  ),
                ),
              ],
            ),
          ),
        );
        i++;
        continue;
      }

      widgets.add(
        Padding(
          padding: const EdgeInsets.only(bottom: 3),
          child: _buildInlineRichText(context, trimmed, isUser),
        ),
      );
      i++;
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: widgets,
    );
  }

  Widget _buildInlineRichText(
    BuildContext context,
    String text,
    bool isUser, {
    double fontSize = 13,
  }) {
    final parts = text.split(RegExp(r'(\*\*[^*]+\*\*)'));
    final List<InlineSpan> spans = [];

    for (final part in parts) {
      if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
        spans.add(
          TextSpan(
            text: part.substring(2, part.length - 2),
            style: TextStyle(
              fontWeight: FontWeight.w800,
              color: isUser ? Colors.white : AppTheme.primaryColor,
            ),
          ),
        );
      } else {
        spans.add(TextSpan(text: part));
      }
    }

    return RichText(
      text: TextSpan(
        style: TextStyle(
          fontSize: fontSize,
          color: isUser ? Colors.white : context.primaryText,
          height: 1.42,
        ),
        children: spans,
      ),
    );
  }
}
