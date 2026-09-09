import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/network/api_client.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:jwt_decoder/jwt_decoder.dart';
import '../../profile/presentation/profile_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  bool _isLoading = true;
  String? _error;
  
  Map<String, dynamic>? _summary;
  List<dynamic>? _applicationsByStatus;
  List<dynamic>? _recentActivity;
  String _userName = 'Egresado';
  String _initial = 'E';
  String? _profilePicUrl;
  double _profileProgress = 0.0;

  List<dynamic> _notifications = [];
  bool _hasUnreadNotifications = false;

  @override
  void initState() {
    super.initState();
    _fetchData();
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
      backgroundColor: context.surfaceColor,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Container(
              height: MediaQuery.of(context).size.height * 0.7,
              padding: const EdgeInsets.symmetric(vertical: 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 24),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Sugerencias Recientes', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: context.primaryText)),
                        IconButton(icon: Icon(Icons.close, color: context.secondaryText), onPressed: () => Navigator.pop(context)),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  Expanded(
                    child: _notifications.isEmpty
                        ? Center(child: Text('No hay sugerencias recientes', style: TextStyle(color: context.secondaryText)))
                        : ListView.separated(
                            padding: const EdgeInsets.symmetric(horizontal: 24),
                            itemCount: _notifications.length,
                            separatorBuilder: (context, index) => const Divider(height: 1),
                            itemBuilder: (context, index) {
                              final notif = _notifications[index];
                              final bool isRead = notif['is_read'] ?? true;
                              final scoreStr = (double.parse(notif['score'].toString()) * 100).toInt().toString();

                              return ListTile(
                                contentPadding: const EdgeInsets.symmetric(vertical: 8),
                                leading: Container(
                                  padding: const EdgeInsets.all(10),
                                  decoration: BoxDecoration(
                                    color: isRead ? AppTheme.primaryColor.withValues(alpha: 0.1) : AppTheme.primaryColor,
                                    shape: BoxShape.circle,
                                  ),
                                  child: Icon(Icons.auto_awesome, color: isRead ? AppTheme.primaryColor : Colors.white, size: 20),
                                ),
                                title: Text(notif['job_title'] ?? 'Vacante Sugerida', style: TextStyle(fontWeight: isRead ? FontWeight.w600 : FontWeight.w800, color: context.primaryText)),
                                subtitle: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const SizedBox(height: 4),
                                    Text(notif['company_name'] ?? 'Empresa Confidencial', style: TextStyle(color: context.secondaryText, fontSize: 13)),
                                    const SizedBox(height: 4),
                                    Text('$scoreStr% de compatibilidad con tu perfil', style: TextStyle(color: AppTheme.primaryColor, fontSize: 12, fontWeight: FontWeight.w700)),
                                  ],
                                ),
                                trailing: !isRead 
                                  ? Container(width: 8, height: 8, decoration: BoxDecoration(color: AppTheme.accentAmber, shape: BoxShape.circle))
                                  : null,
                                onTap: () {
                                  if (!isRead) {
                                    _markNotificationAsRead(notif['id']);
                                    setModalState(() {
                                      notif['is_read'] = true;
                                    });
                                  }
                                },
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
      String? currentGraduateId;
      if (token != null && token.isNotEmpty) {
        try {
          Map<String, dynamic> decodedToken = JwtDecoder.decode(token);
          String sub = decodedToken['sub'] ?? 'Egresado';
          currentGraduateId = decodedToken['id']?.toString();
          setState(() {
            _userName = sub.split('@')[0]; // Quick fallback for name if it's an email
            _initial = _userName.isNotEmpty ? _userName[0].toUpperCase() : 'E';
          });
        } catch (_) {}
      }

      if (currentGraduateId != null) {
        _fetchNotifications(currentGraduateId);
      }

      // Try to get real profile from API for the header avatar and name
      try {
        final profileRes = await ApiClient.instance.get('/modulo1/profile');
        if (profileRes.statusCode == 200 && profileRes.data != null) {
          final pData = profileRes.data;
          String? firstName = pData['first_name'];
          String? lastName = pData['last_name'];
          String? picUrl = pData['profile_picture_url'];

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
          if (pData['cv_url'] != null && pData['cv_url'].toString().isNotEmpty) {
            progress += 0.20;
          }
          // Habilidades 25%
          if (pData['skills'] != null && (pData['skills'] as List).isNotEmpty) {
            progress += 0.25;
          }
          // Experiencia y Academia 20%
          if (pData['academic_histories'] != null && (pData['academic_histories'] as List).isNotEmpty && pData['experiences'] != null && (pData['experiences'] as List).isNotEmpty) {
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
        // Ignore profile errors
      }

      // Fetch dashboard metrics
      final response = await ApiClient.instance.get('/graduate/dashboard');
      final data = response.data;
      
      // Fetch recent applications for the activity list
      final timestamp = DateTime.now().millisecondsSinceEpoch;
      final appsResponse = await ApiClient.instance.get('/modulo1/my-applications?t=$timestamp');

      if (mounted) {
        setState(() {
          _summary = data['summary'];
          _applicationsByStatus = data['applications_by_status'];
          _recentActivity = appsResponse.data is List ? appsResponse.data : [];
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = 'Error al cargar los datos. Revisa tu sesión.';
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
    return context.secondaryText;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: context.bgColor,
      body: SafeArea(
        child: _isLoading 
          ? Center(child: CircularProgressIndicator(color: AppTheme.primaryColor))
          : _error != null
            ? Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(_error!, style: TextStyle(color: AppTheme.statusRechazado, fontWeight: FontWeight.w700)),
                    SizedBox(height: 16),
                    ElevatedButton(
                      onPressed: _fetchData,
                      style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primaryDark),
                      child: Text('Reintentar', style: TextStyle(color: Colors.white)),
                    )
                  ],
                )
              )
            : RefreshIndicator(
                onRefresh: _fetchData,
                color: AppTheme.primaryColor,
                child: SingleChildScrollView(
                  padding: EdgeInsets.only(left: 20, right: 20, top: 20, bottom: 120),
                  physics: const AlwaysScrollableScrollPhysics(),
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
                                Container(
                                  width: 48,
                                  height: 48,
                                  decoration: BoxDecoration(
                                    color: context.surfaceColor,
                                    shape: BoxShape.circle,
                                    border: Border.all(color: AppTheme.primaryColor, width: 2),
                                    boxShadow: [
                                      BoxShadow(color: AppTheme.primaryColor.withValues(alpha: 0.1), blurRadius: 8, offset: const Offset(0, 4)),
                                    ],
                                    image: _profilePicUrl != null 
                                        ? DecorationImage(image: NetworkImage(_profilePicUrl!), fit: BoxFit.cover)
                                        : null,
                                  ),
                                  child: _profilePicUrl == null
                                      ? Center(
                                          child: Text(_initial, style: TextStyle(color: AppTheme.primaryDark, fontSize: 20, fontWeight: FontWeight.w800)),
                                        )
                                      : null,
                                ),
                                SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        'Hola, $_userName 👋',
                                        style: TextStyle(
                                          fontSize: 22,
                                          fontWeight: FontWeight.w800,
                                          color: context.primaryText,
                                          letterSpacing: -0.5,
                                        ),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                      Container(
                                        margin: EdgeInsets.only(top: 4),
                                        padding: EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: AppTheme.primaryColor.withValues(alpha: 0.1),
                                          borderRadius: BorderRadius.circular(4),
                                        ),
                                        child: Text('Egresado', style: TextStyle(color: AppTheme.primaryDark, fontSize: 10, fontWeight: FontWeight.w700)),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Row(
                            children: [
                              Stack(
                                children: [
                                  IconButton(
                                    icon: Icon(Icons.notifications_outlined, color: context.primaryText),
                                    onPressed: _showNotificationsPanel,
                                  ),
                                  if (_hasUnreadNotifications)
                                    Positioned(
                                      right: 8,
                                      top: 8,
                                      child: Container(
                                        width: 10,
                                        height: 10,
                                        decoration: BoxDecoration(
                                          color: AppTheme.accentAmber,
                                          shape: BoxShape.circle,
                                          border: Border.all(color: context.bgColor, width: 2),
                                        ),
                                      ),
                                    ),
                                ],
                              ),
                              IconButton(
                                icon: Icon(Icons.logout_rounded, color: context.primaryText),
                                onPressed: () async {
                                  final prefs = await SharedPreferences.getInstance();
                                  await prefs.remove('jwt_token');
                                  if (mounted && context.mounted) {
                                    Navigator.pushReplacementNamed(context, '/');
                                  }
                                },
                              ),
                            ],
                          )
                        ],
                      ),
                      SizedBox(height: 24),

                      // ── Banner de Completitud de Perfil ──
                      Container(
                        padding: EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          gradient: AppTheme.primaryGradient,
                          borderRadius: AppTheme.cardRadius,
                          boxShadow: AppTheme.premiumShadow,
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text('Tu perfil está al ${(_profileProgress * 100).toInt()}% completo', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 14)),
                                Text('${(_profileProgress * 100).toInt()}%', style: TextStyle(color: AppTheme.primaryColor, fontWeight: FontWeight.w800, fontSize: 14)),
                              ],
                            ),
                            SizedBox(height: 12),
                            ClipRRect(
                              borderRadius: BorderRadius.circular(4),
                              child: LinearProgressIndicator(
                                value: _profileProgress,
                                backgroundColor: Colors.white.withValues(alpha: 0.2),
                                valueColor: const AlwaysStoppedAnimation<Color>(AppTheme.primaryColor),
                                minHeight: 8,
                              ),
                            ),
                            SizedBox(height: 16),
                            SizedBox(
                              height: 36,
                              child: ElevatedButton(
                                onPressed: () {
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(builder: (context) => const ProfileScreen()),
                                  );
                                },
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppTheme.accentAmber,
                                  foregroundColor: Colors.white,
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(50)),
                                  padding: EdgeInsets.symmetric(horizontal: 20),
                                ),
                                child: Text('Completar perfil', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                              ),
                            ),
                          ],
                        ),
                      ),
                      SizedBox(height: 24),

                      // ── Metrics Grid (2x2) ──
                      Row(
                        children: [
                          Expanded(child: _MetricCard(title: 'Postulaciones\nenviadas', value: '${_summary?['total_applications'] ?? 0}', icon: Icons.send_rounded, color: AppTheme.statusPostulado)),
                          SizedBox(width: 16),
                          Expanded(child: _MetricCard(title: 'Tasa de\nrespuesta', value: '${((_summary?['response_rate'] ?? 0) * 100).toStringAsFixed(0)}%', icon: Icons.chat_bubble_outline_rounded, color: AppTheme.primaryColor)),
                        ],
                      ),
                      SizedBox(height: 16),
                      Row(
                        children: [
                          Expanded(child: _MetricCard(title: 'Visitas al\nperfil', value: '${_summary?['profile_views'] ?? 0}', icon: Icons.visibility_outlined, color: const Color(0xFF8B5CF6))),
                          SizedBox(width: 16),
                          Expanded(child: _MetricCard(title: 'Salario prom.\nde ofertas', value: '\$${((_summary?['program_average_salary'] ?? 0)/1000000).toStringAsFixed(1)}M', icon: Icons.monetization_on_outlined, color: AppTheme.accentAmber)),
                        ],
                      ),
                      SizedBox(height: 32),

                      // ── Estado de Postulaciones (Donut Chart) ──
                      Text(
                        'Estado de Postulaciones',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                          color: context.primaryText,
                          letterSpacing: -0.5,
                        ),
                      ),
                      SizedBox(height: 16),
                      Container(
                        padding: EdgeInsets.all(24),
                        decoration: BoxDecoration(
                          color: context.surfaceColor,
                          borderRadius: AppTheme.cardRadius,
                          boxShadow: AppTheme.premiumShadow,
                        ),
                        child: _applicationsByStatus != null && _applicationsByStatus!.isNotEmpty
                          ? Row(
                              children: [
                                SizedBox(
                                  width: 120,
                                  height: 120,
                                  child: PieChart(
                                    PieChartData(
                                      sectionsSpace: 2,
                                      centerSpaceRadius: 40,
                                      sections: _applicationsByStatus!.map((stat) {
                                        return PieChartSectionData(
                                          color: _getStatusColor(stat['status']),
                                          value: (stat['count'] as num).toDouble(),
                                          title: '',
                                          radius: 16
                                        );
                                      }).toList(),
                                    ),
                                  ),
                                ),
                                SizedBox(width: 24),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: _applicationsByStatus!.map((stat) {
                                      return Padding(
                                        padding: EdgeInsets.only(bottom: 8.0),
                                        child: _LegendItem(
                                          color: _getStatusColor(stat['status']),
                                          label: stat['status'],
                                          count: '${stat['count']}'
                                        ),
                                      );
                                    }).toList(),
                                  ),
                                ),
                              ],
                            )
                          : Center(
                              child: Padding(
                                padding: EdgeInsets.symmetric(vertical: 20),
                                child: Text('No hay datos suficientes', style: TextStyle(color: context.secondaryText)),
                              )
                            ),
                      ),
                      SizedBox(height: 32),

                      // ── Actividad Reciente ──
                      Text(
                        'Actividad Reciente',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                          color: context.primaryText,
                          letterSpacing: -0.5,
                        ),
                      ),
                      SizedBox(height: 16),
                      Container(
                        decoration: BoxDecoration(
                          color: context.surfaceColor,
                          borderRadius: AppTheme.cardRadius,
                          boxShadow: AppTheme.premiumShadow,
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

                                  return Column(
                                    children: [
                                      _ActivityItem(
                                        title: jobTitle,
                                        company: company,
                                        statusColor: _getStatusColor(status),
                                        time: status,
                                      ),
                                      if (activity != _recentActivity!.take(3).last)
                                        Divider(color: context.isDark ? Colors.white.withValues(alpha: 0.05) : Colors.black.withValues(alpha: 0.05), height: 1),
                                    ],
                                  );
                                }).toList(),
                              )
                            : Padding(
                                padding: EdgeInsets.all(24),
                                child: Center(child: Text('Sin actividad reciente', style: TextStyle(color: context.secondaryText))),
                              ),
                      ),
                    ],
                  ),
                ),
              ),
      ),
    );
  }
}

class _MetricCard extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;
  final Color color;

  const _MetricCard({
    required this.title,
    required this.value,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: context.surfaceColor,
        borderRadius: AppTheme.cardRadius,
        boxShadow: AppTheme.premiumShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          SizedBox(height: 12),
          Text(
            value,
            style: TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.w800,
              color: context.isDark ? AppTheme.primaryColor : AppTheme.primaryDark,
              letterSpacing: -1,
            ),
          ),
          SizedBox(height: 4),
          Text(
            title,
            style: TextStyle(
              color: context.secondaryText,
              fontSize: 11,
              fontWeight: FontWeight.w600,
              height: 1.2,
            ),
          ),
        ],
      ),
    );
  }
}

class _LegendItem extends StatelessWidget {
  final Color color;
  final String label;
  final String count;

  const _LegendItem({required this.color, required this.label, required this.count});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Expanded(
          child: Row(
            children: [
              Container(width: 8, height: 8, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
              SizedBox(width: 8),
              Expanded(child: Text(label, style: TextStyle(color: context.secondaryText, fontSize: 13, fontWeight: FontWeight.w500), overflow: TextOverflow.ellipsis)),
            ],
          ),
        ),
        Text(count, style: TextStyle(color: context.primaryText, fontSize: 13, fontWeight: FontWeight.w800)),
      ],
    );
  }
}

class _ActivityItem extends StatelessWidget {
  final String title;
  final String company;
  final Color statusColor;
  final String time;

  const _ActivityItem({required this.title, required this.company, required this.statusColor, required this.time});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.all(16),
      child: Row(
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(color: statusColor, shape: BoxShape.circle),
          ),
          SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: TextStyle(fontWeight: FontWeight.w700, color: context.primaryText, fontSize: 14)),
                SizedBox(height: 2),
                Text(company, style: TextStyle(color: context.secondaryText, fontSize: 12)),
              ],
            ),
          ),
          Text(time.toUpperCase(), style: TextStyle(color: statusColor, fontSize: 10, fontWeight: FontWeight.w800)),
        ],
      ),
    );
  }
}
