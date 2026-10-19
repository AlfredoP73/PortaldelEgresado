import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/network/api_client.dart';

class EventsScreen extends StatefulWidget {
  const EventsScreen({super.key});

  @override
  State<EventsScreen> createState() => _EventsScreenState();
}

class _EventsScreenState extends State<EventsScreen> {
  bool _isLoading = true;
  String _filter = 'ALL'; // ALL, REGISTERED
  List<Map<String, dynamic>> _events = [];

  @override
  void initState() {
    super.initState();
    _fetchEvents();
  }

  Future<void> _fetchEvents() async {
    setState(() => _isLoading = true);
    try {
      final res = await ApiClient.instance.get('/modulo2/events');
      if (res.data is List) {
        setState(() {
          _events = List<Map<String, dynamic>>.from(res.data);
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error al cargar eventos: $e'),
            backgroundColor: AppTheme.statusRechazado,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _toggleRegistration(Map<String, dynamic> event) async {
    final eventId = event['id'];
    final isRegistered = event['is_registered'] == true;

    try {
      if (isRegistered) {
        await ApiClient.instance.delete('/modulo2/events/$eventId/register');
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Inscripción cancelada'),
              backgroundColor: AppTheme.primaryColor,
            ),
          );
        }
      } else {
        await ApiClient.instance.post('/modulo2/events/$eventId/register');
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('¡Te has inscrito al evento exitosamente!'),
              backgroundColor: AppTheme.brand500,
            ),
          );
        }
      }
      _fetchEvents();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('No se pudo procesar la inscripción: $e'),
            backgroundColor: AppTheme.statusRechazado,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _filter == 'REGISTERED'
        ? _events.where((e) => e['is_registered'] == true).toList()
        : _events;

    return Scaffold(
      backgroundColor: context.bgColor,
      appBar: AppBar(
        title: const Text('Eventos y Ferias'),
        backgroundColor: context.surfaceColor,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: _fetchEvents,
          ),
        ],
      ),
      body: Column(
        children: [
          // Filter tabs
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            color: context.surfaceColor,
            child: Row(
              children: [
                _buildFilterChip('Todos los Eventos', 'ALL'),
                const SizedBox(width: 8),
                _buildFilterChip('Mis Inscripciones', 'REGISTERED'),
              ],
            ),
          ),
          const Divider(height: 1),

          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: AppTheme.primaryColor))
                : filtered.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.event_busy_rounded, size: 56, color: context.tertiaryText),
                            const SizedBox(height: 12),
                            Text(
                              _filter == 'REGISTERED'
                                  ? 'No estás inscrito en ningún evento'
                                  : 'No hay eventos disponibles en este momento',
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                                color: context.secondaryText,
                              ),
                            ),
                          ],
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: _fetchEvents,
                        color: AppTheme.primaryColor,
                        child: ListView.separated(
                          padding: const EdgeInsets.all(16),
                          itemCount: filtered.length,
                          separatorBuilder: (_, _) => const SizedBox(height: 14),
                          itemBuilder: (ctx, i) => _buildEventCard(filtered[i]),
                        ),
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String label, String value) {
    final selected = _filter == value;
    return ChoiceChip(
      label: Text(label),
      selected: selected,
      onSelected: (_) => setState(() => _filter = value),
      selectedColor: AppTheme.brand500.withValues(alpha: 0.15),
      labelStyle: TextStyle(
        fontSize: 12.5,
        fontWeight: selected ? FontWeight.w800 : FontWeight.w600,
        color: selected ? AppTheme.primaryColor : context.secondaryText,
      ),
      side: BorderSide(
        color: selected ? AppTheme.brand500 : context.borderColor,
      ),
    );
  }

  Widget _buildEventCard(Map<String, dynamic> event) {
    final isRegistered = event['is_registered'] == true;
    final dateStr = event['event_date']?.toString() ?? '';
    DateTime? eventDate;
    try {
      eventDate = DateTime.parse(dateStr);
    } catch (_) {}

    final formattedDate = eventDate != null
        ? DateFormat('EEE, d MMM yyyy · hh:mm a', 'es').format(eventDate)
        : dateStr;

    final maxAttendees = event['max_attendees'];
    final currentAttendees = event['registered_count'] ?? 0;
    final isFull = maxAttendees != null && currentAttendees >= maxAttendees;

    return Container(
      decoration: BoxDecoration(
        color: context.surfaceColor,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: isRegistered ? AppTheme.brand500 : context.borderColor,
          width: isRegistered ? 1.5 : 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AppTheme.brand500.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.event_available_rounded, color: AppTheme.brand500, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      event['title'] ?? 'Evento Institucional',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                        color: context.primaryText,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      event['event_type'] ?? 'CONFERENCIA',
                      style: const TextStyle(
                        fontSize: 10.5,
                        fontWeight: FontWeight.w800,
                        color: AppTheme.primaryColor,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ],
                ),
              ),
              if (isRegistered)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppTheme.brand500,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Text(
                    'Inscrito',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                      color: Colors.white,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 12),
          if (event['description'] != null && event['description'].toString().isNotEmpty)
            Text(
              event['description'],
              style: TextStyle(fontSize: 12.5, color: context.secondaryText, height: 1.4),
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
            ),
          const SizedBox(height: 12),
          Row(
            children: [
              Icon(Icons.schedule_rounded, size: 14, color: context.tertiaryText),
              const SizedBox(width: 5),
              Text(
                formattedDate,
                style: TextStyle(fontSize: 11.5, color: context.secondaryText, fontWeight: FontWeight.w600),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              Icon(Icons.location_on_outlined, size: 14, color: context.tertiaryText),
              const SizedBox(width: 5),
              Expanded(
                child: Text(
                  event['location'] ?? 'Virtual / Presencial UPC',
                  style: TextStyle(fontSize: 11.5, color: context.secondaryText, fontWeight: FontWeight.w600),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              if (maxAttendees != null) ...[
                const SizedBox(width: 8),
                Text(
                  '$currentAttendees / $maxAttendees cupos',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: isFull ? AppTheme.statusRechazado : context.secondaryText,
                  ),
                ),
              ],
            ],
          ),
          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: (!isRegistered && isFull) ? null : () => _toggleRegistration(event),
              style: ElevatedButton.styleFrom(
                backgroundColor: isRegistered ? AppTheme.statusRechazado.withValues(alpha: 0.1) : AppTheme.primaryColor,
                foregroundColor: isRegistered ? AppTheme.statusRechazado : Colors.white,
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                  side: isRegistered
                      ? const BorderSide(color: AppTheme.statusRechazado)
                      : BorderSide.none,
                ),
                padding: const EdgeInsets.symmetric(vertical: 11),
              ),
              child: Text(
                isRegistered
                    ? 'Cancelar Inscripción'
                    : (isFull ? 'Cupos Agotados' : 'Inscribirme al Evento'),
                style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
