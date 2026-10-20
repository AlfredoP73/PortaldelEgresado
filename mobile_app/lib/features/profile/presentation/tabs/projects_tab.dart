import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/network/api_client.dart';

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
      // Safe fallback
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
    final repoCtrl = TextEditingController(text: project?['repository_url']?.toString() ?? '');
    final projUrlCtrl = TextEditingController(text: project?['project_url']?.toString() ?? '');

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
                          isEditing ? 'Editar Proyecto' : 'Agregar Proyecto al Portafolio',
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

                    // Título
                    TextField(
                      controller: titleCtrl,
                      decoration: InputDecoration(
                        labelText: 'Título del Proyecto *',
                        hintText: 'Ej: Sistema de Monitoreo IoT',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Descripción
                    TextField(
                      controller: descCtrl,
                      maxLines: 3,
                      decoration: InputDecoration(
                        labelText: 'Descripción / Resumen',
                        hintText: 'Explica de qué trata el proyecto, tu rol y el impacto...',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Tecnologías
                    TextField(
                      controller: techCtrl,
                      decoration: InputDecoration(
                        labelText: 'Tecnologías (separadas por coma)',
                        hintText: 'Ej: Python, React, AWS, Docker, PostgreSQL',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Repositorio URL
                    TextField(
                      controller: repoCtrl,
                      decoration: InputDecoration(
                        labelText: 'URL Repositorio (GitHub, GitLab)',
                        hintText: 'https://github.com/usuario/repositorio',
                        prefixIcon: const Icon(Icons.code_rounded),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Demo URL
                    TextField(
                      controller: projUrlCtrl,
                      decoration: InputDecoration(
                        labelText: 'URL Demo / Despliegue en Vivo',
                        hintText: 'https://mi-proyecto.com',
                        prefixIcon: const Icon(Icons.link_rounded),
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
                                if (title.isEmpty) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(content: Text('Ingresa el título del proyecto')),
                                  );
                                  return;
                                }

                                setModalState(() => isSubmitting = true);
                                try {
                                  final techs = techCtrl.text
                                      .split(',')
                                      .map((t) => t.trim())
                                      .filter((t) => t.isNotEmpty)
                                      .toList();

                                  final payload = {
                                    'title': title,
                                    'description': descCtrl.text.trim().isEmpty ? null : descCtrl.text.trim(),
                                    'repository_url': repoCtrl.text.trim().isEmpty ? null : repoCtrl.text.trim(),
                                    'project_url': projUrlCtrl.text.trim().isEmpty ? null : projUrlCtrl.text.trim(),
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
          // Banner / Header
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
                        'Mi Portafolio de Proyectos',
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: context.primaryText),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Muestra tu trabajo a empresas reclutadoras y a la comunidad de egresados.',
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
                'Nuevo Proyecto',
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
                      'Agrega tus repositorios, demos y desarrollos destacados.',
                      style: TextStyle(fontSize: 12, color: context.tertiaryText),
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
                final repo = proj['repository_url']?.toString() ?? '';
                final liveDemo = proj['project_url']?.toString() ?? '';

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
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            child: Text(
                              proj['title']?.toString() ?? 'Proyecto sin título',
                              style: TextStyle(
                                fontSize: 14.5,
                                fontWeight: FontWeight.w800,
                                color: context.primaryText,
                              ),
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
                      if (repo.isNotEmpty || liveDemo.isNotEmpty) ...[
                        const SizedBox(height: 12),
                        const Divider(height: 1),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            if (repo.isNotEmpty)
                              TextButton.icon(
                                style: TextButton.styleFrom(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                  visualDensity: VisualDensity.compact,
                                ),
                                onPressed: () => _openUrl(repo),
                                icon: const Icon(Icons.code_rounded, size: 16, color: AppTheme.primaryColor),
                                label: const Text('Repositorio', style: TextStyle(fontSize: 11.5)),
                              ),
                            if (liveDemo.isNotEmpty) ...[
                              const SizedBox(width: 8),
                              TextButton.icon(
                                style: TextButton.styleFrom(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                  visualDensity: VisualDensity.compact,
                                ),
                                onPressed: () => _openUrl(liveDemo),
                                icon: const Icon(Icons.open_in_new_rounded, size: 16, color: AppTheme.brand500),
                                label: const Text('Demo en Vivo', style: TextStyle(fontSize: 11.5)),
                              ),
                            ],
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

extension _IterableFilter<E> on Iterable<E> {
  Iterable<E> filter(bool Function(E element) test) => where(test);
}

