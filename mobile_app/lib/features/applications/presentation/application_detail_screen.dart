import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/network/api_client.dart';
import 'package:url_launcher/url_launcher.dart';

class ApplicationDetailScreen extends StatefulWidget {
  final Map<String, dynamic> application;
  final VoidCallback onUpdate;

  const ApplicationDetailScreen({
    super.key,
    required this.application,
    required this.onUpdate,
  });

  @override
  State<ApplicationDetailScreen> createState() => _ApplicationDetailScreenState();
}

class _ApplicationDetailScreenState extends State<ApplicationDetailScreen> {
  final List<String> _stages = ['POSTULADO', 'EN_EVALUACION', 'ENTREVISTADO', 'FINAL'];
  bool _isLoading = false;

  int _getStageIndex(String status) {
    final s = status.toUpperCase();
    if (s == 'RECHAZADO' || s == 'CONTRATADO') return 3;
    final idx = _stages.indexOf(s);
    return idx >= 0 ? idx : 0;
  }

  Future<void> _markTestComplete(int spId) async {
    setState(() => _isLoading = true);
    try {
      await ApiClient.instance.put('/modulo1/sub-processes/$spId', data: {'estado': 'completado'});
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text('Prueba marcada como completada'),
        backgroundColor: Colors.green,
      ));
      widget.onUpdate();
      Navigator.pop(context); // Go back so it reloads the list, or we could fetch single item here
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text('Error al actualizar prueba'),
        backgroundColor: AppTheme.accentPink,
      ));
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _launchUrl(String urlString) async {
    final Uri url = Uri.parse(urlString);
    if (!await launchUrl(url, mode: LaunchMode.externalApplication)) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('No se pudo abrir el enlace'), backgroundColor: AppTheme.accentPink),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final app = widget.application;
    final job = app['job_offer'] ?? {};
    final title = job['title'] ?? 'Vacante';
    final company = job['company']?['name'] ?? 'Empresa';
    
    final status = (app['status'] ?? 'POSTULADO').toString().toUpperCase();
    final currentIndex = _getStageIndex(status);
    final isRejected = status == 'RECHAZADO';
    final isHired = status == 'CONTRATADO';
    final isFinal = isRejected || isHired;

    final subProcesses = (app['sub_processes'] as List<dynamic>?) ?? [];

    // Colores del header dependiendo del status final
    Color headerBg = AppTheme.primaryColor;
    String finalStatusText = 'En curso';
    if (isHired) {
      headerBg = Colors.green;
      finalStatusText = '¡Felicidades, fuiste contratado!';
    } else if (isRejected) {
      headerBg = AppTheme.accentPink;
      finalStatusText = 'Proceso Finalizado';
    }

    return Scaffold(
      backgroundColor: context.bgColor,
      appBar: AppBar(
        title: Text(
          'Detalle de Postulación',
          style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18),
        ),
      ),
      body: Stack(
        children: [
          LayoutBuilder(
            builder: (context, constraints) {
              final isWide = constraints.maxWidth > 800;

              // Left Column (Header + Timeline)
              final leftColumn = Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // 1. Header Card (Status & Job Info)
                  Container(
                    margin: EdgeInsets.all(isWide ? 0 : 20),
                    padding: EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [headerBg, headerBg.withValues(alpha: 0.8)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(24),
                      boxShadow: [
                        BoxShadow(
                          color: headerBg.withValues(alpha: 0.3),
                          blurRadius: 15,
                          offset: Offset(0, 8),
                        )
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Icon(Icons.check_circle_outline, color: Colors.white, size: 28),
                            SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                isFinal ? finalStatusText : 'Postulación Activa',
                                style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 18),
                              ),
                            ),
                          ],
                        ),
                        SizedBox(height: 20),
                        Container(
                          padding: EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                title,
                                style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 16),
                              ),
                              SizedBox(height: 4),
                              Row(
                                children: [
                                  Icon(Icons.business, color: Colors.white70, size: 14),
                                  SizedBox(width: 6),
                                  Text(
                                    company,
                                    style: TextStyle(color: Colors.white70, fontWeight: FontWeight.w600, fontSize: 13),
                                  ),
                                ],
                              )
                            ],
                          ),
                        )
                      ],
                    ),
                  ),

                  SizedBox(height: isWide ? 20 : 0),

                  // 2. Timeline (Ruta de Selección)
                  Padding(
                    padding: EdgeInsets.symmetric(horizontal: isWide ? 4 : 24, vertical: 10),
                    child: Text(
                      'LÍNEA DE TIEMPO',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900, letterSpacing: 1.2, color: context.secondaryText),
                    ),
                  ),
                  Container(
                    margin: EdgeInsets.symmetric(horizontal: isWide ? 0 : 20),
                    padding: EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: context.surfaceColor,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: Color(0xFFE5E7EB).withValues(alpha: 0.5)),
                      boxShadow: AppTheme.premiumShadow,
                    ),
                    child: Column(
                      children: [
                        _buildTimelineItem(context, 0, 'Postulado', 'Hoja de vida enviada', currentIndex, isRejected),
                        _buildTimelineItem(context, 1, 'HdV Vista', 'En revisión por reclutador', currentIndex, isRejected),
                        _buildTimelineItem(context, 2, 'En Proceso', 'Evaluaciones y entrevistas', currentIndex, isRejected),
                        _buildTimelineItem(context, 3, 'Proceso Finalizado', 'Resolución de la vacante', currentIndex, isRejected, isLast: true),
                      ],
                    ),
                  ),
                ],
              );

              // Right Column (Tests)
              final rightColumn = Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // 3. Tests & Evaluations (Pruebas Técnicas)
                  Padding(
                    padding: EdgeInsets.symmetric(horizontal: isWide ? 4 : 24, vertical: 20),
                    child: Text(
                      'PRUEBAS Y EVALUACIONES',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900, letterSpacing: 1.2, color: context.secondaryText),
                    ),
                  ),

                  if (subProcesses.isEmpty)
                    Container(
                      margin: EdgeInsets.symmetric(horizontal: isWide ? 0 : 20),
                      padding: EdgeInsets.all(30),
                      decoration: BoxDecoration(
                        color: context.surfaceColor,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: Color(0xFFE5E7EB).withValues(alpha: 0.5), style: BorderStyle.solid),
                      ),
                      child: Column(
                        children: [
                          Icon(Icons.assignment_outlined, size: 40, color: context.secondaryText.withValues(alpha: 0.3)),
                          SizedBox(height: 16),
                          Text(
                            'Aún no hay pruebas asignadas',
                            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: context.primaryText),
                          ),
                          SizedBox(height: 8),
                          Text(
                            'La empresa te notificará aquí si necesitas completar una prueba.',
                            textAlign: TextAlign.center,
                            style: TextStyle(fontSize: 13, color: context.secondaryText),
                          ),
                        ],
                      ),
                    )
                  else
                    ...subProcesses.map((sp) {
                      return Padding(
                        padding: EdgeInsets.only(
                          left: isWide ? 0 : 20, 
                          right: isWide ? 0 : 20,
                          bottom: 16,
                        ),
                        child: _buildTestCard(sp),
                      );
                    }),
                ],
              );

              if (isWide) {
                return SingleChildScrollView(
                  padding: EdgeInsets.all(24),
                  physics: const BouncingScrollPhysics(),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(flex: 4, child: leftColumn),
                      SizedBox(width: 24),
                      Expanded(flex: 6, child: rightColumn),
                    ],
                  ),
                );
              } else {
                return SingleChildScrollView(
                  padding: EdgeInsets.only(bottom: 100),
                  physics: const BouncingScrollPhysics(),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      leftColumn,
                      SizedBox(height: 10),
                      rightColumn,
                    ],
                  ),
                );
              }
            },
          ),
          
          if (_isLoading)
            Container(
              color: Colors.black.withValues(alpha: 0.3),
              child: Center(child: CircularProgressIndicator(color: AppTheme.primaryColor)),
            ),
        ],
      ),
    );
  }

  Widget _buildTimelineItem(BuildContext context, int index, String title, String subtitle, int currentIndex, bool isRejected, {bool isLast = false}) {
    final bool isCompleted = index < currentIndex;
    final bool isCurrent = index == currentIndex;

    Color iconColor = AppTheme.primaryColor;
    IconData iconData = Icons.check;

    if (isCompleted) {
      iconColor = AppTheme.primaryColor;
      iconData = Icons.check_circle;
    } else if (isCurrent) {
      if (index == 3 && isRejected) {
        iconColor = AppTheme.accentPink;
        iconData = Icons.cancel;
      } else if (index == 3) {
        iconColor = Colors.green;
        iconData = Icons.check_circle;
      } else {
        iconColor = AppTheme.accentBlue;
        iconData = Icons.radio_button_checked;
      }
    } else {
      iconColor = context.secondaryText.withValues(alpha: 0.3);
      iconData = Icons.radio_button_unchecked;
    }

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Columna del Icono y Línea
          SizedBox(
            width: 40,
            child: Column(
              children: [
                Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: (isCompleted || isCurrent) ? iconColor.withValues(alpha: 0.1) : Colors.transparent,
                  ),
                  child: Icon(iconData, color: iconColor, size: 20),
                ),
                if (!isLast)
                  Expanded(
                    child: Container(
                      width: 2,
                      color: isCompleted ? AppTheme.primaryColor : context.secondaryText.withValues(alpha: 0.2),
                    ),
                  )
              ],
            ),
          ),
          SizedBox(width: 12),
          // Columna de Texto
          Expanded(
            child: Padding(
              padding: const EdgeInsets.only(bottom: 24.0, top: 4),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: (isCurrent || isCompleted) ? FontWeight.w800 : FontWeight.w600,
                      color: isCurrent ? context.primaryText : context.secondaryText,
                    ),
                  ),
                  SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: TextStyle(fontSize: 13, color: context.secondaryText.withValues(alpha: 0.7)),
                  ),
                ],
              ),
            ),
          )
        ],
      ),
    );
  }

  Widget _buildTestCard(dynamic sp) {
    final title = sp['titulo'] ?? 'Evaluación';
    final desc = sp['descripcion'] ?? 'Sin descripción';
    final status = sp['estado'] ?? 'pendiente';
    final type = sp['tipo_prueba'] ?? 'Técnica';
    final link = sp['enlace_prueba'];

    final bool isCompleted = status.toLowerCase() == 'completado';

    return Container(
      margin: EdgeInsets.only(left: 20, right: 20, bottom: 16),
      padding: EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: context.surfaceColor,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Color(0xFFE5E7EB).withValues(alpha: 0.5)),
        boxShadow: AppTheme.premiumShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: isCompleted ? Colors.green.withValues(alpha: 0.1) : AppTheme.accentAmber.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  isCompleted ? 'COMPLETADA' : 'PENDIENTE',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w900,
                    color: isCompleted ? Colors.green : AppTheme.accentAmber,
                  ),
                ),
              ),
              Container(
                padding: EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: context.isDark ? Colors.white.withValues(alpha: 0.1) : Color(0xFFF3F4F6),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  type,
                  style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: context.secondaryText),
                ),
              ),
            ],
          ),
          SizedBox(height: 16),
          Text(
            title,
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: context.primaryText),
          ),
          SizedBox(height: 6),
          Text(
            desc,
            style: TextStyle(fontSize: 13, color: context.secondaryText),
          ),
          if (link != null && link.toString().isNotEmpty) ...[
            SizedBox(height: 16),
            InkWell(
              onTap: () => _launchUrl(link),
              borderRadius: BorderRadius.circular(12),
              child: Container(
                padding: EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                decoration: BoxDecoration(
                  color: AppTheme.accentBlue.withValues(alpha: 0.05),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppTheme.accentBlue.withValues(alpha: 0.2)),
                ),
                child: Row(
                  children: [
                    Icon(Icons.link, size: 16, color: AppTheme.accentBlue),
                    SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Abrir Enlace',
                        style: TextStyle(color: AppTheme.accentBlue, fontWeight: FontWeight.w700, fontSize: 13),
                      ),
                    ),
                    Icon(Icons.open_in_new, size: 16, color: AppTheme.accentBlue),
                  ],
                ),
              ),
            ),
          ],
          if (!isCompleted) ...[
            SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => _markTestComplete(sp['id']),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primaryColor,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  padding: EdgeInsets.symmetric(vertical: 14),
                ),
                child: Text('Marcar como Completada'),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
