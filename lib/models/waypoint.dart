/// A single point on the land boundary, captured via GPS or map tap.
class Waypoint {
  final double lat;
  final double lng;
  final DateTime timestamp;
  final double? accuracy; // meters, when captured from GPS
  final String source; // 'gps' | 'tap'

  const Waypoint({
    required this.lat,
    required this.lng,
    required this.timestamp,
    this.accuracy,
    this.source = 'gps',
  });

  factory Waypoint.fromJson(Map<String, dynamic> json) {
    return Waypoint(
      lat: (json['lat'] as num).toDouble(),
      lng: (json['lng'] as num).toDouble(),
      timestamp: DateTime.parse(json['ts'] as String),
      accuracy: json['accuracy'] != null
          ? (json['accuracy'] as num).toDouble()
          : null,
      source: (json['source'] as String?) ?? 'gps',
    );
  }

  Map<String, dynamic> toJson() => {
    'lat': lat,
    'lng': lng,
    'ts': timestamp.toIso8601String(),
    if (accuracy != null) 'accuracy': accuracy,
    'source': source,
  };
}
