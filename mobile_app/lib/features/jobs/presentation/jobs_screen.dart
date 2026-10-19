import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:jwt_decoder/jwt_decoder.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/network/api_client.dart';
import 'widgets/job_card.dart';

class JobsScreen extends StatefulWidget {
  const JobsScreen({super.key});

  @override
  State<JobsScreen> createState() => _JobsScreenState();
}

class _JobsScreenState extends State<JobsScreen> {
  List<Map<String, dynamic>> _jobs = [];
  Map<int, double> _matchScores = {};
  bool _isLoading = true;
  bool _showAdvancedFilters = false;

  /// 'vacantes' | 'guardadas' | 'empresas'
  String _mode = 'vacantes';
  Set<int> _savedIds = {};
  final List<int> _compareIds = [];
  List<Map<String, dynamic>> _companies = [];
  bool _loadingCompanies = false;

  String _searchQuery = '';
  String _modalityFilter = 'ALL';
  String _contractFilter = 'ALL';
  String _minSalaryFilter = 'ALL';
  String _matchFilter = 'ALL';
  String _sectorFilter = 'ALL';
  String _cityFilter = 'ALL';

  @override
  void initState() {
    super.initState();
    _fetchJobsAndMatches();
    _loadSavedJobs();
    _fetchCompanies();
  }

  Future<void> _loadSavedJobs({bool force = false}) async {
    final ids = await SavedJobsCache.load(force: force);
    if (mounted) setState(() => _savedIds = Set<int>.from(ids));
  }

  Future<void> _fetchCompanies() async {
    setState(() => _loadingCompanies = true);
    try {
      final res = await ApiClient.instance.get('/modulo1/companies-directory');
      final list = <Map<String, dynamic>>[];
      if (res.data is List) {
        for (final c in res.data) {
          if (c is Map) list.add(Map<String, dynamic>.from(c));
        }
      }
      list.sort((a, b) {
        final ha = int.tryParse(a['alumni_hired_count']?.toString() ?? '') ?? 0;
        final hb = int.tryParse(b['alumni_hired_count']?.toString() ?? '') ?? 0;
        return hb.compareTo(ha);
      });
      if (mounted) setState(() => _companies = list);
    } catch (e) {
      debugPrint('[JobsScreen] Error al obtener directorio de empresas: $e');
    } finally {
      if (mounted) setState(() => _loadingCompanies = false);
    }
  }

  Future<void> _refreshAll() async {
    await Future.wait([
      _fetchJobsAndMatches(),
      _loadSavedJobs(force: true),
      _fetchCompanies(),
    ]);
  }

  void _toggleCompare(int jobId) {
    setState(() {
      if (_compareIds.contains(jobId)) {
        _compareIds.remove(jobId);
      } else {
        if (_compareIds.length >= 3) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Puedes comparar hasta 3 vacantes al mismo tiempo'),
              backgroundColor: AppTheme.statusRechazado,
            ),
          );
          return;
        }
        _compareIds.add(jobId);
      }
    });
  }

  double _scoreFor(Map<String, dynamic> job) {
    final id = int.tryParse(job['id']?.toString() ?? '') ?? 0;
    return _matchScores[id] ?? (double.tryParse(job['match_score']?.toString() ?? '') ?? 0.0);
  }

  void _openCompareSheet() {
    final selected = _jobs
        .where((j) => _compareIds.contains(int.tryParse(j['id']?.toString() ?? '') ?? -1))
        .toList();
    if (selected.length < 2) return;

    final rows = <MapEntry<String, String Function(Map<String, dynamic>)>>[
      MapEntry('Empresa', (j) => (j['company'] is Map ? j['company']['name']?.toString() : null) ?? '—'),
      MapEntry('Afinidad', (j) => '${_scoreFor(j).round()}%'),
      MapEntry('Salario', (j) => JobCard.formatSalaryRange(j)),
      MapEntry('Modalidad', (j) => JobCard.effectiveModality(j)),
      MapEntry('Contrato', (j) => JobCard.effectiveContract(j)),
      MapEntry('Experiencia', (j) => j['min_experience_years'] != null ? '${j['min_experience_years']} año(s)' : 'Sin requisito'),
      MapEntry('Ciudad', (j) => (j['company'] is Map && j['company']['city'] is Map ? j['company']['city']['name']?.toString() : null) ?? '—'),
      MapEntry('Cierre', (j) => JobCard.formatClosingDate(j)),
    ];

    final bestScore = selected.map(_scoreFor).reduce((a, b) => a > b ? a : b);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: context.surfaceColor,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) {
        return DraggableScrollableSheet(
          expand: false,
          initialChildSize: 0.75,
          maxChildSize: 0.95,
          builder: (_, scrollCtrl) {
            return Padding(
              padding: const EdgeInsets.fromLTRB(16, 14, 16, 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: Container(
                      width: 42,
                      height: 4,
                      decoration: BoxDecoration(color: context.borderColor, borderRadius: BorderRadius.circular(999)),
                    ),
                  ),
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      const Icon(Icons.compare_arrows_rounded, color: AppTheme.primaryColor),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Comparador lado a lado',
                          style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: ctx.primaryText),
                        ),
                      ),
                      TextButton(
                        onPressed: () {
                          setState(() => _compareIds.clear());
                          Navigator.pop(ctx);
                        },
                        child: const Text('Limpiar'),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Expanded(
                    child: SingleChildScrollView(
                      controller: scrollCtrl,
                      child: SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        child: Table(
                          defaultColumnWidth: const FixedColumnWidth(150),
                          columnWidths: const {0: FixedColumnWidth(96)},
                          border: TableBorder.all(color: ctx.borderColor, borderRadius: BorderRadius.circular(12)),
                          children: [
                            TableRow(
                              decoration: BoxDecoration(color: ctx.mutedColor),
                              children: [
                                const Padding(padding: EdgeInsets.all(10), child: SizedBox()),
                                ...selected.map((j) => Padding(
                                      padding: const EdgeInsets.all(10),
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          if (_scoreFor(j) == bestScore)
                                            Container(
                                              margin: const EdgeInsets.only(bottom: 4),
                                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                              decoration: BoxDecoration(
                                                color: AppTheme.primaryColor,
                                                borderRadius: BorderRadius.circular(6),
                                              ),
                                              child: const Text('Mejor afinidad',
                                                  style: TextStyle(color: Colors.white, fontSize: 9.5, fontWeight: FontWeight.w800)),
                                            ),
                                          Text(
                                            j['title']?.toString() ?? 'Vacante',
                                            style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w900, color: ctx.primaryText),
                                          ),
                                        ],
                                      ),
                                    )),
                              ],
                            ),
                            ...rows.map((r) => TableRow(
                                  children: [
                                    Padding(
                                      padding: const EdgeInsets.all(10),
                                      child: Text(r.key,
                                          style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800, color: ctx.secondaryText)),
                                    ),
                                    ...selected.map((j) => Padding(
                                          padding: const EdgeInsets.all(10),
                                          child: Text(r.value(j),
                                              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: ctx.primaryText)),
                                        )),
                                  ],
                                )),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  Future<void> _fetchJobsAndMatches() async {
    setState(() => _isLoading = true);

    try {
      // 1. Fetch active job offers
      final jobsRes = await ApiClient.instance.get('/modulo1/jobs');
      final List<Map<String, dynamic>> jobsList = [];
      if (jobsRes.data is List) {
        for (final item in jobsRes.data) {
          if (item is Map) {
            jobsList.add(Map<String, dynamic>.from(item));
          }
        }
      }

      // 2. Fetch graduate matchmaking scores (Matches JobBoard.tsx on web)
      final Map<int, double> scoresMap = {};
      try {
        final prefs = await SharedPreferences.getInstance();
        final token = prefs.getString('jwt_token');
        int? gradId;

        // Leer primero del user_data guardado en login
        final userDataStr = prefs.getString('user_data');
        if (userDataStr != null && userDataStr.isNotEmpty) {
          try {
            final u = jsonDecode(userDataStr);
            if (u is Map && u['id'] != null) {
              gradId = u['id'] is int ? u['id'] as int : int.tryParse(u['id'].toString());
            }
          } catch (_) {}
        }

        // Si no está en user_data, decodificar del JWT
        if (gradId == null && token != null && token.isNotEmpty) {
          try {
            final decoded = JwtDecoder.decode(token);
            final rawId = decoded['id'];
            gradId = rawId is int ? rawId : int.tryParse(rawId?.toString() ?? '');
          } catch (_) {}
        }

        if (gradId != null) {
          final matchRes = await ApiClient.instance.get('/matching/graduate/$gradId?limit=200');
          if (matchRes.data is List) {
            for (final m in matchRes.data) {
              if (m is Map && m['job_offer_id'] != null) {
                final jId = int.tryParse(m['job_offer_id']?.toString() ?? '') ?? 0;
                final sc = double.tryParse(m['score']?.toString() ?? '') ?? 0.0;
                if (jId > 0) {
                  scoresMap[jId] = sc;
                }
              }
            }
          }
        }
      } catch (e) {
        debugPrint('[JobsScreen] Error al obtener afinidades de matchmaking: $e');
      }

      // Sort jobs descending by affinity score (just like web JobBoard.tsx)
      jobsList.sort((a, b) {
        final idA = int.tryParse(a['id']?.toString() ?? '') ?? 0;
        final idB = int.tryParse(b['id']?.toString() ?? '') ?? 0;
        final scoreA = scoresMap[idA] ?? (double.tryParse(a['match_score']?.toString() ?? '') ?? 0.0);
        final scoreB = scoresMap[idB] ?? (double.tryParse(b['match_score']?.toString() ?? '') ?? 0.0);
        return scoreB.compareTo(scoreA);
      });

      if (mounted) {
        setState(() {
          _jobs = jobsList;
          _matchScores = scoresMap;
          _isLoading = false;
        });
      }
    } catch (e) {
      debugPrint('[JobsScreen] Error general en _fetchJobsAndMatches: $e');
      if (mounted) setState(() => _isLoading = false);
    }
  }

  List<String> get _availableSectors {
    final set = <String>{'ALL'};
    for (final j in _jobs) {
      final comp = j['company'];
      if (comp is Map && comp['sector'] is Map) {
        final name = comp['sector']['name']?.toString();
        if (name != null && name.isNotEmpty) set.add(name);
      }
    }
    return set.toList();
  }

  List<String> get _availableCities {
    final set = <String>{'ALL'};
    for (final j in _jobs) {
      final comp = j['company'];
      if (comp is Map && comp['city'] is Map) {
        final name = comp['city']['name']?.toString();
        if (name != null && name.isNotEmpty) set.add(name);
      }
    }
    return set.toList();
  }

  String _effectiveModality(Map<String, dynamic> job) {
    return JobCard.effectiveModality(job);
  }

  String _effectiveContract(Map<String, dynamic> job) {
    return JobCard.effectiveContract(job);
  }

  bool get _hasActiveFilters =>
      _searchQuery.isNotEmpty ||
      _modalityFilter != 'ALL' ||
      _contractFilter != 'ALL' ||
      _minSalaryFilter != 'ALL' ||
      _matchFilter != 'ALL' ||
      _sectorFilter != 'ALL' ||
      _cityFilter != 'ALL';

  void _clearAllFilters() {
    setState(() {
      _searchQuery = '';
      _modalityFilter = 'ALL';
      _contractFilter = 'ALL';
      _minSalaryFilter = 'ALL';
      _matchFilter = 'ALL';
      _sectorFilter = 'ALL';
      _cityFilter = 'ALL';
    });
  }

  List<Map<String, dynamic>> get _filteredJobs {
    final base = _mode == 'guardadas'
        ? _jobs.where((j) => _savedIds.contains(int.tryParse(j['id']?.toString() ?? '') ?? -1))
        : _jobs;
    return base.where((job) {
      final title = job['title']?.toString().toLowerCase() ?? '';
      final comp = job['company'] is Map ? job['company'] as Map : {};
      final companyName = comp['name']?.toString().toLowerCase() ?? '';
      final sectorName = comp['sector'] is Map ? (comp['sector']['name']?.toString() ?? '') : '';
      final cityName = comp['city'] is Map ? (comp['city']['name']?.toString() ?? '') : '';

      final q = _searchQuery.toLowerCase();
      if (q.isNotEmpty && !title.contains(q) && !companyName.contains(q)) {
        return false;
      }

      if (_modalityFilter != 'ALL') {
        final mod = _effectiveModality(job).toLowerCase();
        if (!mod.contains(_modalityFilter.toLowerCase())) return false;
      }

      if (_contractFilter != 'ALL') {
        final ct = _effectiveContract(job).toLowerCase();
        if (!ct.contains(_contractFilter.toLowerCase())) return false;
      }

      if (_sectorFilter != 'ALL' && sectorName != _sectorFilter) {
        return false;
      }

      if (_cityFilter != 'ALL' && cityName != _cityFilter) {
        return false;
      }

      if (_minSalaryFilter != 'ALL') {
        final minTarget = double.tryParse(_minSalaryFilter) ?? 0.0;
        final jobMin = double.tryParse(job['salary_min']?.toString() ?? '') ?? 0.0;
        if (jobMin < minTarget) return false;
      }

      if (_matchFilter != 'ALL') {
        final minScore = double.tryParse(_matchFilter) ?? 0.0;
        final id = int.tryParse(job['id']?.toString() ?? '') ?? 0;
        final score = _matchScores[id] ?? (double.tryParse(job['match_score']?.toString() ?? '') ?? 0.0);
        if (score < minScore) return false;
      }

      return true;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _filteredJobs;

    return Stack(
      children: [
        RefreshIndicator(
      color: AppTheme.primaryColor,
      onRefresh: _refreshAll,
      child: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Bolsa de Empleo Institucional',
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w800,
                      color: context.primaryText,
                      letterSpacing: -0.5,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    _mode == 'empresas'
                        ? 'Conoce las empresas aliadas, su tiempo de respuesta y cuántos egresados UPC han contratado.'
                        : 'Explora las ofertas de empresas aliadas ordenadas según tu porcentaje de afinidad.',
                    style: TextStyle(fontSize: 13, color: context.secondaryText),
                  ),
                  const SizedBox(height: 14),
                  _buildModeSelector(),
                  const SizedBox(height: 12),

                  // Search + Toggle Advanced Filters (Matches JobBoard.tsx filter card)
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          onChanged: (v) => setState(() => _searchQuery = v),
                          decoration: AppTheme.inputDecoration(
                            context,
                            label: 'Buscar por cargo o empresa',
                            hint: 'Ej. Desarrollador, Ingeniero...',
                            icon: Icons.search_rounded,
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      InkWell(
                        borderRadius: BorderRadius.circular(12),
                        onTap: () => setState(() => _showAdvancedFilters = !_showAdvancedFilters),
                        child: Container(
                          height: 50,
                          padding: const EdgeInsets.symmetric(horizontal: 14),
                          decoration: BoxDecoration(
                            color: _showAdvancedFilters ? AppTheme.primaryColor : context.surfaceColor,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: _showAdvancedFilters ? AppTheme.primaryColor : context.borderColor,
                            ),
                          ),
                          child: Row(
                            children: [
                              Icon(
                                Icons.tune_rounded,
                                size: 20,
                                color: _showAdvancedFilters ? Colors.white : context.primaryText,
                              ),
                              const SizedBox(width: 6),
                              Text(
                                'Filtros',
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700,
                                  color: _showAdvancedFilters ? Colors.white : context.primaryText,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                  if (_mode != 'empresas') ...[
                  const SizedBox(height: 12),

                  // 1. Selector rápido de Modalidad
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        _buildQuickChip('Todas las modalidades', _modalityFilter == 'ALL', () {
                          setState(() => _modalityFilter = 'ALL');
                        }),
                        _buildQuickChip('Presencial', _modalityFilter == 'Presencial', () {
                          setState(() => _modalityFilter = _modalityFilter == 'Presencial' ? 'ALL' : 'Presencial');
                        }),
                        _buildQuickChip('Remoto', _modalityFilter == 'Remoto', () {
                          setState(() => _modalityFilter = _modalityFilter == 'Remoto' ? 'ALL' : 'Remoto');
                        }),
                        _buildQuickChip('Híbrido', _modalityFilter == 'Híbrido', () {
                          setState(() => _modalityFilter = _modalityFilter == 'Híbrido' ? 'ALL' : 'Híbrido');
                        }),
                      ],
                    ),
                  ),
                  const SizedBox(height: 8),

                  // 2. Selector rápido de Afinidad
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        _buildQuickChip('Cualquier afinidad', _matchFilter == 'ALL', () {
                          setState(() => _matchFilter = 'ALL');
                        }),
                        _buildQuickChip('⭐ Afinidad > 75%', _matchFilter == '75', () {
                          setState(() => _matchFilter = _matchFilter == '75' ? 'ALL' : '75');
                        }),
                        _buildQuickChip('✨ Afinidad > 50%', _matchFilter == '50', () {
                          setState(() => _matchFilter = _matchFilter == '50' ? 'ALL' : '50');
                        }),
                        if (_hasActiveFilters)
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
                              onPressed: _clearAllFilters,
                            ),
                          ),
                      ],
                    ),
                  ),

                  // Expandable Web Filter Panel (Sector, Ciudad, Salario, Contrato, Afinidad)
                  if (_showAdvancedFilters) ...[
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: context.surfaceColor,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: context.borderColor),
                      ),
                      child: Column(
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: _buildDropdownFilter(
                                  label: 'Sector',
                                  value: _sectorFilter,
                                  items: _availableSectors
                                      .map((s) => DropdownMenuItem(value: s, child: Text(s == 'ALL' ? 'Todos los sectores' : s)))
                                      .toList(),
                                  onChanged: (v) => setState(() => _sectorFilter = v ?? 'ALL'),
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: _buildDropdownFilter(
                                  label: 'Ciudad',
                                  value: _cityFilter,
                                  items: _availableCities
                                      .map((c) => DropdownMenuItem(value: c, child: Text(c == 'ALL' ? 'Todas las ciudades' : c)))
                                      .toList(),
                                  onChanged: (v) => setState(() => _cityFilter = v ?? 'ALL'),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 10),
                          Row(
                            children: [
                              Expanded(
                                child: _buildDropdownFilter(
                                  label: 'Salario Mínimo',
                                  value: _minSalaryFilter,
                                  items: const [
                                    DropdownMenuItem(value: 'ALL', child: Text('Cualquier salario')),
                                    DropdownMenuItem(value: '1500000', child: Text('Desde \$1.5M')),
                                    DropdownMenuItem(value: '2500000', child: Text('Desde \$2.5M')),
                                    DropdownMenuItem(value: '4000000', child: Text('Desde \$4.0M')),
                                  ],
                                  onChanged: (v) => setState(() => _minSalaryFilter = v ?? 'ALL'),
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: _buildDropdownFilter(
                                  label: 'Tipo de Contrato',
                                  value: _contractFilter,
                                  items: const [
                                    DropdownMenuItem(value: 'ALL', child: Text('Todos los contratos')),
                                    DropdownMenuItem(value: 'Indefinido', child: Text('Término Indefinido')),
                                    DropdownMenuItem(value: 'Fijo', child: Text('Término Fijo')),
                                    DropdownMenuItem(value: 'Prestación', child: Text('Prestación de Servicios')),
                                  ],
                                  onChanged: (v) => setState(() => _contractFilter = v ?? 'ALL'),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                  ],
                ],
              ),
            ),
          ),

          if (_mode == 'empresas')
            ..._buildCompaniesSlivers()
          else if (_isLoading)
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
                      Icon(
                        _mode == 'guardadas' ? Icons.bookmark_border_rounded : Icons.filter_list_off_rounded,
                        size: 52,
                        color: context.tertiaryText,
                      ),
                      const SizedBox(height: 10),
                      Text(
                        _mode == 'guardadas'
                            ? 'Aún no tienes vacantes guardadas'
                            : 'No se encontraron vacantes con esos filtros',
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: context.primaryText),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        _mode == 'guardadas'
                            ? 'Toca el ícono de marcador en cualquier vacante para guardarla y revisarla después.'
                            : 'Intenta cambiar la modalidad, el rango de afinidad o limpiar los filtros.',
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 12.5, color: context.secondaryText),
                      ),
                      const SizedBox(height: 14),
                      if (_mode != 'guardadas')
                        OutlinedButton.icon(
                          onPressed: _clearAllFilters,
                          icon: const Icon(Icons.refresh_rounded, size: 16),
                          label: const Text('Limpiar todos los filtros'),
                        ),
                    ],
                  ),
                ),
              ),
            )
          else
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 150),
              sliver: SliverList(
                delegate: SliverChildBuilderDelegate(
                  (context, index) {
                    final job = filtered[index];
                    final id = int.tryParse(job['id']?.toString() ?? '') ?? 0;
                    final score = _scoreFor(job);

                    return Padding(
                      padding: const EdgeInsets.only(bottom: 14),
                      child: JobCard(
                        key: ValueKey('job-$id'),
                        job: job,
                        matchScore: score,
                        isSaved: _savedIds.contains(id),
                        onSavedChanged: (jobId, saved) {
                          setState(() {
                            if (saved) {
                              _savedIds.add(jobId);
                            } else {
                              _savedIds.remove(jobId);
                            }
                          });
                        },
                        isCompared: _compareIds.contains(id),
                        onToggleCompare: () => _toggleCompare(id),
                      ),
                    );
                  },
                  childCount: filtered.length,
                ),
              ),
            ),
        ],
      ),
        ),
        if (_compareIds.isNotEmpty && _mode != 'empresas')
          Positioned(
            left: 16,
            right: 16,
            bottom: 96,
            child: Material(
              elevation: 8,
              borderRadius: BorderRadius.circular(16),
              color: AppTheme.primaryColor,
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                child: Row(
                  children: [
                    const Icon(Icons.compare_arrows_rounded, color: Colors.white),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        '${_compareIds.length}/3 vacantes para comparar',
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 13),
                      ),
                    ),
                    TextButton(
                      onPressed: () => setState(() => _compareIds.clear()),
                      child: const Text('Limpiar', style: TextStyle(color: Colors.white70)),
                    ),
                    ElevatedButton(
                      onPressed: _compareIds.length >= 2 ? _openCompareSheet : null,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.white,
                        foregroundColor: AppTheme.primaryColor,
                        padding: const EdgeInsets.symmetric(horizontal: 14),
                      ),
                      child: const Text('Comparar', style: TextStyle(fontWeight: FontWeight.w900)),
                    ),
                  ],
                ),
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildModeSelector() {
    Widget item(String key, String label, IconData icon, {int? count}) {
      final selected = _mode == key;
      return Expanded(
        child: InkWell(
          borderRadius: BorderRadius.circular(10),
          onTap: () => setState(() => _mode = key),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 180),
            padding: const EdgeInsets.symmetric(vertical: 10),
            decoration: BoxDecoration(
              color: selected ? AppTheme.primaryColor : Colors.transparent,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(icon, size: 16, color: selected ? Colors.white : context.secondaryText),
                const SizedBox(width: 5),
                Flexible(
                  child: Text(
                    count != null && count > 0 ? '$label ($count)' : label,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w800,
                      color: selected ? Colors.white : context.secondaryText,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: context.mutedColor,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: context.borderColor),
      ),
      child: Row(
        children: [
          item('vacantes', 'Vacantes', Icons.work_outline_rounded),
          item('guardadas', 'Guardadas', Icons.bookmark_border_rounded, count: _savedIds.length),
          item('empresas', 'Empresas', Icons.apartment_rounded),
        ],
      ),
    );
  }

  List<Widget> _buildCompaniesSlivers() {
    if (_loadingCompanies && _companies.isEmpty) {
      return const [
        SliverFillRemaining(
          child: Center(child: CircularProgressIndicator(color: AppTheme.primaryColor)),
        ),
      ];
    }
    final q = _searchQuery.toLowerCase();
    final list = _companies.where((c) {
      if (q.isEmpty) return true;
      final name = c['name']?.toString().toLowerCase() ?? '';
      final sector = c['sector'] is Map ? (c['sector']['name']?.toString().toLowerCase() ?? '') : '';
      return name.contains(q) || sector.contains(q);
    }).toList();

    if (list.isEmpty) {
      return [
        SliverFillRemaining(
          child: Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.apartment_rounded, size: 52, color: context.tertiaryText),
                const SizedBox(height: 10),
                Text('No hay empresas aliadas para mostrar',
                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: context.primaryText)),
              ],
            ),
          ),
        ),
      ];
    }

    return [
      SliverPadding(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 104),
        sliver: SliverList(
          delegate: SliverChildBuilderDelegate(
            (context, index) => Padding(
              padding: const EdgeInsets.only(bottom: 14),
              child: _buildCompanyCard(list[index]),
            ),
            childCount: list.length,
          ),
        ),
      ),
    ];
  }

  Widget _buildCompanyCard(Map<String, dynamic> c) {
    final name = c['name']?.toString() ?? 'Empresa';
    final sector = c['sector'] is Map ? (c['sector']['name']?.toString() ?? 'General') : 'General';
    final city = c['city'] is Map ? (c['city']['name']?.toString() ?? '') : '';
    final description = c['description']?.toString() ?? '';
    final activeJobs = int.tryParse(c['active_jobs_count']?.toString() ?? '') ?? 0;
    final alumni = int.tryParse(c['alumni_hired_count']?.toString() ?? '') ?? 0;
    final responseRate = (double.tryParse(c['response_rate']?.toString() ?? '') ?? 0).round();
    final avgDays = double.tryParse(c['avg_response_days']?.toString() ?? '') ?? 0;
    final jobs = (c['active_jobs'] is List) ? (c['active_jobs'] as List).whereType<Map>().toList() : <Map>[];

    return Container(
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
          Row(
            children: [
              Container(
                width: 46,
                height: 46,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(colors: [Color(0xFF22A86E), Color(0xFF0E4832)]),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  name.isNotEmpty ? name[0].toUpperCase() : 'E',
                  style: const TextStyle(color: Colors.white, fontSize: 19, fontWeight: FontWeight.w900),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(name,
                        style: TextStyle(fontSize: 15.5, fontWeight: FontWeight.w900, color: context.primaryText)),
                    const SizedBox(height: 2),
                    Text(
                      city.isNotEmpty ? '$sector · $city' : sector,
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: context.secondaryText),
                    ),
                  ],
                ),
              ),
            ],
          ),
          if (alumni > 0) ...[
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: AppTheme.brand50,
                borderRadius: BorderRadius.circular(999),
                border: Border.all(color: AppTheme.brand200),
              ),
              child: Text(
                '🎓 $alumni egresado${alumni == 1 ? '' : 's'} UPC contratado${alumni == 1 ? '' : 's'} aquí',
                style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800, color: AppTheme.brand800),
              ),
            ),
          ],
          if (description.isNotEmpty) ...[
            const SizedBox(height: 10),
            Text(
              description,
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(fontSize: 12.5, color: context.secondaryText, height: 1.4),
            ),
          ],
          const SizedBox(height: 12),
          Row(
            children: [
              _companyStat(Icons.work_outline_rounded, '$activeJobs', 'Vacantes'),
              const SizedBox(width: 8),
              _companyStat(Icons.reply_rounded, '$responseRate%', 'Respuesta'),
              const SizedBox(width: 8),
              _companyStat(Icons.schedule_rounded, avgDays > 0 ? '${avgDays.toStringAsFixed(1)} d' : '—', 'Tiempo resp.'),
            ],
          ),
          if (jobs.isNotEmpty) ...[
            const SizedBox(height: 12),
            Text('Vacantes activas',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: context.primaryText)),
            const SizedBox(height: 6),
            ...jobs.take(3).map((j) {
              final jobId = int.tryParse(j['id']?.toString() ?? '') ?? 0;
              final full = _jobs.firstWhere(
                (x) => (int.tryParse(x['id']?.toString() ?? '') ?? -1) == jobId,
                orElse: () => <String, dynamic>{},
              );
              return InkWell(
                borderRadius: BorderRadius.circular(10),
                onTap: full.isEmpty
                    ? null
                    : () {
                        showModalBottomSheet(
                          context: context,
                          isScrollControlled: true,
                          backgroundColor: context.surfaceColor,
                          shape: const RoundedRectangleBorder(
                              borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
                          builder: (ctx) => JobDetailSheet(
                            job: full,
                            initialScore: _scoreFor(full).round(),
                            hasApplied: full['has_applied'] == true,
                            isSaved: _savedIds.contains(jobId),
                            onToggleSave: () async {
                              final ids = await SavedJobsCache.toggle(jobId);
                              if (mounted) setState(() => _savedIds = Set<int>.from(ids));
                            },
                            onApply: (cover) async {
                              try {
                                await ApiClient.instance.post('/modulo1/applications', data: {
                                  'job_offer_id': jobId,
                                  if (cover.trim().isNotEmpty) 'cover_letter': cover.trim(),
                                });
                                full['has_applied'] = true;
                                if (ctx.mounted) Navigator.pop(ctx);
                                if (mounted) {
                                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                                    content: Text('¡Postulación enviada con éxito!'),
                                    backgroundColor: AppTheme.primaryColor,
                                  ));
                                }
                              } on DioException catch (e) {
                                final msg = (e.response?.data is Map)
                                    ? (e.response?.data['detail']?.toString() ?? 'No se pudo postular')
                                    : 'No se pudo postular';
                                if (mounted) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(content: Text(msg), backgroundColor: AppTheme.statusRechazado),
                                  );
                                }
                              }
                            },
                          ),
                        );
                      },
                child: Container(
                  margin: const EdgeInsets.only(bottom: 6),
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  decoration: BoxDecoration(
                    color: context.mutedColor,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: context.borderColor),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(j['title']?.toString() ?? 'Vacante',
                                style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: context.primaryText)),
                            Text(
                              '${j['modality'] ?? 'Presencial'} • ${j['contract_type'] ?? 'Indefinido'}',
                              style: TextStyle(fontSize: 11, color: context.secondaryText),
                            ),
                          ],
                        ),
                      ),
                      Icon(Icons.chevron_right_rounded, color: context.tertiaryText),
                    ],
                  ),
                ),
              );
            }),
          ],
        ],
      ),
    );
  }

  Widget _companyStat(IconData icon, String value, String label) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8),
        decoration: BoxDecoration(
          color: context.mutedColor,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: context.borderColor),
        ),
        child: Column(
          children: [
            Icon(icon, size: 15, color: AppTheme.primaryColor),
            const SizedBox(height: 2),
            Text(value, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w900, color: context.primaryText)),
            Text(label, style: TextStyle(fontSize: 10, color: context.secondaryText)),
          ],
        ),
      ),
    );
  }

  Widget _buildQuickChip(String label, bool selected, VoidCallback onTap) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: ChoiceChip(
        label: Text(label),
        selected: selected,
        onSelected: (_) => onTap(),
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

  Widget _buildDropdownFilter({
    required String label,
    required String value,
    required List<DropdownMenuItem<String>> items,
    required ValueChanged<String?> onChanged,
  }) {
    return DropdownButtonFormField<String>(
      initialValue: value,
      isExpanded: true,
      items: items,
      onChanged: onChanged,
      style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: context.primaryText),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: context.secondaryText),
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        filled: true,
        fillColor: context.mutedColor,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: BorderSide(color: context.borderColor),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: BorderSide(color: context.borderColor),
        ),
      ),
    );
  }
}
