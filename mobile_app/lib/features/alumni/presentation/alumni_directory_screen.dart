import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/network/api_client.dart';
import '../../messages/presentation/messages_screen.dart';

class AlumniDirectoryScreen extends StatefulWidget {
  const AlumniDirectoryScreen({super.key});

  @override
  State<AlumniDirectoryScreen> createState() => _AlumniDirectoryScreenState();
}

class _AlumniDirectoryScreenState extends State<AlumniDirectoryScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  bool _isLoadingDirectory = true;
  bool _isLoadingConnections = false;

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
    _tabController = TabController(length: 2, vsync: this);
    _tabController.addListener(() {
      if (_tabController.index == 1) {
        _fetchConnections();
      }
    });
    _fetchDirectory();
    _fetchConnections();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
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
    } catch (_) {
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

            return DraggableScrollableSheet(
              initialChildSize: 0.85,
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
                      // Header
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          CircleAvatar(
                            radius: 32,
                            backgroundColor: AppTheme.primaryColor.withValues(alpha: 0.15),
                            backgroundImage: photo != null ? NetworkImage(photo) : null,
                            child: photo == null
                                ? Text(
                                    fullName.isNotEmpty ? fullName[0].toUpperCase() : 'U',
                                    style: const TextStyle(
                                      fontSize: 22,
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
                                  '$program • Promoción $year',
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

                      // Botón Conectar / Estado
                      if (status == 'ACCEPTED')
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
                            label: const Text('Enviar Mensaje Directo', style: TextStyle(color: Colors.white)),
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
                                'Solicitud de conexión enviada (Pendiente)',
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

                      // Proyectos y Portafolio
                      Text(
                        'Portafolio de Proyectos (${projects.length})',
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: context.primaryText),
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
                            final repo = p['repository_url']?.toString() ?? '';
                            final liveDemo = p['project_url']?.toString() ?? '';

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
                                  if (repo.isNotEmpty || liveDemo.isNotEmpty) ...[
                                    const SizedBox(height: 8),
                                    Row(
                                      children: [
                                        if (repo.isNotEmpty)
                                          TextButton.icon(
                                            style: TextButton.styleFrom(visualDensity: VisualDensity.compact),
                                            onPressed: () => _openUrl(repo),
                                            icon: const Icon(Icons.code_rounded, size: 14, color: AppTheme.primaryColor),
                                            label: const Text('Repositorio', style: TextStyle(fontSize: 11)),
                                          ),
                                        if (liveDemo.isNotEmpty)
                                          TextButton.icon(
                                            style: TextButton.styleFrom(visualDensity: VisualDensity.compact),
                                            onPressed: () => _openUrl(liveDemo),
                                            icon: const Icon(Icons.open_in_new_rounded, size: 14, color: AppTheme.brand500),
                                            label: const Text('Demo', style: TextStyle(fontSize: 11)),
                                          ),
                                      ],
                                    ),
                                  ],
                                ],
                              ),
                            );
                          },
                        ),

                      const SizedBox(height: 16),

                      // Habilidades
                      if (skills.isNotEmpty) ...[
                        Text(
                          'Habilidades y Competencias',
                          style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: context.primaryText),
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

                      // Experiencia Laboral
                      if (experiences.isNotEmpty) ...[
                        Text(
                          'Experiencia Laboral',
                          style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: context.primaryText),
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
                            ],
                          ),
                        )),
                      ],
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
        title: const Text('Red de Egresados & Contactos'),
        backgroundColor: context.surfaceColor,
        elevation: 0,
        bottom: TabBar(
          controller: _tabController,
          labelColor: AppTheme.primaryColor,
          unselectedLabelColor: context.secondaryText,
          indicatorColor: AppTheme.primaryColor,
          tabs: [
            Tab(
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.people_alt_rounded, size: 18),
                  const SizedBox(width: 6),
                  Text('Directorio (${_graduates.length})'),
                ],
              ),
            ),
            Tab(
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.how_to_reg_rounded, size: 18),
                  const SizedBox(width: 6),
                  const Text('Mis Conexiones'),
                  if (incomingCount > 0) ...[
                    const SizedBox(width: 4),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
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
          // ── TAB 1: DIRECTORIO ──
          Column(
            children: [
              // Barra de Búsqueda y Filtros
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

              // Lista de egresados
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
                                                  style: const TextStyle(
                                                    fontWeight: FontWeight.bold,
                                                    color: AppTheme.primaryColor,
                                                  ),
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
                                                        style: TextStyle(
                                                          fontSize: 9.5,
                                                          color: Colors.purple,
                                                          fontWeight: FontWeight.bold,
                                                        ),
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
                                    ),
                                  ],
                                ),
                              );
                            },
                          ),
              ),
            ],
          ),

          // ── TAB 2: MIS CONEXIONES ──
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
                          'Aún no tienes contactos conectados. Conecta con egresados en el Directorio.',
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

