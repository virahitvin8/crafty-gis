import 'dart:convert';

import 'package:archive/archive.dart';
import 'package:xml/xml.dart';

import '../models/land_plot.dart';
import '../models/waypoint.dart';

/// Parses KML/KMZ (XML) content into land boundaries, and exports plots to KML.
///
/// Supports the common case: `<Placemark>`s containing a `<Polygon>` or a
/// `<LineString>` whose `<coordinates>` are "lng,lat,alt" triples.
class KmlService {
  /// Parse KML (or KMZ zip archive) bytes and return waypoint lists.
  List<List<Waypoint>> parseKmlBytes(List<int> bytes) {
    final head = String.fromCharCodes(bytes.take(4));
    if (head == 'PK\u0003\u0004') {
      try {
        final archive = ZipDecoder().decodeBytes(bytes);
        for (final file in archive.files) {
          if (file.isFile && file.name.toLowerCase().endsWith('.kml')) {
            final text = utf8.decode(
              file.content as List<int>,
              allowMalformed: true,
            );
            final result = parseKml(text);
            if (result.isNotEmpty) return result;
          }
        }
      } catch (_) {
        // fall through to raw text parse
      }
    }
    return parseKml(utf8.decode(bytes, allowMalformed: true));
  }

  /// Parse KML content and return one waypoint list per geometry found.
  List<List<Waypoint>> parseKml(String kmlContent) {
    final document = XmlDocument.parse(kmlContent);
    final results = <List<Waypoint>>[];

    for (final placemark in document.findAllElements('Placemark')) {
      final polygon = placemark.findAllElements('Polygon').firstOrNull;
      final lineString = placemark.findAllElements('LineString').firstOrNull;

      if (polygon != null) {
        final ring = polygon.findAllElements('LinearRing').firstOrNull;
        if (ring != null) {
          final coords = _extractCoordinates(ring);
          if (coords.length >= 3) results.add(coords);
        }
      } else if (lineString != null) {
        final coords = _extractCoordinates(lineString);
        if (coords.length >= 3) results.add(coords);
      }
    }
    return results;
  }

  List<Waypoint> _extractCoordinates(XmlElement parent) {
    final coords = <Waypoint>[];
    for (final el in parent.findAllElements('coordinates')) {
      final text = el.innerText.trim();
      if (text.isEmpty) continue;
      for (final token in text.split(RegExp(r'\s+'))) {
        final parts = token.split(',');
        if (parts.length < 2) continue;
        final lng = double.tryParse(parts[0]);
        final lat = double.tryParse(parts[1]);
        if (lat == null || lng == null) continue;
        // KML rings repeat the first point to close - drop the duplicate so
        // the plot shows the true vertex count and re-export doesn't compound
        // closing points (generateKml already closes the ring).
        if (coords.isNotEmpty &&
            (coords.last.lat - lat).abs() < 1e-8 &&
            (coords.last.lng - lng).abs() < 1e-8) {
          continue;
        }
        coords.add(
          Waypoint(
            lat: lat,
            lng: lng,
            timestamp: DateTime.now(),
            source: 'kml',
          ),
        );
      }
    }
    return coords;
  }

  /// Build a KML document string for a plot (closed polygon ring).
  String generateKml(LandPlot plot) {
    final buffer = StringBuffer();
    buffer.writeln('<?xml version="1.0" encoding="UTF-8"?>');
    buffer.writeln('<kml xmlns="http://www.opengis.net/kml/2.2">');
    buffer.writeln('  <Document>');
    buffer.writeln('    <name>${_escape(plot.name)}</name>');
    buffer.writeln('    <Placemark>');
    buffer.writeln('      <name>${_escape(plot.name)}</name>');
    buffer.writeln('      <Polygon>');
    buffer.writeln('        <outerBoundaryIs>');
    buffer.writeln('          <LinearRing>');
    buffer.writeln('            <coordinates>');
    for (final wp in plot.waypoints) {
      buffer.writeln(
        '              ${wp.lng.toStringAsFixed(6)},${wp.lat.toStringAsFixed(6)},0',
      );
    }
    if (plot.waypoints.isNotEmpty) {
      final first = plot.waypoints.first;
      buffer.writeln(
        '              ${first.lng.toStringAsFixed(6)},${first.lat.toStringAsFixed(6)},0',
      );
    }
    buffer.writeln('            </coordinates>');
    buffer.writeln('          </LinearRing>');
    buffer.writeln('        </outerBoundaryIs>');
    buffer.writeln('      </Polygon>');
    buffer.writeln('    </Placemark>');
    buffer.writeln('  </Document>');
    buffer.writeln('</kml>');
    return buffer.toString();
  }

  String _escape(String input) => input
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&apos;');

  /// Suggest a safe filename for a plot.
  static String suggestedFilename(String plotName) {
    final safe = plotName.replaceAll(RegExp(r'[^a-zA-Z0-9_-]'), '_');
    return '${safe.isEmpty ? 'plot' : safe}.kml';
  }
}
