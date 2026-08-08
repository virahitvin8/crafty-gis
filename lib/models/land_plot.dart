import 'crop_analysis.dart';
import 'waypoint.dart';

/// A saved land measurement: the boundary waypoints plus optional crop health data.
class LandPlot {
  final String id;
  String name;
  final DateTime createdAt;
  final List<Waypoint> waypoints;
  final double areaM2;
  final double perimeterM;
  CropAnalysis? analysis;

  LandPlot({
    required this.id,
    required this.name,
    required this.createdAt,
    required this.waypoints,
    required this.areaM2,
    required this.perimeterM,
    this.analysis,
  });

  factory LandPlot.fromJson(Map<String, dynamic> json) {
    return LandPlot(
      id: json['id'] as String,
      name: json['name'] as String,
      createdAt: DateTime.parse(json['createdAt'] as String),
      waypoints: (json['waypoints'] as List)
          .map((w) => Waypoint.fromJson(w as Map<String, dynamic>))
          .toList(),
      areaM2: (json['areaM2'] as num).toDouble(),
      perimeterM: (json['perimeterM'] as num).toDouble(),
      analysis: json['analysis'] != null
          ? CropAnalysis.fromJson(json['analysis'] as Map<String, dynamic>)
          : null,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'createdAt': createdAt.toIso8601String(),
    'waypoints': waypoints.map((w) => w.toJson()).toList(),
    'areaM2': areaM2,
    'perimeterM': perimeterM,
    if (analysis != null) 'analysis': analysis!.toJson(),
  };
}
