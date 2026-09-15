
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:jwt_decoder/jwt_decoder.dart';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'dart:ui';

import '../../../core/theme/app_theme.dart';
import '../../../core/network/api_client.dart';
import '../../jobs/presentation/widgets/job_card.dart';

class MatchmakingScreen extends StatefulWidget {
  const MatchmakingScreen({super.key});

  @override
  State<MatchmakingScreen> createState() => _MatchmakingScreenState();
}

class _MatchmakingScreenState extends State<MatchmakingScreen> with TickerProviderStateMixin {
  bool _isLoading = true;
  String? _error;
  List<dynamic> _recommendedJobs = [];
  
  WebSocketChannel? _channel;
  String? _currentGraduateId;

  late AnimationController _animController;
  late Animation<double> _fadeAnim;
  late Animation<Offset> _slideAnim;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(vsync: this, duration: const Duration(milliseconds: 1000));
    _fadeAnim = CurvedAnimation(parent: _animController, curve: Curves.easeOut);
    _slideAnim = Tween<Offset>(begin: const Offset(0, 0.1), end: Offset.zero).animate(CurvedAnimation(parent: _animController, curve: Curves.easeOutCubic));
    
    _fetchRecommendations();
  }

  @override
  void dispose() {
    _channel?.sink.close();
    _animController.dispose();
    super.dispose();
  }

  void _initWebSocket(String graduateId) {
    try {
      final String baseUrl = ApiClient.instance.options.baseUrl.replaceAll(RegExp(r'/api$'), '');
      final uri = Uri.parse(baseUrl);
      final wsScheme = uri.scheme == 'https' ? 'wss' : 'ws';
      final wsUrl = '$wsScheme://${uri.host}:${uri.port}/matching/ws/$graduateId';

      _channel = WebSocketChannel.connect(Uri.parse(wsUrl));
      _channel!.stream.listen((message) {
        if (mounted) {
          // If a new match arrives, silently refetch or just add to the top
          _fetchRecommendations(silent: true);
        }
      });
    } catch (e) {
      // Ignorar error de websocket
    }
  }

  Future<void> _fetchRecommendations({bool silent = false}) async {
    try {
      if (!silent) {
        setState(() { _isLoading = true; _error = null; });
      }

      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('jwt_token');
      if (token == null || token.isEmpty) {
        throw Exception('Token no encontrado');
      }
      
      Map<String, dynamic> decodedToken = JwtDecoder.decode(token);
      final graduateId = decodedToken['id']?.toString();

      if (graduateId == null) {
        throw Exception('ID de egresado no encontrado en el token');
      }

      if (_currentGraduateId == null) {
        _currentGraduateId = graduateId;
        _initWebSocket(graduateId);
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
        if (!silent) _animController.forward(from: 0);
      }
    } catch (e) {
      if (mounted) {
        if (!silent) {
          setState(() {
            _error = 'Error al cargar las recomendaciones';
            _isLoading = false;
          });
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      body: Stack(
        children: [
          // Background ambient glows
          Positioned(
            top: -100, right: -50,
            child: Container(
              width: 300, height: 300,
              decoration: BoxDecoration(shape: BoxShape.circle, color: AppTheme.primaryColor.withValues(alpha: 0.15)),
              child: BackdropFilter(filter: ImageFilter.blur(sigmaX: 100, sigmaY: 100), child: Container(color: Colors.transparent)),
            ),
          ),
          Positioned(
            bottom: -50, left: -50,
            child: Container(
              width: 250, height: 250,
              decoration: BoxDecoration(shape: BoxShape.circle, color: AppTheme.accentAmber.withValues(alpha: 0.1)),
              child: BackdropFilter(filter: ImageFilter.blur(sigmaX: 80, sigmaY: 80), child: Container(color: Colors.transparent)),
            ),
          ),

          SafeArea(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(24, 24, 24, 10),
                  child: SlideTransition(
                    position: _slideAnim,
                    child: FadeTransition(
                      opacity: _fadeAnim,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  color: AppTheme.primaryColor.withValues(alpha: 0.15),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: const Icon(Icons.auto_awesome, color: AppTheme.primaryColor, size: 24),
                              ),
                              const SizedBox(width: 12),
                              const Text('Sugeridas', style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800, color: Colors.white, letterSpacing: -0.5)),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Text('Vacantes recomendadas en vivo según tu perfil', style: TextStyle(fontSize: 14, color: Colors.white.withValues(alpha: 0.6))),
                        ],
                      ),
                    ),
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
                              Text(_error!, style: const TextStyle(color: AppTheme.statusRechazado, fontWeight: FontWeight.bold)),
                              const SizedBox(height: 16),
                              ElevatedButton(
                                onPressed: _fetchRecommendations,
                                style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primaryColor),
                                child: const Text('Reintentar', style: TextStyle(color: Colors.white)),
                              )
                            ],
                          )
                        )
                      : _recommendedJobs.isEmpty 
                        ? Center(
                            child: Padding(
                              padding: const EdgeInsets.all(24.0),
                              child: Text(
                                'No hay recomendaciones por ahora.\nAsegúrate de completar tus habilidades en el perfil.', 
                                textAlign: TextAlign.center,
                                style: TextStyle(color: Colors.white.withValues(alpha: 0.5), fontSize: 15),
                              ),
                            )
                          )
                        : RefreshIndicator(
                            color: AppTheme.primaryColor,
                            backgroundColor: const Color(0xFF1E293B),
                            onRefresh: _fetchRecommendations,
                            child: ListView.separated(
                              physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
                              padding: const EdgeInsets.only(left: 24, right: 24, top: 12, bottom: 120),
                              itemCount: _recommendedJobs.length,
                              separatorBuilder: (context, index) => const SizedBox(height: 16),
                              itemBuilder: (context, index) {
                                final job = _recommendedJobs[index];
                                return SlideTransition(
                                  position: _slideAnim,
                                  child: FadeTransition(
                                    opacity: _fadeAnim,
                                    child: JobCard(
                                      job: job, 
                                      matchScore: job['match_score'],
                                    ),
                                  ),
                                );
                              },
                            ),
                          ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
