import 'dart:convert';
import 'dart:io';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:share_plus/share_plus.dart';

import '../models/crop_analysis.dart';
import '../models/land_plot.dart';
import '../models/waypoint.dart';
import '../services/earth_engine_api.dart';
import '../services/kml_service.dart';
import '../services/plot_storage.dart';
import '../utils/geo_utils.dart';

class PlotDetailScreen extends StatefulWidget {
  final LandPlot plot;

  const PlotDetailScreen({super.key, required this.plot});

  @override
  State<PlotDetailScreen> createState() => _PlotDetailScreenState();
}

class _PlotDetailScreenState extends State<PlotDetailScreen> {
  final _api = EarthEngineApi();
  final _storage = PlotStorage();
  final _kmlService = KmlService();
  bool _analyzing = false;
  bool _showCoords = false;

  late LandPlot _plot;

  @override
  void initState() {
    super.initState();
    _plot = widget.plot;
  }

  Future<void> _analyze() async {
    final now = DateTime.now();
    final range = await showDateRangePicker(
      context: context,
      firstDate: DateTime(now.year - 2),
      lastDate: now,
      initialDateRange: DateTimeRange(
        start: now.subtract(const Duration(days: 21)),
        end: now.subtract(const Duration(days: 7)),
      ),
      helpText: 'Select the growing period',
      saveText: 'Analyze',
    );
    if (range == null || !mounted) return;

    setState(() => _analyzing = true);
    try {
      final analysis = await _api.analyze(
        waypoints: _plot.waypoints,
        start: range.start,
        end: range.end,
      );
      _plot = LandPlot(
        id: _plot.id,
        name: _plot.name,
        createdAt: _plot.createdAt,
        waypoints: _plot.waypoints,
        areaM2: _plot.areaM2,
        perimeterM: _plot.perimeterM,
        analysis: analysis,
      );
      await _storage.upsertPlot(_plot);
      if (!mounted) return;
      setState(() => _analyzing = false);
    } catch (e) {
      if (!mounted) return;
      setState(() => _analyzing = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Analysis failed. Is the Earth Engine backend running? '
            '($e)',
          ),
          duration: const Duration(seconds: 6),
        ),
      );
    }
  }

  Future<void> _exportKml() async {
    File? file;
    try {
      final kmlContent = _kmlService.generateKml(_plot);
      final filename = KmlService.suggestedFilename(_plot.name);
      file = File('${Directory.systemTemp.path}/$filename');
      await file.writeAsString(kmlContent);
      // Opens the OS share sheet (email, Drive, WhatsApp...).
      await Share.shareXFiles([
        XFile(file.path, mimeType: 'application/vnd.google-earth.kml+xml'),
      ], subject: 'LandGPS - ${_plot.name}');
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Failed to export KML: $e')));
      }
    } finally {
      // Remove the temporary file once sharing is done.
      try {
        await file?.delete();
      } catch (_) {}
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Scaffold(
      appBar: AppBar(title: Text(_plot.name)),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
        children: [
          _MiniMap(waypoints: _plot.waypoints),
          const SizedBox(height: 16),
          _statsRow(),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: FilledButton.icon(
                  onPressed: _analyze,
                  icon: const Icon(Icons.satellite_alt),
                  label: const Text('Analyze crop health'),
                ),
              ),
              const SizedBox(width: 12),
              IconButton.filledTonal(
                onPressed: _exportKml,
                icon: const Icon(Icons.file_download),
                tooltip: 'Export as KML',
              ),
            ],
          ),
          const SizedBox(height: 16),
          if (_analyzing)
            const Card(
              child: Padding(
                padding: EdgeInsets.all(24),
                child: Column(
                  children: [
                    CircularProgressIndicator(),
                    SizedBox(height: 12),
                    Text('Querying Google Earth Engine…'),
                  ],
                ),
              ),
            )
          else if (_plot.analysis != null)
            _AnalysisView(analysis: _plot.analysis!)
          else
            Card(
              child: Padding(
                padding: const EdgeInsets.all(18),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.eco, color: scheme.primary),
                        const SizedBox(width: 8),
                        const Text(
                          'Crop health analysis',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Compute NDVI, NDRE, EVI and SAVI for this exact boundary '
                      'using Sentinel-2 satellite data via Google Earth Engine.',
                      style: TextStyle(
                        fontSize: 13,
                        color: scheme.onSurfaceVariant,
                        height: 1.4,
                      ),
                    ),
                    const SizedBox(height: 16),
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton.icon(
                        onPressed: _analyze,
                        icon: const Icon(Icons.satellite_alt),
                        label: const Text('Analyze crop health'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          const SizedBox(height: 16),
          _CoordinatesCard(
            waypoints: _plot.waypoints,
            show: _showCoords,
            onToggle: () => setState(() => _showCoords = !_showCoords),
          ),
        ],
      ),
    );
  }

  Widget _statsRow() {
    return Row(
      children: [
        Expanded(
          child: _StatTile(
            icon: Icons.square_foot,
            label: 'Area',
            value: formatArea(_plot.areaM2),
            color: const Color(0xFF2E7D32),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _StatTile(
            icon: Icons.straighten,
            label: 'Perimeter',
            value: '${_plot.perimeterM.round()} m',
            color: const Color(0xFF1565C0),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _StatTile(
            icon: Icons.flag,
            label: 'Points',
            value: '${_plot.waypoints.length}',
            color: const Color(0xFF6A1B9A),
          ),
        ),
      ],
    );
  }
}

class _MiniMap extends StatelessWidget {
  final List<Waypoint> waypoints;
  const _MiniMap({required this.waypoints});

  @override
  Widget build(BuildContext context) {
    final points = [for (final w in waypoints) LatLng(w.lat, w.lng)];
    if (points.isEmpty) return const SizedBox.shrink();
    var minLat = 90.0, maxLat = -90.0, minLng = 180.0, maxLng = -180.0;
    for (final p in points) {
      if (p.latitude < minLat) minLat = p.latitude;
      if (p.latitude > maxLat) maxLat = p.latitude;
      if (p.longitude < minLng) minLng = p.longitude;
      if (p.longitude > maxLng) maxLng = p.longitude;
    }
    final center = LatLng((minLat + maxLat) / 2, (minLng + maxLng) / 2);
    final latSpan = (maxLat - minLat).abs().clamp(0.0005, 2.0);
    final lngSpan = (maxLng - minLng).abs().clamp(0.0005, 2.0);
    final zoom = (-(math.log(math.max(latSpan, lngSpan) / 0.002) / math.ln2))
        .clamp(13, 19);

    return ClipRRect(
      borderRadius: BorderRadius.circular(16),
      child: SizedBox(
        height: 220,
        child: FlutterMap(
          options: MapOptions(
            initialCenter: center,
            initialZoom: zoom.toDouble(),
            interactionOptions: const InteractionOptions(
              flags: InteractiveFlag.none,
            ),
          ),
          children: [
            TileLayer(
              urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
              userAgentPackageName: 'com.agriapp.landgps',
            ),
            if (points.length >= 3)
              PolygonLayer(
                polygons: [
                  Polygon(
                    points: points,
                    color: const Color(0x442E7D32),
                    borderColor: const Color(0xFF1B5E20),
                    borderStrokeWidth: 2.5,
                  ),
                ],
              ),
            if (points.length >= 2)
              PolylineLayer(
                polylines: [
                  Polyline(
                    points: points,
                    strokeWidth: 3,
                    color: const Color(0xFF2E7D32),
                  ),
                ],
              ),
            MarkerLayer(
              markers: [
                for (final p in points)
                  Marker(
                    point: p,
                    width: 20,
                    height: 20,
                    child: Container(
                      decoration: const BoxDecoration(
                        color: Color(0xFF2E7D32),
                        shape: BoxShape.circle,
                        border: Border.fromBorderSide(
                          BorderSide(color: Colors.white, width: 2),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _StatTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color color;

  const _StatTile({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 10),
        child: Column(
          children: [
            Icon(icon, color: color, size: 22),
            const SizedBox(height: 6),
            Text(
              value,
              style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
              textAlign: TextAlign.center,
            ),
            Text(
              label,
              style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
            ),
          ],
        ),
      ),
    );
  }
}

class _AnalysisView extends StatelessWidget {
  final CropAnalysis analysis;
  const _AnalysisView({required this.analysis});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final classColor = switch (analysis.overallClass) {
      'Healthy' => const Color(0xFF2E7D32),
      'Moderate' => const Color(0xFFF9A825),
      'Stressed' => const Color(0xFFC62828),
      _ => scheme.primary,
    };
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(Icons.eco, color: classColor),
                    const SizedBox(width: 8),
                    Text(
                      'Crop health: ${analysis.overallClass}',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        color: classColor,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  '${analysis.imagery}  •  ${analysis.startDate} → ${analysis.endDate}',
                  style: TextStyle(
                    fontSize: 12,
                    color: scheme.onSurfaceVariant,
                  ),
                ),
                const SizedBox(height: 12),
                if (analysis.thumbnailBase64 != null)
                  ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: Image.memory(
                      base64Decode(analysis.thumbnailBase64!),
                      height: 180,
                      width: double.infinity,
                      fit: BoxFit.cover,
                      errorBuilder: (_, _, _) => Container(
                        height: 180,
                        color: scheme.surfaceContainerHighest,
                        child: const Center(
                          child: Text('NDVI map unavailable'),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        for (final stat in analysis.indices) ...[
          _IndexTile(stat: stat),
          const SizedBox(height: 10),
        ],
      ],
    );
  }
}

class _IndexTile extends StatelessWidget {
  final IndexStat stat;
  const _IndexTile({required this.stat});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final meanColor = _indexColor(stat.mean, stat.code);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: scheme.primaryContainer.withValues(alpha: 0.6),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(Icons.graphic_eq, color: scheme.primary),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    stat.name,
                    style: const TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 15,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'min ${stat.min.toStringAsFixed(2)}  •  max ${stat.max.toStringAsFixed(2)}  •  σ ${stat.std.toStringAsFixed(2)}',
                    style: TextStyle(
                      fontSize: 12,
                      color: scheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  stat.mean.toStringAsFixed(2),
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                    color: meanColor,
                  ),
                ),
                if (stat.className != null)
                  Text(
                    stat.className!,
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: meanColor,
                    ),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Color _indexColor(double v, String code) {
    if (code == 'NDVI' || code == 'NDRE' || code == 'EVI' || code == 'SAVI') {
      if (v >= 0.5) return const Color(0xFF2E7D32);
      if (v >= 0.3) return const Color(0xFFF9A825);
      return const Color(0xFFC62828);
    }
    return Colors.green.shade700;
  }
}

class _CoordinatesCard extends StatelessWidget {
  final List<Waypoint> waypoints;
  final bool show;
  final VoidCallback onToggle;

  const _CoordinatesCard({
    required this.waypoints,
    required this.show,
    required this.onToggle,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Column(
        children: [
          ListTile(
            leading: const Icon(Icons.format_list_numbered),
            title: const Text(
              'Boundary coordinates',
              style: TextStyle(fontWeight: FontWeight.w700),
            ),
            trailing: IconButton(
              icon: Icon(show ? Icons.expand_less : Icons.expand_more),
              onPressed: onToggle,
            ),
          ),
          if (show)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
              child: Column(
                children: [
                  for (final (i, w) in waypoints.indexed)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 3),
                      child: Row(
                        children: [
                          Container(
                            width: 24,
                            height: 24,
                            alignment: Alignment.center,
                            decoration: const BoxDecoration(
                              color: Color(0xFF2E7D32),
                              shape: BoxShape.circle,
                            ),
                            child: Text(
                              '${i + 1}',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              '${w.lat.toStringAsFixed(6)}, ${w.lng.toStringAsFixed(6)}',
                              style: const TextStyle(
                                fontFamily: 'monospace',
                                fontSize: 13,
                              ),
                            ),
                          ),
                          Text(
                            w.source == 'tap' ? 'tapped' : 'gps',
                            style: TextStyle(
                              fontSize: 11,
                              color: Colors.grey.shade600,
                            ),
                          ),
                        ],
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
