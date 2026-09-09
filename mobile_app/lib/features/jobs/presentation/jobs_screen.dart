import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/network/api_client.dart';
import 'widgets/job_card.dart';

class JobsScreen extends StatefulWidget {
  const JobsScreen({super.key});

  @override
  State<JobsScreen> createState() => _JobsScreenState();
}

class _JobsScreenState extends State<JobsScreen> {
  final _searchController = TextEditingController();
  String _selectedFilter = 'Todos';
  List<dynamic> _jobs = [];
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetchJobs();
    _searchController.addListener(() {
      if (mounted) setState(() {});
    });
  }

  Future<void> _fetchJobs() async {
    try {
      final response = await ApiClient.instance.get('/modulo1/jobs');
      if (mounted) {
        setState(() {
          _jobs = response.data;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = 'Error al cargar vacantes';
          _isLoading = false;
        });
      }
    }
  }

  List<dynamic> get _filteredJobs {
    final query = _searchController.text.toLowerCase();
    var filtered = _jobs;

    if (query.isNotEmpty) {
      filtered = filtered.where((j) {
        final title = j['title']?.toString().toLowerCase() ?? '';
        final company = (j['company'] is Map) ? (j['company']['name']?.toString().toLowerCase() ?? '') : '';
        return title.contains(query) || company.contains(query);
      }).toList();
    }

    if (_selectedFilter == 'Todos') return filtered;
    
    if (_selectedFilter == 'Remoto' || _selectedFilter == 'Presencial' || _selectedFilter == 'Híbrido') {
      String filterNormal = _selectedFilter.toLowerCase().replaceAll('í', 'i');
      return filtered.where((j) {
        String mod = j['modality']?.toString().toLowerCase().replaceAll('í', 'i') ?? '';
        return mod == filterNormal;
      }).toList();
    }
    
    if (_selectedFilter == 'Junior') {
      return filtered.where((j) {
        if (j['experience_years_min'] == null) return false;
        int expMin = 0;
        if (j['experience_years_min'] is num) {
          expMin = (j['experience_years_min'] as num).toInt();
        } else {
          expMin = int.tryParse(j['experience_years_min'].toString()) ?? 0;
        }
        return expMin <= 1;
      }).toList();
    }
    
    return filtered;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: context.bgColor,
      body: SafeArea(
        child: Column(
          children: [
            // ── Header ──
            Padding(
              padding: EdgeInsets.fromLTRB(20, 20, 20, 10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Vacantes', style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800, color: context.primaryText, letterSpacing: -0.5)),
                  SizedBox(height: 4),
                  Text('Encuentra tu próximo reto profesional', style: TextStyle(fontSize: 14, color: context.secondaryText)),
                  SizedBox(height: 20),
                  TextField(
                    controller: _searchController,
                    style: TextStyle(color: context.primaryText, fontSize: 14),
                    decoration: AppTheme.inputDecoration(context, 
                      label: '',
                      hint: 'Buscar por cargo o empresa...',
                      icon: Icons.search_rounded,
                      suffixIcon: Container(
                        margin: EdgeInsets.all(8),
                        decoration: BoxDecoration(color: AppTheme.primaryDark, borderRadius: BorderRadius.circular(8)),
                        child: Icon(Icons.tune_rounded, color: Colors.white, size: 20),
                      ),
                    ).copyWith(contentPadding: EdgeInsets.symmetric(vertical: 14)),
                  ),
                ],
              ),
            ),
            
            // ── Filtros ──
            SizedBox(
              height: 44,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: EdgeInsets.symmetric(horizontal: 20),
                children: [
                  _buildFilterChip('Todos'),
                  _buildFilterChip('Remoto'),
                  _buildFilterChip('Presencial'),
                  _buildFilterChip('Híbrido'),
                  _buildFilterChip('Junior'),
                ],
              ),
            ),
            SizedBox(height: 12),
            
            // ── Lista de Vacantes ──
            Expanded(
              child: _isLoading 
                ? Center(child: CircularProgressIndicator(color: AppTheme.primaryColor))
                : _error != null
                  ? Center(child: Text(_error!, style: TextStyle(color: AppTheme.statusRechazado)))
                  : RefreshIndicator(
                      color: AppTheme.primaryColor,
                      onRefresh: _fetchJobs,
                      child: ListView.separated(
                        padding: EdgeInsets.only(left: 20, right: 20, top: 12, bottom: 100),
                        itemCount: _filteredJobs.length,
                        separatorBuilder: (context, index) => SizedBox(height: 12),
                        itemBuilder: (context, index) => JobCard(job: _filteredJobs[index]),
                      ),
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFilterChip(String label) {
    bool isSelected = _selectedFilter == label;
    return Padding(
      padding: const EdgeInsets.only(right: 8.0),
      child: ChoiceChip(
        label: Text(
          label,
          style: TextStyle(
            fontWeight: FontWeight.w800,
            color: isSelected ? Colors.white : context.secondaryText,
          ),
        ),
        selected: isSelected,
        onSelected: (bool selected) {
          if (selected) {
            setState(() => _selectedFilter = label);
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
  }
}


