import 'dart:async';
import 'dart:convert';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:jwt_decoder/jwt_decoder.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/theme/theme_provider.dart';
import '../../../core/network/api_client.dart';
import '../../dashboard/presentation/dashboard_screen.dart';
import '../../jobs/presentation/jobs_screen.dart';
import '../../matchmaking/presentation/matchmaking_screen.dart';
import '../../applications/presentation/applications_screen.dart';
import '../../profile/presentation/profile_screen.dart';
import '../../settings/presentation/settings_screen.dart';

class MainLayoutScreen extends StatefulWidget {
  final int initialIndex;
  const MainLayoutScreen({super.key, this.initialIndex = 0});

  static void switchTab(BuildContext context, int index) {
    final state = context.findAncestorStateOfType<_MainLayoutScreenState>();
    state?.setTab(index);
  }

  @override
  State<MainLayoutScreen> createState() => _MainLayoutScreenState();
}

class _MainLayoutScreenState extends State<MainLayoutScreen> {
  late int _currentIndex;
  int? _graduateId;
  List<Map<String, dynamic>> _notifications = [];
  int _unreadCount = 0;
  WebSocketChannel? _wsChannel;
  Timer? _pollTimer;

  final List<String> _tabTitles = const [
    'Mi Dashboard',
    'Explorar Vacantes',
    'Recomendaciones',
    'Mis Postulaciones',
    'Mi Hoja de Vida',
  ];

  final List<Widget> _screens = const [
    DashboardScreen(),
    JobsScreen(),
    MatchmakingScreen(),
    ApplicationsScreen(),
    ProfileScreen(),
  ];

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.initialIndex;
    _initNotificationsAndWs();
  }

  @override
  void dispose() {
    _wsChannel?.sink.close();
    _pollTimer?.cancel();
    super.dispose();
  }

  void setTab(int index) {
    if (index >= 0 && index < _screens.length) {
      setState(() => _currentIndex = index);
    }
  }

  Future<void> _initNotificationsAndWs() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('jwt_token');
      int? gradId;

      final userDataStr = prefs.getString('user_data');
      if (userDataStr != null && userDataStr.isNotEmpty) {
        try {
          final u = jsonDecode(userDataStr);
          if (u is Map && u['id'] != null) {
            gradId = u['id'] is int ? u['id'] as int : int.tryParse(u['id'].toString());
          }
        } catch (_) {}
      }

      if (gradId == null && token != null && token.isNotEmpty) {
        try {
          final decoded = JwtDecoder.decode(token);
          final rawId = decoded['id'];
          gradId = rawId is int ? rawId : int.tryParse(rawId?.toString() ?? '');
        } catch (_) {}
      }

      if (gradId == null) return;

      _graduateId = gradId;
      await _fetchMergedNotifications();
      _connectWebSocket(gradId);

      _pollTimer = Timer.periodic(const Duration(seconds: 60), (_) {
        _fetchMergedNotifications();
      });
    } catch (_) {}
  }

  void _connectWebSocket(int gradId) {
    try {
      final wsUrl = '${ApiClient.wsRootUrl}/matching/ws/$gradId';
      _wsChannel = WebSocketChannel.connect(Uri.parse(wsUrl));
      _wsChannel!.stream.listen(
        (event) {
          try {
            final data = jsonDecode(event.toString());
            if (data is Map && data['type'] == 'NEW_MATCH') {
              final score = data['score'] ?? 0;
              _fetchMergedNotifications();
              if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    backgroundColor: AppTheme.primaryDark,
                    behavior: SnackBarBehavior.floating,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    content: Row(
                      children: [
                        const Text('✨', style: TextStyle(fontSize: 18)),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            '¡Nueva vacante sugerida! Compatibilidad: $score%',
                            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
                          ),
                        ),
                      ],
                    ),
                    action: SnackBarAction(
                      label: 'Ver',
                      textColor: AppTheme.brand300,
                      onPressed: () => setTab(2),
                    ),
                  ),
                );
              }
            }
          } catch (_) {}
        },
        onError: (_) {},
      );
    } catch (_) {}
  }

  Future<void> _fetchMergedNotifications() async {
    if (_graduateId == null) return;
    final List<Map<String, dynamic>> merged = [];

    // 1. Matchmaking notifications
    try {
      final res = await ApiClient.instance.get('/matching/notifications/$_graduateId?solo_no_leidas=false');
      if (res.data is List) {
        for (final item in res.data) {
          if (item is Map) {
            merged.add({
              'id': item['id'],
              'source': 'matching',
              'title': item['job_title'] ?? 'Vacante compatible con tu perfil',
              'subtitle': item['company_name'] != null
                  ? '${item['company_name']} · ${item['score'] ?? ''}% Afinidad'
                  : 'Compatibilidad: ${item['score'] ?? ''}%',
              'is_read': item['is_read'] == true,
              'timestamp': item['sent_at']?.toString() ?? '',
            });
          }
        }
      }
    } catch (_) {}

    // 2. Auth / System notifications
    try {
      final res = await ApiClient.instance.get('/auth/notifications');
      if (res.data is List) {
        for (final item in res.data) {
          if (item is Map) {
            merged.add({
              'id': item['id'],
              'source': 'auth',
              'title': item['title'] ?? 'Notificación del Portal',
              'subtitle': item['message'] ?? '',
              'is_read': item['is_read'] == true,
              'timestamp': item['created_at']?.toString() ?? '',
            });
          }
        }
      }
    } catch (_) {}

    if (mounted) {
      setState(() {
        _notifications = merged;
        _unreadCount = merged.where((n) => n['is_read'] != true).length;
      });
    }
  }

  Future<void> _markNotificationRead(Map<String, dynamic> notif) async {
    try {
      if (notif['source'] == 'matching') {
        await ApiClient.instance.patch('/matching/notifications/${notif['id']}/leido');
      } else {
        await ApiClient.instance.put('/auth/notifications/${notif['id']}/read');
      }
    } catch (_) {}
    await _fetchMergedNotifications();
  }

  Future<void> _markAllRead() async {
    for (final n in _notifications.where((e) => e['is_read'] != true)) {
      await _markNotificationRead(n);
    }
  }

  void _openNotificationsSheet() {
    showModalBottomSheet(
      context: context,
      backgroundColor: context.surfaceColor,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setModalState) {
            return DraggableScrollableSheet(
              expand: false,
              initialChildSize: 0.6,
              maxChildSize: 0.88,
              minChildSize: 0.4,
              builder: (_, scrollController) {
                return Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Center(
                        child: Container(
                          width: 40,
                          height: 4,
                          decoration: BoxDecoration(
                            color: context.borderColor,
                            borderRadius: BorderRadius.circular(999),
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: AppTheme.brand50,
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: const Icon(Icons.notifications_active_outlined, color: AppTheme.primaryColor, size: 20),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              'Centro de Notificaciones',
                              style: TextStyle(
                                fontSize: 17,
                                fontWeight: FontWeight.w800,
                                color: context.primaryText,
                              ),
                            ),
                          ),
                          if (_unreadCount > 0)
                            TextButton(
                              onPressed: () async {
                                await _markAllRead();
                                setModalState(() {});
                              },
                              child: const Text(
                                'Marcar todas',
                                style: TextStyle(color: AppTheme.primaryColor, fontWeight: FontWeight.w700, fontSize: 12.5),
                              ),
                            ),
                        ],
                      ),
                      const Divider(height: 20),
                      Expanded(
                        child: _notifications.isEmpty
                            ? Center(
                                child: Column(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(Icons.notifications_none_rounded, size: 48, color: context.tertiaryText),
                                    const SizedBox(height: 8),
                                    Text(
                                      'No tienes notificaciones pendientes',
                                      style: TextStyle(color: context.secondaryText, fontWeight: FontWeight.w600),
                                    ),
                                  ],
                                ),
                              )
                            : ListView.separated(
                                controller: scrollController,
                                itemCount: _notifications.length,
                                separatorBuilder: (_, _) => const SizedBox(height: 10),
                                itemBuilder: (_, i) {
                                  final n = _notifications[i];
                                  final isRead = n['is_read'] == true;
                                  final isMatch = n['source'] == 'matching';

                                  return InkWell(
                                    borderRadius: BorderRadius.circular(14),
                                    onTap: () async {
                                      await _markNotificationRead(n);
                                      if (ctx.mounted) Navigator.pop(ctx);
                                      setTab(isMatch ? 2 : 3);
                                    },
                                    child: Container(
                                      padding: const EdgeInsets.all(14),
                                      decoration: BoxDecoration(
                                        color: isRead ? context.mutedColor : AppTheme.brand50.withValues(alpha: context.isDark ? 0.12 : 0.7),
                                        borderRadius: BorderRadius.circular(14),
                                        border: Border.all(
                                          color: isRead ? context.borderColor : AppTheme.brand300,
                                        ),
                                      ),
                                      child: Row(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Container(
                                            padding: const EdgeInsets.all(8),
                                            decoration: BoxDecoration(
                                              color: isMatch
                                                  ? AppTheme.brand500.withValues(alpha: 0.15)
                                                  : AppTheme.accentBlue.withValues(alpha: 0.15),
                                              borderRadius: BorderRadius.circular(10),
                                            ),
                                            child: Icon(
                                              isMatch ? Icons.auto_awesome_rounded : Icons.assignment_turned_in_outlined,
                                              color: isMatch ? AppTheme.brand500 : AppTheme.accentBlue,
                                              size: 18,
                                            ),
                                          ),
                                          const SizedBox(width: 12),
                                          Expanded(
                                            child: Column(
                                              crossAxisAlignment: CrossAxisAlignment.start,
                                              children: [
                                                Text(
                                                  n['title']?.toString() ?? '',
                                                  style: TextStyle(
                                                    fontSize: 13.5,
                                                    fontWeight: isRead ? FontWeight.w600 : FontWeight.w800,
                                                    color: context.primaryText,
                                                  ),
                                                ),
                                                const SizedBox(height: 3),
                                                Text(
                                                  n['subtitle']?.toString() ?? '',
                                                  style: TextStyle(
                                                    fontSize: 12,
                                                    color: context.secondaryText,
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ),
                                          if (!isRead)
                                            Container(
                                              width: 8,
                                              height: 8,
                                              margin: const EdgeInsets.only(top: 4),
                                              decoration: const BoxDecoration(
                                                color: Color(0xFFE11D48),
                                                shape: BoxShape.circle,
                                              ),
                                            ),
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
              },
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final themeProvider = Provider.of<ThemeProvider>(context);

    return Scaffold(
      backgroundColor: context.bgColor,
      extendBody: true,

      // ── Executive Floating Top Header Bar (Matches Layout.tsx Header Flotante) ──
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(74),
        child: SafeArea(
          bottom: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(14, 8, 14, 6),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(22),
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
                child: Container(
                  height: 60,
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  decoration: BoxDecoration(
                    color: context.surfaceColor.withValues(alpha: context.isDark ? 0.88 : 0.94),
                    borderRadius: BorderRadius.circular(22),
                    border: Border.all(
                      color: context.isDark
                          ? Colors.white.withValues(alpha: 0.09)
                          : const Color(0xFFD6E4DE),
                      width: 1.2,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF064E3B).withValues(alpha: context.isDark ? 0.28 : 0.08),
                        blurRadius: 20,
                        offset: const Offset(0, 6),
                      ),
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.03),
                        blurRadius: 4,
                        offset: const Offset(0, 1),
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      // Institutional Brand Emblem with subtle glow
                      Container(
                        width: 38,
                        height: 38,
                        decoration: BoxDecoration(
                          gradient: AppTheme.primaryGradient,
                          borderRadius: BorderRadius.circular(13),
                          border: Border.all(
                            color: Colors.white.withValues(alpha: 0.22),
                            width: 1,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: AppTheme.primaryColor.withValues(alpha: 0.28),
                              blurRadius: 8,
                              offset: const Offset(0, 3),
                            ),
                          ],
                        ),
                        child: const Icon(Icons.school_rounded, color: Colors.white, size: 19),
                      ),
                      const SizedBox(width: 11),

                      // Two-tier Executive Title + Status Eyebrow
                      Expanded(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Container(
                                  width: 6,
                                  height: 6,
                                  decoration: const BoxDecoration(
                                    color: AppTheme.brand500,
                                    shape: BoxShape.circle,
                                  ),
                                ),
                                const SizedBox(width: 5),
                                const Flexible(
                                  child: Text(
                                    'PORTAL EGRESADO',
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      fontSize: 9,
                                      fontWeight: FontWeight.w900,
                                      letterSpacing: 0.9,
                                      color: AppTheme.primaryColor,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 1.5),
                            Text(
                              _tabTitles[_currentIndex],
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w800,
                                color: context.primaryText,
                                letterSpacing: -0.3,
                                height: 1.15,
                              ),
                            ),
                          ],
                        ),
                      ),

                      // Right Action Buttons (Circular Pills matching Layout.tsx)
                      _buildHeaderActionBtn(
                        context,
                        tooltip: context.isDark ? 'Modo Claro' : 'Modo Oscuro',
                        icon: context.isDark ? Icons.wb_sunny_rounded : Icons.dark_mode_outlined,
                        onTap: () => themeProvider.toggleTheme(!context.isDark),
                      ),
                      const SizedBox(width: 6),
                      _buildHeaderActionBtn(
                        context,
                        tooltip: 'Mi cuenta y seguridad',
                        icon: Icons.vpn_key_outlined,
                        onTap: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(builder: (_) => const SettingsScreen()),
                          );
                        },
                      ),
                      const SizedBox(width: 6),
                      _buildHeaderActionBtn(
                        context,
                        tooltip: 'Gestión de Privacidad (Habeas Data)',
                        icon: Icons.shield_outlined,
                        onTap: () => Navigator.pushNamed(context, '/privacy_settings'),
                      ),
                      const SizedBox(width: 6),

                      // Notifications Bell Circular Pill with Unread Badge
                      Stack(
                        clipBehavior: Clip.none,
                        children: [
                          _buildHeaderActionBtn(
                            context,
                            tooltip: 'Centro de Notificaciones',
                            icon: _unreadCount > 0
                                ? Icons.notifications_active_outlined
                                : Icons.notifications_none_rounded,
                            isHighlighted: _unreadCount > 0,
                            onTap: _openNotificationsSheet,
                          ),
                          if (_unreadCount > 0)
                            Positioned(
                              right: -2,
                              top: -2,
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 4.5, vertical: 1),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFE11D48),
                                  borderRadius: BorderRadius.circular(999),
                                  border: Border.all(color: context.surfaceColor, width: 1.5),
                                ),
                                child: Text(
                                  _unreadCount > 9 ? '9+' : '$_unreadCount',
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 8.5,
                                    fontWeight: FontWeight.w900,
                                  ),
                                ),
                              ),
                            ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),

      body: IndexedStack(
        index: _currentIndex,
        children: _screens,
      ),

      // ── Professional Floating Pill Bottom Dock Navbar ──
      bottomNavigationBar: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(26),
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 18, sigmaY: 18),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 6),
                decoration: BoxDecoration(
                  color: context.surfaceColor.withValues(alpha: context.isDark ? 0.90 : 0.95),
                  borderRadius: BorderRadius.circular(26),
                  border: Border.all(
                    color: context.isDark
                        ? Colors.white.withValues(alpha: 0.10)
                        : const Color(0xFFD5E3DD),
                    width: 1.2,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF064E3B).withValues(alpha: context.isDark ? 0.35 : 0.12),
                      blurRadius: 24,
                      offset: const Offset(0, 8),
                    ),
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.05),
                      blurRadius: 6,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    _buildNavItem(0, Icons.dashboard_outlined, Icons.dashboard_rounded, 'Dashboard'),
                    _buildNavItem(1, Icons.work_outline_rounded, Icons.work_rounded, 'Vacantes'),
                    _buildNavItem(2, Icons.auto_awesome_outlined, Icons.auto_awesome_rounded, 'Sugeridas'),
                    _buildNavItem(3, Icons.fact_check_outlined, Icons.fact_check_rounded, 'Postulaciones'),
                    _buildNavItem(4, Icons.person_outline_rounded, Icons.person_rounded, 'Hoja de Vida'),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHeaderActionBtn(
    BuildContext context, {
    required String tooltip,
    required IconData icon,
    required VoidCallback onTap,
    bool isHighlighted = false,
  }) {
    return Tooltip(
      message: tooltip,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          customBorder: const CircleBorder(),
          onTap: onTap,
          child: Container(
            width: 34,
            height: 34,
            decoration: BoxDecoration(
              color: isHighlighted
                  ? AppTheme.brand50.withValues(alpha: context.isDark ? 0.2 : 1.0)
                  : context.mutedColor,
              shape: BoxShape.circle,
              border: Border.all(
                color: isHighlighted
                    ? AppTheme.brand300
                    : context.borderColor.withValues(alpha: 0.85),
              ),
            ),
            child: Icon(
              icon,
              size: 17,
              color: isHighlighted ? AppTheme.primaryColor : context.secondaryText,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildNavItem(int index, IconData icon, IconData activeIcon, String label) {
    final isSelected = _currentIndex == index;

    return Expanded(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 2),
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            borderRadius: BorderRadius.circular(20),
            onTap: () => setState(() => _currentIndex = index),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 240),
              curve: Curves.easeOutCubic,
              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 8),
              decoration: BoxDecoration(
                gradient: isSelected ? AppTheme.primaryGradient : null,
                color: isSelected ? null : Colors.transparent,
                borderRadius: BorderRadius.circular(20),
                boxShadow: isSelected
                    ? [
                        BoxShadow(
                          color: AppTheme.primaryColor.withValues(alpha: 0.30),
                          blurRadius: 10,
                          offset: const Offset(0, 4),
                        ),
                      ]
                    : null,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    isSelected ? activeIcon : icon,
                    size: 20,
                    color: isSelected ? Colors.white : context.secondaryText,
                  ),
                  const SizedBox(height: 3),
                  Text(
                    label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                      color: isSelected ? Colors.white : context.secondaryText,
                      letterSpacing: -0.2,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
