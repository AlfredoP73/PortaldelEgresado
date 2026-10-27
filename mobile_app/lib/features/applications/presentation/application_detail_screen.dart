import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:file_picker/file_picker.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/network/api_client.dart';
import 'widgets/applicant_benchmark_card.dart';

class ApplicationDetailScreen extends StatefulWidget {
  final Map<String, dynamic> application;
  const ApplicationDetailScreen({super.key, required this.application});

  @override
  State<ApplicationDetailScreen> createState() => _ApplicationDetailScreenState();
}

class _ApplicationDetailScreenState extends State<ApplicationDetailScreen> {
  late Map<String, dynamic> _app;
  bool _isUpdating = false;

  Map<String, dynamic>? _interviewPrep;
  bool _loadingPrep = false;
  final Map<int, String> _practiceNotes = {};

  @override
  void initState() {
    super.initState();
    _app = Map<String, dynamic>.from(widget.application);
    _fetchInterviewPrep();
  }

  int get _jobOfferId {
    final raw = _app['job_offer_id'] ?? (_app['job_offer'] is Map ? _app['job_offer']['id'] : null);
    return int.tryParse(raw?.toString() ?? '') ?? 0;
  }

  Future<void> _fetchInterviewPrep() async {
    if (_jobOfferId <= 0) return;
    setState(() => _loadingPrep = true);
    try {
      final res = await ApiClient.instance.get('/modulo1/jobs/$_jobOfferId/interview-prep');
      if (res.data is Map && mounted) {
        setState(() => _interviewPrep = Map<String, dynamic>.from(res.data));
      }
    } catch (_) {
      final job = _app['job_offer'] is Map ? _app['job_offer'] as Map : {};
      final title = job['title']?.toString() ?? 'la vacante';
      final company = (job['company'] is Map ? job['company']['name'] : null)?.toString() ?? 'la empresa';
      if (mounted) {
        setState(() {
          _interviewPrep = {
            'questions': [
              {
                'category': 'Motivación y Cultura',
                'question': '¿Por qué te interesa trabajar en $company como $title?',
                'tip': 'Conecta tu formación en la UPC con la misión de la empresa y destaca cómo tus competencias aportan valor inmediato.',
              },
              {
                'category': 'Método STAR (Resolución de Problemas)',
                'question': 'Cuéntanos sobre un reto técnico o académico complejo y cómo lo resolviste.',
                'tip': 'Estructura tu respuesta con Situación, Tarea, Acción y Resultado medible.',
              },
              {
                'category': 'Competencia Técnica',
                'question': '¿Cómo abordarías tus primeros 30 días en el cargo de $title?',
                'tip': 'Menciona comprensión de procesos, alineación con el equipo y entrega de victorias tempranas.',
              },
            ],
            'checklist': [
              'Investiga los proyectos recientes y el sector de la empresa.',
              'Ten lista tu Hoja de Vida y portafolio para compartir pantalla.',
              'Prepara 2 preguntas estratégicas para hacerle al entrevistador al final.',
            ],
          };
        });
      }
    } finally {
      if (mounted) setState(() => _loadingPrep = false);
    }
  }

  Future<void> _scheduleGoogleCalendar(String title, String desc, String rawDate) async {
    try {
      DateTime deadline;
      try {
        deadline = DateTime.parse(rawDate);
      } catch (_) {
        deadline = DateTime.now().add(const Duration(days: 1));
      }
      final start = deadline.subtract(const Duration(hours: 1));

      String fmt(DateTime dt) {
        final s = dt.toUtc().toIso8601String().replaceAll(RegExp(r'[-:]'), '').split('.').first;
        return '${s}Z';
      }
      final dates = '${fmt(start)}/${fmt(deadline)}';

      final job = _app['job_offer'] is Map ? _app['job_offer'] as Map : {};
      final fullTitle = Uri.encodeComponent('$title - ${job['title'] ?? 'Proceso'}');
      final details = Uri.encodeComponent('$desc\nOrganizado por Portal de Empleo UPC.');

      final url = 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=$fullTitle&dates=$dates&details=$details';
      final uri = Uri.tryParse(url);
      if (uri != null) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('No se pudo abrir Google Calendar.'), backgroundColor: AppTheme.statusRechazado),
        );
      }
    }
  }

  Future<void> _refreshApplication() async {
    try {
      final res = await ApiClient.instance.get('/modulo1/my-applications');
      if (res.data is List) {
        for (final item in res.data) {
          if (item is Map && item['id'] == _app['id']) {
            if (mounted) {
              setState(() => _app = Map<String, dynamic>.from(item));
            }
            break;
          }
        }
      }
    } catch (_) {}
  }

  Future<void> _updateSubProcessState(int spId, String newState) async {
    setState(() => _isUpdating = true);
    try {
      // Web ApplicationDetail.tsx uses PUT /api/modulo2/sub-processes/${spId} (with fallback to /modulo1/sub-processes)
      try {
        await ApiClient.instance.put('/modulo2/sub-processes/$spId', data: {'estado': newState});
      } catch (_) {
        await ApiClient.instance.put('/modulo1/sub-processes/$spId', data: {'estado': newState});
      }
      await _refreshApplication();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Estado de la prueba actualizado correctamente.'),
            backgroundColor: AppTheme.primaryColor,
          ),
        );
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('No se pudo actualizar el estado de la prueba.'),
            backgroundColor: AppTheme.statusRechazado,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isUpdating = false);
    }
  }

  Future<void> _uploadSubProcessDeliverable(int spId) async {
    final files = await FilePicker.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['pdf', 'zip', 'doc', 'docx', 'png', 'jpg'],
    );
    if (files.isEmpty) return;

    final picked = files.first;
    setState(() => _isUpdating = true);

    try {
      final bytes = await picked.readAsBytes();
      final multipart = MultipartFile.fromBytes(bytes, filename: picked.name);

      final formData = FormData.fromMap({'file': multipart});
      await ApiClient.instance.post('/modulo2/sub-processes/$spId/upload', data: formData);
      await _refreshApplication();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('¡Archivo entregable subido exitosamente!'),
            backgroundColor: AppTheme.primaryColor,
          ),
        );
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Error al subir el archivo entregable.'),
            backgroundColor: AppTheme.statusRechazado,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isUpdating = false);
    }
  }

  Future<void> _openExternalUrl(String rawUrl) async {
    if (rawUrl.isEmpty) return;
    final fullUrl = rawUrl.startsWith('http') ? rawUrl : '${ApiClient.rootUrl}$rawUrl';
    final uri = Uri.tryParse(fullUrl);
    if (uri != null) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    final job = _app['job_offer'] is Map
        ? Map<String, dynamic>.from(_app['job_offer'])
        : <String, dynamic>{};
    final company = job['company'] is Map
        ? Map<String, dynamic>.from(job['company'])
        : <String, dynamic>{};
    final status = _app['status']?.toString() ?? 'POSTULADO';
    final rejectionReason = _app['rejection_reason']?.toString() ?? '';
    final subProcesses = (_app['sub_processes'] as List? ?? [])
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .toList();

    final LinearGradient bannerGradient = status == 'RECHAZADO'
        ? const LinearGradient(colors: [Color(0xFFEF4444), Color(0xFFDC2626)])
        : status == 'CONTRATADO'
            ? const LinearGradient(colors: [Color(0xFF10B981), Color(0xFF059669)])
            : AppTheme.primaryGradient;

    return Scaffold(
      backgroundColor: context.bgColor,
      appBar: AppBar(
        backgroundColor: context.surfaceColor,
        elevation: 0,
        title: Text(
          'Seguimiento de Postulación',
          style: TextStyle(fontSize: 16.5, fontWeight: FontWeight.w800, color: context.primaryText),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Status Banner Card (Matches ApplicationDetail.tsx) ──
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: bannerGradient,
                borderRadius: AppTheme.cardRadius,
                boxShadow: AppTheme.premiumShadow,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text(
                      'ESTADO: $status',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 10.5,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.8,
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    job['title']?.toString() ?? 'Vacante Laboral',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 20,
                      fontWeight: FontWeight.w900,
                      letterSpacing: -0.4,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    company['name']?.toString() ?? 'Empresa Aliada',
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.9),
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),

            // Rejection Reason Callout (if RECHAZADO)
            if (status == 'RECHAZADO' && rejectionReason.isNotEmpty) ...[
              const SizedBox(height: 14),
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xFFFEF2F2),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFFFECACA)),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.info_outline_rounded, color: Color(0xFFDC2626), size: 20),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Retroalimentación del Proceso',
                            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xFF991B1B)),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            rejectionReason,
                            style: const TextStyle(fontSize: 12.5, color: Color(0xFFB91C1C)),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 16),

            // ── Pitch / Carta de Presentación Enviada ──
            if ((_app['cover_letter']?.toString().trim().isNotEmpty ?? false)) ...[
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppTheme.brand50,
                  borderRadius: AppTheme.cardRadius,
                  border: Border.all(color: AppTheme.brand200),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.auto_awesome_rounded, color: AppTheme.primaryColor, size: 16),
                        const SizedBox(width: 6),
                        Text(
                          'MI PITCH / CARTA DE PRESENTACIÓN ENVIADA',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 0.7,
                            color: AppTheme.brand800,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      '"${_app['cover_letter']}"',
                      style: TextStyle(
                        fontSize: 13,
                        fontStyle: FontStyle.italic,
                        color: context.primaryText,
                        height: 1.45,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
            ],

            // ── Radiografía de Competencia en Vivo (Benchmark Anónimo en Tiempo Real) ──
            if (_jobOfferId > 0) ...[
              ApplicantBenchmarkCard(
                jobOfferId: _jobOfferId,
                jobTitle: job['title']?.toString(),
              ),
              const SizedBox(height: 16),
            ],

            // ── 4-Stage Pipeline Timeline (Matches ApplicationDetail.tsx) ──
            Container(
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
                    'ETAPAS DEL PROCESO DE SELECCIÓN',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.8,
                      color: context.secondaryText,
                    ),
                  ),
                  const SizedBox(height: 16),
                  _buildTimelineStage(
                    step: 1,
                    title: 'Postulado',
                    subtitle: 'Tu hoja de vida fue enviada exitosamente.',
                    isCompleted: true,
                    isLast: false,
                  ),
                  _buildTimelineStage(
                    step: 2,
                    title: 'HdV Vista / En Evaluación',
                    subtitle: 'La empresa ha revisado tu perfil profesional.',
                    isCompleted: ['EN_EVALUACION', 'ENTREVISTADO', 'CONTRATADO', 'RECHAZADO'].contains(status),
                    isLast: false,
                  ),
                  _buildTimelineStage(
                    step: 3,
                    title: 'Pruebas y Entrevistas',
                    subtitle: 'Evaluación técnica, psicotécnica o entrevista.',
                    isCompleted: ['ENTREVISTADO', 'CONTRATADO', 'RECHAZADO'].contains(status),
                    isLast: false,
                  ),
                  _buildTimelineStage(
                    step: 4,
                    title: status == 'CONTRATADO'
                        ? '¡Contratado!'
                        : status == 'RECHAZADO'
                            ? 'Proceso Finalizado (No seleccionado)'
                            : 'Decisión Final',
                    subtitle: 'Cierre y notificación del proceso de selección.',
                    isCompleted: ['CONTRATADO', 'RECHAZADO'].contains(status),
                    isLast: true,
                    isError: status == 'RECHAZADO',
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // ── Pruebas y Evaluaciones (Sub-Processes - Exact match to ApplicationDetail.tsx) ──
            Container(
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
                      const Icon(Icons.assignment_outlined, color: AppTheme.primaryColor, size: 20),
                      const SizedBox(width: 8),
                      Text(
                        'Pruebas y Evaluaciones Asignadas',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: context.primaryText),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  if (subProcesses.isEmpty)
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: context.mutedColor,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        'La empresa aún no ha asignado pruebas adicionales ni enlaces de evaluación a esta postulación.',
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 12.5, color: context.secondaryText),
                      ),
                    )
                  else
                    Column(
                      children: subProcesses.map((sp) {
                        final spId = int.tryParse(sp['id']?.toString() ?? '') ?? 0;
                        final tipo = (sp['tipo'] ?? sp['tipo_prueba'] ?? 'Prueba').toString();
                        final nombre = (sp['nombre'] ?? sp['titulo'] ?? 'Evaluación').toString();
                        final desc = sp['descripcion']?.toString() ?? '';
                        final estado = (sp['estado'] ?? 'pendiente').toString().toLowerCase();
                        final fechaLimite = sp['fecha_limite']?.toString() ?? '';
                        final enlace = (sp['enlace_adjunto'] ?? sp['enlace_prueba'] ?? '').toString();
                        final archivoResp = sp['archivo_respuesta']?.toString() ?? '';
                        final score = int.tryParse(sp['score']?.toString() ?? '');

                        final isDone = estado == 'completado' || estado == 'aprobado';

                        return Container(
                          margin: const EdgeInsets.only(bottom: 12),
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: context.mutedColor,
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(
                              color: isDone ? AppTheme.brand300 : context.borderColor,
                            ),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                    decoration: BoxDecoration(
                                      color: AppTheme.brand50,
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: Text(
                                      tipo.toUpperCase(),
                                      style: const TextStyle(
                                        fontSize: 10,
                                        fontWeight: FontWeight.w800,
                                        color: AppTheme.primaryColor,
                                      ),
                                    ),
                                  ),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                    decoration: BoxDecoration(
                                      color: isDone
                                          ? const Color(0xFFDCFCE7)
                                          : const Color(0xFFFEF3C7),
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: Text(
                                      estado.toUpperCase(),
                                      style: TextStyle(
                                        fontSize: 10,
                                        fontWeight: FontWeight.w800,
                                        color: isDone
                                            ? const Color(0xFF15803D)
                                            : const Color(0xFFB45309),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 8),
                              Text(
                                nombre,
                                style: TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w800,
                                  color: context.primaryText,
                                ),
                              ),
                              if (fechaLimite.isNotEmpty) ...[
                                const SizedBox(height: 4),
                                Text(
                                  'Fecha límite: ${fechaLimite.split('T').first}',
                                  style: TextStyle(fontSize: 11.5, color: context.secondaryText, fontWeight: FontWeight.w600),
                                ),
                              ],
                              if (desc.isNotEmpty) ...[
                                const SizedBox(height: 6),
                                Text(
                                  desc,
                                  style: TextStyle(fontSize: 12.5, color: context.secondaryText, height: 1.4),
                                ),
                              ],
                              if (score != null && score > 0) ...[
                                const SizedBox(height: 8),
                                Row(
                                  children: [
                                    const Text('Calificación: ', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                                    ...List.generate(5, (i) {
                                      return Icon(
                                        i < score ? Icons.star_rounded : Icons.star_border_rounded,
                                        size: 16,
                                        color: AppTheme.accentAmber,
                                      );
                                    }),
                                  ],
                                ),
                              ],
                              if (archivoResp.isNotEmpty) ...[
                                const SizedBox(height: 8),
                                InkWell(
                                  onTap: () => _openExternalUrl(archivoResp),
                                  child: const Row(
                                    children: [
                                      Icon(Icons.attach_file_rounded, size: 15, color: AppTheme.primaryColor),
                                      SizedBox(width: 4),
                                      Text(
                                        'Ver archivo entregable enviado',
                                        style: TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w700,
                                          color: AppTheme.primaryColor,
                                          decoration: TextDecoration.underline,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                              const SizedBox(height: 12),

                              // Action Buttons (Empezar Prueba / Subir Archivo / Ya la completé)
                              Wrap(
                                spacing: 8,
                                runSpacing: 8,
                                children: [
                                  if (fechaLimite.isNotEmpty)
                                    OutlinedButton.icon(
                                      onPressed: () => _scheduleGoogleCalendar(nombre, desc, fechaLimite),
                                      icon: const Icon(Icons.calendar_month_outlined, size: 15, color: Color(0xFF2563EB)),
                                      label: const Text('Google Calendar', style: TextStyle(fontSize: 12, color: Color(0xFF1D4ED8))),
                                    ),
                                  if (enlace.isNotEmpty)
                                    OutlinedButton.icon(
                                      onPressed: _isUpdating
                                          ? null
                                          : () async {
                                              if (estado == 'pendiente') {
                                                await _updateSubProcessState(spId, 'en_progreso');
                                              }
                                              await _openExternalUrl(enlace);
                                            },
                                      icon: const Icon(Icons.open_in_new_rounded, size: 15),
                                      label: Text(
                                        estado == 'pendiente' ? 'Empezar Prueba' : 'Abrir Enlace',
                                        style: const TextStyle(fontSize: 12),
                                      ),
                                    ),
                                  OutlinedButton.icon(
                                    onPressed: _isUpdating ? null : () => _uploadSubProcessDeliverable(spId),
                                    icon: const Icon(Icons.upload_file_rounded, size: 15),
                                    label: Text(
                                      archivoResp.isNotEmpty ? 'Reemplazar Archivo' : 'Subir Archivo',
                                      style: const TextStyle(fontSize: 12),
                                    ),
                                  ),
                                  if (!isDone)
                                    ElevatedButton.icon(
                                      onPressed: _isUpdating ? null : () => _updateSubProcessState(spId, 'completado'),
                                      style: ElevatedButton.styleFrom(
                                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                                      ),
                                      icon: const Icon(Icons.check_circle_outline_rounded, size: 15),
                                      label: const Text('Ya la completé', style: TextStyle(fontSize: 12)),
                                    ),
                                ],
                              ),
                            ],
                          ),
                        );
                      }).toList(),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // ── SIMULADOR Y PREPARADOR DE ENTREVISTA IA (MÉTODO STAR) ──
            _buildInterviewPrepSection(),
          ],
        ),
      ),
    );
  }

  Widget _buildInterviewPrepSection() {
    final questions = (_interviewPrep?['questions'] as List? ?? []).whereType<Map>().toList();
    final checklist = (_interviewPrep?['checklist'] as List? ?? []).whereType<String>().toList();

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
                  gradient: const LinearGradient(colors: [Color(0xFF22A86E), Color(0xFF0E4832)]),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.psychology_rounded, color: Colors.white, size: 18),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Simulador de Entrevista IA',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: context.primaryText),
                    ),
                    Text(
                      'Preguntas personalizadas y Método STAR',
                      style: TextStyle(fontSize: 11.5, color: context.secondaryText),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFFDCFCE7),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: const Text(
                  'Método STAR',
                  style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: Color(0xFF15803D)),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),

          if (_loadingPrep && _interviewPrep == null)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 16),
              child: Center(child: CircularProgressIndicator(color: AppTheme.primaryColor)),
            )
          else ...[
            ...questions.asMap().entries.map((entry) {
              final idx = entry.key;
              final q = entry.value;
              final cat = q['category']?.toString() ?? 'Pregunta';
              final question = q['question']?.toString() ?? '';
              final tip = q['tip']?.toString() ?? '';

              return Container(
                margin: const EdgeInsets.only(bottom: 12),
                decoration: BoxDecoration(
                  color: context.mutedColor,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: context.borderColor),
                ),
                child: Theme(
                  data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
                  child: ExpansionTile(
                    initiallyExpanded: idx == 0,
                    tilePadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                    childrenPadding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
                    title: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: AppTheme.brand50,
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(color: AppTheme.brand200),
                          ),
                          child: Text(
                            cat.toUpperCase(),
                            style: const TextStyle(fontSize: 9.5, fontWeight: FontWeight.w800, color: AppTheme.primaryColor),
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          question,
                          style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w800, color: context.primaryText),
                        ),
                      ],
                    ),
                    children: [
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xFFDCFCE7).withValues(alpha: 0.6),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: const Color(0xFF86EFAC)),
                        ),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Icon(Icons.lightbulb_outline_rounded, size: 16, color: Color(0xFF15803D)),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                tip,
                                style: const TextStyle(fontSize: 12, color: Color(0xFF065F46), height: 1.4),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 10),
                      TextField(
                        maxLines: 3,
                        minLines: 2,
                        style: TextStyle(fontSize: 12.5, color: context.primaryText),
                        onChanged: (val) => _practiceNotes[idx] = val,
                        decoration: InputDecoration(
                          hintText: 'Borrador personal: Anota tus ideas (Situación, Tarea, Acción, Resultado)...',
                          hintStyle: TextStyle(fontSize: 11.5, color: context.secondaryText),
                          filled: true,
                          fillColor: context.surfaceColor,
                          contentPadding: const EdgeInsets.all(10),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(10),
                            borderSide: BorderSide(color: context.borderColor),
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(10),
                            borderSide: BorderSide(color: context.borderColor),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }),

            if (checklist.isNotEmpty) ...[
              const SizedBox(height: 8),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: context.mutedColor,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: context.borderColor),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'CHECKLIST ANTES DE TU ENTREVISTA',
                      style: TextStyle(
                        fontSize: 10.5,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.7,
                        color: context.secondaryText,
                      ),
                    ),
                    const SizedBox(height: 8),
                    ...checklist.map((item) => Padding(
                          padding: const EdgeInsets.only(bottom: 6),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Icon(Icons.check_circle_rounded, size: 15, color: AppTheme.primaryColor),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  item,
                                  style: TextStyle(fontSize: 12, color: context.primaryText, height: 1.3),
                                ),
                              ),
                            ],
                          ),
                        )),
                  ],
                ),
              ),
            ],
          ],
        ],
      ),
    );
  }

  Widget _buildTimelineStage({
    required int step,
    required String title,
    required String subtitle,
    required bool isCompleted,
    required bool isLast,
    bool isError = false,
  }) {
    final Color activeColor = isError ? AppTheme.statusRechazado : AppTheme.primaryColor;

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Column(
            children: [
              Container(
                width: 28,
                height: 28,
                decoration: BoxDecoration(
                  color: isCompleted ? activeColor : context.mutedColor,
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: isCompleted ? activeColor : context.borderColor,
                    width: 2,
                  ),
                ),
                alignment: Alignment.center,
                child: isCompleted
                    ? Icon(
                        isError ? Icons.close_rounded : Icons.check_rounded,
                        color: Colors.white,
                        size: 16,
                      )
                    : Text(
                        '$step',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w800,
                          color: context.secondaryText,
                        ),
                      ),
              ),
              if (!isLast)
                Expanded(
                  child: Container(
                    width: 2,
                    margin: const EdgeInsets.symmetric(vertical: 4),
                    color: isCompleted ? activeColor : context.borderColor,
                  ),
                ),
            ],
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Padding(
              padding: EdgeInsets.only(bottom: isLast ? 0 : 18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w800,
                      color: isCompleted ? context.primaryText : context.secondaryText,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: TextStyle(fontSize: 12, color: context.secondaryText),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
