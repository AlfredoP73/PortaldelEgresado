import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:jwt_decoder/jwt_decoder.dart';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'dart:ui';

import '../../../core/theme/app_theme.dart';
import '../../../core/network/api_client.dart';
import '../../profile/presentation/profile_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> with TickerProviderStateMixin {
  bool _isLoading = true;
  String? _error;
  
  Map<String, dynamic>? _summary;
  List<dynamic>? _recentActivity;
  String _userName = 'Egresado';
  String _initial = 'E';
  String? _profilePicUrl;
  double _profileProgress = 0.0;
  String? _currentGraduateId;

  List<dynamic> _notifications = [];
  bool _hasUnreadNotifications = false;

  WebSocketChannel? _channel;

  // Animaciones
  late AnimationController _animController;
  late Animation<double> _fadeAnim;
  late Animation<Offset> _slideAnim;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(vsync: this, duration: const Duration(milliseconds: 1000));
    _fadeAnim = CurvedAnimation(parent: _animController, curve: Curves.easeOut);
    _slideAnim = Tween<Offset>(begin: const Offset(0, 0.1), end: Offset.zero).animate(CurvedAnimation(parent: _animController, curve: Curves.easeOutCubic));
    
    _fetchData();
  }

  @override
  void dispose() {
    _channel?.sink.close();
    _animController.dispose();
    super.dispose();
  }

  void _initWebSocket(String graduateId) {
    try {
      final String baseUrl = ApiClient.instance.options.baseUrl;
      final uri = Uri.parse(baseUrl);
      final wsScheme = uri.scheme == 'https' ? 'wss' : 'ws';
      final wsUrl = '$wsScheme://${uri.host}:${uri.port}/matching/ws/$graduateId';

      _channel = WebSocketChannel.connect(Uri.parse(wsUrl));
      _channel!.stream.listen((message) {
        if (mounted) {
          try {
            final data = jsonDecode(message);
            setState(() {
              _notifications.insert(0, data);
              _hasUnreadNotifications = true;
            });
            // Haptic feedback could be added here
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('¡Nueva sugerencia de empleo: ${data['job_title']}!'),
                backgroundColor: AppTheme.primaryColor,
                duration: const Duration(seconds: 3),
              )
            );
          } catch (e) {
            // Ignore parse errors
          }
        }
      });
    } catch (e) {
      // Failed to connect ws
    }
  }

  Future<void> _fetchNotifications(String graduateId) async {
    try {
      final String baseUrl = ApiClient.instance.options.baseUrl.replaceAll(RegExp(r'/api$'), '');
      final res = await ApiClient.instance.get('$baseUrl/matching/notifications/$graduateId');
      if (res.statusCode == 200 && mounted) {
        final List<dynamic> notifs = res.data;
        setState(() {
          _notifications = notifs;
          _hasUnreadNotifications = notifs.any((n) => n['is_read'] == false);
        });
      }
    } catch (e) {
      // Ignore notification fetch errors
    }
  }

  Future<void> _markNotificationAsRead(int notificationId) async {
    try {
      final String baseUrl = ApiClient.instance.options.baseUrl.replaceAll(RegExp(r'/api$'), '');
      await ApiClient.instance.patch('$baseUrl/matching/notifications/$notificationId/leido');
      setState(() {
        final notif = _notifications.firstWhere((n) => n['id'] == notificationId, orElse: () => null);
        if (notif != null) notif['is_read'] = true;
        _hasUnreadNotifications = _notifications.any((n) => n['is_read'] == false);
      });
    } catch (e) {
      // Ignore error
    }
  }

  void _showNotificationsPanel() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Container(
              height: MediaQuery.of(context).size.height * 0.75,
              decoration: const BoxDecoration(
                color: Color(0xFF1E1E2C), // Darker elegant background
                borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: Container(
                      margin: const EdgeInsets.only(top: 12, bottom: 24),
                      width: 40, height: 4,
                      decoration: BoxDecoration(color: Colors.white24, borderRadius: BorderRadius.circular(2)),
                    )
                  ),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 24),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Notificaciones en Vivo', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: Colors.white)),
                        IconButton(icon: const Icon(Icons.close, color: Colors.white54), onPressed: () => Navigator.pop(context)),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  Expanded(
                    child: _notifications.isEmpty
                        ? const Center(child: Text('Todo está tranquilo por ahora', style: TextStyle(color: Colors.white54)))
                        : ListView.separated(
                            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                            itemCount: _notifications.length,
                            separatorBuilder: (context, index) => const SizedBox(height: 12),
                            itemBuilder: (context, index) {
                              final notif = _notifications[index];
                              final bool isRead = notif['is_read'] ?? true;
                              final scoreStr = notif['score'] != null ? (double.parse(notif['score'].toString())).toInt().toString() : '80';

                              return GestureDetector(
                                onTap: () {
                                  if (!isRead) {
                                    _markNotificationAsRead(notif['id']);
                                    setModalState(() { notif['is_read'] = true; });
                                  }
                                },
                                child: Container(
                                  padding: const EdgeInsets.all(16),
                                  decoration: BoxDecoration(
                                    color: isRead ? Colors.white.withValues(alpha: 0.03) : AppTheme.primaryColor.withValues(alpha: 0.1),
                                    borderRadius: BorderRadius.circular(20),
                                    border: Border.all(color: isRead ? Colors.white12 : AppTheme.primaryColor.withValues(alpha: 0.5)),
                                  ),
                                  child: Row(
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.all(12),
                                        decoration: BoxDecoration(
                                          gradient: isRead ? null : AppTheme.primaryGradient,
                                          color: isRead ? Colors.white10 : null,
                                          shape: BoxShape.circle,
                                        ),
                                        child: Icon(Icons.auto_awesome, color: isRead ? Colors.white54 : Colors.white, size: 20),
                                      ),
                                      const SizedBox(width: 16),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(notif['job_title'] ?? 'Vacante Sugerida', style: const TextStyle(fontWeight: FontWeight.w700, color: Colors.white, fontSize: 15)),
                                            const SizedBox(height: 4),
                                            Text(notif['company_name'] ?? 'Empresa Confidencial', style: const TextStyle(color: Colors.white70, fontSize: 13)),
                                            const SizedBox(height: 6),
                                            Row(
                                              children: [
                                                const Icon(Icons.local_fire_department, size: 14, color: AppTheme.accentAmber),
                                                const SizedBox(width: 4),
                                                Text('$scoreStr% Match', style: const TextStyle(color: AppTheme.accentAmber, fontSize: 12, fontWeight: FontWeight.w700)),
                                              ],
                                            )
                                          ],
                                        ),
                                      ),
                                      if (!isRead)
                                        Container(width: 10, height: 10, decoration: const BoxDecoration(color: AppTheme.accentAmber, shape: BoxShape.circle)),
                                    ],
                                  ),
                                ),
                              );
                            },
                          ),
                  ),
                ],
              ),
            );
          }
        );
      }
    );
  }

  Future<void> _fetchData() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('jwt_token');
      
      if (token != null && token.isNotEmpty) {
        try {
          Map<String, dynamic> decodedToken = JwtDecoder.decode(token);
          String sub = decodedToken['sub'] ?? 'Egresado';
          _currentGraduateId = decodedToken['id']?.toString();
          setState(() {
            _userName = sub.split('@')[0];
            _initial = _userName.isNotEmpty ? _userName[0].toUpperCase() : 'E';
          });
        } catch (_) {}
      }

      if (_currentGraduateId != null) {
        _fetchNotifications(_currentGraduateId!);
        _initWebSocket(_currentGraduateId!);
      }

      // Perfil
      try {
        final profileRes = await ApiClient.instance.get('/modulo1/profile');
        if (profileRes.statusCode == 200 && profileRes.data != null) {
          final pData = profileRes.data;
          String? firstName = pData['first_name'];
          String? lastName = pData['last_name'];
          String? picUrl = pData['profile_picture_url'];

          double progress = 0.0;
          if (firstName != null && firstName.isNotEmpty && lastName != null && lastName.isNotEmpty) progress += 0.20;
          if (picUrl != null && picUrl.isNotEmpty) progress += 0.15;
          if (pData['cv_url'] != null && pData['cv_url'].toString().isNotEmpty) progress += 0.20;
          if (pData['skills'] != null && (pData['skills'] as List).isNotEmpty) progress += 0.25;
          if (pData['academic_histories'] != null && (pData['academic_histories'] as List).isNotEmpty && pData['experiences'] != null && (pData['experiences'] as List).isNotEmpty) progress += 0.20;

          setState(() => _profileProgress = progress);

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
      } catch (e) { /* ignore */ }

      // Dashboard
      final response = await ApiClient.instance.get('/graduate/dashboard');
      final data = response.data;
      final timestamp = DateTime.now().millisecondsSinceEpoch;
      final appsResponse = await ApiClient.instance.get('/modulo1/my-applications?t=$timestamp');

      if (mounted) {
        setState(() {
          _summary = data['summary'];
          _recentActivity = appsResponse.data is List ? appsResponse.data : [];
          _isLoading = false;
        });
        _animController.forward();
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = 'Error al cargar los datos. Revisa tu conexión.';
          _isLoading = false;
        });
      }
    }
  }

  Color _getStatusColor(String status) {
    status = status.toLowerCase();
    if (status.contains('postulado') || status.contains('aplicado')) return AppTheme.statusPostulado;
    if (status.contains('entrevistado')) return AppTheme.statusEntrevistado;
    if (status.contains('contratado') || status.contains('aceptado')) return AppTheme.statusContratado;
    if (status.contains('rechazado')) return AppTheme.statusRechazado;
    return Colors.white54;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A), // Deep professional blue
      body: Stack(
        children: [
          // Background ambient glows
          Positioned(
            top: -100, left: -100,
            child: Container(
              width: 300, height: 300,
              decoration: BoxDecoration(shape: BoxShape.circle, color: AppTheme.primaryColor.withValues(alpha: 0.15)),
              child: BackdropFilter(filter: ImageFilter.blur(sigmaX: 100, sigmaY: 100), child: Container(color: Colors.transparent)),
            ),
          ),
          Positioned(
            bottom: -50, right: -50,
            child: Container(
              width: 250, height: 250,
              decoration: BoxDecoration(shape: BoxShape.circle, color: AppTheme.accentAmber.withValues(alpha: 0.1)),
              child: BackdropFilter(filter: ImageFilter.blur(sigmaX: 80, sigmaY: 80), child: Container(color: Colors.transparent)),
            ),
          ),
          
          SafeArea(
            child: _isLoading 
              ? const Center(child: CircularProgressIndicator(color: AppTheme.primaryColor))
              : _error != null
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(_error!, style: const TextStyle(color: AppTheme.statusRechazado, fontWeight: FontWeight.w700)),
                        const SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: () { setState(() => _isLoading = true); _fetchData(); },
                          style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primaryDark),
                          child: const Text('Reintentar', style: TextStyle(color: Colors.white)),
                        )
                      ],
                    )
                  )
                : RefreshIndicator(
                    onRefresh: _fetchData,
                    color: AppTheme.primaryColor,
                    backgroundColor: const Color(0xFF1E293B),
                    child: SingleChildScrollView(
                      padding: const EdgeInsets.only(left: 24, right: 24, top: 20, bottom: 120),
                      physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
                      child: SlideTransition(
                        position: _slideAnim,
                        child: FadeTransition(
                          opacity: _fadeAnim,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // ── Header ──
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Expanded(
                                    child: Row(
                                      children: [
                                        Hero(
                                          tag: 'profilePic',
                                          child: Container(
                                            width: 56, height: 56,
                                            decoration: BoxDecoration(
                                              shape: BoxShape.circle,
                                              border: Border.all(color: Colors.white.withValues(alpha: 0.1), width: 2),
                                              image: _profilePicUrl != null ? DecorationImage(image: NetworkImage(_profilePicUrl!), fit: BoxFit.cover) : null,
                                              gradient: _profilePicUrl == null ? AppTheme.primaryGradient : null,
                                            ),
                                            child: _profilePicUrl == null
                                                ? Center(child: Text(_initial, style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold)))
                                                : null,
                                          ),
                                        ),
                                        const SizedBox(width: 16),
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Text(
                                                'Hola, $_userName',
                                                style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w800, color: Colors.white, letterSpacing: -0.5),
                                                maxLines: 1, overflow: TextOverflow.ellipsis,
                                              ),
                                              const SizedBox(height: 2),
                                              Text('Egresado Destacado', style: TextStyle(color: AppTheme.primaryColor.withValues(alpha: 0.9), fontSize: 13, fontWeight: FontWeight.w600)),
                                            ],
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  GestureDetector(
                                    onTap: _showNotificationsPanel,
                                    child: Container(
                                      padding: const EdgeInsets.all(12),
                                      decoration: BoxDecoration(
                                        color: Colors.white.withValues(alpha: 0.05),
                                        shape: BoxShape.circle,
                                        border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
                                      ),
                                      child: Stack(
                                        clipBehavior: Clip.none,
                                        children: [
                                          const Icon(Icons.notifications_outlined, color: Colors.white, size: 24),
                                          if (_hasUnreadNotifications)
                                            Positioned(
                                              right: -4, top: -4,
                                              child: Container(
                                                width: 12, height: 12,
                                                decoration: BoxDecoration(
                                                  color: const Color(0xFFEF4444), // Ping red
                                                  shape: BoxShape.circle,
                                                  border: Border.all(color: const Color(0xFF0F172A), width: 2),
                                                ),
                                              ),
                                            ),
                                        ],
                                      ),
                                    ),
                                  )
                                ],
                              ),
                              const SizedBox(height: 32),

                              // ── Banner Glassmorphism Completitud ──
                              if (_profileProgress < 1.0)
                                Container(
                                  margin: const EdgeInsets.only(bottom: 32),
                                  decoration: BoxDecoration(
                                    borderRadius: BorderRadius.circular(24),
                                    gradient: LinearGradient(
                                      colors: [Colors.white.withValues(alpha: 0.1), Colors.white.withValues(alpha: 0.05)],
                                      begin: Alignment.topLeft, end: Alignment.bottomRight,
                                    ),
                                    border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
                                    boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.2), blurRadius: 20)],
                                  ),
                                  child: ClipRRect(
                                    borderRadius: BorderRadius.circular(24),
                                    child: BackdropFilter(
                                      filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
                                      child: Padding(
                                        padding: const EdgeInsets.all(24),
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Row(
                                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                              children: [
                                                const Text('Completa tu Perfil', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 18)),
                                                Container(
                                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                                  decoration: BoxDecoration(color: AppTheme.accentAmber.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(20)),
                                                  child: Text('${(_profileProgress * 100).toInt()}%', style: const TextStyle(color: AppTheme.accentAmber, fontWeight: FontWeight.bold, fontSize: 14)),
                                                ),
                                              ],
                                            ),
                                            const SizedBox(height: 8),
                                            const Text('Los perfiles completos tienen 3x más probabilidades de ser contactados.', style: TextStyle(color: Colors.white70, fontSize: 13, height: 1.4)),
                                            const SizedBox(height: 20),
                                            ClipRRect(
                                              borderRadius: BorderRadius.circular(6),
                                              child: LinearProgressIndicator(
                                                value: _profileProgress,
                                                backgroundColor: Colors.black26,
                                                valueColor: const AlwaysStoppedAnimation<Color>(AppTheme.accentAmber),
                                                minHeight: 8,
                                              ),
                                            ),
                                            const SizedBox(height: 20),
                                            SizedBox(
                                              width: double.infinity, height: 44,
                                              child: ElevatedButton(
                                                onPressed: () { Navigator.push(context, MaterialPageRoute(builder: (context) => const ProfileScreen())); },
                                                style: ElevatedButton.styleFrom(
                                                  backgroundColor: Colors.white, foregroundColor: Colors.black87,
                                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                                ),
                                                child: const Text('Actualizar ahora', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ),
                                  ),
                                ),

                              // ── Metrics Grid (2x2) ──
                              const Text('Resumen', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white)),
                              const SizedBox(height: 16),
                              Row(
                                children: [
                                  Expanded(child: _GlassMetricCard(title: 'Postulaciones\nenviadas', value: '${_summary?['total_applications'] ?? 0}', icon: Icons.send_rounded, color: const Color(0xFF3B82F6))),
                                  const SizedBox(width: 16),
                                  Expanded(child: _GlassMetricCard(title: 'Tasa de\nrespuesta', value: '${((_summary?['response_rate'] ?? 0)).toStringAsFixed(0)}%', icon: Icons.insights_rounded, color: const Color(0xFF10B981))),
                                ],
                              ),
                              const SizedBox(height: 16),
                              Row(
                                children: [
                                  Expanded(child: _GlassMetricCard(title: 'Visitas al\nperfil', value: '${_summary?['profile_views'] ?? 0}', icon: Icons.visibility_rounded, color: const Color(0xFF8B5CF6))),
                                  const SizedBox(width: 16),
                                  Expanded(child: _GlassMetricCard(title: 'Salario prom.\nofertas', value: '\$${((_summary?['program_average_salary'] ?? 0)/1000000).toStringAsFixed(1)}M', icon: Icons.monetization_on_rounded, color: const Color(0xFFF59E0B))),
                                ],
                              ),
                              const SizedBox(height: 32),

                              // ── Actividad Reciente (Modern) ──
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  const Text('Actividad Reciente', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white)),
                                  Icon(Icons.arrow_forward_ios_rounded, color: Colors.white.withValues(alpha: 0.3), size: 16),
                                ],
                              ),
                              const SizedBox(height: 16),
                              Container(
                                decoration: BoxDecoration(
                                  color: Colors.white.withValues(alpha: 0.03),
                                  borderRadius: BorderRadius.circular(24),
                                  border: Border.all(color: Colors.white.withValues(alpha: 0.05)),
                                ),
                                child: _recentActivity != null && _recentActivity!.isNotEmpty
                                    ? Column(
                                        children: _recentActivity!.take(3).map((activity) {
                                          String jobTitle = 'Puesto';
                                          String company = 'Empresa';
                                          String status = activity['status'] ?? 'Pendiente';
                                          if (activity['job_offer'] != null) {
                                              jobTitle = activity['job_offer']['title'] ?? 'Puesto';
                                              if (activity['job_offer']['company'] != null) {
                                                  company = activity['job_offer']['company']['name'] ?? 'Empresa';
                                              }
                                          }
                                          return _ModernActivityItem(
                                            title: jobTitle,
                                            company: company,
                                            statusColor: _getStatusColor(status),
                                            status: status,
                                            isLast: activity == _recentActivity!.take(3).last,
                                          );
                                        }).toList(),
                                      )
                                    : const Padding(
                                        padding: EdgeInsets.all(32),
                                        child: Center(child: Text('Sin actividad reciente', style: TextStyle(color: Colors.white54))),
                                      ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
          ),
        ],
      ),
    );
  }
}

class _GlassMetricCard extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;
  final Color color;

  const _GlassMetricCard({required this.title, required this.value, required this.icon, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.04),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(color: color.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(12)),
            child: Icon(icon, color: color, size: 22),
          ),
          const SizedBox(height: 16),
          Text(value, style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Colors.white, letterSpacing: -1)),
          const SizedBox(height: 4),
          Text(title, style: const TextStyle(color: Colors.white54, fontSize: 13, fontWeight: FontWeight.w500, height: 1.2)),
        ],
      ),
    );
  }
}

class _ModernActivityItem extends StatelessWidget {
  final String title;
  final String company;
  final Color statusColor;
  final String status;
  final bool isLast;

  const _ModernActivityItem({required this.title, required this.company, required this.statusColor, required this.status, required this.isLast});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          child: Row(
            children: [
              Container(
                width: 44, height: 44,
                decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.05), borderRadius: BorderRadius.circular(12)),
                child: const Icon(Icons.business_center_rounded, color: Colors.white54, size: 20),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: const TextStyle(fontWeight: FontWeight.w700, color: Colors.white, fontSize: 15), maxLines: 1, overflow: TextOverflow.ellipsis),
                    const SizedBox(height: 4),
                    Text(company, style: const TextStyle(color: Colors.white54, fontSize: 13), maxLines: 1, overflow: TextOverflow.ellipsis),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(color: statusColor.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(20)),
                child: Text(status.toUpperCase(), style: TextStyle(color: statusColor, fontSize: 10, fontWeight: FontWeight.bold)),
              ),
            ],
          ),
        ),
        if (!isLast) Divider(color: Colors.white.withValues(alpha: 0.05), height: 1, indent: 80, endIndent: 20),
      ],
    );
  }
}
