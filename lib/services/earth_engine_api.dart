import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config.dart';
import '../models/crop_analysis.dart';
import '../utils/geo_utils.dart';
import '../models/waypoint.dart';

class EarthEngineApi {
  EarthEngineApi({String? baseUrl}) : baseUrl = baseUrl ?? AppConfig.apiBaseUrl;

  final String baseUrl;

  /// Ask the backend to compute vegetation indices (NDVI, NDRE, EVI, SAVI...)
  /// for the plot polygon over [start]..[end].
  Future<CropAnalysis> analyze({
    required List<Waypoint> waypoints,
    required DateTime start,
    required DateTime end,
  }) async {
    final body = {
      'polygon': toGeoJson(waypoints),
      'start_date': _fmt(start),
      'end_date': _fmt(end),
    };

    final resp = await http
        .post(
          Uri.parse('$baseUrl/api/analyze'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode(body),
        )
        .timeout(const Duration(seconds: 120));

    if (resp.statusCode != 200) {
      throw Exception(
        'Backend error ${resp.statusCode}: ${resp.body.length > 200 ? resp.body.substring(0, 200) : resp.body}',
      );
    }

    final json = jsonDecode(resp.body) as Map<String, dynamic>;
    return CropAnalysis.fromJson(json);
  }

  /// Lightweight health probe used to warn the user the backend is offline.
  Future<bool> ping() async {
    try {
      final resp = await http
          .get(Uri.parse('$baseUrl/api/health'))
          .timeout(const Duration(seconds: 5));
      return resp.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  static String _fmt(DateTime d) =>
      '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
}
