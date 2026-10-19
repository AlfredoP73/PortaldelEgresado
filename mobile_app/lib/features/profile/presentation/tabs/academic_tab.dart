import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:file_picker/file_picker.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/network/api_client.dart';

class AcademicTab extends StatefulWidget {
  const AcademicTab({super.key});

  @override
  State<AcademicTab> createState() => _AcademicTabState();
}

class _AcademicTabState extends State<AcademicTab> {
  List<Map<String, dynamic>> _academicList = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchAcademic();
  }

  Future<void> _fetchAcademic() async {
    setState(() => _isLoading = true);
    try {
      final res = await ApiClient.instance.get('/modulo1/profile');
      if (res.data is Map && res.data['academic_histories'] is List) {
        _academicList = List<Map<String, dynamic>>.from(
          (res.data['academic_histories'] as List).whereType<Map>().map((e) => Map<String, dynamic>.from(e)),
        );
      }
    } catch (_) {}
    if (mounted) setState(() => _isLoading = false);
  }

  Future<void> _deleteAcademic(int id) async {
    try {
      await ApiClient.instance.delete('/modulo1/academic_histories/$id');
      await _fetchAcademic();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Registro académico eliminado.'), backgroundColor: AppTheme.primaryColor),
        );
      }
    } catch (_) {}
  }

  Future<void> _uploadDiploma(int acadId) async {
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
      await ApiClient.instance.post('/modulo1/education/$acadId/diploma', data: formData);
      await _fetchAcademic();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Diploma / Acta adjuntado en PDF.'), backgroundColor: AppTheme.primaryColor),
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

  void _openAddAcademicModal() {
    final institutionCtrl = TextEditingController(text: 'Universidad Popular del Cesar');
    final degreeCtrl = TextEditingController();
    final startCtrl = TextEditingController(text: '2019-02-01');
    final endCtrl = TextEditingController(text: '2024-06-15');
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
                      'Agregar Historial Académico',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: context.primaryText),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: degreeCtrl,
                      decoration: AppTheme.inputDecoration(
                        context,
                        label: 'Título Obtenido / Estudio *',
                        hint: 'Ej. Especialización en Ingeniería de Software',
                        icon: Icons.school_outlined,
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: institutionCtrl,
                      decoration: AppTheme.inputDecoration(
                        context,
                        label: 'Institución Educativa *',
                        icon: Icons.account_balance_outlined,
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
                              label: 'Fecha Grado (Opcional)',
                              icon: Icons.event_available_outlined,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 18),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: isSubmitting
                            ? null
                            : () async {
                                if (degreeCtrl.text.trim().isEmpty || institutionCtrl.text.trim().isEmpty) return;
                                setModalState(() => isSubmitting = true);
                                try {
                                  await ApiClient.instance.post('/modulo1/academic_histories', data: {
                                    'institution': institutionCtrl.text.trim(),
                                    'degree': degreeCtrl.text.trim(),
                                    'start_date': startCtrl.text.trim(),
                                    'end_date': endCtrl.text.trim().isEmpty ? null : endCtrl.text.trim(),
                                  });
                                  if (modalCtx.mounted) Navigator.pop(modalCtx);
                                  await _fetchAcademic();
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
                            : const Text('Guardar Formación Académica'),
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
                  'Formación Académica y Posgrados',
                  style: TextStyle(fontSize: 15.5, fontWeight: FontWeight.w800, color: context.primaryText),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(width: 8),
              ElevatedButton.icon(
                onPressed: _openAddAcademicModal,
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                ),
                icon: const Icon(Icons.add_rounded, size: 17),
                label: const Text('Agregar', style: TextStyle(fontSize: 12.5)),
              ),
            ],
          ),
          const SizedBox(height: 12),

          if (_academicList.isEmpty)
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
                  Icon(Icons.school_outlined, size: 44, color: context.tertiaryText),
                  const SizedBox(height: 8),
                  Text(
                    'Sin estudios adicionales registrados',
                    style: TextStyle(fontSize: 14.5, fontWeight: FontWeight.w800, color: context.primaryText),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Registra tus títulos de pregrado, posgrado, diplomados o certificaciones junto con tu diploma en PDF.',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 12.5, color: context.secondaryText),
                  ),
                ],
              ),
            )
          else
            Column(
              children: _academicList.map((acad) {
                final id = (acad['id'] as num).toInt();
                final degree = acad['degree']?.toString() ?? 'Título Académico';
                final inst = acad['institution']?.toString() ?? 'Institución';
                final start = acad['start_date']?.toString() ?? '';
                final end = acad['end_date']?.toString() ?? 'En curso';
                final diplomaUrl = acad['diploma_pdf_url']?.toString() ?? '';

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
                            child: const Icon(Icons.school_rounded, color: AppTheme.primaryColor, size: 20),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  degree,
                                  style: TextStyle(fontSize: 15.5, fontWeight: FontWeight.w800, color: context.primaryText),
                                ),
                                Text(
                                  inst,
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
                            onPressed: () => _deleteAcademic(id),
                            icon: const Icon(Icons.delete_outline_rounded, color: AppTheme.statusRechazado, size: 20),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          if (diplomaUrl.isNotEmpty)
                            OutlinedButton.icon(
                              onPressed: () => _openPdfUrl(diplomaUrl),
                              icon: const Icon(Icons.picture_as_pdf_outlined, size: 15, color: AppTheme.primaryColor),
                              label: const Text('Ver Diploma PDF', style: TextStyle(fontSize: 12)),
                            ),
                          if (diplomaUrl.isNotEmpty) const SizedBox(width: 8),
                          TextButton.icon(
                            onPressed: () => _uploadDiploma(id),
                            icon: const Icon(Icons.upload_file_rounded, size: 15),
                            label: Text(
                              diplomaUrl.isNotEmpty ? 'Actualizar Diploma' : 'Subir Diploma (PDF)',
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
