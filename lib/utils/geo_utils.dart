import 'dart:math' as math;

import '../models/waypoint.dart';

const double _earthRadiusM = 6371000.0;
const double _metersPerDegLat = 111320.0;

/// Great-circle distance between two coordinates in meters (Haversine).
double haversineDistance(double lat1, double lng1, double lat2, double lng2) {
  final dLat = _degToRad(lat2 - lat1);
  final dLng = _degToRad(lng2 - lng1);
  final a =
      math.pow(math.sin(dLat / 2), 2) +
      math.cos(_degToRad(lat1)) *
          math.cos(_degToRad(lat2)) *
          math.pow(math.sin(dLng / 2), 2);
  return 2 * _earthRadiusM * math.asin(math.sqrt(a));
}

/// Perimeter of a closed polygon in meters.
double polygonPerimeter(List<Waypoint> pts) {
  if (pts.length < 2) return 0;
  var total = 0.0;
  for (var i = 0; i < pts.length; i++) {
    final a = pts[i];
    final b = pts[(i + 1) % pts.length];
    total += haversineDistance(a.lat, a.lng, b.lat, b.lng);
  }
  return total;
}

/// Area of a polygon in square meters using the shoelace formula on an
/// equirectangular projection centred at the polygon's mean latitude.
/// Accurate to well under 1% for land-plot scales.
double polygonAreaM2(List<Waypoint> pts) {
  if (pts.length < 3) return 0;
  final latMidRad = _degToRad(
    pts.map((p) => p.lat).reduce((a, b) => a + b) / pts.length,
  );
  final mPerDegLng = _metersPerDegLat * math.cos(latMidRad);

  double area2 = 0;
  for (var i = 0; i < pts.length; i++) {
    final p1 = pts[i];
    final p2 = pts[(i + 1) % pts.length];
    final x1 = p1.lng * mPerDegLng;
    final y1 = p1.lat * _metersPerDegLat;
    final x2 = p2.lng * mPerDegLng;
    final y2 = p2.lat * _metersPerDegLat;
    area2 += x1 * y2 - x2 * y1;
  }
  return area2.abs() / 2;
}

/// Approximate centroid of a polygon (simple average of vertices).
(double lat, double lng) polygonCentroid(List<Waypoint> pts) {
  if (pts.isEmpty) return (0, 0);
  final lat = pts.map((p) => p.lat).reduce((a, b) => a + b) / pts.length;
  final lng = pts.map((p) => p.lng).reduce((a, b) => a + b) / pts.length;
  return (lat, lng);
}

/// GeoJSON Polygon coordinates [[lng, lat], ...] for Earth Engine.
Map<String, dynamic> toGeoJson(List<Waypoint> pts) {
  final ring = [
    for (final p in pts) [p.lng, p.lat],
    if (pts.isNotEmpty) [pts.first.lng, pts.first.lat], // close the ring
  ];
  return {
    'type': 'Polygon',
    'coordinates': [ring],
  };
}

/// Convert an area in m² to the display-preferred unit.
/// Large plots -> hectares, small plots -> acres, tiny -> m².
String formatArea(double areaM2, {int decimals = 2}) {
  if (areaM2 >= 10000) {
    final ha = areaM2 / 10000;
    return '${ha.toStringAsFixed(decimals)} ha';
  }
  if (areaM2 >= 404.7) {
    final ac = areaM2 / 4046.86;
    return '${ac.toStringAsFixed(decimals)} ac';
  }
  return '${areaM2.toStringAsFixed(decimals)} m²';
}

double _degToRad(double deg) => deg * math.pi / 180;
