import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:file_picker/file_picker.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/network/api_client.dart';

class PersonalDataTab extends StatefulWidget {
  final VoidCallback? onProfileUpdated;
  const PersonalDataTab({super.key, this.onProfileUpdated});

  @override
  State<PersonalDataTab> createState() => _PersonalDataTabState();
}

class _PersonalDataTabState extends State<PersonalDataTab> {
  final _firstNameCtrl = TextEditingController();
  final _lastNameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _gradYearCtrl = TextEditingController();
  final _bioCtrl = TextEditingController();
  final _newSkillCtrl = TextEditingController();
  final _expectedSalaryCtrl = TextEditingController();

  String _availabilityStatus = 'OPEN_TO_WORK';
  String _preferredModality = 'Cualquiera';
  String _availabilityNotice = 'Inmediata';
  bool _jobAlertsEnabled = true;

  int _selectedProgramId = 1;
  List<Map<String, dynamic>> _programs = [];
  List<Map<String, dynamic>> _allSkills = [];
  Set<int> _selectedSkillIds = {};

  String? _cvUrl;
  bool _isLoading = true;
  bool _isSaving = false;
  bool _isUploadingCv = false;
  bool _isParsingCv = false;
  bool _isEditingSkills = false;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  @override
  void dispose() {
    _firstNameCtrl.dispose();
    _lastNameCtrl.dispose();
    _emailCtrl.dispose();
    _phoneCtrl.dispose();
    _gradYearCtrl.dispose();
    _bioCtrl.dispose();
    _newSkillCtrl.dispose();
    _expectedSalaryCtrl.dispose();
    super.dispose();
  }

  static String _normalizeAvailabilityStatus(dynamic raw) {
    if (raw == null) return 'OPEN_TO_WORK';
    final s = raw.toString().toUpperCase().trim();
    if (s == 'OPEN_TO_WORK' || s == 'OPEN_TO_OFFERS' || s == 'EMPLOYED_CLOSED') {
      return s;
    }
    if (s.contains('OPEN') && s.contains('WORK')) return 'OPEN_TO_WORK';
    if (s.contains('OFFER')) return 'OPEN_TO_OFFERS';
    if (s.contains('CLOSE') || s.contains('EMPLOYED')) return 'EMPLOYED_CLOSED';
    return 'OPEN_TO_WORK';
  }

  static String _normalizeModality(dynamic raw) {
    if (raw == null) return 'Cualquiera';
    final s = raw.toString().trim();
    const valid = ['Cualquiera', 'Remoto', 'Híbrido', 'Presencial'];
    for (final v in valid) {
      if (v.toLowerCase() == s.toLowerCase()) return v;
    }
    return 'Cualquiera';
  }

  static String _normalizeNotice(dynamic raw) {
    if (raw == null) return 'Inmediata';
    final s = raw.toString().trim();
    const valid = ['Inmediata', '1 semana', '2 semanas', '1 mes'];
    for (final v in valid) {
      if (v.toLowerCase() == s.toLowerCase()) return v;
    }
    return 'Inmediata';
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);

    // 1. Load Academic Programs Catalog (Matches GraduateProfile.tsx GET /api/modulo2/programs)
    try {
      final progRes = await ApiClient.instance.get('/modulo2/programs');
      if (progRes.data is List) {
        _programs = List<Map<String, dynamic>>.from(
          (progRes.data as List).whereType<Map>().map((e) => Map<String, dynamic>.from(e)),
        );
      }
    } catch (_) {}

    // 2. Load Skills Catalog
    try {
      final skillsRes = await ApiClient.instance.get('/modulo1/skills');
      if (skillsRes.data is List) {
        _allSkills = List<Map<String, dynamic>>.from(
          (skillsRes.data as List).whereType<Map>().map((e) => Map<String, dynamic>.from(e)),
        );
      }
    } catch (_) {}

    // 3. Load Graduate Profile
    try {
      final profRes = await ApiClient.instance.get('/modulo1/profile');
      if (profRes.data is Map) {
        final d = profRes.data as Map<String, dynamic>;
        _firstNameCtrl.text = d['first_name']?.toString() ?? '';
        _lastNameCtrl.text = d['last_name']?.toString() ?? '';
        _emailCtrl.text = d['email']?.toString() ?? '';
        _phoneCtrl.text = d['phone']?.toString() ?? '';
        _gradYearCtrl.text = d['graduation_year']?.toString() ?? '2024';
        _bioCtrl.text = d['profile_summary']?.toString() ?? '';
        _cvUrl = d['cv_url']?.toString();
        _availabilityStatus = _normalizeAvailabilityStatus(d['availability_status']);
        _preferredModality = _normalizeModality(d['preferred_modality']);
        _availabilityNotice = _normalizeNotice(d['availability_notice']);
        _expectedSalaryCtrl.text = d['expected_salary'] != null ? d['expected_salary'].toString() : '';
        _jobAlertsEnabled = d['job_alerts_enabled'] != null ? (d['job_alerts_enabled'] == true) : true;

        if (d['program_id'] != null) {
          _selectedProgramId = (d['program_id'] as num).toInt();
        } else if (_programs.isNotEmpty) {
          _selectedProgramId = (_programs.first['id'] as num).toInt();
        }

        final userSkills = d['skills'] as List? ?? [];
        final ids = <int>{};
        for (final s in userSkills) {
          if (s is Map) {
            final rawId = s['skill_id'] ?? s['id'];
            if (rawId is num) ids.add(rawId.toInt());
          }
        }
        _selectedSkillIds = ids;
      }
    } catch (_) {}

    if (mounted) setState(() => _isLoading = false);
  }

  Future<void> _saveProfile() async {
    setState(() => _isSaving = true);
    try {
      final expSal = double.tryParse(_expectedSalaryCtrl.text.trim());
      await ApiClient.instance.post('/modulo1/profile', data: {
        'first_name': _firstNameCtrl.text.trim(),
        'last_name': _lastNameCtrl.text.trim(),
        'program_id': _selectedProgramId,
        'graduation_year': int.tryParse(_gradYearCtrl.text.trim()) ?? 2024,
        'phone': _phoneCtrl.text.trim(),
        'profile_summary': _bioCtrl.text.trim(),
        'availability_status': _availabilityStatus,
        'preferred_modality': _preferredModality,
        'availability_notice': _availabilityNotice,
        'expected_salary': expSal,
        'job_alerts_enabled': _jobAlertsEnabled,
      });
      widget.onProfileUpdated?.call();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('¡Datos básicos actualizados correctamente!'),
            backgroundColor: AppTheme.primaryColor,
          ),
        );
      }
    } on DioException catch (e) {
      String msg = 'Error al guardar los datos del perfil.';
      if (e.response?.data != null && e.response?.data is Map) {
        msg = e.response?.data['detail']?.toString() ?? msg;
      }
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(msg), backgroundColor: AppTheme.statusRechazado),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  Future<void> _uploadCvPdf() async {
    final files = await FilePicker.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['pdf'],
    );
    if (files.isEmpty) return;

    final file = files.first;
    setState(() => _isUploadingCv = true);

    try {
      final bytes = await file.readAsBytes();
      final multipart = MultipartFile.fromBytes(bytes, filename: file.name);

      final formData = FormData.fromMap({'file': multipart});
      await ApiClient.instance.post('/modulo1/cv', data: formData);
      await _loadData();
      widget.onProfileUpdated?.call();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('¡Hoja de Vida (PDF) actualizada exitosamente!'),
            backgroundColor: AppTheme.primaryColor,
          ),
        );
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Error al subir la Hoja de Vida en PDF.'),
            backgroundColor: AppTheme.statusRechazado,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isUploadingCv = false);
    }
  }

  Future<void> _parseCvPdf() async {
    final files = await FilePicker.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['pdf'],
    );
    if (files.isEmpty) return;

    final file = files.first;
    setState(() => _isParsingCv = true);

    try {
      final bytes = await file.readAsBytes();
      final multipart = MultipartFile.fromBytes(bytes, filename: file.name);

      final formData = FormData.fromMap({'file': multipart});
      final res = await ApiClient.instance.post('/modulo1/cv/parse', data: formData);

      if (mounted && res.data != null) {
        _showParsedCvDialog(Map<String, dynamic>.from(res.data));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error al analizar CV por reglas: $e'),
            backgroundColor: AppTheme.statusRechazado,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isParsingCv = false);
    }
  }

  void _showParsedCvDialog(Map<String, dynamic> data) {
    final phone = data['phone']?.toString() ?? '';
    final summary = data['profile_summary']?.toString() ?? '';
    final skills = data['skills'] is List ? List<Map<String, dynamic>>.from(data['skills']) : [];
    final experiences = data['experiences'] is List ? List<Map<String, dynamic>>.from(data['experiences']) : [];
    final education = data['academic_histories'] is List ? List<Map<String, dynamic>>.from(data['academic_histories']) : [];

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Row(
          children: const [
            Icon(Icons.rule_folder_rounded, color: AppTheme.brand500),
            SizedBox(width: 8),
            Expanded(child: Text('Datos Extraídos del CV', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold))),
          ],
        ),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AppTheme.brand50.withValues(alpha: 0.5),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppTheme.brand300),
                ),
                child: const Text(
                  'Motor Heurístico y de Reglas UPC (Sin IA externa ni costos). Revisa la información antes de aplicar.',
                  style: TextStyle(fontSize: 11, color: AppTheme.primaryColor),
                ),
              ),
              const SizedBox(height: 12),
              if (phone.isNotEmpty) ...[
                const Text('Teléfono:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                Text(phone, style: const TextStyle(fontSize: 13)),
                const SizedBox(height: 8),
              ],
              if (summary.isNotEmpty) ...[
                const Text('Resumen Profesional:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                Text(summary, style: const TextStyle(fontSize: 12), maxLines: 4, overflow: TextOverflow.ellipsis),
                const SizedBox(height: 8),
              ],
              Text('Habilidades detectadas: ${skills.length}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
              if (skills.isNotEmpty)
                Wrap(
                  spacing: 6,
                  children: skills.map((s) => Chip(
                    label: Text(s['skill_name']?.toString() ?? '', style: const TextStyle(fontSize: 11)),
                    backgroundColor: AppTheme.brand500.withValues(alpha: 0.15),
                  )).toList(),
                ),
              const SizedBox(height: 8),
              Text('Experiencias detectadas: ${experiences.length}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
              Text('Formaciones detectadas: ${education.length}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Descartar'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(ctx);
              if (phone.isNotEmpty) _phoneCtrl.text = phone;
              if (summary.isNotEmpty) _bioCtrl.text = summary;
              for (final sk in skills) {
                final id = sk['skill_id'];
                if (id is int) _selectedSkillIds.add(id);
              }
              for (final exp in experiences) {
                try {
                  await ApiClient.instance.post('/modulo1/experiences', data: {
                    'company_name': exp['company_name'] ?? 'Empresa',
                    'position': exp['position'] ?? 'Cargo',
                    'start_date': exp['start_date'] ?? '2023-01-01',
                    'end_date': exp['end_date'],
                    'description': exp['description'] ?? '',
                  });
                } catch (_) {}
              }
              for (final edu in education) {
                try {
                  await ApiClient.instance.post('/modulo1/academic_histories', data: {
                    'institution': edu['institution'] ?? 'Universidad',
                    'degree': edu['degree'] ?? 'Título',
                    'start_date': edu['start_date'] ?? '2019-01-01',
                    'end_date': edu['end_date'],
                  });
                } catch (_) {}
              }
              await _saveProfile();
              await _saveSkills();
              if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('¡Datos del CV aplicados con éxito a tu perfil!'),
                    backgroundColor: AppTheme.brand500,
                  ),
                );
              }
            },
            child: const Text('Aplicar al Perfil'),
          ),
        ],
      ),
    );
  }

  Future<void> _saveSkills() async {
    setState(() => _isSaving = true);
    try {
      final payload = _selectedSkillIds
          .map((id) => {'skill_id': id, 'proficiency_level': 'Intermedio'})
          .toList();
      await ApiClient.instance.put('/modulo1/profile/skills', data: {'skills': payload});
      widget.onProfileUpdated?.call();
      if (mounted) {
        setState(() => _isEditingSkills = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('¡Habilidades actualizadas! Tu afinidad en vacantes ha sido recalculada.'),
            backgroundColor: AppTheme.primaryColor,
          ),
        );
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Error al actualizar las habilidades.'),
            backgroundColor: AppTheme.statusRechazado,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  Future<void> _createNewSkill() async {
    final name = _newSkillCtrl.text.trim();
    if (name.isEmpty) return;

    try {
      final res = await ApiClient.instance.post('/modulo1/skills', data: {'name': name});
      if (res.data is Map && res.data['id'] != null) {
        final newSkill = Map<String, dynamic>.from(res.data);
        final id = (newSkill['id'] as num).toInt();
        setState(() {
          if (!_allSkills.any((s) => s['id'] == id)) {
            _allSkills.add(newSkill);
          }
          _selectedSkillIds.add(id);
          _newSkillCtrl.clear();
        });
      }
    } catch (_) {}
  }

  Future<void> _openCvUrl() async {
    if (_cvUrl == null || _cvUrl!.isEmpty) return;
    final full = _cvUrl!.startsWith('http') ? _cvUrl! : '${ApiClient.rootUrl}$_cvUrl';
    final uri = Uri.tryParse(full);
    if (uri != null) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator(color: AppTheme.primaryColor));
    }

    final selectedSkillsList = _allSkills
        .where((s) => _selectedSkillIds.contains((s['id'] as num).toInt()))
        .toList();

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 104),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Card 1: Hoja de Vida (CV PDF) ──
          Container(
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
                  children: [
                    Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: AppTheme.brand50,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(Icons.picture_as_pdf_outlined, color: AppTheme.primaryColor, size: 24),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Hoja de Vida Institucional (PDF)',
                            style: TextStyle(fontSize: 14.5, fontWeight: FontWeight.w800, color: context.primaryText),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            (_cvUrl != null && _cvUrl!.isNotEmpty)
                                ? 'Documento PDF cargado y visible para empresas'
                                : 'Aún no has adjuntado tu CV en formato PDF',
                            style: TextStyle(
                              fontSize: 12,
                              color: (_cvUrl != null && _cvUrl!.isNotEmpty) ? AppTheme.brand500 : context.secondaryText,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                    if (_cvUrl != null && _cvUrl!.isNotEmpty)
                      IconButton(
                        tooltip: 'Ver PDF actual',
                        onPressed: _openCvUrl,
                        icon: const Icon(Icons.open_in_new_rounded, color: AppTheme.primaryColor, size: 20),
                      ),
                  ],
                ),
                const SizedBox(height: 14),
                Row(
                  children: [
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: _isUploadingCv ? null : _uploadCvPdf,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.primaryColor,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          padding: const EdgeInsets.symmetric(vertical: 10),
                        ),
                        icon: _isUploadingCv
                            ? const SizedBox(
                                width: 14,
                                height: 14,
                                child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                              )
                            : const Icon(Icons.upload_file_rounded, size: 16, color: Colors.white),
                        label: Text(
                          (_cvUrl != null && _cvUrl!.isNotEmpty) ? 'Actualizar PDF' : 'Subir PDF',
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: _isParsingCv ? null : _parseCvPdf,
                        style: OutlinedButton.styleFrom(
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          padding: const EdgeInsets.symmetric(vertical: 10),
                        ),
                        icon: _isParsingCv
                            ? const SizedBox(
                                width: 14,
                                height: 14,
                                child: CircularProgressIndicator(color: AppTheme.primaryColor, strokeWidth: 2),
                              )
                            : const Icon(Icons.auto_fix_high_rounded, size: 16),
                        label: const Text(
                          'Escanear (Reglas)',
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // ── Card 2: Habilidades y Competencias (Matches GraduateProfile.tsx inline editor) ──
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
                    const Icon(Icons.auto_awesome_outlined, color: AppTheme.primaryColor, size: 20),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Habilidades y Competencias',
                        style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: context.primaryText),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(width: 6),
                    TextButton.icon(
                      style: TextButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        minimumSize: Size.zero,
                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      ),
                      onPressed: () => setState(() => _isEditingSkills = !_isEditingSkills),
                      icon: Icon(_isEditingSkills ? Icons.close_rounded : Icons.edit_outlined, size: 15),
                      label: Text(
                        _isEditingSkills ? 'Cerrar' : 'Editar',
                        style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),

                if (!_isEditingSkills) ...[
                  if (selectedSkillsList.isEmpty)
                    Text(
                      'No has seleccionado habilidades aún. Toca "Editar Habilidades" para activar el motor de afinidad con vacantes.',
                      style: TextStyle(fontSize: 12.5, color: context.secondaryText),
                    )
                  else
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: selectedSkillsList.map((s) {
                        return Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: AppTheme.brand50,
                            borderRadius: BorderRadius.circular(999),
                            border: Border.all(color: AppTheme.brand200),
                          ),
                          child: Text(
                            s['name']?.toString() ?? '',
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: AppTheme.brand800,
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                ] else ...[
                  // Inline Skills Selector + Add New Skill (Exact match to GraduateProfile.tsx)
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: _allSkills.map((s) {
                      final id = (s['id'] as num).toInt();
                      final isSelected = _selectedSkillIds.contains(id);
                      return FilterChip(
                        label: Text(s['name']?.toString() ?? ''),
                        selected: isSelected,
                        selectedColor: AppTheme.brand50,
                        checkmarkColor: AppTheme.primaryColor,
                        labelStyle: TextStyle(
                          fontSize: 12,
                          fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                          color: isSelected ? AppTheme.primaryColor : context.secondaryText,
                        ),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                          side: BorderSide(color: isSelected ? AppTheme.primaryColor : context.borderColor),
                        ),
                        onSelected: (val) {
                          setState(() {
                            if (val) {
                              _selectedSkillIds.add(id);
                            } else {
                              _selectedSkillIds.remove(id);
                            }
                          });
                        },
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _newSkillCtrl,
                          decoration: AppTheme.inputDecoration(
                            context,
                            label: '¿No encuentras tu habilidad? Añádela',
                            hint: 'Ej. Python, Gestión de Proyectos...',
                            icon: Icons.add_circle_outline_rounded,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      OutlinedButton(
                        onPressed: _createNewSkill,
                        child: const Text('Añadir'),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: _isSaving ? null : _saveSkills,
                      icon: const Icon(Icons.save_outlined, size: 18),
                      label: const Text('Guardar Habilidades'),
                    ),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 16),

          // ── Card 3: Datos Personales y Programa Académico ──
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
                  'Información Personal y Académica',
                  style: TextStyle(fontSize: 15.5, fontWeight: FontWeight.w800, color: context.primaryText),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _firstNameCtrl,
                        decoration: AppTheme.inputDecoration(
                          context,
                          label: 'Nombres *',
                          icon: Icons.person_outline_rounded,
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: TextField(
                        controller: _lastNameCtrl,
                        decoration: AppTheme.inputDecoration(
                          context,
                          label: 'Apellidos *',
                          icon: Icons.person_outline_rounded,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                if (_programs.isNotEmpty) ...[
                  DropdownButtonFormField<int>(
                    initialValue: _programs.any((p) => (p['id'] as num).toInt() == _selectedProgramId)
                        ? _selectedProgramId
                        : (_programs.first['id'] as num).toInt(),
                    isExpanded: true,
                    decoration: AppTheme.inputDecoration(
                      context,
                      label: 'Programa Académico UPC *',
                      icon: Icons.school_outlined,
                    ),
                    items: _programs.map((p) {
                      final id = (p['id'] as num).toInt();
                      return DropdownMenuItem<int>(
                        value: id,
                        child: Text(
                          p['name']?.toString() ?? 'Programa $id',
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontSize: 13.5),
                        ),
                      );
                    }).toList(),
                    onChanged: (v) {
                      if (v != null) setState(() => _selectedProgramId = v);
                    },
                  ),
                  const SizedBox(height: 12),
                ],

                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _phoneCtrl,
                        keyboardType: TextInputType.phone,
                        decoration: AppTheme.inputDecoration(
                          context,
                          label: 'Teléfono / Celular',
                          icon: Icons.phone_outlined,
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: TextField(
                        controller: _gradYearCtrl,
                        keyboardType: TextInputType.number,
                        decoration: AppTheme.inputDecoration(
                          context,
                          label: 'Año de Grado *',
                          icon: Icons.calendar_today_outlined,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _bioCtrl,
                  maxLines: 4,
                  decoration: AppTheme.inputDecoration(
                    context,
                    label: 'Resumen Profesional (Perfil)',
                    hint: 'Describe tu perfil profesional, fortalezas e intereses laborales...',
                    icon: Icons.notes_rounded,
                  ),
                ),
                const SizedBox(height: 18),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: _isSaving ? null : _saveProfile,
                    icon: _isSaving
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                          )
                        : const Icon(Icons.check_circle_outline_rounded, size: 18),
                    label: const Text('Guardar Datos Básicos'),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // ── Card 4: Estado #OpenToWork, Preferencias y Alertas Inteligentes ──
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
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: const Color(0xFFDCFCE7),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(Icons.auto_awesome_rounded, color: Color(0xFF15803D), size: 18),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Estado #OpenToWork y Preferencias',
                            style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: context.primaryText),
                          ),
                          Text(
                            'Configura tu disponibilidad para el motor de afinidad IA',
                            style: TextStyle(fontSize: 11.5, color: context.secondaryText),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                DropdownButtonFormField<String>(
                  value: _normalizeAvailabilityStatus(_availabilityStatus),
                  isExpanded: true,
                  decoration: AppTheme.inputDecoration(
                    context,
                    label: 'Estado de Búsqueda Laboral',
                    icon: Icons.work_outline_rounded,
                  ),
                  items: const [
                    DropdownMenuItem(value: 'OPEN_TO_WORK', child: Text('🟢 #OpenToWork · Buscando activamente')),
                    DropdownMenuItem(value: 'OPEN_TO_OFFERS', child: Text('🔵 Abierto a escuchar ofertas')),
                    DropdownMenuItem(value: 'EMPLOYED_CLOSED', child: Text('⚪ No busco empleo por ahora')),
                  ],
                  onChanged: (v) {
                    if (v != null) setState(() => _availabilityStatus = v);
                  },
                ),
                const SizedBox(height: 12),

                Row(
                  children: [
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        value: _normalizeModality(_preferredModality),
                        isExpanded: true,
                        decoration: AppTheme.inputDecoration(
                          context,
                          label: 'Modalidad Preferida',
                          icon: Icons.laptop_mac_rounded,
                        ),
                        items: const [
                          DropdownMenuItem(value: 'Cualquiera', child: Text('Cualquiera')),
                          DropdownMenuItem(value: 'Remoto', child: Text('Remoto')),
                          DropdownMenuItem(value: 'Híbrido', child: Text('Híbrido')),
                          DropdownMenuItem(value: 'Presencial', child: Text('Presencial')),
                        ],
                        onChanged: (v) {
                          if (v != null) setState(() => _preferredModality = v);
                        },
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        value: _normalizeNotice(_availabilityNotice),
                        isExpanded: true,
                        decoration: AppTheme.inputDecoration(
                          context,
                          label: 'Incorporación',
                          icon: Icons.schedule_rounded,
                        ),
                        items: const [
                          DropdownMenuItem(value: 'Inmediata', child: Text('Inmediata')),
                          DropdownMenuItem(value: '1 semana', child: Text('1 semana')),
                          DropdownMenuItem(value: '2 semanas', child: Text('2 semanas')),
                          DropdownMenuItem(value: '1 mes', child: Text('1 mes')),
                        ],
                        onChanged: (v) {
                          if (v != null) setState(() => _availabilityNotice = v);
                        },
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                TextField(
                  controller: _expectedSalaryCtrl,
                  keyboardType: TextInputType.number,
                  decoration: AppTheme.inputDecoration(
                    context,
                    label: 'Aspiración Salarial Mensual (COP)',
                    hint: 'Ej. 3500000',
                    icon: Icons.payments_outlined,
                  ),
                ),
                const SizedBox(height: 14),

                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: context.mutedColor,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: context.borderColor),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.notifications_active_outlined, color: AppTheme.primaryColor, size: 20),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Alertas Inteligentes de Vacantes',
                              style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: context.primaryText),
                            ),
                            Text(
                              'Notificarme cuando haya vacantes con >75% de afinidad',
                              style: TextStyle(fontSize: 11, color: context.secondaryText),
                            ),
                          ],
                        ),
                      ),
                      Switch(
                        value: _jobAlertsEnabled,
                        activeThumbColor: AppTheme.primaryColor,
                        onChanged: (val) => setState(() => _jobAlertsEnabled = val),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: _isSaving ? null : _saveProfile,
                    icon: _isSaving
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                          )
                        : const Icon(Icons.check_circle_outline_rounded, size: 18),
                    label: const Text('Guardar Preferencias Laborales'),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
