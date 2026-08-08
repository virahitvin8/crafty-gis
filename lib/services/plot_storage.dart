import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../models/land_plot.dart';

/// Loads and saves [LandPlot]s locally via shared_preferences.
class PlotStorage {
  static const _key = 'saved_plots_v1';

  Future<List<LandPlot>> loadPlots() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_key);
    if (raw == null || raw.isEmpty) return [];
    try {
      final list = jsonDecode(raw) as List;
      return list
          .map((e) => LandPlot.fromJson(e as Map<String, dynamic>))
          .toList()
        ..sort((a, b) => b.createdAt.compareTo(a.createdAt));
    } catch (_) {
      return [];
    }
  }

  Future<void> savePlots(List<LandPlot> plots) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      _key,
      jsonEncode(plots.map((p) => p.toJson()).toList()),
    );
  }

  Future<void> upsertPlot(LandPlot plot) async {
    final plots = await loadPlots();
    plots.removeWhere((p) => p.id == plot.id);
    plots.add(plot);
    await savePlots(plots);
  }

  Future<void> deletePlot(String id) async {
    final plots = await loadPlots();
    plots.removeWhere((p) => p.id == id);
    await savePlots(plots);
  }
}
