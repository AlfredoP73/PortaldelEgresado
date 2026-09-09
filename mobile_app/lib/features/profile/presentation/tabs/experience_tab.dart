import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import 'package:dio/dio.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/network/api_client.dart';

class ExperienceTab extends StatefulWidget {
  final VoidCallback? onUpdate;
  const ExperienceTab({super.key, this.onUpdate});

  @override
  State<ExperienceTab> createState() => _ExperienceTabState();
}

class _ExperienceTabState extends State<ExperienceTab> with AutomaticKeepAliveClientMixin {
  List<dynamic> _experiences = [];
  bool _isLoading = true;

  @override
  bool get wantKeepAlive => true;

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
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('No se pudo abrir el documento.'), backgroundColor: AppTheme.accentPink));
      }
    }
  }

  @override
  void initState() {
    super.initState();
    _loadExperiences();
  }

  Future<void> _loadExperiences() async {
    setState(() => _isLoading = true);
    try {
      final response = await ApiClient.instance.get('/modulo1/profile');
      if (response.data != null && response.data['experiences'] != null) {
        setState(() {
          _experiences = response.data['experiences'];
        });
      }
    } catch (e) {
      if (e is DioException && e.response?.statusCode == 404) {
        // Ignorar si el perfil no existe
      } else if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('Error al cargar experiencia: $e'),
          backgroundColor: AppTheme.accentPink,
        ));
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _addExperience() async {
    final result = await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: context.surfaceColor,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => const _AddExperienceForm(),
    );
    if (result == true) {
      _loadExperiences();
      widget.onUpdate?.call();
    }
  }

  Future<void> _deleteExperience(int id) async {
    setState(() => _isLoading = true);
    try {
      await ApiClient.instance.delete('/modulo1/experiences/$id');
      _loadExperiences();
      widget.onUpdate?.call();
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('Error al eliminar'),
          backgroundColor: AppTheme.statusRechazado,
        ));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    return Stack(
      children: [
        if (_isLoading)
          Center(child: CircularProgressIndicator(color: AppTheme.primaryColor))
        else if (_experiences.isEmpty)
          Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.work_history_rounded, size: 64, color: context.secondaryText.withValues(alpha: 0.3)),
                SizedBox(height: 16),
                Text('No hay experiencia registrada', style: TextStyle(color: context.secondaryText)),
              ],
            ),
          )
        else
          ListView.builder(
            padding: EdgeInsets.only(left: 20, right: 20, top: 20, bottom: 100),
            itemCount: _experiences.length,
            itemBuilder: (context, index) {
              final exp = _experiences[index];
              return Container(
                margin: EdgeInsets.only(bottom: 16),
                padding: EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: context.surfaceColor,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [BoxShadow(color: context.isDark ? Colors.white.withValues(alpha: 0.05) : Colors.black.withValues(alpha: 0.05), blurRadius: 10)],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          width: 48,
                          height: 48,
                          decoration: BoxDecoration(color: AppTheme.primaryColor.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12)),
                          child: Icon(Icons.business_center, color: AppTheme.primaryColor),
                        ),
                        SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(exp['position'] ?? '', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16, color: context.primaryText)),
                              Text(exp['company_name'] ?? '', style: TextStyle(color: context.secondaryText, fontSize: 14)),
                            ],
                          ),
                        ),
                        if (exp['certificate_url'] != null)
                          IconButton(
                            icon: Icon(Icons.remove_red_eye_outlined, color: AppTheme.primaryColor),
                            onPressed: () => _previewDocument(exp['certificate_url']),
                            tooltip: 'Ver Certificado',
                          ),
                        IconButton(
                          icon: Icon(Icons.delete_outline_rounded, color: Color(0xFFEF4444), size: 20),
                          onPressed: () {
                            showDialog(
                              context: context,
                              builder: (ctx) => AlertDialog(
                                title: Text('Eliminar experiencia'),
                                content: Text('¿Estás seguro de que deseas eliminar este registro?'),
                                actions: [
                                  TextButton(onPressed: () => Navigator.pop(ctx), child: Text('Cancelar')),
                                  TextButton(
                                    onPressed: () {
                                      Navigator.pop(ctx);
                                      _deleteExperience(exp['id']);
                                    }, 
                                    child: Text('Eliminar', style: TextStyle(color: AppTheme.statusRechazado)),
                                  ),
                                ],
                              ),
                            );
                          },
                        ),
                      ],
                    ),
                    SizedBox(height: 12),
                    Row(
                      children: [
                        Icon(Icons.calendar_today_rounded, size: 12, color: context.secondaryText),
                        SizedBox(width: 4),
                        Text(
                          '${exp['start_date'] ?? ''} - ${exp['end_date'] ?? 'Presente'}', 
                          style: TextStyle(fontSize: 11, color: context.secondaryText, fontWeight: FontWeight.w600)
                        ),
                      ],
                    ),
                    if (exp['description'] != null && exp['description'].toString().isNotEmpty) ...[
                      SizedBox(height: 12),
                      Text(exp['description'], style: TextStyle(fontSize: 13, color: context.secondaryText)),
                    ],
                  ],
                ),
              );
            },
          ),
          
        Positioned(
          bottom: 20,
          right: 20,
          child: FloatingActionButton(
            heroTag: 'exp_fab',
            onPressed: _addExperience,
            backgroundColor: AppTheme.primaryColor,
            child: Icon(Icons.add, color: context.surfaceColor),
          ),
        ),
      ],
    );
  }
}

class _AddExperienceForm extends StatefulWidget {
  const _AddExperienceForm();

  @override
  State<_AddExperienceForm> createState() => _AddExperienceFormState();
}

class _AddExperienceFormState extends State<_AddExperienceForm> {
  String? _fileName;
  Uint8List? _fileBytes;
  bool _isSaving = false;

  final _companyCtrl = TextEditingController();
  final _positionCtrl = TextEditingController();
  final _startDateCtrl = TextEditingController();
  final _endDateCtrl = TextEditingController();

  Future<void> _pickFile() async {
    PlatformFile? result = await FilePicker.pickFile(
      type: FileType.custom,
      allowedExtensions: ['pdf', 'jpg', 'png'],
    );

    if (result != null) {
      final bytes = await result.readAsBytes();
      setState(() {
        _fileName = result.name;
        _fileBytes = bytes;
      });
    }
  }

  Future<void> _saveExperience() async {
    if (_companyCtrl.text.isEmpty || _positionCtrl.text.isEmpty || _startDateCtrl.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Por favor completa los campos requeridos (Empresa, Cargo y Fecha Inicio).')));
      return;
    }
    
    setState(() => _isSaving = true);
    try {
      final response = await ApiClient.instance.post('/modulo1/experiences', data: {
        'company_name': _companyCtrl.text,
        'position': _positionCtrl.text,
        'start_date': _startDateCtrl.text,
        if (_endDateCtrl.text.isNotEmpty) 'end_date': _endDateCtrl.text,
      });
      
      if (_fileBytes != null && _fileName != null) {
        final id = response.data['id'];
        FormData formData = FormData.fromMap({
          "file": MultipartFile.fromBytes(_fileBytes!, filename: _fileName),
        });
        await ApiClient.instance.post('/modulo1/experiences/$id/certificate', data: formData);
      }
      
      if (mounted) {
        Navigator.pop(context, true);
      }
    } catch (e) {
      if (mounted) {
        String errorMsg = 'Error al guardar: $e';
        if (e is DioException && e.response?.data != null && e.response?.data['detail'] != null) {
          errorMsg = e.response!.data['detail'];
        }
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(errorMsg), backgroundColor: AppTheme.accentPink));
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
        left: 20, right: 20, top: 24,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Añadir Experiencia', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: context.primaryText)),
          SizedBox(height: 20),
          TextFormField(
            controller: _companyCtrl,
            decoration: AppTheme.inputDecoration(context,  label: 'EMPRESA', icon: Icons.business),
          ),
          SizedBox(height: 16),
          TextFormField(
            controller: _positionCtrl,
            decoration: AppTheme.inputDecoration(context,  label: 'CARGO', icon: Icons.work_outline),
          ),
          SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: TextFormField(
                  controller: _startDateCtrl,
                  decoration: AppTheme.inputDecoration(context, label: 'FECHA INICIO (YYYY-MM-DD)', icon: Icons.calendar_today_rounded),
                  keyboardType: TextInputType.datetime,
                ),
              ),
              SizedBox(width: 16),
              Expanded(
                child: TextFormField(
                  controller: _endDateCtrl,
                  decoration: AppTheme.inputDecoration(context, label: 'FECHA FIN (YYYY-MM-DD)', icon: Icons.calendar_today_rounded),
                  keyboardType: TextInputType.datetime,
                ),
              ),
            ],
          ),
          SizedBox(height: 16),
          // Support document button
          InkWell(
            onTap: _pickFile,
            borderRadius: BorderRadius.circular(12),
            child: Container(
              padding: EdgeInsets.all(16),
              decoration: BoxDecoration(
                border: Border.all(color: AppTheme.primaryColor, style: BorderStyle.solid),
                borderRadius: BorderRadius.circular(12),
                color: AppTheme.primaryColor.withValues(alpha: 0.05),
              ),
              child: Row(
                children: [
                  Icon(Icons.upload_file_rounded, color: AppTheme.primaryColor),
                  SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      _fileName ?? 'Subir documento soporte (PDF, JPG)',
                      style: TextStyle(color: _fileName != null ? context.primaryText : AppTheme.primaryColor, fontWeight: FontWeight.w600),
                    ),
                  ),
                ],
              ),
            ),
          ),
          SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _isSaving ? null : _saveExperience,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primaryColor,
                padding: EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: _isSaving
                ? SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                : Text('Guardar', style: TextStyle(fontWeight: FontWeight.w700)),
            ),
          ),
          SizedBox(height: 24),
        ],
      ),
    );
  }
}
