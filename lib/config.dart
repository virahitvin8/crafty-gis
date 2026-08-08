/// Central app configuration.
///
/// Point [apiBaseUrl] at your Earth Engine backend.
/// - Android emulator reaches the host machine via 10.0.2.2
/// - Physical devices need your computer's LAN IP, e.g. http://192.168.1.10:8000
/// - Override at build time: flutter run --dart-define=API_BASE_URL=http://...
class AppConfig {
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:8000',
  );

  static const String mapAttribution = '© OpenStreetMap contributors';
}
