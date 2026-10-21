import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/network/api_client.dart';

class ResourceTypeInfo {
  final String key;
  final String label;
  final String emoji;
  final IconData icon;
  final String urlHint;

  const ResourceTypeInfo({
    required this.key,
    required this.label,
    required this.emoji,
    required this.icon,
    required this.urlHint,
  });
}

const List<ResourceTypeInfo> kResourceTypes = [
  ResourceTypeInfo(
    key: 'github',
    label: 'GitHub / GitLab (Código)',
    emoji: '💻',
    icon: Icons.code_rounded,
    urlHint: 'https://github.com/usuario/proyecto',
  ),
  ResourceTypeInfo(
    key: 'behance',
    label: 'Behance / Dribbble (Diseño / Arte)',
    emoji: '🎨',
    icon: Icons.palette_rounded,
    urlHint: 'https://behance.net/gallery/...',
  ),
  ResourceTypeInfo(
    key: 'youtube',
    label: 'YouTube / Video Pitch',
    emoji: '🎬',
    icon: Icons.play_circle_fill_rounded,
    urlHint: 'https://youtube.com/watch?v=...',
  ),
  ResourceTypeInfo(
    key: 'drive',
    label: 'Google Drive / Documento / PDF',
    emoji: '📄',
    icon: Icons.description_rounded,
    urlHint: 'https://drive.google.com/file/...',
  ),
  ResourceTypeInfo(
    key: 'web',
    label: 'Sitio Web / Demo en Vivo',
    emoji: '🌐',
    icon: Icons.language_rounded,
    urlHint: 'https://mi-proyecto.com',
  ),
  ResourceTypeInfo(
    key: 'paper',
    label: 'Artículo / Paper Académico',
    emoji: '📑',
    icon: Icons.article_rounded,
    urlHint: 'https://scielo.org/... o https://doi.org/...',
  ),
  ResourceTypeInfo(
    key: 'institutional',
    label: 'Repositorio Institucional UPC',
    emoji: '🏛️',
    icon: Icons.account_balance_rounded,
    urlHint: 'https://repositorioacademico.upc.edu.co/...',
  ),
  ResourceTypeInfo(
    key: 'other',
    label: 'Enlace Externo / Otro Recurso',
    emoji: '🔗',
    icon: Icons.link_rounded,
    urlHint: 'https://...',
  ),
];

ResourceTypeInfo getResourceInfo(String? type) {
  if (type == null || type.isEmpty) return kResourceTypes.first;
  return kResourceTypes.firstWhere(
    (r) => r.key.toLowerCase() == type.toLowerCase(),
    orElse: () => kResourceTypes.last,
  );
}

class ProjectsTab extends StatefulWidget {
  const ProjectsTab({super.key});

  @override
  State<ProjectsTab> createState() => _ProjectsTabState();
}

class _ProjectsTabState extends State<ProjectsTab> {
  List<Map<String, dynamic>> _projects = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchProjects();
  }

  Future<void> _fetchProjects() async {
    setState(() => _isLoading = true);
    try {
      final res = await ApiClient.instance.get('/modulo1/projects');
      if (res.data is List) {
        _projects = List<Map<String, dynamic>>.from(
          (res.data as List).whereType<Map>().map((e) => Map<String, dynamic>.from(e)),
        );
      }
    } catch (_) {
      _projects = [];
    }
    if (mounted) setState(() => _isLoading = false);
  }

  Future<void> _deleteProject(int id) async {
    try {
      await ApiClient.instance.delete('/modulo1/projects/$id');
      await _fetchProjects();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Proyecto eliminado de tu portafolio.'),
            backgroundColor: AppTheme.primaryColor,
          ),
        );
      }
    } catch (_) {}
  }

  Future<void> _openUrl(String raw) async {
    if (raw.isEmpty) return;
    final uri = Uri.tryParse(raw);
    if (uri != null) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  void _openAddOrEditModal({Map<String, dynamic>? project}) {
    final isEditing = project != null;
    final titleCtrl = TextEditingController(text: project?['title']?.toString() ?? '');
    final descCtrl = TextEditingController(text: project?['description']?.toString() ?? '');

    String initialUrl = project?['resource_url']?.toString() ??
        project?['project_url']?.toString() ??
        project?['repository_url']?.toString() ??
        '';
    final urlCtrl = TextEditingController(text: initialUrl);

    String selectedType = project?['resource_type']?.toString() ??
        (project?['repository_url'] != null && project!['repository_url'].toString().isNotEmpty
            ? 'github'
            : 'web');

    String initialTechs = '';
    if (project?['technologies'] is List) {
      initialTechs = (project!['technologies'] as List).join(', ');
    }
    final techCtrl = TextEditingController(text: initialTechs);
    bool isSubmitting = false;

    showModalBottomSheet(
      context: context,
      backgroundColor: context.surfaceColor,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (modalCtx) {
        return StatefulBuilder(
          builder: (modalCtx, setModalState) {
            final activeTypeInfo = getResourceInfo(selectedType);

            return Padding(
              padding: EdgeInsets.only(
                left: 20,
                right: 20,
                top: 20,
                bottom: MediaQuery.of(modalCtx).viewInsets.bottom + 20,
              ),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          isEditing ? 'Editar Proyecto / Recurso' : 'Nuevo Proyecto Multidisciplinario',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w800,
                            color: context.primaryText,
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.close_rounded),
                          onPressed: () => Navigator.pop(modalCtx),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),

                    // Tipo de Recurso (Universal)
                    DropdownButtonFormField<String>(
                      value: selectedType,
                      decoration: InputDecoration(
                        labelText: 'Tipo de Recurso o Trabajo *',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        prefixIcon: Icon(activeTypeInfo.icon, color: AppTheme.primaryColor),
                      ),
                      items: kResourceTypes.map((r) {
                        return DropdownMenuItem<String>(
                          value: r.key,
                          child: Row(
                            children: [
                              Text(r.emoji, style: const TextStyle(fontSize: 16)),
                              const SizedBox(width: 8),
                              Text(r.label, style: const TextStyle(fontSize: 13)),
                            ],
                          ),
                        );
                      }).toList(),
                      onChanged: (val) {
                        if (val != null) {
                          setModalState(() => selectedType = val);
                        }
                      },
                    ),
                    const SizedBox(height: 12),

                    // Título
                    TextField(
                      controller: titleCtrl,
                      decoration: InputDecoration(
                        labelText: 'Título del Proyecto o Trabajo *',
                        hintText: 'Ej: Campaña Publicitaria, Análisis Financiero, App Móvil...',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Enlace al Recurso (Universal)
                    TextField(
                      controller: urlCtrl,
                      decoration: InputDecoration(
                        labelText: 'Enlace al Recurso / Trabajo *',
                        hintText: activeTypeInfo.urlHint,
                        prefixIcon: const Icon(Icons.link_rounded),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Herramientas / Tecnologías
                    TextField(
                      controller: techCtrl,
                      decoration: InputDecoration(
                        labelText: 'Herramientas, Metodologías o Tecnologías',
                        hintText: 'Ej: Figma, SPSS, Python, Adobe Premiere, Normas APA...',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Descripción
                    TextField(
                      controller: descCtrl,
                      maxLines: 3,
                      decoration: InputDecoration(
                        labelText: 'Descripción / Resumen del Impacto',
                        hintText: 'Explica el objetivo, metodología y resultados destacados...',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                    const SizedBox(height: 18),

                    // Botón Guardar
                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.primaryColor,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        onPressed: isSubmitting
                            ? null
                            : () async {
                                final title = titleCtrl.text.trim();
                                final url = urlCtrl.text.trim();

                                if (title.isEmpty) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(content: Text('Ingresa el título del proyecto')),
                                  );
                                  return;
                                }

                                if (url.isEmpty) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(content: Text('Ingresa el enlace del recurso o proyecto')),
                                  );
                                  return;
                                }

                                setModalState(() => isSubmitting = true);
                                try {
                                  final techs = techCtrl.text
                                      .split(',')
                                      .map((t) => t.trim())
                                      .where((t) => t.isNotEmpty)
                                      .toList();

                                  final payload = {
                                    'title': title,
                                    'description': descCtrl.text.trim().isEmpty ? null : descCtrl.text.trim(),
                                    'resource_type': selectedType,
                                    'resource_url': url,
                                    'project_url': url,
                                    'repository_url': selectedType == 'github' ? url : null,
                                    'technologies': techs,
                                  };

                                  if (isEditing) {
                                    await ApiClient.instance.put('/modulo1/projects/${project['id']}', data: payload);
                                  } else {
                                    await ApiClient.instance.post('/modulo1/projects', data: payload);
                                  }

                                  if (mounted) {
                                    Navigator.pop(modalCtx);
                                    await _fetchProjects();
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(
                                        content: Text(isEditing ? 'Proyecto actualizado.' : '¡Proyecto agregado al portafolio!'),
                                        backgroundColor: AppTheme.brand500,
                                      ),
                                    );
                                  }
                                } catch (_) {
                                  if (mounted) {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      const SnackBar(content: Text('Error al guardar el proyecto')),
                                    );
                                  }
                                } finally {
                                  setModalState(() => isSubmitting = false);
                                }
                              },
                        child: isSubmitting
                            ? const SizedBox(
                                width: 22,
                                height: 22,
                                child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                              )
                            : Text(
                                isEditing ? 'Guardar Cambios' : 'Agregar Proyecto',
                                style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white),
                              ),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator(color: AppTheme.primaryColor));
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Banner / Header Multidisciplinario
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: context.surfaceColor,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: context.borderColor),
            ),
            child: Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: AppTheme.primaryColor.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.folder_special_outlined, color: AppTheme.primaryColor, size: 24),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Portafolio Profesional Multidisciplinario',
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: context.primaryText),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Publica tus proyectos de cualquier carrera: diseño, código, artículos, videos, tesis o documentos.',
                        style: TextStyle(fontSize: 11.5, color: context.secondaryText),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Botón Añadir Proyecto
          SizedBox(
            width: double.infinity,
            height: 44,
            child: OutlinedButton.icon(
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: AppTheme.primaryColor),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              onPressed: () => _openAddOrEditModal(),
              icon: const Icon(Icons.add_rounded, color: AppTheme.primaryColor),
              label: const Text(
                'Nuevo Proyecto o Recurso',
                style: TextStyle(fontWeight: FontWeight.bold, color: AppTheme.primaryColor),
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Lista de Proyectos
          if (_projects.isEmpty)
            Center(
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 40),
                child: Column(
                  children: [
                    Icon(Icons.folder_open_rounded, size: 48, color: context.tertiaryText),
                    const SizedBox(height: 12),
                    Text(
                      'No tienes proyectos registrados',
                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: context.secondaryText),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Agrega tus trabajos destacados para visibilidad ante empresas y la comunidad.',
                      style: TextStyle(fontSize: 12, color: context.tertiaryText),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
            )
          else
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _projects.length,
              separatorBuilder: (_, _) => const SizedBox(height: 12),
              itemBuilder: (ctx, i) {
                final proj = _projects[i];
                final techs = (proj['technologies'] as List? ?? []).map((t) => t.toString()).toList();
                final resourceType = proj['resource_type']?.toString();
                final resInfo = getResourceInfo(resourceType);

                final finalUrl = proj['resource_url']?.toString() ??
                    proj['project_url']?.toString() ??
                    proj['repository_url']?.toString() ??
                    '';

                return Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: context.surfaceColor,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: context.borderColor),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Badge tipo recurso + Menú
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: AppTheme.primaryColor.withValues(alpha: 0.10),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(resInfo.emoji, style: const TextStyle(fontSize: 12)),
                                const SizedBox(width: 5),
                                Text(
                                  resInfo.label,
                                  style: const TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold,
                                    color: AppTheme.primaryColor,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          PopupMenuButton<String>(
                            icon: Icon(Icons.more_vert_rounded, size: 20, color: context.tertiaryText),
                            onSelected: (val) {
                              if (val == 'edit') {
                                _openAddOrEditModal(project: proj);
                              } else if (val == 'delete') {
                                _deleteProject(proj['id'] as int);
                              }
                            },
                            itemBuilder: (_) => [
                              const PopupMenuItem(value: 'edit', child: Text('Editar')),
                              const PopupMenuItem(
                                value: 'delete',
                                child: Text('Eliminar', style: TextStyle(color: Colors.redAccent)),
                              ),
                            ],
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),

                      // Título
                      Text(
                        proj['title']?.toString() ?? 'Proyecto sin título',
                        style: TextStyle(
                          fontSize: 14.5,
                          fontWeight: FontWeight.w800,
                          color: context.primaryText,
                        ),
                      ),
                      if (proj['description'] != null && proj['description'].toString().isNotEmpty) ...[
                        const SizedBox(height: 6),
                        Text(
                          proj['description'].toString(),
                          style: TextStyle(fontSize: 12, color: context.secondaryText, height: 1.3),
                        ),
                      ],
                      if (techs.isNotEmpty) ...[
                        const SizedBox(height: 10),
                        Wrap(
                          spacing: 6,
                          runSpacing: 4,
                          children: techs.map((t) {
                            return Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: AppTheme.brand500.withValues(alpha: 0.10),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                t,
                                style: const TextStyle(
                                  fontSize: 10.5,
                                  fontWeight: FontWeight.w700,
                                  color: AppTheme.primaryColor,
                                ),
                              ),
                            );
                          }).toList(),
                        ),
                      ],
                      if (finalUrl.isNotEmpty) ...[
                        const SizedBox(height: 12),
                        const Divider(height: 1),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            ElevatedButton.icon(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppTheme.primaryColor,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                visualDensity: VisualDensity.compact,
                              ),
                              onPressed: () => _openUrl(finalUrl),
                              icon: Icon(resInfo.icon, size: 15, color: Colors.white),
                              label: Text(
                                'Ver ${resInfo.label.split(' ')[0]}',
                                style: const TextStyle(fontSize: 11.5, color: Colors.white, fontWeight: FontWeight.bold),
                              ),
                            ),
                          ],
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
  }
}
