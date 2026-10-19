import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/network/api_client.dart';

class SurveysTab extends StatefulWidget {
  const SurveysTab({super.key});

  @override
  State<SurveysTab> createState() => _SurveysTabState();
}

class _SurveysTabState extends State<SurveysTab> {
  List<Map<String, dynamic>> _surveys = [];
  Map<int, bool> _completedMap = {};
  Map<String, dynamic>? _activeSurvey;
  final Map<String, dynamic> _answers = {};
  bool _isLoading = true;
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    _fetchSurveys();
  }

  Future<void> _fetchSurveys() async {
    setState(() => _isLoading = true);
    try {
      final res = await ApiClient.instance.get('/modulo1/surveys');
      final List<Map<String, dynamic>> list = [];
      final Map<int, bool> completed = {};

      if (res.data is List) {
        for (final item in res.data) {
          if (item is Map) {
            final s = Map<String, dynamic>.from(item);
            list.add(s);
            final id = (s['id'] as num).toInt();
            try {
              final respCheck = await ApiClient.instance.get('/modulo1/surveys/$id/response');
              completed[id] = respCheck.data != null &&
                  respCheck.data is Map &&
                  (respCheck.data['completed'] == true || respCheck.data['id'] != null);
            } catch (_) {
              completed[id] = false;
            }
          }
        }
      }

      if (mounted) {
        setState(() {
          _surveys = list;
          _completedMap = completed;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _submitSurvey() async {
    if (_activeSurvey == null) return;
    final id = (_activeSurvey!['id'] as num).toInt();

    setState(() => _isSubmitting = true);
    try {
      await ApiClient.instance.post('/modulo1/surveys/$id/response', data: _answers);
      if (mounted) {
        setState(() {
          _completedMap[id] = true;
          _activeSurvey = null;
          _answers.clear();
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('¡Encuesta institucional M01 enviada con éxito! Gracias por tu participación.'),
            backgroundColor: AppTheme.primaryColor,
          ),
        );
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('No se pudo enviar la encuesta. Verifica tus respuestas.'),
            backgroundColor: AppTheme.statusRechazado,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator(color: AppTheme.primaryColor));
    }

    if (_activeSurvey != null) {
      return _buildActiveSurveyForm(context);
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 104),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Encuestas de Seguimiento a Egresados (M01)',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: context.primaryText),
          ),
          const SizedBox(height: 4),
          Text(
            'Instrumentos de acreditación y seguimiento institucional de la Universidad Popular del Cesar.',
            style: TextStyle(fontSize: 12.5, color: context.secondaryText),
          ),
          const SizedBox(height: 14),

          if (_surveys.isEmpty)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: context.surfaceColor,
                borderRadius: AppTheme.cardRadius,
                border: Border.all(color: context.borderColor),
              ),
              child: Text(
                'No hay encuestas activas asignadas en este momento.',
                textAlign: TextAlign.center,
                style: TextStyle(color: context.secondaryText),
              ),
            )
          else
            Column(
              children: _surveys.map((survey) {
                final id = (survey['id'] as num).toInt();
                final done = _completedMap[id] == true;

                return Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    color: done ? AppTheme.brand50.withValues(alpha: context.isDark ? 0.1 : 0.6) : context.surfaceColor,
                    borderRadius: AppTheme.cardRadius,
                    border: Border.all(color: done ? AppTheme.brand300 : context.borderColor),
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
                            child: Icon(
                              done ? Icons.check_circle_rounded : Icons.assignment_outlined,
                              color: AppTheme.primaryColor,
                              size: 20,
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              survey['title']?.toString() ?? 'Encuesta Institucional',
                              style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: context.primaryText),
                            ),
                          ),
                          if (done)
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: const Color(0xFFDCFCE7),
                                borderRadius: BorderRadius.circular(999),
                              ),
                              child: const Text(
                                'Completada',
                                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF15803D)),
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        survey['description']?.toString() ?? '',
                        style: TextStyle(fontSize: 12.5, color: context.secondaryText, height: 1.4),
                      ),
                      if (!done) ...[
                        const SizedBox(height: 14),
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton.icon(
                            onPressed: () {
                              setState(() {
                                _answers.clear();
                                _activeSurvey = survey;
                              });
                            },
                            icon: const Icon(Icons.play_arrow_rounded, size: 18),
                            label: const Text('Comenzar Encuesta'),
                          ),
                        ),
                      ],
                    ],
                  ),
                );
              }).toList(),
            ),
        ],
      ),
    );
  }

  Widget _buildActiveSurveyForm(BuildContext context) {
    final questions = (_activeSurvey!['questions'] as List? ?? [])
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .toList();

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 104),
      child: Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: context.surfaceColor,
          borderRadius: AppTheme.cardRadius,
          border: Border.all(color: context.borderColor),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                IconButton(
                  onPressed: () => setState(() => _activeSurvey = null),
                  icon: const Icon(Icons.arrow_back_rounded),
                ),
                Expanded(
                  child: Text(
                    _activeSurvey!['title']?.toString() ?? 'Encuesta',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: context.primaryText),
                  ),
                ),
              ],
            ),
            const Divider(height: 20),
            ...List.generate(questions.length, (idx) {
              final q = questions[idx];
              final qId = (q['id'] ?? 'q_$idx').toString();
              final qText = q['question'] ?? q['text'] ?? 'Pregunta ${idx + 1}';
              final qType = q['type']?.toString() ?? 'text';
              final options = (q['options'] as List? ?? []).map((e) => e.toString()).toList();

              return Padding(
                padding: const EdgeInsets.only(bottom: 18),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${idx + 1}. $qText',
                      style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w800, color: context.primaryText),
                    ),
                    const SizedBox(height: 8),
                    if (qType == 'radio' && options.isNotEmpty)
                      ...options.map((opt) {
                        final selected = _answers[qId] == opt;
                        return InkWell(
                          onTap: () => setState(() => _answers[qId] = opt),
                          child: Container(
                            margin: const EdgeInsets.only(bottom: 6),
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                            decoration: BoxDecoration(
                              color: selected ? AppTheme.brand50 : context.mutedColor,
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(
                                color: selected ? AppTheme.primaryColor : context.borderColor,
                              ),
                            ),
                            child: Row(
                              children: [
                                Icon(
                                  selected ? Icons.radio_button_checked : Icons.radio_button_off,
                                  size: 18,
                                  color: selected ? AppTheme.primaryColor : context.secondaryText,
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    opt,
                                    style: TextStyle(
                                      fontSize: 12.5,
                                      fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                                      color: context.primaryText,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      })
                    else
                      TextField(
                        onChanged: (v) => _answers[qId] = v,
                        decoration: AppTheme.inputDecoration(
                          context,
                          label: 'Tu respuesta',
                          icon: Icons.short_text_rounded,
                        ),
                      ),
                  ],
                ),
              );
            }),
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _isSubmitting ? null : _submitSurvey,
                icon: const Icon(Icons.send_rounded, size: 17),
                label: Text(_isSubmitting ? 'Enviando...' : 'Finalizar y Enviar Encuesta'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

