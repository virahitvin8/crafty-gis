import 'package:geolocator/geolocator.dart';

/// Wraps geolocator: permission handling, one-shot fixes and continuous streams.
class GpsService {
  /// Returns true once location permission has been granted.
  Future<bool> ensurePermission() async {
    var perm = await Geolocator.checkPermission();
    if (perm == LocationPermission.denied) {
      perm = await Geolocator.requestPermission();
    }
    return perm == LocationPermission.whileInUse ||
        perm == LocationPermission.always;
  }

  /// True when the device GPS / location services are on.
  Future<bool> isServiceEnabled() => Geolocator.isLocationServiceEnabled();

  /// One-shot current position (with a 10s timeout fallback to last known).
  Future<Position?> getCurrentPosition() async {
    try {
      return await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 10),
        ),
      );
    } catch (_) {
      try {
        return await Geolocator.getLastKnownPosition();
      } catch (_) {
        return null;
      }
    }
  }

  /// Continuous stream of position fixes (best accuracy available).
  Stream<Position> getPositionStream() {
    return Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.best,
        distanceFilter: 2,
        timeLimit: Duration(hours: 6),
      ),
    );
  }

  /// Small helper for live accuracy display.
  static double? accuracyOf(Position p) => p.accuracy;
}
