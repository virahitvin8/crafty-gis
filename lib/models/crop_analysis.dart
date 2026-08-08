/// Result of a crop-health analysis for a plot, from the Earth Engine backend.
class CropAnalysis {
  final DateTime analyzedAt;
  final String startDate;
  final String endDate;
  final String imagery; // e.g. 'Sentinel-2'
  final String overallClass; // e.g. 'Healthy' | 'Moderate' | 'Stressed'
  final String? thumbnailBase64; // NDVI-coloured PNG of the plot area
  final List<IndexStat> indices;

  const CropAnalysis({
    required this.analyzedAt,
    required this.startDate,
    required this.endDate,
    required this.imagery,
    required this.overallClass,
    this.thumbnailBase64,
    this.indices = const [],
  });

  IndexStat? statFor(String code) {
    for (final s in indices) {
      if (s.code == code) return s;
    }
    return null;
  }

  factory CropAnalysis.fromJson(Map<String, dynamic> json) {
    return CropAnalysis(
      analyzedAt: DateTime.parse(json['analyzedAt'] as String),
      startDate: json['startDate'] as String,
      endDate: json['endDate'] as String,
      imagery: (json['imagery'] as String?) ?? 'Sentinel-2',
      overallClass: json['overallClass'] as String,
      thumbnailBase64: json['thumbnailBase64'] as String?,
      indices: (json['indices'] as List? ?? [])
          .map((i) => IndexStat.fromJson(i as Map<String, dynamic>))
          .toList(),
    );
  }

  Map<String, dynamic> toJson() => {
    'analyzedAt': analyzedAt.toIso8601String(),
    'startDate': startDate,
    'endDate': endDate,
    'imagery': imagery,
    'overallClass': overallClass,
    if (thumbnailBase64 != null) 'thumbnailBase64': thumbnailBase64,
    'indices': indices.map((i) => i.toJson()).toList(),
  };
}

/// A single vegetation index (NDVI, NDRE, EVI, SAVI...) with summary stats.
class IndexStat {
  final String code;
  final String name;
  final double mean;
  final double min;
  final double max;
  final double std;
  final String? className; // per-index classification label

  const IndexStat({
    required this.code,
    required this.name,
    required this.mean,
    required this.min,
    required this.max,
    required this.std,
    this.className,
  });

  factory IndexStat.fromJson(Map<String, dynamic> json) {
    return IndexStat(
      code: json['code'] as String,
      name: json['name'] as String,
      mean: (json['mean'] as num).toDouble(),
      min: (json['min'] as num).toDouble(),
      max: (json['max'] as num).toDouble(),
      std: (json['std'] as num).toDouble(),
      className: json['className'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
    'code': code,
    'name': name,
    'mean': mean,
    'min': min,
    'max': max,
    'std': std,
    if (className != null) 'className': className,
  };
}
