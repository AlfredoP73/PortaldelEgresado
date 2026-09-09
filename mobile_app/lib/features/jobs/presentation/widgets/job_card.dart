import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/network/api_client.dart';

class JobCard extends StatefulWidget {
  final dynamic job;
  final double? matchScore;
  const JobCard({super.key, required this.job, this.matchScore});

  @override
  State<JobCard> createState() => _JobCardState();
}

class _JobCardState extends State<JobCard> {
  bool _isApplying = false;
  bool _hasApplied = false;

  Future<void> _applyToJob() async {
    setState(() => _isApplying = true);
    try {
      await ApiClient.instance.post('/modulo1/applications', data: {
        'job_offer_id': widget.job['id'],
      });
      if (mounted) {
        setState(() => _hasApplied = true);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('Postulación enviada exitosamente'),
          backgroundColor: AppTheme.primaryColor,
        ));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('Error al postularse. Tal vez ya estés postulado.'),
          backgroundColor: AppTheme.statusRechazado,
        ));
      }
    } finally {
      if (mounted) setState(() => _isApplying = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    String title = widget.job['title']?.toString() ?? 'Sin título';
    
    String company = 'Empresa Confidencial';
    String sector = 'General';
    if (widget.job['company'] != null && widget.job['company'] is Map) {
      company = widget.job['company']['name']?.toString() ?? 'Empresa Confidencial';
      sector = widget.job['company']['sector']?.toString() ?? 'General';
    }

    String modality = widget.job['modality']?.toString() ?? 'Presencial';
    
    int expMin = 0;
    if (widget.job['experience_years_min'] != null) {
      if (widget.job['experience_years_min'] is num) {
        expMin = (widget.job['experience_years_min'] as num).toInt();
      } else {
        expMin = int.tryParse(widget.job['experience_years_min'].toString()) ?? 0;
      }
    }

    bool isClosed = widget.job['status']?.toString().toLowerCase() == 'closed' || widget.job['status']?.toString().toLowerCase() == 'cerrada';
    String closingDateStr = widget.job['closing_date']?.toString() ?? '';
    String displayDate = '';
    if (closingDateStr.isNotEmpty) {
      try {
        DateTime date = DateTime.parse(closingDateStr);
        displayDate = 'Cierra: ${date.day}/${date.month}/${date.year}';
      } catch (_) {
        displayDate = 'Cierra: $closingDateStr';
      }
    } else {
      displayDate = isClosed ? 'CERRADA' : 'ACTIVA';
    }

    return Container(
      decoration: BoxDecoration(
        color: context.surfaceColor,
        borderRadius: AppTheme.cardRadius,
        boxShadow: AppTheme.premiumShadow,
        border: Border.all(color: context.isDark ? Colors.white.withValues(alpha: 0.05) : Colors.black.withValues(alpha: 0.03)),
      ),
      child: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (widget.matchScore != null)
              Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: AppTheme.primaryColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.auto_awesome, size: 14, color: AppTheme.primaryColor),
                    const SizedBox(width: 6),
                    Text(
                      '${(widget.matchScore! * 100).toInt()}% Afinidad',
                      style: TextStyle(
                        color: AppTheme.primaryColor,
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ],
                ),
              ),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: (context.isDark ? AppTheme.primaryColor : AppTheme.primaryDark).withValues(alpha: 0.05),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Center(
                    child: Text(
                      company.isNotEmpty ? company[0].toUpperCase() : 'C',
                      style: TextStyle(color: context.isDark ? AppTheme.primaryColor : AppTheme.primaryDark, fontWeight: FontWeight.bold, fontSize: 20),
                    ),
                  ),
                ),
                SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(title, style: TextStyle(color: context.primaryText, fontSize: 16, fontWeight: FontWeight.w700)),
                      SizedBox(height: 2),
                      Text(company, style: TextStyle(color: context.secondaryText, fontSize: 13)),
                    ],
                  ),
                ),
                Icon(Icons.bookmark_border_rounded, color: context.secondaryText.withValues(alpha: 0.5), size: 24),
              ],
            ),
            SizedBox(height: 16),
            Row(
              children: [
                _buildTag(context, Icons.work_outline, sector),
                const SizedBox(width: 12),
                _buildTag(context, Icons.auto_graph_rounded, '$expMin+ años'),
              ],
            ),
            SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Icon(Icons.location_on_outlined, size: 14, color: context.secondaryText),
                    SizedBox(width: 4),
                    Text(modality, style: TextStyle(color: context.secondaryText, fontSize: 12)),
                  ],
                ),
                Row(
                  children: [
                    Icon(Icons.calendar_today_outlined, size: 12, color: AppTheme.primaryColor),
                    SizedBox(width: 4),
                    Text(
                      displayDate,
                      style: TextStyle(
                        color: AppTheme.primaryColor,
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ],
            ),
            SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: (isClosed || _isApplying || _hasApplied) ? null : _applyToJob,
                style: ElevatedButton.styleFrom(
                  backgroundColor: _hasApplied ? AppTheme.accentBlue : AppTheme.primaryColor,
                  padding: EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(borderRadius: AppTheme.buttonRadius),
                ),
                child: _isApplying 
                    ? SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : Text(_hasApplied ? 'Postulado' : 'Postularme', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTag(BuildContext context, IconData icon, String text) {
    return Row(
      children: [
        Icon(icon, size: 14, color: context.secondaryText.withValues(alpha: 0.8)),
        SizedBox(width: 4),
        Text(text, style: TextStyle(color: context.secondaryText, fontSize: 12, fontWeight: FontWeight.w500)),
      ],
    );
  }
}
