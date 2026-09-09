import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:file_picker/file_picker.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:dio/dio.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/network/api_client.dart';

class AcademicTab extends StatefulWidget {
  final VoidCallback? onUpdate;
  const AcademicTab({super.key, this.onUpdate});

  @override
  State<AcademicTab> createState() => _AcademicTabState();
}

class _AcademicTabState extends State<AcademicTab> with AutomaticKeepAliveClientMixin {
  List<dynamic> _academics = [];
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
    _loadAcademics();
  }

  Future<void> _loadAcademics() async {
    setState(() => _isLoading = true);
    try {
      final response = await ApiClient.instance.get('/modulo1/profile');
      if (response.data != null && response.data['academic_histories'] != null) {
        setState(() {
          _academics = response.data['academic_histories'];
        });
      }
    } catch (e) {
      if (e is DioException && e.response?.statusCode == 404) {
        // Ignorar si el perfil no existe
      } else if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('Error al cargar formación: $e'),
          backgroundColor: AppTheme.accentPink,
        ));
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _addAcademic() async {
    final result = await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: context.surfaceColor,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => const _AddAcademicForm(),
    );
    if (result == true) {
      _loadAcademics();
      widget.onUpdate?.call();
    }
  }

  Future<void> _deleteAcademic(int id) async {
    setState(() => _isLoading = true);
    try {
      await ApiClient.instance.delete('/modulo1/academic_histories/$id');
      _loadAcademics();
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
          Center(child: CircularProgressIndicator(color: Color(0xFF6366F1)))
        else if (_academics.isEmpty)
          Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.school_outlined, size: 64, color: context.secondaryText.withValues(alpha: 0.3)),
                SizedBox(height: 16),
                Text('No hay formación registrada', style: TextStyle(color: context.secondaryText)),
              ],
            ),
          )
        else
          ListView.builder(
            padding: EdgeInsets.only(left: 20, right: 20, top: 20, bottom: 100),
            itemCount: _academics.length,
            itemBuilder: (ctx, i) {
              final ac = _academics[i];
              String dateRange = ac['start_date'] ?? '';
              if (ac['end_date'] != null) {
                dateRange += ' - ${ac['end_date']}';
              } else {
                dateRange += ' - Presente';
              }
              
              return Container(
                margin: EdgeInsets.only(bottom: 16),
                padding: EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: context.surfaceColor,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Color(0xFFE5E7EB)),
                  boxShadow: [
                    BoxShadow(color: Colors.black.withValues(alpha: 0.03), blurRadius: 10, offset: const Offset(0, 4))
                  ],
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
                          decoration: BoxDecoration(color: Color(0xFF6366F1).withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12)),
                          child: Icon(Icons.school, color: Color(0xFF6366F1)),
                        ),
                        SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(ac['degree'] ?? '', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16, color: context.primaryText)),
                              Text(ac['institution'] ?? '', style: TextStyle(color: context.secondaryText, fontSize: 14)),
                            ],
                          ),
                        ),
                        if (ac['diploma_url'] != null)
                          IconButton(
                            icon: Icon(Icons.remove_red_eye_outlined, color: Color(0xFF6366F1)),
                            onPressed: () => _previewDocument(ac['diploma_url']),
                            tooltip: 'Ver Diploma',
                          ),
                        IconButton(
                          icon: Icon(Icons.delete_outline_rounded, color: Color(0xFFEF4444), size: 20),
                          onPressed: () {
                            showDialog(
                              context: context,
                              builder: (ctx) => AlertDialog(
                                title: Text('Eliminar formación'),
                                content: Text('¿Estás seguro de que deseas eliminar este registro?'),
                                actions: [
                                  TextButton(onPressed: () => Navigator.pop(ctx), child: Text('Cancelar')),
                                  TextButton(
                                    onPressed: () {
                                      Navigator.pop(ctx);
                                      _deleteAcademic(ac['id']);
                                    }, 
                                    child: Text('Eliminar', style: TextStyle(color: AppTheme.statusRechazado)),
                                  ),
                                ],
                              ),
                            );
                          },
                        )
                      ],
                    ),
                    SizedBox(height: 12),
                    Row(
                      children: [
                        Icon(Icons.calendar_today_rounded, size: 12, color: context.secondaryText),
                        SizedBox(width: 4),
                        Text(dateRange, style: TextStyle(fontSize: 11, color: context.secondaryText, fontWeight: FontWeight.w600)),
                      ],
                    ),
                    if (ac['diploma_url'] != null) ...[
                      SizedBox(height: 12),
                      Container(
                        padding: EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: AppTheme.primaryColor.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.workspace_premium_rounded, size: 14, color: AppTheme.primaryColor),
                            SizedBox(width: 6),
                            Text('Diploma Adjunto', style: TextStyle(fontSize: 11, color: context.primaryText, fontWeight: FontWeight.w600)),
                          ],
                        ),
                      )
                    ]
                  ],
                ),
              );
            },
          ),
          
        Positioned(
          bottom: 20,
          right: 20,
          child: FloatingActionButton(
            heroTag: 'acad_fab',
            onPressed: _addAcademic,
            backgroundColor: Color(0xFF6366F1), // Purplish tint to differentiate
            child: Icon(Icons.add, color: Colors.white), // FIXED: Colors.white instead of context surface
          ),
        ),
      ],
    );
  }
}

class _AddAcademicForm extends StatefulWidget {
  const _AddAcademicForm();

  @override
  State<_AddAcademicForm> createState() => _AddAcademicFormState();
}

class _AddAcademicFormState extends State<_AddAcademicForm> {
  String? _fileName;
  Uint8List? _fileBytes;
  bool _isSaving = false;

  final _institutionCtrl = TextEditingController();
  final _degreeCtrl = TextEditingController();
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

  Future<void> _saveAcademic() async {
    if (_institutionCtrl.text.isEmpty || _degreeCtrl.text.isEmpty || _startDateCtrl.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Por favor completa los campos requeridos (Institución, Título y Fecha Inicio).')));
      return;
    }
    
    setState(() => _isSaving = true);
    try {
      final response = await ApiClient.instance.post('/modulo1/academic_histories', data: {
        'institution': _institutionCtrl.text,
        'degree': _degreeCtrl.text,
        'start_date': _startDateCtrl.text,
        if (_endDateCtrl.text.isNotEmpty) 'end_date': _endDateCtrl.text,
      });
      
      if (_fileBytes != null && _fileName != null) {
        final id = response.data['id'];
        FormData formData = FormData.fromMap({
          "file": MultipartFile.fromBytes(_fileBytes!, filename: _fileName),
        });
        await ApiClient.instance.post('/modulo1/education/$id/diploma', data: formData);
      }
      
      if (mounted) {
        Navigator.pop(context, true); // Retorna true para recargar
      }
    } catch (e) {
      if (mounted) {
        String errorMsg = 'Error al guardar: $e';
        if (e is DioException && e.response?.data != null && e.response?.data['detail'] != null) {
          errorMsg = e.response!.data['detail'];
        }
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(errorMsg), backgroundColor: AppTheme.statusRechazado));
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
          Text('Añadir Formación', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: context.primaryText)),
          SizedBox(height: 20),
          TextFormField(
            controller: _institutionCtrl,
            decoration: AppTheme.inputDecoration(context,  label: 'INSTITUCIÓN', icon: Icons.account_balance_outlined),
          ),
          SizedBox(height: 16),
          TextFormField(
            controller: _degreeCtrl,
            decoration: AppTheme.inputDecoration(context,  label: 'TÍTULO', icon: Icons.school_outlined),
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
          InkWell(
            onTap: _pickFile,
            borderRadius: BorderRadius.circular(12),
            child: Container(
              padding: EdgeInsets.all(16),
              decoration: BoxDecoration(
                border: Border.all(color: Color(0xFF6366F1), style: BorderStyle.solid),
                borderRadius: BorderRadius.circular(12),
                color: Color(0xFF6366F1).withValues(alpha: 0.05),
              ),
              child: Row(
                children: [
                  Icon(Icons.upload_file, color: Color(0xFF6366F1)),
                  SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      _fileName ?? 'Adjuntar Diploma (Opcional)',
                      style: TextStyle(color: Color(0xFF6366F1), fontWeight: FontWeight.w600),
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
              onPressed: _isSaving ? null : _saveAcademic,
              style: ElevatedButton.styleFrom(
                backgroundColor: Color(0xFF6366F1),
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
