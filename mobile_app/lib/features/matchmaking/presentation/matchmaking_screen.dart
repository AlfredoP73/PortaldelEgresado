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
  bool _isLoading = true;
  String? _error;
  List<dynamic> _recommendedJobs = [];

  @override
  void initState() {
    super.initState();
    _fetchRecommendations();
  }

  Future<void> _fetchRecommendations() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('jwt_token');
      if (token == null || token.isEmpty) {
        throw Exception('Token no encontrado');
      }
      
      Map<String, dynamic> decodedToken = JwtDecoder.decode(token);
      final graduateId = decodedToken['id'];

      if (graduateId == null) {
        throw Exception('ID de egresado no encontrado en el token');
      }

      // 1. Fetch matches
      final String baseUrl = ApiClient.instance.options.baseUrl.replaceAll(RegExp(r'/api$'), '');
      final matchesResponse = await ApiClient.instance.get('$baseUrl/matching/graduate/$graduateId');
      final matches = matchesResponse.data as List<dynamic>;

      // 2. Fetch all jobs
      final jobsResponse = await ApiClient.instance.get('/modulo1/jobs');
      final allJobs = jobsResponse.data as List<dynamic>;

      // 3. Merge matches with jobs
      final jobsMap = { for (var job in allJobs) job['id'] : job };
      
      final List<dynamic> merged = [];
      for (var match in matches) {
        final jobId = match['job_offer_id'];
        if (jobsMap.containsKey(jobId)) {
          final job = Map<String, dynamic>.from(jobsMap[jobId]);
          job['match_score'] = double.tryParse(match['score'].toString()) ?? 0.0;
          merged.add(job);
        }
      }

      if (mounted) {
        setState(() {
          _recommendedJobs = merged;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = 'Error al cargar las recomendaciones';
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: context.bgColor,
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.auto_awesome, color: AppTheme.primaryColor, size: 28),
                      const SizedBox(width: 8),
                      Text('Sugeridas', style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800, color: context.primaryText, letterSpacing: -0.5)),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text('Vacantes recomendadas según tu perfil y habilidades', style: TextStyle(fontSize: 14, color: context.secondaryText)),
                ],
              ),
            ),
            Expanded(
              child: _isLoading 
                ? const Center(child: CircularProgressIndicator(color: AppTheme.primaryColor))
                : _error != null
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(_error!, style: const TextStyle(color: AppTheme.statusRechazado)),
                          const SizedBox(height: 12),
                          ElevatedButton(
                            onPressed: () {
                              setState(() {
                                _isLoading = true;
                                _error = null;
                              });
                              _fetchRecommendations();
                            },
                            child: const Text('Reintentar'),
                          )
                        ],
                      )
                    )
                  : _recommendedJobs.isEmpty 
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.all(20.0),
                          child: Text(
                            'No hay recomendaciones por ahora.\nAsegúrate de completar tus habilidades en el perfil.', 
                            textAlign: TextAlign.center,
                            style: TextStyle(color: context.secondaryText),
                          ),
                        )
                      )
                    : RefreshIndicator(
                        color: AppTheme.primaryColor,
                        onRefresh: _fetchRecommendations,
                        child: ListView.separated(
                          padding: const EdgeInsets.only(left: 20, right: 20, top: 12, bottom: 100),
                          itemCount: _recommendedJobs.length,
                          separatorBuilder: (context, index) => const SizedBox(height: 12),
                          itemBuilder: (context, index) {
                            final job = _recommendedJobs[index];
                            return JobCard(
                              job: job, 
                              matchScore: job['match_score'],
                            );
                          },
                        ),
                      ),
            ),
          ],
        ),
      ),
    );
  }
}
