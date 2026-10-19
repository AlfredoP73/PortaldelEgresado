import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/network/api_client.dart';
import '../../../core/widgets/progress_ring.dart';
import 'application_detail_screen.dart';

class ApplicationsScreen extends StatefulWidget {
  const ApplicationsScreen({super.key});

  @override
  State<ApplicationsScreen> createState() => _ApplicationsScreenState();
}

class _ApplicationsScreenState extends State<ApplicationsScreen> {
  List<Map<String, dynamic>> _applications = [];
  bool _isLoading = true;
  bool _showSelectionRoute = false;
  String _selectedFilter = 'ALL';
  String _searchQuery = '';

  final List<Map<String, String>> _filterPills = const [
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
      final response = await ApiClient.instance.get('/modulo1/my-applications');
      final List<Map<String, dynamic>> list = [];
      if (response.data is List) {
        for (final item in response.data) {
          if (item is Map) list.add(Map<String, dynamic>.from(item));
        }
      }
      if (mounted) {
        setState(() {
          _applications = list;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  List<Map<String, dynamic>> get _filteredApplications {
    return _applications.where((app) {
      final status = app['status']?.toString() ?? 'POSTULADO';
      if (_selectedFilter != 'ALL') {
        if (_selectedFilter == 'FINAL') {
          if (status != 'CONTRATADO' && status != 'RECHAZADO') return false;
        } else if (status != _selectedFilter) {
          return false;
        }
      }

      if (_searchQuery.isNotEmpty) {
        final job = app['job_offer'] is Map ? app['job_offer'] as Map : {};
        final company = job['company'] is Map ? job['company'] as Map : {};
        final title = job['title']?.toString().toLowerCase() ?? '';
        final compName = company['name']?.toString().toLowerCase() ?? '';
        final q = _searchQuery.toLowerCase();
        if (!title.contains(q) && !compName.contains(q)) return false;
      }

      return true;
    }).toList();
  }

  Map<String, dynamic> _getStatusMeta(String status) {
    switch (status) {
      case 'POSTULADO':
        return {
          'label': 'Postulado',
          'progress': 0.25,
          'color': AppTheme.statusPostulado,
          'bg': const Color(0xFFECFDF5),
        };
      case 'EN_EVALUACION':
        return {
          'label': 'HdV Vista',
          'progress': 0.50,
          'color': AppTheme.statusEvaluacion,
          'bg': const Color(0xFFEFF6FF),
        };
      case 'ENTREVISTADO':
        return {
          'label': 'En proceso',
          'progress': 0.75,
          'color': AppTheme.statusEntrevistado,
          'bg': const Color(0xFFF5F3FF),
        };
      case 'CONTRATADO':
        return {
          'label': 'Contratado',
          'progress': 1.0,
          'color': AppTheme.statusContratado,
          'bg': AppTheme.brand50,
        };
      case 'RECHAZADO':
        return {
          'label': 'No seleccionado',
          'progress': 1.0,
          'color': AppTheme.statusRechazado,
          'bg': const Color(0xFFFEF2F2),
        };
      default:
        return {
          'label': status,
          'progress': 0.25,
          'color': AppTheme.statusPostulado,
          'bg': AppTheme.brand50,
        };
    }
  }

  String _formatDate(String? raw) {
    if (raw == null || raw.isEmpty) return '';
    try {
      final dt = DateTime.parse(raw);
      return DateFormat('dd MMM yyyy', 'es').format(dt);
    } catch (_) {
      return raw.split('T').first;
    }
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _filteredApplications;

    return RefreshIndicator(
      color: AppTheme.primaryColor,
      onRefresh: _fetchApplications,
      child: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Mis Postulaciones',
                              style: TextStyle(
                                fontSize: 22,
                                fontWeight: FontWeight.w800,
                                color: context.primaryText,
                                letterSpacing: -0.5,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              'Haz seguimiento a cada etapa de tus procesos de selección.',
                              style: TextStyle(fontSize: 12.5, color: context.secondaryText),
                            ),
                          ],
                        ),
                      ),
                      TextButton.icon(
                        onPressed: () => setState(() => _showSelectionRoute = !_showSelectionRoute),
                        icon: Icon(
                          _showSelectionRoute ? Icons.expand_less_rounded : Icons.help_outline_rounded,
                          size: 16,
                          color: AppTheme.primaryColor,
                        ),
                        label: const Text(
                          'Ruta de Selección',
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppTheme.primaryColor),
                        ),
                      ),
                    ],
                  ),

                  // Collapsible "Ruta de Selección" Guide (Matches right sidebar of GraduateApplications.tsx)
                  if (_showSelectionRoute) ...[
                    const SizedBox(height: 10),
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: context.surfaceColor,
                        borderRadius: AppTheme.cardRadius,
                        border: Border.all(color: context.borderColor),
                        boxShadow: AppTheme.subtleShadow,
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '¿Cómo avanza tu postulación?',
                            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: context.primaryText),
                          ),
                          const SizedBox(height: 10),
                          _buildRouteStep('1. Postulado (25%)', 'Tu hoja de vida fue enviada a la empresa.', AppTheme.statusPostulado),
                          const SizedBox(height: 8),
                          _buildRouteStep('2. HdV Vista (50%)', 'El reclutador está revisando tu perfil.', AppTheme.statusEvaluacion),
                          const SizedBox(height: 8),
                          _buildRouteStep('3. En Proceso (75%)', 'Avanzaste a pruebas técnicas o entrevista.', AppTheme.statusEntrevistado),
                          const SizedBox(height: 8),
                          _buildRouteStep('4. Finalizado (100%)', 'Decisión final de contratación.', AppTheme.statusContratado),
                        ],
                      ),
                    ),
                  ],
                  const SizedBox(height: 14),

                  // Search Bar
                  TextField(
                    onChanged: (v) => setState(() => _searchQuery = v),
                    decoration: AppTheme.inputDecoration(
                      context,
                      label: 'Buscar por cargo o empresa',
                      hint: 'Ej. Analista, Desarrollador...',
                      icon: Icons.search_rounded,
                    ),
                  ),
                  const SizedBox(height: 12),

                  // 5 Filter Pills (Matches GraduateApplications.tsx)
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: _filterPills.map((pill) {
                        final isSelected = _selectedFilter == pill['id'];
                        return Padding(
                          padding: const EdgeInsets.only(right: 8),
                          child: ChoiceChip(
                            label: Text(pill['label']!),
                            selected: isSelected,
                            onSelected: (_) => setState(() => _selectedFilter = pill['id']!),
                            selectedColor: AppTheme.primaryColor,
                            backgroundColor: context.surfaceColor,
                            labelStyle: TextStyle(
                              fontSize: 12.5,
                              fontWeight: FontWeight.w700,
                              color: isSelected ? Colors.white : context.secondaryText,
                            ),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(999),
                              side: BorderSide(color: isSelected ? AppTheme.primaryColor : context.borderColor),
                            ),
                            showCheckmark: false,
                          ),
                        );
                      }).toList(),
                    ),
                  ),
                ],
              ),
            ),
          ),

          if (_isLoading)
            const SliverFillRemaining(
              child: Center(child: CircularProgressIndicator(color: AppTheme.primaryColor)),
            )
          else if (filtered.isEmpty)
            SliverFillRemaining(
              child: Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.inbox_outlined, size: 52, color: context.tertiaryText),
                      const SizedBox(height: 10),
                      Text(
                        'No se encontraron postulaciones',
                        style: TextStyle(fontSize: 15.5, fontWeight: FontWeight.w800, color: context.primaryText),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Explora la Bolsa de Empleo o tus Recomendaciones para postularte.',
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 12.5, color: context.secondaryText),
                      ),
                    ],
                  ),
                ),
              ),
            )
          else
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 104),
              sliver: SliverList(
                delegate: SliverChildBuilderDelegate(
                  (context, index) {
                    final app = filtered[index];
                    final job = app['job_offer'] is Map
                        ? Map<String, dynamic>.from(app['job_offer'])
                        : <String, dynamic>{};
                    final company = job['company'] is Map
                        ? Map<String, dynamic>.from(job['company'])
                        : <String, dynamic>{};
                    final cityName = company['city'] is Map
                        ? (company['city']['name']?.toString() ?? 'Valledupar')
                        : 'Colombia';
                    final status = app['status']?.toString() ?? 'POSTULADO';
                    final meta = _getStatusMeta(status);
                    final subProcesses = app['sub_processes'] as List? ?? [];

                    return Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: InkWell(
                        borderRadius: AppTheme.cardRadius,
                        onTap: () async {
                          await Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => ApplicationDetailScreen(application: app),
                            ),
                          );
                          _fetchApplications();
                        },
                        child: Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: context.surfaceColor,
                            borderRadius: AppTheme.cardRadius,
                            border: Border.all(color: context.borderColor),
                            boxShadow: AppTheme.subtleShadow,
                          ),
                          child: Row(
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      job['title']?.toString() ?? 'Vacante Laboral',
                                      style: TextStyle(
                                        fontSize: 15.5,
                                        fontWeight: FontWeight.w800,
                                        color: context.primaryText,
                                      ),
                                    ),
                                    const SizedBox(height: 3),
                                    Text(
                                      company['name']?.toString() ?? 'Empresa Aliada',
                                      style: const TextStyle(
                                        fontSize: 13,
                                        fontWeight: FontWeight.w700,
                                        color: AppTheme.primaryColor,
                                      ),
                                    ),
                                    const SizedBox(height: 8),
                                    Wrap(
                                      spacing: 12,
                                      runSpacing: 4,
                                      children: [
                                        Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            Icon(Icons.location_on_outlined, size: 14, color: context.secondaryText),
                                            const SizedBox(width: 3),
                                            Text(cityName, style: TextStyle(fontSize: 11.5, color: context.secondaryText)),
                                          ],
                                        ),
                                        Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            Icon(Icons.calendar_today_outlined, size: 13, color: context.secondaryText),
                                            const SizedBox(width: 4),
                                            Text(
                                              _formatDate(app['application_date']?.toString()),
                                              style: TextStyle(fontSize: 11.5, color: context.secondaryText),
                                            ),
                                          ],
                                        ),
                                      ],
                                    ),
                                    if (subProcesses.isNotEmpty) ...[
                                      const SizedBox(height: 8),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                        decoration: BoxDecoration(
                                          color: AppTheme.statusEntrevistado.withValues(alpha: 0.1),
                                          borderRadius: BorderRadius.circular(6),
                                        ),
                                        child: Text(
                                          '${subProcesses.length} prueba(s) / etapa(s) asignada(s)',
                                          style: const TextStyle(
                                            fontSize: 10.5,
                                            fontWeight: FontWeight.w700,
                                            color: AppTheme.statusEntrevistado,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                              ),
                              const SizedBox(width: 12),
                              Column(
                                children: [
                                  ProgressRing(
                                    progress: meta['progress'] as double,
                                    color: meta['color'] as Color,
                                    size: 54,
                                    strokeWidth: 5,
                                  ),
                                  const SizedBox(height: 6),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                    decoration: BoxDecoration(
                                      color: (meta['color'] as Color).withValues(alpha: 0.12),
                                      borderRadius: BorderRadius.circular(999),
                                    ),
                                    child: Text(
                                      meta['label'] as String,
                                      style: TextStyle(
                                        fontSize: 10.5,
                                        fontWeight: FontWeight.w800,
                                        color: meta['color'] as Color,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(width: 6),
                              Icon(Icons.chevron_right_rounded, color: context.tertiaryText),
                            ],
                          ),
                        ),
                      ),
                    );
                  },
                  childCount: filtered.length,
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildRouteStep(String title, String subtitle, Color color) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          margin: const EdgeInsets.only(top: 3),
          width: 10,
          height: 10,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: context.primaryText)),
              Text(subtitle, style: TextStyle(fontSize: 11.5, color: context.secondaryText)),
            ],
          ),
        ),
      ],
    );
  }
}
