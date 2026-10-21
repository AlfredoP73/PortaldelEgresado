import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/network/api_client.dart';
import '../../messages/presentation/messages_screen.dart';

// Definición de recursos universales
class ResourceTypeInfo {
  final String key;
  final String label;
  final String emoji;
  final IconData icon;

  const ResourceTypeInfo({
    required this.key,
    required this.label,
    required this.emoji,
    required this.icon,
  });
}

const List<ResourceTypeInfo> _kResourceTypes = [
  ResourceTypeInfo(key: 'github', label: 'GitHub / Código', emoji: '💻', icon: Icons.code_rounded),
  ResourceTypeInfo(key: 'behance', label: 'Behance / Arte', emoji: '🎨', icon: Icons.palette_rounded),
  ResourceTypeInfo(key: 'youtube', label: 'YouTube / Video', emoji: '🎬', icon: Icons.play_circle_fill_rounded),
  ResourceTypeInfo(key: 'drive', label: 'Google Drive / Doc', emoji: '📄', icon: Icons.description_rounded),
  ResourceTypeInfo(key: 'web', label: 'Sitio Web / Demo', emoji: '🌐', icon: Icons.language_rounded),
  ResourceTypeInfo(key: 'paper', label: 'Artículo / Paper', emoji: '📑', icon: Icons.article_rounded),
  ResourceTypeInfo(key: 'institutional', label: 'Repositorio UPC', emoji: '🏛️', icon: Icons.account_balance_rounded),
  ResourceTypeInfo(key: 'other', label: 'Enlace Externo', emoji: '🔗', icon: Icons.link_rounded),
];

ResourceTypeInfo _getResourceInfo(String? type) {
  if (type == null || type.isEmpty) return _kResourceTypes.first;
  return _kResourceTypes.firstWhere(
    (r) => r.key.toLowerCase() == type.toLowerCase(),
    orElse: () => _kResourceTypes.last,
  );
}

class AlumniDirectoryScreen extends StatefulWidget {
  const AlumniDirectoryScreen({super.key});

  @override
  State<AlumniDirectoryScreen> createState() => _AlumniDirectoryScreenState();
}

class _AlumniDirectoryScreenState extends State<AlumniDirectoryScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  bool _isLoadingNetwork = true;
  bool _isLoadingDirectory = true;
  bool _isLoadingConnections = false;

  String? _currentUserRole;
  int? _currentUserId;

  List<Map<String, dynamic>> _networkSuggestions = [];
  List<Map<String, dynamic>> _graduates = [];
  Map<String, dynamic> _connections = {
    'incoming': [],
    'sent': [],
    'accepted': [],
  };

  String _searchQuery = '';
  bool _mentorsOnly = false;
  int? _selectedYear;

  @override
  void initState() {
    super.initState();
    _loadCurrentUser();
    _tabController = TabController(length: 3, vsync: this);
    _tabController.addListener(() {
      if (_tabController.index == 0 && _networkSuggestions.isEmpty) {
        _fetchNetworkSuggestions();
      } else if (_tabController.index == 1 && _graduates.isEmpty) {
        _fetchDirectory();
      } else if (_tabController.index == 2) {
        _fetchConnections();
      }
    });

    _fetchNetworkSuggestions();
    _fetchDirectory();
    _fetchConnections();
  }

  Future<void> _loadCurrentUser() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final str = prefs.getString('user_data');
      if (str != null) {
        final u = jsonDecode(str);
        if (u is Map) {
          setState(() {
            _currentUserRole = u['role_name']?.toString();
            if (u['id'] != null) {
              _currentUserId = u['id'] is int ? u['id'] as int : int.tryParse(u['id'].toString());
            }
          });
        }
      }
    } catch (_) {}
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _fetchNetworkSuggestions() async {
    setState(() => _isLoadingNetwork = true);
    try {
      final res = await ApiClient.instance.get('/modulo1/network/suggestions');
      if (res.data is List) {
        _networkSuggestions = List<Map<String, dynamic>>.from(
          (res.data as List).whereType<Map>().map((e) => Map<String, dynamic>.from(e)),
        );
      }
    } catch (_) {
      _networkSuggestions = [];
    }
    if (mounted) setState(() => _isLoadingNetwork = false);
  }

  Future<void> _fetchDirectory() async {
    setState(() => _isLoadingDirectory = true);
    try {
      final queryParams = <String, dynamic>{};
      if (_searchQuery.trim().isNotEmpty) queryParams['q'] = _searchQuery.trim();
      if (_mentorsOnly) queryParams['mentors_only'] = true;
      if (_selectedYear != null) queryParams['graduation_year'] = _selectedYear;

      final res = await ApiClient.instance.get('/modulo1/directory', queryParameters: queryParams);
      if (res.data is List) {
        _graduates = List<Map<String, dynamic>>.from(
          (res.data as List).whereType<Map>().map((e) => Map<String, dynamic>.from(e)),
        );
      }
    } catch (_) {
      _graduates = [];
    }
    if (mounted) setState(() => _isLoadingDirectory = false);
  }

  Future<void> _fetchConnections() async {
    setState(() => _isLoadingConnections = true);
    try {
      final res = await ApiClient.instance.get('/modulo1/connections');
      if (res.data is Map) {
        setState(() {
          _connections = {
            'incoming': List<Map<String, dynamic>>.from(res.data['incoming'] ?? []),
            'sent': List<Map<String, dynamic>>.from(res.data['sent'] ?? []),
            'accepted': List<Map<String, dynamic>>.from(res.data['accepted'] ?? []),
          };
        });
      }
    } catch (_) {}
    if (mounted) setState(() => _isLoadingConnections = false);
  }

  Future<void> _sendConnectionRequest(int targetUserId, {String? note}) async {
    if (_currentUserRole == 'COMPANY') {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Las empresas pueden contactar candidatos mediante procesos de selección.'),
          backgroundColor: AppTheme.primaryColor,
        ),
      );
      return;
    }

    try {
      await ApiClient.instance.post('/modulo1/connections/request', data: {
        'target_user_id': targetUserId,
        if (note != null && note.isNotEmpty) 'message': note,
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('¡Solicitud de conexión enviada con éxito!'),
            backgroundColor: AppTheme.brand500,
          ),
        );
      }
      _fetchConnections();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Error al enviar la solicitud de conexión')),
        );
      }
    }
  }

  Future<void> _respondConnection(int connectionId, String action) async {
    try {
      await ApiClient.instance.put('/modulo1/connections/$connectionId/respond', data: {
        'action': action,
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(action == 'ACCEPT'
                ? '¡Conexión aceptada! Ahora pueden conversar en Mensajes Directos.'
                : 'Solicitud rechazada'),
            backgroundColor: action == 'ACCEPT' ? AppTheme.brand500 : AppTheme.primaryColor,
          ),
        );
      }
      _fetchConnections();
    } catch (_) {}
  }

  Future<void> _openUrl(String raw) async {
    if (raw.isEmpty) return;
    final uri = Uri.tryParse(raw);
    if (uri != null) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  void _showPublicProfileModal(int userId) {
    showModalBottomSheet(
      context: context,
      backgroundColor: context.surfaceColor,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (modalCtx) {
        return FutureBuilder(
          future: ApiClient.instance.get('/modulo1/graduates/$userId/public-profile'),
          builder: (ctx, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const SizedBox(
                height: 350,
                child: Center(child: CircularProgressIndicator(color: AppTheme.primaryColor)),
              );
            }
            if (snapshot.hasError || snapshot.data?.data is! Map) {
              return SizedBox(
                height: 250,
                child: Center(
                  child: Text(
                    'No se pudo cargar el perfil público',
                    style: TextStyle(color: context.secondaryText),
                  ),
                ),
              );
            }

            final data = Map<String, dynamic>.from(snapshot.data!.data);
            final first = data['first_name']?.toString() ?? '';
            final last = data['last_name']?.toString() ?? '';
            final fullName = '$first $last'.trim();
            final program = data['program_name']?.toString() ?? 'Egresado UPC';
            final year = data['graduation_year']?.toString() ?? '';
            final summary = data['profile_summary']?.toString() ?? '';
            final photo = data['profile_picture_url']?.toString();
            final status = data['connection_status']?.toString() ?? 'NONE';
            final projects = List<Map<String, dynamic>>.from(data['projects'] ?? []);
            final skills = List<String>.from(data['skills'] ?? []);
            final experiences = List<Map<String, dynamic>>.from(data['experiences'] ?? []);
            final academicHistories = List<Map<String, dynamic>>.from(data['academic_histories'] ?? []);

            final isCompany = _currentUserRole == 'COMPANY';

            return DraggableScrollableSheet(
              initialChildSize: 0.88,
              maxChildSize: 0.95,
              minChildSize: 0.5,
              expand: false,
              builder: (_, scrollCtrl) {
                return SingleChildScrollView(
                  controller: scrollCtrl,
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Header con Foto y Datos Principales
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          CircleAvatar(
                            radius: 34,
                            backgroundColor: AppTheme.primaryColor.withValues(alpha: 0.15),
                            backgroundImage: photo != null ? NetworkImage(photo) : null,
                            child: photo == null
                                ? Text(
                                    fullName.isNotEmpty ? fullName[0].toUpperCase() : 'U',
                                    style: const TextStyle(
                                      fontSize: 24,
                                      fontWeight: FontWeight.bold,
                                      color: AppTheme.primaryColor,
                                    ),
                                  )
                                : null,
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Flexible(
                                      child: Text(
                                        fullName,
                                        style: TextStyle(
                                          fontSize: 17,
                                          fontWeight: FontWeight.w900,
                                          color: context.primaryText,
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 6),
                                    const Icon(Icons.verified_rounded, size: 18, color: AppTheme.brand500),
                                  ],
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  '$program ${year.isNotEmpty ? "• Promoción $year" : ""}',
                                  style: const TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w700,
                                    color: AppTheme.primaryColor,
                                  ),
                                ),
                                if (summary.isNotEmpty) ...[
                                  const SizedBox(height: 6),
                                  Text(
                                    summary,
                                    style: TextStyle(fontSize: 11.5, color: context.secondaryText, height: 1.3),
                                  ),
                                ],
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),

                      // Botón Conectar / Estado (Guard de Rol Empresa)
                      if (isCompany)
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
                          decoration: BoxDecoration(
                            color: AppTheme.primaryColor.withValues(alpha: 0.08),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: AppTheme.primaryColor.withValues(alpha: 0.2)),
                          ),
                          child: const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.business_rounded, size: 16, color: AppTheme.primaryColor),
                              SizedBox(width: 6),
                              Text(
                                'Vista de Empresa • Perfil Público Verificado',
                                style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold, color: AppTheme.primaryColor),
                              ),
                            ],
                          ),
                        )
                      else if (status == 'ACCEPTED')
                        SizedBox(
                          width: double.infinity,
                          height: 44,
                          child: ElevatedButton.icon(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppTheme.primaryColor,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                            onPressed: () {
                              Navigator.pop(modalCtx);
                              Navigator.push(
                                context,
                                MaterialPageRoute(builder: (_) => const MessagesScreen()),
                              );
                            },
                            icon: const Icon(Icons.chat_bubble_outline_rounded, color: Colors.white, size: 18),
                            label: const Text('Enviar Mensaje Directo', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                          ),
                        )
                      else if (status == 'PENDING')
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          decoration: BoxDecoration(
                            color: Colors.amber.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: Colors.amber.withValues(alpha: 0.3)),
                          ),
                          alignment: Alignment.center,
                          child: const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.hourglass_top_rounded, size: 16, color: Colors.amber),
                              SizedBox(width: 6),
                              Text(
                                'Solicitud de conexión pendiente',
                                style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.amber),
                              ),
                            ],
                          ),
                        )
                      else if (status != 'SELF')
                        SizedBox(
                          width: double.infinity,
                          height: 44,
                          child: ElevatedButton.icon(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppTheme.brand500,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                            onPressed: () async {
                              Navigator.pop(modalCtx);
                              await _sendConnectionRequest(userId);
                            },
                            icon: const Icon(Icons.person_add_rounded, color: Colors.white, size: 18),
                            label: const Text('Conectar & Chatear', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                          ),
                        ),

                      const SizedBox(height: 20),

                      // 1. EDUCACIÓN ACADÉMICA (ESTILO LINKEDIN)
                      if (academicHistories.isNotEmpty) ...[
                        Row(
                          children: [
                            const Icon(Icons.school_rounded, size: 18, color: AppTheme.primaryColor),
                            const SizedBox(width: 6),
                            Text(
                              'Educación Académica (${academicHistories.length})',
                              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: context.primaryText),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        ...academicHistories.map((edu) {
                          final degree = edu['degree']?.toString() ?? 'Título profesional';
                          final inst = edu['institution']?.toString() ?? 'Institución';
                          final start = edu['start_date']?.toString() ?? '';
                          final end = edu['end_date']?.toString() ?? 'Actualmente';
                          final isCurrent = edu['is_current'] == true;

                          return Container(
                            margin: const EdgeInsets.only(bottom: 8),
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: context.surfaceColor,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: context.borderColor),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  degree,
                                  style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: context.primaryText),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  inst,
                                  style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: AppTheme.primaryColor),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  isCurrent ? '$start - Actualmente' : '$start - $end',
                                  style: TextStyle(fontSize: 11, color: context.secondaryText),
                                ),
                              ],
                            ),
                          );
                        }),
                        const SizedBox(height: 14),
                      ],

                      // 2. EXPERIENCIA LABORAL
                      if (experiences.isNotEmpty) ...[
                        Row(
                          children: [
                            const Icon(Icons.work_rounded, size: 18, color: AppTheme.primaryColor),
                            const SizedBox(width: 6),
                            Text(
                              'Experiencia Laboral (${experiences.length})',
                              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: context.primaryText),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        ...experiences.map((exp) => Container(
                          margin: const EdgeInsets.only(bottom: 8),
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: context.surfaceColor,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: context.borderColor),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '${exp['position']} en ${exp['company_name']}',
                                style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: context.primaryText),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                '${exp['start_date']} - ${exp['end_date'] ?? 'Actualmente'}',
                                style: TextStyle(fontSize: 11, color: context.secondaryText),
                              ),
                              if (exp['description'] != null && exp['description'].toString().isNotEmpty) ...[
                                const SizedBox(height: 4),
                                Text(
                                  exp['description'].toString(),
                                  style: TextStyle(fontSize: 11, color: context.secondaryText),
                                ),
                              ],
                            ],
                          ),
                        )),
                        const SizedBox(height: 14),
                      ],

                      // 3. HABILIDADES
                      if (skills.isNotEmpty) ...[
                        Row(
                          children: [
                            const Icon(Icons.stars_rounded, size: 18, color: AppTheme.primaryColor),
                            const SizedBox(width: 6),
                            Text(
                              'Habilidades & Competencias',
                              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: context.primaryText),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 6,
                          runSpacing: 6,
                          children: skills.map((s) => Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: AppTheme.primaryColor.withValues(alpha: 0.10),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              s,
                              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppTheme.primaryColor),
                            ),
                          )).toList(),
                        ),
                        const SizedBox(height: 16),
                      ],

                      // 4. PORTAFOLIO MULTIDISCIPLINARIO DE PROYECTOS
                      Row(
                        children: [
                          const Icon(Icons.folder_special_rounded, size: 18, color: AppTheme.primaryColor),
                          const SizedBox(width: 6),
                          Text(
                            'Portafolio de Proyectos (${projects.length})',
                            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: context.primaryText),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),

                      if (projects.isEmpty)
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: context.surfaceColor,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: context.borderColor),
                          ),
                          child: Text(
                            'El egresado no ha registrado proyectos públicos todavía.',
                            style: TextStyle(fontSize: 11.5, color: context.tertiaryText),
                          ),
                        )
                      else
                        ListView.separated(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          itemCount: projects.length,
                          separatorBuilder: (_, _) => const SizedBox(height: 8),
                          itemBuilder: (_, idx) {
                            final p = projects[idx];
                            final pTechs = List<String>.from(p['technologies'] ?? []);
                            final rType = p['resource_type']?.toString();
                            final rInfo = _getResourceInfo(rType);
                            final resourceUrl = p['resource_url']?.toString() ??
                                p['project_url']?.toString() ??
                                p['repository_url']?.toString() ??
                                '';

                            return Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: context.surfaceColor,
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: context.borderColor),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: AppTheme.primaryColor.withValues(alpha: 0.10),
                                          borderRadius: BorderRadius.circular(6),
                                        ),
                                        child: Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            Text(rInfo.emoji, style: const TextStyle(fontSize: 11)),
                                            const SizedBox(width: 4),
                                            Text(
                                              rInfo.label,
                                              style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppTheme.primaryColor),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 6),
                                  Text(
                                    p['title']?.toString() ?? 'Proyecto',
                                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: context.primaryText),
                                  ),
                                  if (p['description'] != null && p['description'].toString().isNotEmpty) ...[
                                    const SizedBox(height: 4),
                                    Text(
                                      p['description'].toString(),
                                      style: TextStyle(fontSize: 11.5, color: context.secondaryText),
                                    ),
                                  ],
                                  if (pTechs.isNotEmpty) ...[
                                    const SizedBox(height: 6),
                                    Wrap(
                                      spacing: 4,
                                      runSpacing: 4,
                                      children: pTechs.map((t) => Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: AppTheme.brand500.withValues(alpha: 0.10),
                                          borderRadius: BorderRadius.circular(6),
                                        ),
                                        child: Text(
                                          t,
                                          style: const TextStyle(fontSize: 9.5, fontWeight: FontWeight.w700, color: AppTheme.primaryColor),
                                        ),
                                      )).toList(),
                                    ),
                                  ],
                                  if (resourceUrl.isNotEmpty) ...[
                                    const SizedBox(height: 8),
                                    ElevatedButton.icon(
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: AppTheme.primaryColor,
                                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                        visualDensity: VisualDensity.compact,
                                      ),
                                      onPressed: () => _openUrl(resourceUrl),
                                      icon: Icon(rInfo.icon, size: 14, color: Colors.white),
                                      label: Text(
                                        'Ver ${rInfo.label.split(' ')[0]}',
                                        style: const TextStyle(fontSize: 11, color: Colors.white, fontWeight: FontWeight.bold),
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                            );
                          },
                        ),
                    ],
                  ),
                );
              },
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final incomingCount = (_connections['incoming'] as List).length;

    return Scaffold(
      backgroundColor: context.bgColor,
      appBar: AppBar(
        title: const Text('Mi Red Profesional'),
        backgroundColor: context.surfaceColor,
        elevation: 0,
        bottom: TabBar(
          controller: _tabController,
          labelColor: AppTheme.primaryColor,
          unselectedLabelColor: context.secondaryText,
          indicatorColor: AppTheme.primaryColor,
          isScrollable: true,
          tabs: [
            Tab(
              child: Row(
                children: [
                  const Icon(Icons.hub_rounded, size: 17),
                  const SizedBox(width: 6),
                  Text('Red Afín (${_networkSuggestions.length})'),
                ],
              ),
            ),
            Tab(
              child: Row(
                children: [
                  const Icon(Icons.people_alt_rounded, size: 17),
                  const SizedBox(width: 6),
                  Text('Directorio (${_graduates.length})'),
                ],
              ),
            ),
            Tab(
              child: Row(
                children: [
                  const Icon(Icons.how_to_reg_rounded, size: 17),
                  const SizedBox(width: 6),
                  const Text('Mis Conexiones'),
                  if (incomingCount > 0) ...[
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                      decoration: BoxDecoration(
                        color: Colors.redAccent,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        '$incomingCount',
                        style: const TextStyle(fontSize: 10, color: Colors.white, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          // ── TAB 1: SUGERENCIAS DE RED (RED AFÍN) ──
          Column(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                color: context.surfaceColor,
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        'Egresados afines a tu carrera y habilidades.',
                        style: TextStyle(fontSize: 12, color: context.secondaryText),
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.refresh_rounded, size: 20),
                      onPressed: _fetchNetworkSuggestions,
                      tooltip: 'Actualizar sugerencias',
                    ),
                  ],
                ),
              ),
              Expanded(
                child: _isLoadingNetwork
                    ? const Center(child: CircularProgressIndicator(color: AppTheme.primaryColor))
                    : _networkSuggestions.isEmpty
                        ? Center(
                            child: Padding(
                              padding: const EdgeInsets.all(24),
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(Icons.hub_outlined, size: 52, color: context.tertiaryText),
                                  const SizedBox(height: 10),
                                  Text(
                                    'No hay sugerencias de red por ahora',
                                    style: TextStyle(color: context.secondaryText, fontWeight: FontWeight.w700, fontSize: 14),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    'Completa tu perfil académico y tus habilidades para encontrar egresados afines.',
                                    style: TextStyle(color: context.tertiaryText, fontSize: 12),
                                    textAlign: TextAlign.center,
                                  ),
                                ],
                              ),
                            ),
                          )
                        : ListView.separated(
                            padding: const EdgeInsets.all(14),
                            itemCount: _networkSuggestions.length,
                            separatorBuilder: (_, _) => const SizedBox(height: 10),
                            itemBuilder: (ctx, i) {
                              final s = _networkSuggestions[i];
                              final fullName = s['full_name']?.toString() ?? 'Egresado UPC';
                              final headline = s['headline']?.toString() ?? s['program_name']?.toString() ?? 'Egresado UPC';
                              final year = s['graduation_year']?.toString() ?? '';
                              final photo = s['profile_picture_url']?.toString();
                              final skills = List<String>.from(s['skills'] ?? []);
                              final affinityNum = (s['affinity_score'] is num ? s['affinity_score'] as num : 0).toDouble();
                              final affinityPct = (affinityNum / 95 * 100).round().clamp(1, 100);

                              final isCompany = _currentUserRole == 'COMPANY';

                              return Container(
                                padding: const EdgeInsets.all(14),
                                decoration: BoxDecoration(
                                  color: context.surfaceColor,
                                  borderRadius: BorderRadius.circular(16),
                                  border: Border.all(color: context.borderColor),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        CircleAvatar(
                                          radius: 26,
                                          backgroundColor: AppTheme.brand500.withValues(alpha: 0.15),
                                          backgroundImage: photo != null ? NetworkImage(photo) : null,
                                          child: photo == null
                                              ? Text(
                                                  fullName.isNotEmpty ? fullName[0].toUpperCase() : 'U',
                                                  style: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.primaryColor),
                                                )
                                              : null,
                                        ),
                                        const SizedBox(width: 12),
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Row(
                                                children: [
                                                  Flexible(
                                                    child: Text(
                                                      fullName,
                                                      style: TextStyle(
                                                        fontSize: 14.5,
                                                        fontWeight: FontWeight.w800,
                                                        color: context.primaryText,
                                                      ),
                                                    ),
                                                  ),
                                                  const SizedBox(width: 4),
                                                  const Icon(Icons.verified_rounded, size: 15, color: AppTheme.brand500),
                                                ],
                                              ),
                                              Text(
                                                headline,
                                                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.primaryColor),
                                              ),
                                              if (year.isNotEmpty)
                                                Text(
                                                  'Promoción $year',
                                                  style: TextStyle(fontSize: 11, color: context.secondaryText),
                                                ),
                                            ],
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 10),

                                    // Barra de Afinidad (%)
                                    Row(
                                      children: [
                                        Expanded(
                                          child: ClipRRect(
                                            borderRadius: BorderRadius.circular(6),
                                            child: LinearProgressIndicator(
                                              value: affinityPct / 100.0,
                                              backgroundColor: AppTheme.brand500.withValues(alpha: 0.12),
                                              color: AppTheme.brand500,
                                              minHeight: 6,
                                            ),
                                          ),
                                        ),
                                        const SizedBox(width: 8),
                                        Text(
                                          '$affinityPct% afín',
                                          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: AppTheme.brand500),
                                        ),
                                      ],
                                    ),

                                    if (skills.isNotEmpty) ...[
                                      const SizedBox(height: 8),
                                      Wrap(
                                        spacing: 4,
                                        runSpacing: 4,
                                        children: skills.take(3).map((sk) => Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                          decoration: BoxDecoration(
                                            color: AppTheme.primaryColor.withValues(alpha: 0.08),
                                            borderRadius: BorderRadius.circular(6),
                                          ),
                                          child: Text(
                                            sk,
                                            style: const TextStyle(fontSize: 9.5, fontWeight: FontWeight.w700, color: AppTheme.primaryColor),
                                          ),
                                        )).toList(),
                                      ),
                                    ],
                                    const SizedBox(height: 12),
                                    const Divider(height: 1),
                                    const SizedBox(height: 8),
                                    Row(
                                      children: [
                                        Expanded(
                                          child: OutlinedButton.icon(
                                            style: OutlinedButton.styleFrom(
                                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                              visualDensity: VisualDensity.compact,
                                            ),
                                            onPressed: () => _showPublicProfileModal(s['user_id'] as int),
                                            icon: const Icon(Icons.visibility_outlined, size: 16),
                                            label: const Text('Ver Perfil & Proyectos', style: TextStyle(fontSize: 11.5)),
                                          ),
                                        ),
                                        if (!isCompany) ...[
                                          const SizedBox(width: 8),
                                          ElevatedButton.icon(
                                            style: ElevatedButton.styleFrom(
                                              backgroundColor: AppTheme.brand500,
                                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                              visualDensity: VisualDensity.compact,
                                            ),
                                            onPressed: () => _sendConnectionRequest(s['user_id'] as int),
                                            icon: const Icon(Icons.person_add_rounded, color: Colors.white, size: 15),
                                            label: const Text('Conectar', style: TextStyle(color: Colors.white, fontSize: 11.5)),
                                          ),
                                        ],
                                      ],
                                    ),
                                  ],
                                ),
                              );
                            },
                          ),
              ),
            ],
          ),

          // ── TAB 2: DIRECTORIO GENERAL ──
          Column(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                color: context.surfaceColor,
                child: Column(
                  children: [
                    TextField(
                      decoration: InputDecoration(
                        hintText: 'Buscar por nombre, cargo o habilidad...',
                        prefixIcon: const Icon(Icons.search_rounded),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      ),
                      onSubmitted: (val) {
                        _searchQuery = val;
                        _fetchDirectory();
                      },
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        FilterChip(
                          selected: _mentorsOnly,
                          label: const Text('Solo Mentores'),
                          avatar: const Icon(Icons.school_rounded, size: 16),
                          onSelected: (val) {
                            setState(() => _mentorsOnly = val);
                            _fetchDirectory();
                          },
                        ),
                        const Spacer(),
                        IconButton(
                          icon: const Icon(Icons.refresh_rounded),
                          onPressed: _fetchDirectory,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              Expanded(
                child: _isLoadingDirectory
                    ? const Center(child: CircularProgressIndicator(color: AppTheme.primaryColor))
                    : _graduates.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.people_outline_rounded, size: 52, color: context.tertiaryText),
                                const SizedBox(height: 8),
                                Text(
                                  'No se encontraron egresados',
                                  style: TextStyle(color: context.secondaryText, fontWeight: FontWeight.w600),
                                ),
                              ],
                            ),
                          )
                        : ListView.separated(
                            padding: const EdgeInsets.all(14),
                            itemCount: _graduates.length,
                            separatorBuilder: (_, _) => const SizedBox(height: 10),
                            itemBuilder: (ctx, i) {
                              final g = _graduates[i];
                              final first = g['first_name']?.toString() ?? '';
                              final last = g['last_name']?.toString() ?? '';
                              final name = '$first $last'.trim();
                              final prog = g['program_name']?.toString() ?? 'Egresado UPC';
                              final year = g['graduation_year']?.toString() ?? '';
                              final position = g['current_position']?.toString();
                              final company = g['current_company']?.toString();
                              final isMentor = g['mentor_opt_in'] == true;
                              final photo = g['profile_picture_url']?.toString();
                              final skills = List<String>.from(g['skills'] ?? []);

                              final isCompany = _currentUserRole == 'COMPANY';

                              return Container(
                                padding: const EdgeInsets.all(14),
                                decoration: BoxDecoration(
                                  color: context.surfaceColor,
                                  borderRadius: BorderRadius.circular(16),
                                  border: Border.all(color: context.borderColor),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        CircleAvatar(
                                          radius: 24,
                                          backgroundColor: AppTheme.brand500.withValues(alpha: 0.15),
                                          backgroundImage: photo != null ? NetworkImage(photo) : null,
                                          child: photo == null
                                              ? Text(
                                                  name.isNotEmpty ? name[0].toUpperCase() : 'U',
                                                  style: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.primaryColor),
                                                )
                                              : null,
                                        ),
                                        const SizedBox(width: 12),
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Row(
                                                children: [
                                                  Flexible(
                                                    child: Text(
                                                      name,
                                                      style: TextStyle(
                                                        fontSize: 14,
                                                        fontWeight: FontWeight.w800,
                                                        color: context.primaryText,
                                                      ),
                                                    ),
                                                  ),
                                                  if (isMentor) ...[
                                                    const SizedBox(width: 4),
                                                    Container(
                                                      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                                                      decoration: BoxDecoration(
                                                        color: Colors.purple.withValues(alpha: 0.15),
                                                        borderRadius: BorderRadius.circular(6),
                                                      ),
                                                      child: const Text(
                                                        'Mentor',
                                                        style: TextStyle(fontSize: 9.5, color: Colors.purple, fontWeight: FontWeight.bold),
                                                      ),
                                                    ),
                                                  ],
                                                ],
                                              ),
                                              Text(
                                                '$prog • $year',
                                                style: TextStyle(fontSize: 11.5, color: context.secondaryText),
                                              ),
                                              if (position != null || company != null) ...[
                                                const SizedBox(height: 2),
                                                Text(
                                                  '${position ?? 'Profesional'} ${company != null ? 'en $company' : ''}',
                                                  style: const TextStyle(
                                                    fontSize: 11,
                                                    fontWeight: FontWeight.w600,
                                                    color: AppTheme.primaryColor,
                                                  ),
                                                ),
                                              ],
                                            ],
                                          ),
                                        ),
                                      ],
                                    ),
                                    if (skills.isNotEmpty) ...[
                                      const SizedBox(height: 8),
                                      Wrap(
                                        spacing: 4,
                                        runSpacing: 4,
                                        children: skills.take(3).map((s) => Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                          decoration: BoxDecoration(
                                            color: AppTheme.brand500.withValues(alpha: 0.10),
                                            borderRadius: BorderRadius.circular(6),
                                          ),
                                          child: Text(
                                            s,
                                            style: const TextStyle(
                                              fontSize: 9.5,
                                              fontWeight: FontWeight.w700,
                                              color: AppTheme.primaryColor,
                                            ),
                                          ),
                                        )).toList(),
                                      ),
                                    ],
                                    const SizedBox(height: 12),
                                    const Divider(height: 1),
                                    const SizedBox(height: 8),
                                    Row(
                                      children: [
                                        Expanded(
                                          child: OutlinedButton.icon(
                                            style: OutlinedButton.styleFrom(
                                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                              visualDensity: VisualDensity.compact,
                                            ),
                                            onPressed: () => _showPublicProfileModal(g['user_id'] as int),
                                            icon: const Icon(Icons.visibility_outlined, size: 16),
                                            label: const Text('Ver Perfil & Proyectos', style: TextStyle(fontSize: 11.5)),
                                          ),
                                        ),
                                        if (!isCompany) ...[
                                          const SizedBox(width: 8),
                                          ElevatedButton.icon(
                                            style: ElevatedButton.styleFrom(
                                              backgroundColor: AppTheme.brand500,
                                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                              visualDensity: VisualDensity.compact,
                                            ),
                                            onPressed: () => _sendConnectionRequest(g['user_id'] as int),
                                            icon: const Icon(Icons.person_add_rounded, color: Colors.white, size: 15),
                                            label: const Text('Conectar', style: TextStyle(color: Colors.white, fontSize: 11.5)),
                                          ),
                                        ],
                                      ],
                                    ),
                                  ],
                                ),
                              );
                            },
                          ),
              ),
            ],
          ),

          // ── TAB 3: MIS CONEXIONES ──
          _isLoadingConnections
              ? const Center(child: CircularProgressIndicator(color: AppTheme.primaryColor))
              : SingleChildScrollView(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // 1. Solicitudes Recibidas
                      Text(
                        'Solicitudes Recibidas (${(_connections['incoming'] as List).length})',
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: context.primaryText),
                      ),
                      const SizedBox(height: 8),
                      if ((_connections['incoming'] as List).isEmpty)
                        Text(
                          'No tienes solicitudes pendientes por responder.',
                          style: TextStyle(fontSize: 12, color: context.tertiaryText),
                        )
                      else
                        ...(_connections['incoming'] as List).map((req) {
                          return Container(
                            margin: const EdgeInsets.only(bottom: 10),
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              color: context.surfaceColor,
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(color: context.borderColor),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    CircleAvatar(
                                      radius: 20,
                                      child: Text(req['peer_name']?[0] ?? 'U'),
                                    ),
                                    const SizedBox(width: 10),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            req['peer_name'] ?? 'Egresado',
                                            style: TextStyle(
                                              fontWeight: FontWeight.bold,
                                              fontSize: 13,
                                              color: context.primaryText,
                                            ),
                                          ),
                                          Text(
                                            req['peer_program'] ?? '',
                                            style: TextStyle(fontSize: 11, color: context.secondaryText),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                                if (req['message'] != null && req['message'].toString().isNotEmpty) ...[
                                  const SizedBox(height: 6),
                                  Text(
                                    '"${req['message']}"',
                                    style: TextStyle(fontSize: 11.5, fontStyle: FontStyle.italic, color: context.secondaryText),
                                  ),
                                ],
                                const SizedBox(height: 10),
                                Row(
                                  children: [
                                    Expanded(
                                      child: ElevatedButton(
                                        style: ElevatedButton.styleFrom(
                                          backgroundColor: AppTheme.brand500,
                                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                        ),
                                        onPressed: () => _respondConnection(req['id'] as int, 'ACCEPT'),
                                        child: const Text('Aceptar', style: TextStyle(color: Colors.white, fontSize: 12)),
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    OutlinedButton(
                                      style: OutlinedButton.styleFrom(
                                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                      ),
                                      onPressed: () => _respondConnection(req['id'] as int, 'REJECT'),
                                      child: const Text('Rechazar', style: TextStyle(fontSize: 12)),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          );
                        }),

                      const SizedBox(height: 20),

                      // 2. Amigos / Contactos Conectados
                      Text(
                        'Mis Contactos Conectados (${(_connections['accepted'] as List).length})',
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: context.primaryText),
                      ),
                      const SizedBox(height: 8),
                      if ((_connections['accepted'] as List).isEmpty)
                        Text(
                          'Aún no tienes contactos conectados. Conecta con egresados en el Directorio o Red Afín.',
                          style: TextStyle(fontSize: 12, color: context.tertiaryText),
                        )
                      else
                        ...(_connections['accepted'] as List).map((c) {
                          return Container(
                            margin: const EdgeInsets.only(bottom: 10),
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: context.surfaceColor,
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(color: context.borderColor),
                            ),
                            child: Row(
                              children: [
                                CircleAvatar(
                                  radius: 22,
                                  backgroundColor: AppTheme.primaryColor.withValues(alpha: 0.15),
                                  child: Text(
                                    c['peer_name']?[0] ?? 'C',
                                    style: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.primaryColor),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        c['peer_name'] ?? 'Contacto',
                                        style: TextStyle(
                                          fontWeight: FontWeight.w800,
                                          fontSize: 13,
                                          color: context.primaryText,
                                        ),
                                      ),
                                      Text(
                                        c['peer_program'] ?? '',
                                        style: TextStyle(fontSize: 11, color: context.secondaryText),
                                      ),
                                    ],
                                  ),
                                ),
                                IconButton(
                                  icon: const Icon(Icons.chat_bubble_outline_rounded, color: AppTheme.brand500),
                                  onPressed: () {
                                    Navigator.push(
                                      context,
                                      MaterialPageRoute(builder: (_) => const MessagesScreen()),
                                    );
                                  },
                                ),
                              ],
                            ),
                          );
                        }),
                    ],
                  ),
                ),
        ],
      ),
    );
  }
}
