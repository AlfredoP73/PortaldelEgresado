import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import 'package:dio/dio.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:jwt_decoder/jwt_decoder.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/network/api_client.dart';

class PersonalDataTab extends StatefulWidget {
  final VoidCallback? onUpdate;
  const PersonalDataTab({super.key, this.onUpdate});

  @override
  State<PersonalDataTab> createState() => _PersonalDataTabState();
}

class _PersonalDataTabState extends State<PersonalDataTab> with AutomaticKeepAliveClientMixin {
  final _formKey = GlobalKey<FormState>();
  bool _isLoading = false;

  final TextEditingController _firstNameCtrl = TextEditingController();
  final TextEditingController _lastNameCtrl = TextEditingController();
  final TextEditingController _emailCtrl = TextEditingController();
  final TextEditingController _phoneCtrl = TextEditingController();
  final TextEditingController _gradYearCtrl = TextEditingController();
  final TextEditingController _bioCtrl = TextEditingController();
  
  bool _isUploadingCv = false;
  String? _cvUrl;
  List<dynamic> _skills = [];
  List<dynamic> _allSkills = [];

  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    setState(() => _isLoading = true);
    
    // Attempt to load email from token
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('jwt_token');
      if (token != null && token.isNotEmpty) {
        Map<String, dynamic> decodedToken = JwtDecoder.decode(token);
        _emailCtrl.text = decodedToken['sub'] ?? '';
      }
    } catch (_) {}

    try {
      final skillsRes = await ApiClient.instance.get('/modulo1/skills');
      if (skillsRes.data != null) {
        _allSkills = skillsRes.data;
      }
    } catch (_) {}

    try {
      final response = await ApiClient.instance.get('/modulo1/profile');
      if (response.data != null) {
        final data = response.data;
        _firstNameCtrl.text = data['first_name'] ?? '';
        _lastNameCtrl.text = data['last_name'] ?? '';
        _phoneCtrl.text = data['phone'] ?? '';
        _gradYearCtrl.text = data['graduation_year']?.toString() ?? '';
        _bioCtrl.text = data['profile_summary'] ?? '';
        _cvUrl = data['cv_url'];
        if (data['skills'] != null) {
          _skills = List<dynamic>.from(data['skills']);
        }
      }
    } catch (e) {
      if (e is DioException && e.response?.statusCode == 404) {
        // Nuevo perfil
      } else if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('Error al cargar perfil'),
          backgroundColor: AppTheme.accentPink,
        ));
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _uploadCv() async {
    try {
      PlatformFile? result = await FilePicker.pickFile(
        type: FileType.custom,
        allowedExtensions: ['pdf'],
      );

      if (result != null) {
        setState(() => _isUploadingCv = true);
        
        final filename = result.name;
        final bytes = await result.readAsBytes();

        FormData formData = FormData.fromMap({
          "file": MultipartFile.fromBytes(bytes, filename: filename),
        });

        final res = await ApiClient.instance.post(
          '/modulo1/cv', 
          data: formData,
        );

        setState(() {
          _cvUrl = res.data['cv_url'];
        });

        if (mounted) {
          widget.onUpdate?.call();
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Hoja de vida subida exitosamente'), backgroundColor: AppTheme.primaryColor),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error al subir la hoja de vida'), backgroundColor: AppTheme.statusRechazado),
        );
      }
    } finally {
      if (mounted) setState(() => _isUploadingCv = false);
    }
  }

  Future<void> _previewDocument(String url) async {
    String fullUrl = url;
    if (url.startsWith('/')) {
      String base = ApiClient.instance.options.baseUrl.replaceAll(RegExp(r'/api$'), '');
      fullUrl = base + url;
    }
    final uri = Uri.parse(fullUrl);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('No se pudo abrir el documento.'), backgroundColor: AppTheme.statusRechazado),
        );
      }
    }
  }

  Future<void> _saveProfile() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);
    try {
      await ApiClient.instance.post('/modulo1/profile', data: {
        'first_name': _firstNameCtrl.text,
        'last_name': _lastNameCtrl.text,
        'phone': _phoneCtrl.text,
        'graduation_year': int.tryParse(_gradYearCtrl.text) ?? 0,
        'profile_summary': _bioCtrl.text,
        'program_id': 1,
      });

      if (mounted) {
        widget.onUpdate?.call();
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('Datos guardados correctamente'),
          backgroundColor: AppTheme.primaryColor,
        ));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('Error al guardar: $e'),
          backgroundColor: AppTheme.accentPink,
        ));
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    return SingleChildScrollView(
      padding: EdgeInsets.all(24),
      child: Form(
        key: _formKey,
        child: Column(
          children: [
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: _firstNameCtrl,
                    decoration: AppTheme.inputDecoration(context, label: 'NOMBRES', icon: Icons.person_outline),
                    validator: (v) => v!.isEmpty ? 'Requerido' : null,
                  ),
                ),
                SizedBox(width: 16),
                Expanded(
                  child: TextFormField(
                    controller: _lastNameCtrl,
                    decoration: AppTheme.inputDecoration(context, label: 'APELLIDOS', icon: Icons.person_outline),
                    validator: (v) => v!.isEmpty ? 'Requerido' : null,
                  ),
                ),
              ],
            ),
            SizedBox(height: 16),
            TextFormField(
              controller: _emailCtrl,
              readOnly: true,
              decoration: AppTheme.inputDecoration(context,  label: 'CORREO ELECTRÓNICO', icon: Icons.email_outlined),
            ),
            SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: _phoneCtrl,
                    decoration: AppTheme.inputDecoration(context,  label: 'TELÉFONO', icon: Icons.phone_outlined),
                  ),
                ),
                SizedBox(width: 16),
                Expanded(
                  child: TextFormField(
                    controller: _gradYearCtrl,
                    decoration: AppTheme.inputDecoration(context,  label: 'AÑO DE GRADO', icon: Icons.workspace_premium_outlined),
                    keyboardType: TextInputType.number,
                  ),
                ),
              ],
            ),
            SizedBox(height: 16),
            TextFormField(
              controller: _bioCtrl,
              decoration: AppTheme.inputDecoration(context,  label: 'PERFIL PROFESIONAL (BIO)', icon: Icons.description_outlined),
              maxLines: 4,
            ),
            SizedBox(height: 24),
            Container(
              padding: EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: context.surfaceColor,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: context.isDark ? Colors.white.withValues(alpha: 0.05) : Colors.black.withValues(alpha: 0.05)),
              ),
              child: Row(
                children: [
                  Icon(Icons.picture_as_pdf_rounded, color: AppTheme.primaryColor, size: 28),
                  SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Hoja de Vida (CV)', style: TextStyle(fontWeight: FontWeight.w700, color: context.primaryText)),
                        Text(
                          _cvUrl != null ? 'CV subido correctamente' : 'Sube tu CV en formato PDF',
                          style: TextStyle(fontSize: 12, color: context.secondaryText),
                        ),
                      ],
                    ),
                  ),
                  if (_cvUrl != null)
                    IconButton(
                      icon: Icon(Icons.remove_red_eye_outlined, color: AppTheme.primaryColor),
                      onPressed: () => _previewDocument(_cvUrl!),
                      tooltip: 'Previsualizar',
                    ),
                  ElevatedButton(
                    onPressed: _isUploadingCv ? null : _uploadCv,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: _cvUrl != null ? AppTheme.accentBlue.withValues(alpha: 0.1) : AppTheme.primaryColor.withValues(alpha: 0.1),
                      foregroundColor: _cvUrl != null ? AppTheme.accentBlue : (context.isDark ? AppTheme.primaryColor : AppTheme.primaryDark),
                      elevation: 0,
                    ),
                    child: _isUploadingCv 
                        ? SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                        : Text(_cvUrl != null ? 'Actualizar' : 'Subir'),
                  ),
                ],
              ),
            ),
            SizedBox(height: 24),
            Container(
              padding: EdgeInsets.all(16),
              width: double.infinity,
              decoration: BoxDecoration(
                color: context.surfaceColor,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: context.isDark ? Colors.white.withValues(alpha: 0.05) : Colors.black.withValues(alpha: 0.05)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Icon(Icons.star_rounded, color: AppTheme.primaryColor),
                          SizedBox(width: 12),
                          Text('Mis Habilidades', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16, color: context.primaryText)),
                        ],
                      ),
                      TextButton.icon(
                        icon: Icon(Icons.edit, size: 16),
                        label: Text('Editar'),
                        style: TextButton.styleFrom(
                          foregroundColor: AppTheme.primaryColor,
                          padding: EdgeInsets.zero,
                          minimumSize: Size(50, 30),
                        ),
                        onPressed: () async {
                          final result = await showModalBottomSheet(
                            context: context,
                            isScrollControlled: true,
                            backgroundColor: context.surfaceColor,
                            shape: const RoundedRectangleBorder(
                              borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
                            ),
                            builder: (ctx) => _SkillsManager(currentSkills: _skills),
                          );
                          if (result == true) {
                            _loadProfile();
                            widget.onUpdate?.call();
                          }
                        },
                      ),
                    ],
                  ),
                  SizedBox(height: 12),
                  if (_skills.isEmpty)
                    Text('No has registrado habilidades. Puedes editarlas desde la versión web.', style: TextStyle(color: context.secondaryText, fontSize: 13))
                  else
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: _skills.map((s) {
                        String name = 'Skill';
                        try {
                          final match = _allSkills.firstWhere((as) => as['id'] == s['skill_id']);
                          name = match['name'] ?? 'Skill';
                        } catch (_) {}
                        return Chip(
                          label: Text(name, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                          backgroundColor: AppTheme.primaryColor.withValues(alpha: 0.1),
                          labelStyle: TextStyle(color: context.isDark ? AppTheme.primaryColor : AppTheme.primaryDark),
                          side: BorderSide.none,
                        );
                      }).toList(),
                    ),
                ],
              ),
            ),
            SizedBox(height: 32),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _isLoading ? null : _saveProfile,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primaryColor,
                  padding: EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: _isLoading
                    ? SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: context.surfaceColor, strokeWidth: 2))
                    : Text('Guardar Datos', style: TextStyle(fontWeight: FontWeight.w700)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SkillsManager extends StatefulWidget {
  final List<dynamic> currentSkills;
  const _SkillsManager({required this.currentSkills});

  @override
  State<_SkillsManager> createState() => _SkillsManagerState();
}

class _SkillsManagerState extends State<_SkillsManager> {
  bool _isLoading = true;
  List<dynamic> _allSkills = [];
  List<int> _selectedIds = [];

  @override
  void initState() {
    super.initState();
    _selectedIds = widget.currentSkills.map((s) => s['skill_id'] as int).toList();
    _loadAllSkills();
  }

  Future<void> _loadAllSkills() async {
    try {
      final res = await ApiClient.instance.get('/modulo1/skills');
      setState(() {
        _allSkills = res.data;
        _isLoading = false;
      });
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error al cargar habilidades')));
      }
    }
  }

  Future<void> _saveSkills() async {
    setState(() => _isLoading = true);
    try {
      final formattedSkills = _selectedIds.map((id) => {
        'skill_id': id,
        'proficiency_level': 'Intermedio',
      }).toList();

      await ApiClient.instance.put('/modulo1/profile/skills', data: {
        'skills': formattedSkills,
      });
      if (mounted) {
        Navigator.pop(context, true);
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        String errorMsg = 'Error al guardar habilidades';
        if (e is DioException && e.response?.data != null && e.response?.data['detail'] != null) {
          errorMsg = e.response!.data['detail'];
        }
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(errorMsg), backgroundColor: AppTheme.accentPink));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.7,
      padding: EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Gestionar Habilidades', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: context.primaryText)),
              IconButton(icon: Icon(Icons.close), onPressed: () => Navigator.pop(context)),
            ],
          ),
          SizedBox(height: 16),
          Expanded(
            child: _isLoading 
              ? Center(child: CircularProgressIndicator())
              : SingleChildScrollView(
                  child: Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: _allSkills.map((skill) {
                      final isSelected = _selectedIds.contains(skill['id']);
                      return FilterChip(
                        label: Text(skill['name'] ?? ''),
                        selected: isSelected,
                        selectedColor: AppTheme.primaryColor.withValues(alpha: 0.2),
                        checkmarkColor: AppTheme.primaryColor,
                        onSelected: (val) {
                          setState(() {
                            if (val) {
                              _selectedIds.add(skill['id']);
                            } else {
                              _selectedIds.remove(skill['id']);
                            }
                          });
                        },
                      );
                    }).toList(),
                  ),
                ),
          ),
          SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _isLoading ? null : _saveSkills,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primaryColor,
                padding: EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: _isLoading 
                ? SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : Text('Guardar Habilidades'),
            ),
          ),
        ],
      ),
    );
  }
}
