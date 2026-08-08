import 'dart:async';
import 'dart:io';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';

import '../models/land_plot.dart';
import '../models/waypoint.dart';
import '../services/gps_service.dart';
import '../services/kml_service.dart';
import '../services/plot_storage.dart';
import '../utils/geo_utils.dart';

enum _Mode { idle, measuring }

class MeasureScreen extends StatefulWidget {
  const MeasureScreen({super.key});

  @override
  State<MeasureScreen> createState() => _MeasureScreenState();
}

class _MeasureScreenState extends State<MeasureScreen> {
  final _gps = GpsService();
  final _mapController = MapController();
  final _storage = PlotStorage();

  _Mode _mode = _Mode.idle;
  final List<Waypoint> _waypoints = [];
  Position? _currentPos;
  StreamSubscription<Position>? _gpsSub;
  double _walkedM = 0;
  bool _following = true;
  bool _autoTrack = false;
  double _lastAutoPointM = 0;
  String? _permissionError;

  static const double _autoTrackEveryM = 10;

  final KmlService _kmlService = KmlService();
  bool _importingKml = false;

  @override
  void initState() {
    super.initState();
    _initLocation();
  }

  @override
  void dispose() {
    _gpsSub?.cancel();
    super.dispose();
  }

  Future<void> _importKml() async {
    if (_importingKml) return;
    setState(() => _importingKml = true);
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['kml', 'kmz'],
        dialogTitle: 'Select KML File',
      );
      if (result == null || result.files.isEmpty) return;

      final file = result.files.first;
      final bytes =
          file.bytes ??
          (file.path != null ? await File(file.path!).readAsBytes() : null);
      if (bytes == null) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Could not read the selected file.')),
          );
        }
        return;
      }

      // Parse KML (or KMZ zip containing .kml members).
      final boundaries = _kmlService.parseKmlBytes(bytes);
      if (boundaries.isEmpty) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('No polygon or line boundaries found in this KML.'),
            ),
          );
        }
        return;
      }

      // If several boundaries exist, let the user pick one.
      List<Waypoint> selected = boundaries.first;
      if (boundaries.length > 1 && mounted) {
        final picked = await _pickBoundary(boundaries);
        if (picked == null) return;
        selected = picked;
      }

      // Switch to measuring mode so the user can edit points and Close.
      setState(() {
        _mode = _Mode.measuring;
        _waypoints.clear();
        _walkedM = 0;
        _lastAutoPointM = 0;
        _waypoints.addAll(selected);
      });

      // Center the map on the imported boundary.
      if (selected.isNotEmpty) {
        final (lat, lng) = polygonCentroid(selected);
        _mapController.move(LatLng(lat, lng), 17);
      }
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Imported ${selected.length} waypoints - edit then press Close.',
            ),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Failed to import KML: $e')));
      }
    } finally {
      if (mounted) {
        setState(() => _importingKml = false);
      }
    }
  }

  Future<List<Waypoint>?> _pickBoundary(List<List<Waypoint>> boundaries) {
    return showDialog<List<Waypoint>>(
      context: context,
      builder: (ctx) => SimpleDialog(
        title: const Text('Choose a boundary to import'),
        children: [
          for (final (i, b) in boundaries.indexed)
            SimpleDialogOption(
              onPressed: () => Navigator.pop(ctx, b),
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 6),
                child: Text(
                  'Boundary ${i + 1}  •  ${b.length} points  •  ${formatArea(polygonAreaM2(b))}',
                ),
              ),
            ),
        ],
      ),
    );
  }

  Future<void> _initLocation() async {
    final enabled = await _gps.isServiceEnabled();
    final granted = await _gps.ensurePermission();
    if (!mounted) return;
    if (!enabled || !granted) {
      setState(() {
        _permissionError =
            'Location access is required to measure land. '
            'Please enable GPS and grant location permission.';
      });
      return;
    }
    final pos = await _gps.getCurrentPosition();
    if (!mounted) return;
    if (pos != null) {
      setState(() => _currentPos = pos);
      _mapController.move(LatLng(pos.latitude, pos.longitude), 18);
    }
  }

  void _startMeasuring() {
    setState(() => _mode = _Mode.measuring);
    _gpsSub = _gps.getPositionStream().listen(
      (pos) {
        if (!mounted) return;
        setState(() {
          _currentPos = pos;
          if (_mode == _Mode.measuring && _following) {
            _mapController.move(LatLng(pos.latitude, pos.longitude), 18);
          }
        });
        _maybeAutoAdd(pos);
      },
      onError: (_) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('GPS stream error - keep GPS on.')),
          );
        }
      },
    );
  }

  void _maybeAutoAdd(Position pos) {
    if (!_autoTrack || _mode != _Mode.measuring) return;
    final last = _waypoints.isEmpty ? null : _waypoints.last;
    if (last == null) {
      _addWaypoint(pos);
      return;
    }
    final d = haversineDistance(
      last.lat,
      last.lng,
      pos.latitude,
      pos.longitude,
    );
    _lastAutoPointM += d;
    if (_lastAutoPointM >= _autoTrackEveryM) {
      _lastAutoPointM = 0;
      _addWaypoint(pos);
    }
  }

  void _addWaypoint(Position pos) {
    final wp = Waypoint(
      lat: pos.latitude,
      lng: pos.longitude,
      timestamp: DateTime.now(),
      accuracy: pos.accuracy,
      source: 'gps',
    );
    setState(() {
      if (_waypoints.isNotEmpty) {
        _walkedM += haversineDistance(
          _waypoints.last.lat,
          _waypoints.last.lng,
          wp.lat,
          wp.lng,
        );
      }
      _waypoints.add(wp);
    });
  }

  void _addTappedPoint(LatLng latLng) {
    if (_mode != _Mode.measuring) return;
    final wp = Waypoint(
      lat: latLng.latitude,
      lng: latLng.longitude,
      timestamp: DateTime.now(),
      source: 'tap',
    );
    setState(() {
      if (_waypoints.isNotEmpty) {
        _walkedM += haversineDistance(
          _waypoints.last.lat,
          _waypoints.last.lng,
          wp.lat,
          wp.lng,
        );
      }
      _waypoints.add(wp);
    });
  }

  void _undo() {
    if (_waypoints.isEmpty) return;
    setState(() => _waypoints.removeLast());
  }

  Future<void> _finish() async {
    if (_waypoints.length < 3) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Mark at least 3 points to create a boundary.'),
        ),
      );
      return;
    }
    final areaM2 = polygonAreaM2(_waypoints);
    final perimeterM = polygonPerimeter(_waypoints);
    if (areaM2 < 1) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Boundary is too small - check the points.'),
        ),
      );
      return;
    }

    final nameCtrl = TextEditingController(
      text:
          'Plot ${DateTime.now().day}/${DateTime.now().month}/${DateTime.now().year}',
    );
    final name = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Save plot'),
        content: TextField(
          controller: nameCtrl,
          autofocus: true,
          decoration: const InputDecoration(
            labelText: 'Plot name',
            border: OutlineInputBorder(),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, nameCtrl.text.trim()),
            child: const Text('Save'),
          ),
        ],
      ),
    );
    if (name == null || name.isEmpty) return;

    final plot = LandPlot(
      id: DateTime.now().microsecondsSinceEpoch.toString(),
      name: name,
      createdAt: DateTime.now(),
      waypoints: List.of(_waypoints),
      areaM2: areaM2,
      perimeterM: perimeterM,
    );
    await _storage.upsertPlot(plot);
    if (!mounted) return;
    Navigator.of(context).pop(true);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_mode == _Mode.idle ? 'Measure Land' : 'Measuring…'),
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => Navigator.of(context).pop(false),
        ),
        actions: [
          if (_mode == _Mode.measuring)
            IconButton(
              icon: const Icon(Icons.check_circle),
              tooltip: 'Finish & save',
              onPressed: _finish,
            ),
        ],
      ),
      body: Stack(
        children: [
          _buildMap(),
          if (_permissionError != null)
            _PermissionBanner(message: _permissionError!),
          Positioned(
            left: 12,
            top: 12,
            child: _StatsCard(waypoints: _waypoints, walkedM: _walkedM),
          ),
          Positioned(
            right: 12,
            bottom: 120,
            child: _ControlColumn(
              following: _following,
              autoTrack: _autoTrack,
              onToggleFollow: () => setState(() => _following = !_following),
              onToggleAuto: () => setState(() => _autoTrack = !_autoTrack),
              onLocate: () {
                final p = _currentPos;
                if (p != null) {
                  _mapController.move(LatLng(p.latitude, p.longitude), 18);
                }
              },
            ),
          ),
        ],
      ),
      bottomNavigationBar: _mode == _Mode.idle
          ? _IdleBar(
              canStart: _currentPos != null,
              onStart: _startMeasuring,
              onImportKml: _importKml,
            )
          : _MeasureBar(
              waypoints: _waypoints,
              onAdd: () {
                final p = _currentPos;
                if (p != null) {
                  _addWaypoint(p);
                } else {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Waiting for GPS fix…')),
                  );
                }
              },
              onUndo: _undo,
              onClear: () => setState(() {
                _waypoints.clear();
                _walkedM = 0;
                _lastAutoPointM = 0;
              }),
              onFinish: _finish,
            ),
    );
  }

  Widget _buildMap() {
    final points = _waypoints.map((w) => LatLng(w.lat, w.lng)).toList();
    final closed = points.length >= 3;

    final markers = <Marker>[
      for (final (i, p) in points.indexed)
        Marker(
          point: p,
          width: 30,
          height: 30,
          child: _WaypointMarker(index: i + 1),
        ),
      if (_currentPos != null)
        Marker(
          point: LatLng(_currentPos!.latitude, _currentPos!.longitude),
          width: 26,
          height: 26,
          child: const _CurrentPosMarker(),
        ),
    ];

    return FlutterMap(
      mapController: _mapController,
      options: MapOptions(
        initialCenter: _currentPos != null
            ? LatLng(_currentPos!.latitude, _currentPos!.longitude)
            : const LatLng(28.6139, 77.2090), // New Delhi default
        initialZoom: 17,
        onTap: (_, latLng) => _addTappedPoint(latLng),
        interactionOptions: const InteractionOptions(
          flags: InteractiveFlag.all & ~InteractiveFlag.rotate,
        ),
      ),
      children: [
        TileLayer(
          urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          userAgentPackageName: 'com.agriapp.landgps',
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
        if (closed)
          PolygonLayer(
            polygons: [
              Polygon(
                points: points,
                color: const Color(0x332E7D32),
                borderColor: const Color(0xFF1B5E20),
                borderStrokeWidth: 2,
              ),
            ],
          ),
        MarkerLayer(markers: markers),
      ],
    );
  }
}

class _WaypointMarker extends StatelessWidget {
  final int index;
  const _WaypointMarker({required this.index});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Container(
        width: 26,
        height: 26,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: const Color(0xFF2E7D32),
          shape: BoxShape.circle,
          border: Border.all(color: Colors.white, width: 2),
          boxShadow: const [
            BoxShadow(
              color: Colors.black26,
              blurRadius: 4,
              offset: Offset(0, 1),
            ),
          ],
        ),
        child: Text(
          '$index',
          style: const TextStyle(
            color: Colors.white,
            fontSize: 12,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
    );
  }
}

class _CurrentPosMarker extends StatelessWidget {
  const _CurrentPosMarker();

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF1565C0).withValues(alpha: 0.2),
        shape: BoxShape.circle,
        border: Border.all(color: Colors.white, width: 2),
      ),
      child: const Center(
        child: Icon(Icons.my_location, color: Color(0xFF1565C0), size: 14),
      ),
    );
  }
}

class _StatsCard extends StatelessWidget {
  final List<Waypoint> waypoints;
  final double walkedM;

  const _StatsCard({required this.waypoints, required this.walkedM});

  @override
  Widget build(BuildContext context) {
    final area = polygonAreaM2(waypoints);
    final perimeter = polygonPerimeter(waypoints);
    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            _stat(context, Icons.flag, '${waypoints.length}', 'points'),
            _divider(),
            _stat(context, Icons.timeline, '${walkedM.round()} m', 'walked'),
            _divider(),
            _stat(
              context,
              Icons.square_foot,
              waypoints.length >= 3 ? formatArea(area) : '—',
              'area',
            ),
            _divider(),
            _stat(
              context,
              Icons.straighten,
              waypoints.length >= 3 ? '${perimeter.round()} m' : '—',
              'perim.',
            ),
          ],
        ),
      ),
    );
  }

  Widget _divider() => Container(
    width: 1,
    height: 28,
    margin: const EdgeInsets.symmetric(horizontal: 10),
    color: Colors.black12,
  );

  Widget _stat(
    BuildContext context,
    IconData icon,
    String value,
    String label,
  ) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 16, color: Theme.of(context).colorScheme.primary),
        const SizedBox(height: 2),
        Text(
          value,
          style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
        ),
        Text(
          label,
          style: TextStyle(fontSize: 10, color: Colors.grey.shade600),
        ),
      ],
    );
  }
}

class _ControlColumn extends StatelessWidget {
  final bool following;
  final bool autoTrack;
  final VoidCallback onToggleFollow;
  final VoidCallback onToggleAuto;
  final VoidCallback onLocate;

  const _ControlColumn({
    required this.following,
    required this.autoTrack,
    required this.onToggleFollow,
    required this.onToggleAuto,
    required this.onLocate,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        _RoundButton(
          icon: Icons.my_location,
          onPressed: onLocate,
          tooltip: 'Re-center on GPS',
        ),
        const SizedBox(height: 10),
        _RoundButton(
          icon: Icons.gps_fixed,
          active: following,
          onPressed: onToggleFollow,
          tooltip: 'Follow me: ${following ? 'ON' : 'OFF'}',
        ),
        const SizedBox(height: 10),
        _RoundButton(
          icon: Icons.auto_awesome_motion,
          active: autoTrack,
          onPressed: onToggleAuto,
          tooltip: 'Auto waypoint every 10 m: ${autoTrack ? 'ON' : 'OFF'}',
        ),
      ],
    );
  }
}

class _RoundButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback onPressed;
  final String tooltip;
  final bool active;

  const _RoundButton({
    required this.icon,
    required this.onPressed,
    required this.tooltip,
    this.active = false,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      elevation: 3,
      shape: const CircleBorder(),
      child: IconButton(
        onPressed: onPressed,
        icon: Icon(
          icon,
          color: active ? const Color(0xFF2E7D32) : Colors.grey.shade700,
        ),
        tooltip: tooltip,
      ),
    );
  }
}

class _IdleBar extends StatelessWidget {
  final bool canStart;
  final VoidCallback onStart;
  final VoidCallback onImportKml;

  const _IdleBar({
    required this.canStart,
    required this.onStart,
    required this.onImportKml,
  });

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'Walk around the edge of your land. Tap the map or use '
              '"Add point" at each corner. LandGPS draws the boundary live.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 13, color: Colors.grey.shade700),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: canStart ? onStart : null,
                icon: const Icon(Icons.play_arrow),
                label: const Text('Start measuring'),
              ),
            ),
            const SizedBox(height: 8),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: onImportKml,
                icon: const Icon(Icons.upload_file),
                label: const Text('Import boundary from KML'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _MeasureBar extends StatelessWidget {
  final List<Waypoint> waypoints;
  final VoidCallback onAdd;
  final VoidCallback onUndo;
  final VoidCallback onClear;
  final VoidCallback onFinish;

  const _MeasureBar({
    required this.waypoints,
    required this.onAdd,
    required this.onUndo,
    required this.onClear,
    required this.onFinish,
  });

  @override
  Widget build(BuildContext context) {
    final canClose = waypoints.length >= 3;
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 10, 16, 16),
        child: Row(
          children: [
            Expanded(
              child: FilledButton.icon(
                onPressed: onAdd,
                icon: const Icon(Icons.add_location_alt),
                label: const Text('Add point'),
              ),
            ),
            const SizedBox(width: 10),
            IconButton.filledTonal(
              onPressed: onUndo,
              icon: const Icon(Icons.undo),
              tooltip: 'Undo last point',
            ),
            IconButton.filledTonal(
              onPressed: onClear,
              icon: const Icon(Icons.delete_sweep),
              tooltip: 'Clear all points',
            ),
            const SizedBox(width: 10),
            Expanded(
              child: FilledButton.icon(
                onPressed: canClose ? onFinish : null,
                style: FilledButton.styleFrom(
                  backgroundColor: const Color(0xFF1B5E20),
                ),
                icon: const Icon(Icons.check),
                label: const Text('Close'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PermissionBanner extends StatelessWidget {
  final String message;
  const _PermissionBanner({required this.message});

  @override
  Widget build(BuildContext context) {
    return Positioned(
      left: 16,
      right: 16,
      bottom: 16,
      child: Material(
        color: Theme.of(context).colorScheme.errorContainer,
        borderRadius: BorderRadius.circular(14),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              Icon(
                Icons.location_off,
                color: Theme.of(context).colorScheme.onErrorContainer,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  message,
                  style: TextStyle(
                    color: Theme.of(context).colorScheme.onErrorContainer,
                    fontSize: 13,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
