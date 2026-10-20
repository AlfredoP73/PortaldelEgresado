import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:image_picker/image_picker.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/network/api_client.dart';
import 'tabs/personal_data_tab.dart';
import 'tabs/experience_tab.dart';
import 'tabs/academic_tab.dart';
import 'tabs/surveys_tab.dart';
import 'tabs/projects_tab.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  String _fullName = 'Egresado UPC';
  String _email = '';
  String _programName = 'Programa Académico UPC';
  String? _graduationYear;
  String? _profilePictureUrl;
  String _availabilityStatus = 'OPEN_TO_WORK';
  double _completeness = 0.0;
  bool _isUploadingPhoto = false;

  @override
  void initState() {
    super.initState();
    _loadProfileHeader();
  }

  Future<void> _loadProfileHeader() async {
    try {
      final response = await ApiClient.instance.get('/modulo1/profile');
      if (response.data is Map) {
        final data = response.data as Map<String, dynamic>;
        final first = data['first_name']?.toString() ?? '';
        final last = data['last_name']?.toString() ?? '';
        final full = '$first $last'.trim();

        // 6-part ATS Profile Strength calculation (Matches ProfileCompleteness.tsx)
        double progress = 0.0;
        if (first.isNotEmpty &&
            last.isNotEmpty &&
            (data['phone']?.toString().isNotEmpty ?? false) &&
            (data['profile_summary']?.toString().isNotEmpty ?? false)) {
          progress += 0.20;
        }
        if (data['profile_picture_url']?.toString().isNotEmpty ?? false) {
          progress += 0.10;
        }
        if (data['cv_url']?.toString().isNotEmpty ?? false) {
          progress += 0.20;
        }
        if ((data['skills'] as List? ?? []).isNotEmpty) {
          progress += 0.20;
        }
        if ((data['experiences'] as List? ?? []).isNotEmpty ||
            (data['academic_histories'] as List? ?? []).isNotEmpty) {
          progress += 0.15;
        }
        final hasSalary = data['expected_salary'] != null &&
            (double.tryParse(data['expected_salary'].toString()) ?? 0) > 0;
        if (data['availability_status'] != null && hasSalary) {
          progress += 0.15;
        }

        String progName = 'Programa Académico UPC';
        if (data['program'] is Map && data['program']['name'] != null) {
          progName = data['program']['name'].toString();
        }

        if (mounted) {
          setState(() {
            if (full.isNotEmpty) _fullName = full;
            _email = data['email']?.toString() ?? '';
            _programName = progName;
            _graduationYear = data['graduation_year']?.toString();
            _profilePictureUrl = data['profile_picture_url']?.toString();
            _availabilityStatus = data['availability_status']?.toString() ?? 'OPEN_TO_WORK';
            _completeness = progress.clamp(0.0, 1.0);
          });
        }
      }
    } catch (_) {}
  }

  Future<void> _uploadProfilePicture() async {
    final picker = ImagePicker();
    final picked = await picker.pickImage(source: ImageSource.gallery, imageQuality: 85);
    if (picked == null) return;

    setState(() => _isUploadingPhoto = true);
    try {
      final bytes = await picked.readAsBytes();
      final formData = FormData.fromMap({
        'file': MultipartFile.fromBytes(bytes, filename: picked.name),
      });
      await ApiClient.instance.post('/modulo1/profile/picture', data: formData);
      await _loadProfileHeader();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('¡Foto de perfil institucional actualizada!'),
            backgroundColor: AppTheme.primaryColor,
          ),
        );
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('No se pudo actualizar la foto de perfil.'),
            backgroundColor: AppTheme.statusRechazado,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isUploadingPhoto = false);
    }
  }

  String? _resolveImageUrl(String? raw) {
    if (raw == null || raw.isEmpty) return null;
    if (raw.startsWith('http')) return raw;
    return '${ApiClient.rootUrl}$raw';
  }

  @override
  Widget build(BuildContext context) {
    final resolvedPhoto = _resolveImageUrl(_profilePictureUrl);
    final pct = (_completeness * 100).round();

    return DefaultTabController(
      length: 5,
      child: NestedScrollView(
        headerSliverBuilder: (context, innerBoxIsScrolled) {
          return [
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 10, 16, 12),
                child: Column(
                  children: [
                    // ── Web Hero Cover Banner (Matches GraduateProfile.tsx) ──
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(18),
                      decoration: BoxDecoration(
                        gradient: AppTheme.heroBannerGradient,
                        borderRadius: BorderRadius.circular(22),
                        boxShadow: AppTheme.premiumShadow,
                      ),
                      child: Column(
                        children: [
                          Row(
                            children: [
                              // Avatar with Camera Badge
                              Stack(
                                clipBehavior: Clip.none,
                                children: [
                                  Container(
                                    width: 72,
                                    height: 72,
                                    decoration: BoxDecoration(
                                      color: Colors.white.withValues(alpha: 0.14),
                                      borderRadius: BorderRadius.circular(18),
                                      border: Border.all(color: Colors.white.withValues(alpha: 0.3), width: 2),
                                      image: resolvedPhoto != null
                                          ? DecorationImage(
                                              image: NetworkImage(resolvedPhoto),
                                              fit: BoxFit.cover,
                                            )
                                          : null,
                                    ),
                                    alignment: Alignment.center,
                                    child: resolvedPhoto == null
                                        ? Text(
                                            _fullName.isNotEmpty ? _fullName[0].toUpperCase() : 'E',
                                            style: const TextStyle(
                                              color: Colors.white,
                                              fontSize: 28,
                                              fontWeight: FontWeight.w900,
                                            ),
                                          )
                                        : null,
                                  ),
                                  Positioned(
                                    right: -4,
                                    bottom: -4,
                                    child: GestureDetector(
                                      onTap: _isUploadingPhoto ? null : _uploadProfilePicture,
                                      child: Container(
                                        padding: const EdgeInsets.all(6),
                                        decoration: BoxDecoration(
                                          color: AppTheme.brand500,
                                          shape: BoxShape.circle,
                                          border: Border.all(color: Colors.white, width: 2),
                                        ),
                                        child: _isUploadingPhoto
                                            ? const SizedBox(
                                                width: 12,
                                                height: 12,
                                                child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                                              )
                                            : const Icon(Icons.camera_alt_rounded, color: Colors.white, size: 13),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(width: 14),

                              // Name, Program & Chips
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      _fullName,
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 18,
                                        fontWeight: FontWeight.w900,
                                        letterSpacing: -0.3,
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      _programName,
                                      style: const TextStyle(
                                        color: Color(0xFF7CDAAC),
                                        fontSize: 12.5,
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                    const SizedBox(height: 8),
                                    Wrap(
                                      spacing: 6,
                                      runSpacing: 6,
                                      children: [
                                        _buildHeroChip(
                                          _availabilityStatus == 'OPEN_TO_WORK'
                                              ? Icons.circle_rounded
                                              : Icons.radio_button_checked_rounded,
                                          _availabilityStatus == 'OPEN_TO_WORK'
                                              ? '#OpenToWork'
                                              : _availabilityStatus == 'OPEN_TO_OFFERS'
                                                  ? 'Abierto a ofertas'
                                                  : 'No busco empleo',
                                          color: _availabilityStatus == 'OPEN_TO_WORK'
                                              ? const Color(0xFF45C388)
                                              : _availabilityStatus == 'OPEN_TO_OFFERS'
                                                  ? const Color(0xFF60A5FA)
                                                  : Colors.white70,
                                        ),
                                        if (_email.isNotEmpty)
                                          _buildHeroChip(Icons.mail_outline_rounded, _email),
                                        if (_graduationYear != null && _graduationYear!.isNotEmpty)
                                          _buildHeroChip(Icons.school_outlined, 'Promoción $_graduationYear'),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),

                          // Fuerza del Perfil Strip inside Hero
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.08),
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(color: Colors.white.withValues(alpha: 0.14)),
                            ),
                            child: Column(
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    const Text(
                                      'FUERZA DE TU HOJA DE VIDA',
                                      style: TextStyle(
                                        color: Colors.white70,
                                        fontSize: 10,
                                        fontWeight: FontWeight.w800,
                                        letterSpacing: 0.8,
                                      ),
                                    ),
                                    Text(
                                      '$pct% Completado',
                                      style: const TextStyle(
                                        color: Color(0xFF45C388),
                                        fontSize: 12,
                                        fontWeight: FontWeight.w800,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 6),
                                ClipRRect(
                                  borderRadius: BorderRadius.circular(999),
                                  child: LinearProgressIndicator(
                                    value: _completeness,
                                    minHeight: 6,
                                    backgroundColor: Colors.white.withValues(alpha: 0.15),
                                    valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF45C388)),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),

                    // ── 4 Corporate Tabs: Datos, Experiencia, Academia, Encuestas M01 ──
                    Container(
                      padding: const EdgeInsets.all(4),
                      decoration: BoxDecoration(
                        color: context.surfaceColor,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: context.borderColor),
                      ),
                      child: TabBar(
                        labelPadding: const EdgeInsets.symmetric(horizontal: 4),
                        dividerColor: Colors.transparent,
                        indicatorSize: TabBarIndicatorSize.tab,
                        indicator: BoxDecoration(
                          color: AppTheme.primaryColor,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        labelColor: Colors.white,
                        unselectedLabelColor: context.secondaryText,
                        labelStyle: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800),
                        unselectedLabelStyle: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600),
                        isScrollable: true,
                        tabAlignment: TabAlignment.start,
                        tabs: const [
                          Tab(text: 'Datos'),
                          Tab(text: 'Experiencia'),
                          Tab(text: 'Academia'),
                          Tab(text: 'Proyectos'),
                          Tab(text: 'Seguimiento'),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ];
        },
        body: TabBarView(
          children: [
            PersonalDataTab(onProfileUpdated: _loadProfileHeader),
            const ExperienceTab(),
            const AcademicTab(),
            const ProjectsTab(),
            const SurveysTab(),
          ],
        ),
      ),
    );
  }

  Widget _buildHeroChip(IconData icon, String label, {Color? color}) {
    final fg = color ?? Colors.white70;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color != null ? color.withValues(alpha: 0.18) : Colors.white.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(8),
        border: color != null ? Border.all(color: color.withValues(alpha: 0.4)) : null,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: fg, size: 12),
          const SizedBox(width: 4),
          Flexible(
            child: Text(
              label,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(color: fg, fontSize: 11, fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );
  }
}
