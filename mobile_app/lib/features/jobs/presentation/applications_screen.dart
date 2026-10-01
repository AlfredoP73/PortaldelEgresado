import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/network/api_client.dart';
import 'package:intl/intl.dart';

class ApplicationsScreen extends StatefulWidget {
  const ApplicationsScreen({super.key});

  @override
  State<ApplicationsScreen> createState() => _ApplicationsScreenState();
}

class _ApplicationsScreenState extends State<ApplicationsScreen> {
  bool _isLoading = true;
  String? _error;
  List<dynamic> _activeApplications = [];
  List<dynamic> _finishedApplications = [];

  @override
  void initState() {
    super.initState();
    _fetchApplications();
  }

  Future<void> _fetchApplications() async {
    try {
      final timestamp = DateTime.now().millisecondsSinceEpoch;
      final response = await ApiClient.instance.get('/modulo1/my-applications?t=$timestamp');
      List<dynamic> allApps = response.data;
      
      List<dynamic> active = [];
      List<dynamic> finished = [];
      
      for (var app in allApps) {
        String status = (app['status'] ?? '').toLowerCase();
        if (status.contains('rechazado') || status.contains('contratado') || status.contains('aceptado')) {
          finished.add(app);
        } else {
          active.add(app);
        }
      }

      if (mounted) {
        setState(() {
          _activeApplications = active;
          _finishedApplications = finished;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = 'Error al cargar tus postulaciones';
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        backgroundColor: context.bgColor,
        body: SafeArea(
          child: Column(
            children: [
              Padding(
                padding: EdgeInsets.fromLTRB(20, 20, 20, 10),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Mis Postulaciones', style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800, color: context.primaryText, letterSpacing: -0.5)),
                    SizedBox(height: 4),
                    Text('Haz seguimiento a tus procesos', style: TextStyle(fontSize: 14, color: context.secondaryText)),
                    SizedBox(height: 20),
                  ],
                ),
              ),
              TabBar(
                indicator: const UnderlineTabIndicator(
                  borderSide: BorderSide(width: 3.0, color: AppTheme.primaryColor),
                  insets: EdgeInsets.symmetric(horizontal: 16.0),
                ),
                labelColor: AppTheme.primaryDark,
                unselectedLabelColor: context.secondaryText,
                labelStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.w500, fontSize: 14),
                dividerColor: const Color(0xFFE5E7EB),
                tabs: const [
                  Tab(text: 'Activas'),
                  Tab(text: 'Finalizadas'),
                ],
              ),
              Expanded(
                child: _isLoading 
                  ? Center(child: CircularProgressIndicator(color: AppTheme.primaryColor))
                  : _error != null 
                    ? Center(child: Text(_error!, style: TextStyle(color: AppTheme.statusRechazado)))
                    : TabBarView(
                        physics: const BouncingScrollPhysics(),
                        children: [
                          // Tab 1: Activas
                          RefreshIndicator(
                            onRefresh: _fetchApplications,
                            color: AppTheme.primaryColor,
                            child: _activeApplications.isEmpty 
                              ? Center(child: Text('No tienes postulaciones activas', style: TextStyle(color: context.secondaryText)))
                              : ListView.separated(
                                  padding: EdgeInsets.only(left: 20, right: 20, top: 16, bottom: 100),
                                  itemCount: _activeApplications.length,
                                  separatorBuilder: (context, index) => SizedBox(height: 12),
                                  itemBuilder: (context, index) => _buildAppCard(_activeApplications[index]),
                                ),
                          ),
                          // Tab 2: Finalizadas
                          RefreshIndicator(
                            onRefresh: _fetchApplications,
                            color: AppTheme.primaryColor,
                            child: _finishedApplications.isEmpty 
                              ? Center(child: Text('No tienes postulaciones finalizadas', style: TextStyle(color: context.secondaryText)))
                              : ListView.separated(
                                  padding: EdgeInsets.only(left: 20, right: 20, top: 16, bottom: 100),
                                  itemCount: _finishedApplications.length,
                                  separatorBuilder: (context, index) => SizedBox(height: 12),
                                  itemBuilder: (context, index) => _buildAppCard(_finishedApplications[index]),
                                ),
                          ),
                        ],
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildAppCard(dynamic application) {
    String role = 'Puesto Confidencial';
    String company = 'Empresa';
    
    final jobOffer = application['job_offer'];
    if (jobOffer != null) {
      role = jobOffer['title'] ?? role;
      if (jobOffer['company'] != null) {
        company = jobOffer['company']['name'] ?? company;
      }
    }

    String status = application['status'] ?? 'Postulado';
    String dateStr = application['application_date'] ?? '';
    String displayDate = '';
    String daysAgo = '';

    if (dateStr.isNotEmpty) {
      try {
        DateTime date = DateTime.parse(dateStr);
        displayDate = DateFormat('dd MMM yyyy').format(date);
        int days = DateTime.now().difference(date).inDays;
        daysAgo = days == 0 ? 'Hoy' : 'Hace $days días';
      } catch (_) {
        displayDate = dateStr;
      }
    }

    Color statusColor = context.secondaryText;
    String statusLower = status.toLowerCase();
    if (statusLower.contains('postulado') || statusLower.contains('aplicado')) statusColor = AppTheme.statusPostulado;
    if (statusLower.contains('entrevistado')) statusColor = AppTheme.statusEntrevistado;
    if (statusLower.contains('contratado') || statusLower.contains('aceptado')) statusColor = AppTheme.statusContratado;
    if (statusLower.contains('rechazado')) statusColor = AppTheme.statusRechazado;

    return _ApplicationCard(
      company: company,
      role: role,
      date: displayDate,
      daysAgo: daysAgo,
      status: status,
      statusColor: statusColor,
    );
  }
}

class _ApplicationCard extends StatelessWidget {
  final String company;
  final String role;
  final String date;
  final String daysAgo;
  final String status;
  final Color statusColor;

  const _ApplicationCard({
    required this.company,
    required this.role,
    required this.date,
    required this.daysAgo,
    required this.status,
    required this.statusColor,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: context.surfaceColor,
        borderRadius: AppTheme.cardRadius,
        boxShadow: AppTheme.premiumShadow,
        border: Border.all(color: Colors.black.withValues(alpha: 0.03)),
      ),
      child: IntrinsicHeight(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Left color bar
            Container(
              width: 4,
              decoration: BoxDecoration(
                color: statusColor,
                borderRadius: BorderRadius.only(topLeft: Radius.circular(16), bottomLeft: Radius.circular(16)),
              ),
            ),
            Expanded(
              child: Padding(
                padding: EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(role, style: TextStyle(color: context.primaryText, fontSize: 16, fontWeight: FontWeight.w800)),
                              SizedBox(height: 4),
                              Text(company, style: TextStyle(color: context.secondaryText, fontSize: 13, fontWeight: FontWeight.w500)),
                            ],
                          ),
                        ),
                        Container(
                          padding: EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: statusColor.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(100),
                            border: Border.all(color: statusColor.withValues(alpha: 0.2)),
                          ),
                          child: Text(status.toUpperCase(), style: TextStyle(color: statusColor, fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 0.5)),
                        ),
                      ],
                    ),
                    SizedBox(height: 12),
                    Row(
                      children: [
                        Icon(Icons.calendar_today_outlined, size: 14, color: context.secondaryText),
                        SizedBox(width: 6),
                        Text('$date • $daysAgo', style: TextStyle(color: context.secondaryText, fontSize: 12)),
                      ],
                    ),
                    SizedBox(height: 16),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        TextButton(
                          onPressed: () {
                            showDialog(
                              context: context,
                              builder: (ctx) => AlertDialog(
                                backgroundColor: context.bgColor,
                                surfaceTintColor: Colors.transparent,
                                shape: RoundedRectangleBorder(borderRadius: AppTheme.cardRadius),
                                title: Text(role, style: TextStyle(fontWeight: FontWeight.w800, color: context.primaryText)),
                                content: Column(
                                  mainAxisSize: MainAxisSize.min,
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(company, style: TextStyle(fontWeight: FontWeight.w700, color: context.secondaryText)),
                                    SizedBox(height: 16),
                                    Text('Estado actual:', style: TextStyle(fontSize: 12, color: context.secondaryText)),
                                    SizedBox(height: 4),
                                    Container(
                                      padding: EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                      decoration: BoxDecoration(
                                        color: statusColor.withValues(alpha: 0.1),
                                        borderRadius: BorderRadius.circular(100),
                                        border: Border.all(color: statusColor.withValues(alpha: 0.2)),
                                      ),
                                      child: Text(status.toUpperCase(), style: TextStyle(color: statusColor, fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 0.5)),
                                    ),
                                    SizedBox(height: 16),
                                    Text('Fecha de postulación:', style: TextStyle(fontSize: 12, color: context.secondaryText)),
                                    Text('$date ($daysAgo)', style: TextStyle(fontWeight: FontWeight.w600, color: context.primaryText)),
                                  ],
                                ),
                                actions: [
                                  TextButton(
                                    onPressed: () => Navigator.pop(ctx),
                                    child: Text('Cerrar', style: TextStyle(color: AppTheme.primaryDark, fontWeight: FontWeight.w700)),
                                  ),
                                ],
                              ),
                            );
                          },
                          style: TextButton.styleFrom(
                            foregroundColor: AppTheme.primaryDark,
                            padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                            minimumSize: Size.zero,
                            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text('Ver detalle', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                              SizedBox(width: 4),
                              Icon(Icons.arrow_forward_rounded, size: 16),
                            ],
                          ),
                        ),
                      ],
                    )
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
