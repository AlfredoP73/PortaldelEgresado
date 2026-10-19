import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:file_picker/file_picker.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/network/api_client.dart';

class ExperienceTab extends StatefulWidget {
  const ExperienceTab({super.key});

  @override
  State<ExperienceTab> createState() => _ExperienceTabState();
}

class _ExperienceTabState extends State<ExperienceTab> {
  List<Map<String, dynamic>> _experiences = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchExperiences();
  }

  Future<void> _fetchExperiences() async {
    setState(() => _isLoading = true);
    try {
      final res = await ApiClient.instance.get('/modulo1/profile');
      if (res.data is Map && res.data['experiences'] is List) {
        _experiences = List<Map<String, dynamic>>.from(
          (res.data['experiences'] as List).whereType<Map>().map((e) => Map<String, dynamic>.from(e)),
        );
      }
    } catch (_) {}
    if (mounted) setState(() => _isLoading = false);
  }

  Future<void> _deleteExperience(int id) async {
    try {
      await ApiClient.instance.delete('/modulo1/experiences/$id');
      await _fetchExperiences();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Experiencia laboral eliminada.'), backgroundColor: AppTheme.primaryColor),
        );
      }
    } catch (_) {}
  }

  Future<void> _uploadCertificate(int expId) async {
    final files = await FilePicker.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['pdf'],
    );
    if (files.isEmpty) return;

    final file = files.first;
    try {
      final bytes = await file.readAsBytes();
      final multipart = MultipartFile.fromBytes(bytes, filename: file.name);

      final formData = FormData.fromMap({'file': multipart});
      await ApiClient.instance.post('/modulo1/experiences/$expId/certificate', data: formData);
      await _fetchExperiences();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Certificado laboral adjuntado en PDF.'), backgroundColor: AppTheme.primaryColor),
        );
      }
    } catch (_) {}
  }

  Future<void> _openPdfUrl(String raw) async {
    if (raw.isEmpty) return;
    final full = raw.startsWith('http') ? raw : '${ApiClient.rootUrl}$raw';
    final uri = Uri.tryParse(full);
    if (uri != null) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  void _openAddExperienceModal() {
    final companyCtrl = TextEditingController();
    final positionCtrl = TextEditingController();
    final startCtrl = TextEditingController(text: '2023-01-15');
    final endCtrl = TextEditingController();
    final descCtrl = TextEditingController();
    bool isSubmitting = false;

    showModalBottomSheet(
      context: context,
      backgroundColor: context.surfaceColor,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (modalCtx) {
        return StatefulBuilder(
          builder: (modalCtx, setModalState) {
            return Padding(
              padding: EdgeInsets.only(
                left: 22,
                right: 22,
                top: 20,
                bottom: MediaQuery.of(modalCtx).viewInsets.bottom + 24,
              ),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Agregar Experiencia Laboral',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: context.primaryText),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: positionCtrl,
                      decoration: AppTheme.inputDecoration(
                        context,
                        label: 'Cargo o Posición *',
                        hint: 'Ej. Ingeniero de Software',
                        icon: Icons.work_outline_rounded,
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: companyCtrl,
                      decoration: AppTheme.inputDecoration(
                        context,
                        label: 'Empresa o Entidad *',
                        hint: 'Nombre de la empresa',
                        icon: Icons.business_rounded,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: startCtrl,
                            decoration: AppTheme.inputDecoration(
                              context,
                              label: 'Fecha Inicio (YYYY-MM-DD) *',
                              icon: Icons.event_outlined,
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: TextField(
                            controller: endCtrl,
                            decoration: AppTheme.inputDecoration(
                              context,
                              label: 'Fecha Fin (Opcional)',
                              hint: 'Vacío = Presente',
                              icon: Icons.event_available_outlined,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: descCtrl,
                      maxLines: 3,
                      decoration: AppTheme.inputDecoration(
                        context,
                        label: 'Descripción de Funciones y Logros',
                        hint: 'Describe tus responsabilidades principales...',
                        icon: Icons.description_outlined,
                      ),
                    ),
                    const SizedBox(height: 18),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: isSubmitting
                            ? null
                            : () async {
                                if (positionCtrl.text.trim().isEmpty || companyCtrl.text.trim().isEmpty) return;
                                setModalState(() => isSubmitting = true);
                                try {
                                  await ApiClient.instance.post('/modulo1/experiences', data: {
                                    'company_name': companyCtrl.text.trim(),
                                    'position': positionCtrl.text.trim(),
                                    'start_date': startCtrl.text.trim(),
                                    'end_date': endCtrl.text.trim().isEmpty ? null : endCtrl.text.trim(),
                                    'description': descCtrl.text.trim(),
                                  });
                                  if (modalCtx.mounted) Navigator.pop(modalCtx);
                                  await _fetchExperiences();
                                } catch (_) {
                                  setModalState(() => isSubmitting = false);
                                }
                              },
                        child: isSubmitting
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                              )
                            : const Text('Guardar Experiencia'),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator(color: AppTheme.primaryColor));
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 104),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  'Historial de Experiencia Laboral',
                  style: TextStyle(fontSize: 15.5, fontWeight: FontWeight.w800, color: context.primaryText),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(width: 8),
              ElevatedButton.icon(
                onPressed: _openAddExperienceModal,
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                ),
                icon: const Icon(Icons.add_rounded, size: 17),
                label: const Text('Agregar', style: TextStyle(fontSize: 12.5)),
              ),
            ],
          ),
          const SizedBox(height: 12),

          if (_experiences.isEmpty)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: context.surfaceColor,
                borderRadius: AppTheme.cardRadius,
                border: Border.all(color: context.borderColor),
              ),
              child: Column(
                children: [
                  Icon(Icons.work_history_outlined, size: 44, color: context.tertiaryText),
                  const SizedBox(height: 8),
                  Text(
                    'Aún no has registrado experiencia laboral',
                    style: TextStyle(fontSize: 14.5, fontWeight: FontWeight.w800, color: context.primaryText),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Agrega tus cargos previos o prácticas profesionales y adjunta tus certificados en PDF.',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 12.5, color: context.secondaryText),
                  ),
                ],
              ),
            )
          else
            Column(
              children: _experiences.map((exp) {
                final id = (exp['id'] as num).toInt();
                final position = exp['position']?.toString() ?? 'Cargo';
                final company = exp['company_name']?.toString() ?? 'Empresa';
                final start = exp['start_date']?.toString() ?? '';
                final end = exp['end_date']?.toString() ?? 'Presente';
                final desc = exp['description']?.toString() ?? '';
                final certUrl = exp['certificate_pdf_url']?.toString() ?? '';

                return Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.all(16),
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
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            width: 40,
                            height: 40,
                            decoration: BoxDecoration(
                              color: AppTheme.brand50,
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: const Icon(Icons.work_outline_rounded, color: AppTheme.primaryColor, size: 20),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  position,
                                  style: TextStyle(fontSize: 15.5, fontWeight: FontWeight.w800, color: context.primaryText),
                                ),
                                Text(
                                  company,
                                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppTheme.primaryColor),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  '$start — $end',
                                  style: TextStyle(fontSize: 11.5, color: context.secondaryText, fontWeight: FontWeight.w600),
                                ),
                              ],
                            ),
                          ),
                          IconButton(
                            onPressed: () => _deleteExperience(id),
                            icon: const Icon(Icons.delete_outline_rounded, color: AppTheme.statusRechazado, size: 20),
                          ),
                        ],
                      ),
                      if (desc.isNotEmpty) ...[
                        const SizedBox(height: 10),
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: context.mutedColor,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Text(
                            desc,
                            style: TextStyle(fontSize: 12.5, color: context.secondaryText, height: 1.4),
                          ),
                        ),
                      ],
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          if (certUrl.isNotEmpty)
                            OutlinedButton.icon(
                              onPressed: () => _openPdfUrl(certUrl),
                              icon: const Icon(Icons.picture_as_pdf_outlined, size: 15, color: AppTheme.primaryColor),
                              label: const Text('Ver Certificado PDF', style: TextStyle(fontSize: 12)),
                            ),
                          if (certUrl.isNotEmpty) const SizedBox(width: 8),
                          TextButton.icon(
                            onPressed: () => _uploadCertificate(id),
                            icon: const Icon(Icons.upload_file_rounded, size: 15),
                            label: Text(
                              certUrl.isNotEmpty ? 'Actualizar PDF' : 'Subir Certificado (PDF)',
                              style: const TextStyle(fontSize: 12),
                            ),
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
    );
  }
}
