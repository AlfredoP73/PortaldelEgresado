import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/network/api_client.dart';
import '../../../core/widgets/progress_ring.dart';
import 'application_detail_screen.dart'; // We'll create this next

class ApplicationsScreen extends StatefulWidget {
  const ApplicationsScreen({super.key});

  @override
  State<ApplicationsScreen> createState() => _ApplicationsScreenState();
}

class _ApplicationsScreenState extends State<ApplicationsScreen> {
  List<dynamic> _applications = [];
  bool _isLoading = true;
  String _searchTerm = '';
  String _statusFilter = 'ALL';

  final List<Map<String, String>> _filterPills = [
    {'id': 'ALL', 'label': 'Todas'},
    {'id': 'POSTULADO', 'label': 'Aplicado'},
    {'id': 'EN_EVALUACION', 'label': 'HdV Vista'},
    {'id': 'ENTREVISTADO', 'label': 'En proceso'},
    {'id': 'FINAL', 'label': 'Finalizado'},
  ];

  @override
  void initState() {
    super.initState();
    _fetchApplications();
  }

  Future<void> _fetchApplications() async {
    setState(() => _isLoading = true);
    try {
      final timestamp = DateTime.now().millisecondsSinceEpoch;
      final response = await ApiClient.instance.get('/modulo1/my-applications?t=$timestamp');
      if (response.data != null) {
        setState(() {
          _applications = response.data;
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('Error al cargar postulaciones: $e'),
          backgroundColor: AppTheme.accentPink,
        ));
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Map<String, dynamic> _getProgressData(String status) {
    final s = status.toUpperCase();
    if (s == 'POSTULADO') return {'progress': 0.25, 'label': 'Postulado', 'color': AppTheme.primaryColor};
    if (s == 'EN_EVALUACION') return {'progress': 0.50, 'label': 'HdV Vista', 'color': AppTheme.accentBlue};
    if (s == 'ENTREVISTADO') return {'progress': 0.75, 'label': 'En proceso', 'color': AppTheme.accentPurple};
    if (s == 'CONTRATADO') return {'progress': 1.0, 'label': 'Contratado', 'color': Colors.green};
    if (s == 'RECHAZADO') return {'progress': 1.0, 'label': 'Proceso Finalizado', 'color': AppTheme.textSecondary};
    return {'progress': 0.0, 'label': 'Desconocido', 'color': AppTheme.textSecondary};
  }

  @override
  Widget build(BuildContext context) {
    // Filtrar resultados
    final filteredApps = _applications.where((app) {
      final job = app['job_offer'] ?? {};
      final title = (job['title'] ?? '').toString().toLowerCase();
      final company = (job['company']?['name'] ?? '').toString().toLowerCase();
      
      final matchSearch = title.contains(_searchTerm.toLowerCase()) || company.contains(_searchTerm.toLowerCase());
      final status = (app['status'] ?? '').toString().toUpperCase();

      if (_statusFilter == 'ALL') return matchSearch;
      if (_statusFilter == 'FINAL') return matchSearch && (status == 'CONTRATADO' || status == 'RECHAZADO');
      return matchSearch && status == _statusFilter;
    }).toList();

    return SafeArea(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Container(
            padding: EdgeInsets.fromLTRB(20, 20, 20, 10),
            child: Row(
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    gradient: AppTheme.primaryGradient,
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Icon(Icons.fact_check_rounded, color: Colors.white, size: 24),
                ),
                SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Mis Postulaciones',
                        style: TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.w900,
                          color: context.primaryText,
                        ),
                      ),
                      SizedBox(height: 2),
                      Text(
                        'Seguimiento en tiempo real',
                        style: TextStyle(fontSize: 13, color: context.secondaryText.withValues(alpha: 0.8)),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          
          // Search Bar
          Padding(
            padding: EdgeInsets.symmetric(horizontal: 20, vertical: 10),
            child: TextField(
              onChanged: (val) => setState(() => _searchTerm = val),
              decoration: AppTheme.inputDecoration(
                context,
                label: 'Buscar vacante o empresa',
                icon: Icons.search,
              ).copyWith(
                filled: true,
                fillColor: context.isDark ? Colors.white.withValues(alpha: 0.05) : Colors.white,
                contentPadding: EdgeInsets.symmetric(horizontal: 20, vertical: 14),
              ),
            ),
          ),

          // Horizontal Filter Pills
          SizedBox(
            height: 40,
            child: ListView.builder(
              padding: EdgeInsets.symmetric(horizontal: 20),
              scrollDirection: Axis.horizontal,
              physics: const BouncingScrollPhysics(),
              itemCount: _filterPills.length,
              itemBuilder: (context, index) {
                final pill = _filterPills[index];
                final isSelected = _statusFilter == pill['id'];
                
                return Padding(
                  padding: const EdgeInsets.only(right: 8.0),
                  child: ChoiceChip(
                    label: Text(
                      pill['label']!,
                      style: TextStyle(
                        fontWeight: FontWeight.w800,
                        color: isSelected ? Colors.white : context.secondaryText,
                      ),
                    ),
                    selected: isSelected,
                    onSelected: (bool selected) {
                      if (selected) {
                        setState(() => _statusFilter = pill['id']!);
                      }
                    },
                    selectedColor: AppTheme.primaryColor,
                    backgroundColor: context.isDark ? Colors.white.withValues(alpha: 0.05) : Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(20),
                      side: BorderSide(
                        color: isSelected ? AppTheme.primaryColor : Color(0xFFE5E7EB).withValues(alpha: 0.5),
                      ),
                    ),
                    showCheckmark: false,
                    elevation: isSelected ? 4 : 0,
                    shadowColor: AppTheme.primaryColor.withValues(alpha: 0.4),
                  ),
                );
              },
            ),
          ),
          
          SizedBox(height: 10),
          
          // List
          Expanded(
            child: _isLoading
                ? Center(child: CircularProgressIndicator(color: AppTheme.primaryColor))
                : filteredApps.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Container(
                              padding: EdgeInsets.all(24),
                              decoration: BoxDecoration(
                                color: context.isDark ? Colors.white.withValues(alpha: 0.05) : Colors.white,
                                shape: BoxShape.circle,
                              ),
                              child: Icon(Icons.inbox_outlined, size: 48, color: context.secondaryText.withValues(alpha: 0.5)),
                            ),
                            SizedBox(height: 16),
                            Text("No hay postulaciones", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: context.primaryText)),
                            SizedBox(height: 8),
                            Text("Intenta ajustando los filtros de búsqueda.", style: TextStyle(color: context.secondaryText)),
                          ],
                        ),
                      )
                    : ListView.builder(
                        padding: EdgeInsets.only(left: 20, right: 20, top: 10, bottom: 100),
                        physics: const BouncingScrollPhysics(),
                        itemCount: filteredApps.length,
                        itemBuilder: (ctx, i) {
                          final app = filteredApps[i];
                          
                          String date = app['application_date'] != null ? app['application_date'].toString().split('T').first : '';
                          String status = app['status'] ?? 'POSTULADO';
                          
                          Map<String, dynamic>? job = app['job_offer'];
                          String title = job != null ? job['title'] ?? 'Vacante' : 'Vacante Desconocida';
                          String companyName = job != null && job['company'] != null ? job['company']['name'] ?? 'Empresa' : 'Empresa';
                          String location = job != null && job['company'] != null ? job['company']['location'] ?? 'Colombia' : 'Colombia';

                          final progressData = _getProgressData(status);
                          final double progress = progressData['progress'];
                          final String label = progressData['label'];
                          final Color color = progressData['color'];

                          return GestureDetector(
                            onTap: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (context) => ApplicationDetailScreen(
                                    application: app,
                                    onUpdate: _fetchApplications,
                                  ),
                                ),
                              );
                            },
                            child: Container(
                              margin: EdgeInsets.only(bottom: 16),
                              padding: EdgeInsets.all(20),
                              decoration: BoxDecoration(
                                color: context.surfaceColor,
                                borderRadius: AppTheme.cardRadius,
                                border: Border.all(color: Color(0xFFE5E7EB).withValues(alpha: 0.5)),
                                boxShadow: AppTheme.premiumShadow,
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              title,
                                              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: context.primaryText),
                                              maxLines: 1,
                                              overflow: TextOverflow.ellipsis,
                                            ),
                                            SizedBox(height: 6),
                                            Row(
                                              children: [
                                                Icon(Icons.business, size: 14, color: AppTheme.primaryColor),
                                                SizedBox(width: 4),
                                                Expanded(
                                                  child: Text(
                                                    companyName,
                                                    style: TextStyle(fontSize: 13, color: context.secondaryText, fontWeight: FontWeight.w600),
                                                    maxLines: 1,
                                                    overflow: TextOverflow.ellipsis,
                                                  ),
                                                ),
                                              ],
                                            ),
                                            SizedBox(height: 4),
                                            Row(
                                              children: [
                                                Icon(Icons.location_on_outlined, size: 14, color: context.secondaryText.withValues(alpha: 0.7)),
                                                SizedBox(width: 4),
                                                Text(
                                                  location,
                                                  style: TextStyle(fontSize: 12, color: context.secondaryText),
                                                ),
                                                SizedBox(width: 12),
                                                Icon(Icons.calendar_today_outlined, size: 14, color: context.secondaryText.withValues(alpha: 0.7)),
                                                SizedBox(width: 4),
                                                Text(
                                                  date,
                                                  style: TextStyle(fontSize: 12, color: context.secondaryText),
                                                ),
                                              ],
                                            ),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ),
                                  SizedBox(height: 16),
                                  // Bottom section with Progress Ring
                                  Container(
                                    padding: EdgeInsets.all(12),
                                    decoration: BoxDecoration(
                                      color: context.isDark ? Colors.white.withValues(alpha: 0.03) : Color(0xFFF9FAFB),
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: Row(
                                      children: [
                                        ProgressRing(
                                          progress: progress,
                                          color: color,
                                          size: 44,
                                          strokeWidth: 4.5,
                                        ),
                                        SizedBox(width: 12),
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Container(
                                                padding: EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                                decoration: BoxDecoration(
                                                  color: color.withValues(alpha: 0.1),
                                                  borderRadius: BorderRadius.circular(20),
                                                ),
                                                child: Text(
                                                  label,
                                                  style: TextStyle(
                                                    fontSize: 11,
                                                    fontWeight: FontWeight.w800,
                                                    color: color,
                                                  ),
                                                ),
                                              ),
                                              SizedBox(height: 4),
                                              Text(
                                                'ESTADO ACTUAL',
                                                style: TextStyle(
                                                  fontSize: 9,
                                                  fontWeight: FontWeight.w900,
                                                  color: context.secondaryText.withValues(alpha: 0.6),
                                                  letterSpacing: 1.2,
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                        Icon(Icons.chevron_right, color: context.secondaryText.withValues(alpha: 0.5)),
                                      ],
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
  }
}
