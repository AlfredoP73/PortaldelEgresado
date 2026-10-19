import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:jwt_decoder/jwt_decoder.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/network/api_client.dart';
import '../../jobs/presentation/widgets/job_card.dart';

class MatchmakingScreen extends StatefulWidget {
  const MatchmakingScreen({super.key});

  @override
  State<MatchmakingScreen> createState() => _MatchmakingScreenState();
}

class _MatchmakingScreenState extends State<MatchmakingScreen> {
  List<Map<String, dynamic>> _recommendedJobs = [];
  bool _isLoading = true;
  String _searchQuery = '';
  String _modalityFilter = 'ALL';

  @override
  void initState() {
    super.initState();
    _fetchRecommendations();
  }

  Future<void> _fetchRecommendations() async {
    setState(() => _isLoading = true);

    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('jwt_token');
      int? gradId;

      // 1. Obtener ID del egresado desde user_data o token JWT
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

      // 2. Fetch Matchmaking Scores for this Graduate (Matches GraduateMatchmaking.tsx)
      final Map<int, double> scoresMap = {};
      if (gradId != null) {
        try {
          final matchRes = await ApiClient.instance.get('/matching/graduate/$gradId?limit=200');
          if (matchRes.data is List) {
            for (final item in matchRes.data) {
              if (item is Map && item['job_offer_id'] != null) {
                final id = int.tryParse(item['job_offer_id']?.toString() ?? '') ?? 0;
                final sc = double.tryParse(item['score']?.toString() ?? '') ?? 0.0;
                if (id > 0) {
                  scoresMap[id] = sc;
                }
              }
            }
          }
        } catch (e) {
          debugPrint('[MatchmakingScreen] Error fetching graduate matches: $e');
        }
      }

      // 3. Fetch Jobs and filter where score > 0 (Matches GraduateMatchmaking.tsx)
      final jobsRes = await ApiClient.instance.get('/modulo1/jobs');
      final List<Map<String, dynamic>> matched = [];

      if (jobsRes.data is List) {
        for (final raw in jobsRes.data) {
          if (raw is Map) {
            final job = Map<String, dynamic>.from(raw);
            final id = int.tryParse(job['id']?.toString() ?? '') ?? 0;
            final score = scoresMap[id] ?? (double.tryParse(job['match_score']?.toString() ?? '') ?? 0.0);
            if (score > 0) {
              job['match_score'] = score;
              matched.add(job);
            }
          }
        }
      }

      matched.sort((a, b) {
        final sa = double.tryParse(a['match_score']?.toString() ?? '') ?? 0.0;
        final sb = double.tryParse(b['match_score']?.toString() ?? '') ?? 0.0;
        return sb.compareTo(sa);
      });

      if (mounted) {
        setState(() {
          _recommendedJobs = matched;
          _isLoading = false;
        });
      }
    } catch (e) {
      debugPrint('[MatchmakingScreen] Error fetching recommendations: $e');
      if (mounted) setState(() => _isLoading = false);
    }
  }

  String _effectiveModality(Map<String, dynamic> job) {
    return JobCard.effectiveModality(job);
  }

  List<Map<String, dynamic>> get _filteredRecommendations {
    return _recommendedJobs.where((job) {
      final title = job['title']?.toString().toLowerCase() ?? '';
      final comp = job['company'] is Map ? job['company'] as Map : {};
      final companyName = comp['name']?.toString().toLowerCase() ?? '';
      final q = _searchQuery.toLowerCase();

      if (q.isNotEmpty && !title.contains(q) && !companyName.contains(q)) {
        return false;
      }
      if (_modalityFilter != 'ALL') {
        final mod = _effectiveModality(job).toLowerCase();
        if (!mod.contains(_modalityFilter.toLowerCase())) return false;
      }
      return true;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _filteredRecommendations;

    return RefreshIndicator(
      color: AppTheme.primaryColor,
      onRefresh: _fetchRecommendations,
      child: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Header (Matches GraduateMatchmaking.tsx)
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          gradient: AppTheme.primaryGradient,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Icon(Icons.auto_awesome_rounded, color: Colors.white, size: 20),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Vacantes Recomendadas para Ti',
                              style: TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.w800,
                                color: context.primaryText,
                                letterSpacing: -0.4,
                              ),
                            ),
                            Text(
                              'Ofertas seleccionadas por afinidad con tus habilidades y programa.',
                              style: TextStyle(fontSize: 12.5, color: context.secondaryText),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),

                  // Algorithm Breakdown Banner
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AppTheme.brand50,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: AppTheme.brand200),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Row(
                          children: [
                            Icon(Icons.insights_rounded, color: AppTheme.primaryColor, size: 17),
                            SizedBox(width: 6),
                            Text(
                              'Motor de Matchmaking Inteligente UPC',
                              style: TextStyle(
                                fontSize: 12.5,
                                fontWeight: FontWeight.w800,
                                color: AppTheme.brand800,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 8,
                          runSpacing: 6,
                          children: [
                            _buildWeightChip('Habilidades Técnicas 40%'),
                            _buildWeightChip('Programa Académico 30%'),
                            _buildWeightChip('Experiencia 20%'),
                            _buildWeightChip('Ubicación / Modalidad 10%'),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Search & Modality Filter
                  TextField(
                    onChanged: (v) => setState(() => _searchQuery = v),
                    decoration: AppTheme.inputDecoration(
                      context,
                      label: 'Filtrar dentro de tus recomendaciones',
                      hint: 'Cargo o empresa...',
                      icon: Icons.search_rounded,
                    ),
                  ),
                  const SizedBox(height: 10),
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        _buildModalityChip('Todas las modalidades', 'ALL'),
                        _buildModalityChip('Presencial', 'Presencial'),
                        _buildModalityChip('Remoto', 'Remoto'),
                        _buildModalityChip('Híbrido', 'Híbrido'),
                        if (_searchQuery.isNotEmpty || _modalityFilter != 'ALL')
                          Padding(
                            padding: const EdgeInsets.only(left: 4),
                            child: ActionChip(
                              avatar: const Icon(Icons.close_rounded, size: 14, color: AppTheme.statusRechazado),
                              label: const Text('Limpiar filtros'),
                              backgroundColor: AppTheme.statusRechazado.withValues(alpha: 0.1),
                              labelStyle: const TextStyle(
                                fontSize: 11.5,
                                fontWeight: FontWeight.w700,
                                color: AppTheme.statusRechazado,
                              ),
                              side: const BorderSide(color: AppTheme.statusRechazado, width: 0.8),
                              onPressed: () {
                                setState(() {
                                  _searchQuery = '';
                                  _modalityFilter = 'ALL';
                                });
                              },
                            ),
                          ),
                      ],
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
          else if (_recommendedJobs.isEmpty)
            SliverFillRemaining(
              child: Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.auto_awesome_outlined, size: 52, color: context.tertiaryText),
                      const SizedBox(height: 12),
                      Text(
                        'Aún no hay recomendaciones con afinidad activa',
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: context.primaryText),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'Asegúrate de completar tus habilidades y programa académico en tu Hoja de Vida para recalcular tus coincidencias.',
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 12.5, color: context.secondaryText),
                      ),
                    ],
                  ),
                ),
              ),
            )
          else if (filtered.isEmpty)
            SliverFillRemaining(
              child: Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.filter_list_off_rounded, size: 52, color: context.tertiaryText),
                      const SizedBox(height: 12),
                      Text(
                        'No se encontraron recomendaciones con los filtros aplicados',
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: context.primaryText),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'Prueba seleccionando otra modalidad o restableciendo la búsqueda.',
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 12.5, color: context.secondaryText),
                      ),
                      const SizedBox(height: 16),
                      OutlinedButton.icon(
                        onPressed: () {
                          setState(() {
                            _searchQuery = '';
                            _modalityFilter = 'ALL';
                          });
                        },
                        icon: const Icon(Icons.refresh_rounded, size: 16),
                        label: const Text('Mostrar todas las sugerencias'),
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
                    final job = filtered[index];
                    final score = double.tryParse(job['match_score']?.toString() ?? '');
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 14),
                      child: JobCard(
                        job: job,
                        matchScore: score,
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

  Widget _buildWeightChip(String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: AppTheme.brand200),
      ),
      child: Text(
        text,
        style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: AppTheme.brand700),
      ),
    );
  }

  Widget _buildModalityChip(String label, String value) {
    final selected = _modalityFilter == value;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: ChoiceChip(
        label: Text(label),
        selected: selected,
        onSelected: (_) => setState(() => _modalityFilter = value),
        selectedColor: AppTheme.primaryColor,
        backgroundColor: context.surfaceColor,
        labelStyle: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w700,
          color: selected ? Colors.white : context.secondaryText,
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(999),
          side: BorderSide(color: selected ? AppTheme.primaryColor : context.borderColor),
        ),
        showCheckmark: false,
      ),
    );
  }
}
