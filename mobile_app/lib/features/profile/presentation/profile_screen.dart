import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:jwt_decoder/jwt_decoder.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/network/api_client.dart';
import 'tabs/personal_data_tab.dart';
import 'tabs/experience_tab.dart';
import 'tabs/academic_tab.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  String _userName = 'Egresado';
  String _userEmail = 'correo@upc.edu.co';
  String _initial = 'E';
  bool _isUploading = false;
  final ImagePicker _picker = ImagePicker();

  String? _profilePicUrl;
  double _profileProgress = 0.0;

  Uint8List? _imageBytes;

  @override
  void initState() {
    super.initState();
    _loadUserInfo();
  }

  Future<void> _loadUserInfo() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('jwt_token');
    
    // Default from token
    if (token != null && token.isNotEmpty) {
      try {
        Map<String, dynamic> decodedToken = JwtDecoder.decode(token);
        String sub = decodedToken['sub'] ?? 'Egresado';
        setState(() {
          _userEmail = sub;
          _userName = sub.split('@')[0];
          _initial = _userName.isNotEmpty ? _userName[0].toUpperCase() : 'E';
        });
      } catch (_) {}
    }

    // Try to get real profile from API
    try {
      final res = await ApiClient.instance.get('/modulo1/profile');
      if (res.statusCode == 200 && res.data != null) {
        final data = res.data;
        String? firstName = data['first_name'];
        String? lastName = data['last_name'];
        String? picUrl = data['profile_picture_url'];

        double progress = 0.0;
        
        // Datos Básicos 20%
        if (firstName != null && firstName.isNotEmpty && lastName != null && lastName.isNotEmpty) {
          progress += 0.20;
        }
        // Foto de Perfil 15%
        if (picUrl != null && picUrl.isNotEmpty) {
          progress += 0.15;
        }
        // Hoja de Vida (CV) 20%
        if (data['cv_url'] != null && data['cv_url'].toString().isNotEmpty) {
          progress += 0.20;
        }
        // Habilidades 25%
        if (data['skills'] != null && (data['skills'] as List).isNotEmpty) {
          progress += 0.25;
        }
        // Experiencia y Academia 20%
        if (data['academic_histories'] != null && (data['academic_histories'] as List).isNotEmpty && data['experiences'] != null && (data['experiences'] as List).isNotEmpty) {
          progress += 0.20;
        }

        setState(() {
          _profileProgress = progress;
        });

        if (firstName != null && firstName.isNotEmpty) {
          setState(() {
            _userName = '$firstName ${lastName ?? ''}'.trim();
            _initial = firstName[0].toUpperCase();
          });
        }
        
        if (picUrl != null && picUrl.isNotEmpty) {
          setState(() {
            String base = ApiClient.instance.options.baseUrl.replaceAll(RegExp(r'/api$'), '');
            _profilePicUrl = base + picUrl;
          });
        }
      }
    } catch (e) {
      // Ignorar si no ha creado perfil
    }
  }

  Future<void> _pickAndUploadImage() async {
    try {
      final XFile? image = await _picker.pickImage(source: ImageSource.gallery);
      if (image == null) return;
      
      final bytes = await image.readAsBytes();

      setState(() {
        _imageBytes = bytes;
        _isUploading = true;
      });

      FormData formData = FormData.fromMap({
        "file": MultipartFile.fromBytes(bytes, filename: image.name),
      });

      await ApiClient.instance.post(
        '/modulo1/profile/picture', 
        data: formData,
      );

      if (mounted && context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Foto de perfil actualizada correctamente'), backgroundColor: AppTheme.primaryColor),
        );
      }
    } catch (e) {
      if (mounted && context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Error al subir la foto'), backgroundColor: AppTheme.statusRechazado),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isUploading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 3,
      child: Scaffold(
        backgroundColor: context.bgColor,
        body: SafeArea(
          child: Column(
            children: [
              // ── Header con Foto ──
              Padding(
                padding: EdgeInsets.only(top: 32, bottom: 24),
                child: Column(
                  children: [
                    GestureDetector(
                      onTap: _isUploading ? null : _pickAndUploadImage,
                      child: Stack(
                        alignment: Alignment.bottomRight,
                        children: [
                          Container(
                            width: 100,
                            height: 100,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              border: Border.all(color: AppTheme.primaryDark, width: 4),
                              color: context.surfaceColor,
                              boxShadow: [
                                BoxShadow(color: AppTheme.primaryDark.withValues(alpha: 0.1), blurRadius: 10, offset: const Offset(0, 4)),
                              ],
                              image: _imageBytes != null
                                  ? DecorationImage(image: MemoryImage(_imageBytes!), fit: BoxFit.cover)
                                  : (_profilePicUrl != null
                                      ? DecorationImage(image: NetworkImage(_profilePicUrl!), fit: BoxFit.cover)
                                      : null),
                            ),
                            child: (_imageBytes == null && _profilePicUrl == null)
                                ? Center(
                                    child: Text(
                                      _initial,
                                      style: TextStyle(color: context.isDark ? AppTheme.primaryColor : AppTheme.primaryDark, fontSize: 36, fontWeight: FontWeight.w800),
                                    ),
                                  )
                                : null,
                          ),
                          Container(
                            width: 36,
                            height: 36,
                            decoration: BoxDecoration(
                              color: context.primaryText, // Botón contrastante con el fondo
                              shape: BoxShape.circle,
                              border: Border.all(color: context.bgColor, width: 3),
                            ),
                            child: _isUploading
                                ? Padding(
                                    padding: EdgeInsets.all(8.0),
                                    child: CircularProgressIndicator(strokeWidth: 2, color: context.bgColor),
                                  )
                                : Icon(Icons.camera_alt_rounded, size: 18, color: context.bgColor),
                          ),
                        ],
                      ),
                    ),
                    SizedBox(height: 16),
                    Text(
                      _userName,
                      style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: context.primaryText),
                    ),
                    SizedBox(height: 4),
                    Text(_userEmail, style: TextStyle(color: context.secondaryText, fontSize: 14)),
                    SizedBox(height: 12),
                    Container(
                      padding: EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppTheme.primaryColor.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(100),
                      ),
                      child: Text('EGRESADO', style: TextStyle(color: context.isDark ? AppTheme.primaryColor : AppTheme.primaryDark, fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 0.5)),
                    ),
                  ],
                ),
              ),

              // ── Completitud ──
              Padding(
                padding: EdgeInsets.symmetric(horizontal: 20),
                child: Container(
                  padding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    color: context.surfaceColor,
                    borderRadius: BorderRadius.circular(100),
                    border: Border.all(color: context.isDark ? Colors.white.withValues(alpha: 0.05) : Colors.black.withValues(alpha: 0.05)),
                    boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.02), blurRadius: 8, offset: const Offset(0, 2))],
                  ),
                  child: Row(
                    children: [
                      SizedBox(
                        width: 24, height: 24,
                        child: CircularProgressIndicator(
                          value: _profileProgress,
                          backgroundColor: context.secondaryText.withValues(alpha: 0.2),
                          valueColor: const AlwaysStoppedAnimation(AppTheme.primaryColor),
                          strokeWidth: 4,
                        ),
                      ),
                      SizedBox(width: 12),
                      Expanded(
                        child: Text('Tu perfil está al ${(_profileProgress * 100).toInt()}% completo', style: TextStyle(color: context.primaryText, fontSize: 13, fontWeight: FontWeight.w600)),
                      ),
                    ],
                  ),
                ),
              ),
              SizedBox(height: 24),

              // ── Tabs ──
              Container(
                margin: EdgeInsets.symmetric(horizontal: 20),
                decoration: BoxDecoration(
                  color: context.surfaceColor,
                  borderRadius: BorderRadius.circular(100),
                  border: Border.all(color: context.isDark ? Colors.white.withValues(alpha: 0.05) : Colors.black.withValues(alpha: 0.05)),
                ),
                child: TabBar(
                  indicatorSize: TabBarIndicatorSize.tab,
                  indicator: BoxDecoration(
                    color: AppTheme.primaryColor.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(100),
                  ),
                  dividerColor: Colors.transparent,
                  labelColor: context.isDark ? AppTheme.primaryColor : AppTheme.primaryDark,
                  unselectedLabelColor: context.secondaryText,
                  labelStyle: TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                  unselectedLabelStyle: TextStyle(fontWeight: FontWeight.w500, fontSize: 13),
                  tabs: [
                    Tab(text: 'Datos'),
                    Tab(text: 'Experiencia'),
                    Tab(text: 'Academia'),
                  ],
                ),
              ),
              SizedBox(height: 16),

              // ── Tab Views ──
              Expanded(
                child: TabBarView(
                  physics: const BouncingScrollPhysics(),
                  children: [
                    PersonalDataTab(onUpdate: _loadUserInfo),
                    ExperienceTab(onUpdate: _loadUserInfo),
                    AcademicTab(onUpdate: _loadUserInfo),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
