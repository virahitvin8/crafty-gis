/* ═══════════════════════════════════════════════════════════
   Crafty GIS — Analysis Pipeline Module
   ═══════════════════════════════════════════════════════════ */

const FH_ANALYSIS = (function() {
  'use strict';

  const { $, toast, showLoading, hideLoading, areaHa, downloadBlob } = FH_UTILS;
  const { CROPS, HEALTH_CLASSES, YIELD_COEFFICIENTS, ALERT_THRESHOLDS } = FH_CONFIG;
  const { getSHGeoJSON, fetchMLStressSimple } = FH_API;
  const { renderResults, renderHealthChart, renderAdvice, renderTSChart, showChangeDetection, renderYieldProjection, renderPestRiskCards, renderAlerts, renderGISMetadata } = FH_UI;
  const { predictStress, generateDecisionSupport } = FH_ML;
  const { polygonCentroid, formatCoord, decimalToDMS } = FH_GIS;

  // ─── Data source tracking ───
  let usedDataSource = 'sentinel-hub';

  // ─── Shared state reference ───
  let _state = null;

  function setStateRef(state) {
    _state = state;
  }

  // ═══════════ ADVICE ENGINE ═══════════
  function generateAdvice(analysisData) {
    const { crop, cnt, cc } = analysisData;
    const prob = (cc[0] + cc[1] + cc[2]) / cnt * 100;
    const w = _state.weatherData;
    const t = _state.terrainData;
    let parts = [];

    if (prob > 40)
      parts.push(`[CRITICAL] <b>${prob.toFixed(1)}% of your ${crop.name} field is stressed.</b> Immediate action needed. Check soil moisture and leaf conditions in red/orange zones.`);
    else if (prob > 15)
      parts.push(`[WARNING] <b>Some patches (${prob.toFixed(1)}%) need attention.</b> Spot-treat the orange/red zones with irrigation or nutrients.`);
    else
      parts.push(`[OK] <b>Your ${crop.name} field looks great!</b> ${(100 - prob).toFixed(1)}% shows good vigour.`);

    if (w?.forecast?.current) {
      const temp = w.forecast.current.temperature_2m;
      if (temp > 38) parts.push(`[TEMP] <b>Heat stress alert!</b> Temperature is ${temp.toFixed(1)}°C. Consider evening irrigation.`);
      if (temp < 5) parts.push(`[FROST] <b>Frost risk!</b> Temperature is ${temp.toFixed(1)}°C. Protect sensitive crops.`);
    }

    if (t && t.avgSlope > 5)
      parts.push(`[TERRAIN] <b>Sloped terrain (${t.avgSlope.toFixed(1)}°):</b> Risk of water runoff. Consider contour farming.`);

    return parts;
  }

  // ═══════════ LAYER SWITCHING ── triggers re-render via API ═══════════
  async function switchLayer(layer) {
    _state.currentIndex = layer;
    if ($('layerSelect')) $('layerSelect').value = layer;
    // Keep the split-view bar label in sync while comparing
    if (_state.compareMode && FH_MAP && FH_MAP.updateCompareLabel) {
      FH_MAP.updateCompareLabel();
    }
    const { INDEX_INFO } = FH_CONFIG;
    // Handle 'sar' alias — INDEX_INFO uses 'smmi' key
    const infoKey = layer === 'sar' ? 'smmi' : layer;
    $('layerInfo').textContent = INDEX_INFO[infoKey]?.desc || 'Advanced map layer.';

    if (_state.analysisData) {
      showLoading('Fetching visualization…');
      try {
        const crop = CROPS[$('cropSelect')?.value] || CROPS.generic;
        
        // Handle SAR specifically via Earth Engine Proxy for raw data, but render via Sentinel Hub
        if (layer === 'sar') {
          const sarData = await FH_API.fetchSAR();
          if (sarData && sarData.moistureIndex !== undefined) {
            const pct = (sarData.moistureIndex * 100).toFixed(0);
            toast(`Soil Moisture: ${pct}% (${sarData.date})`);
            FH_UI.updateLegend('sar', sarData.date, 'Sentinel-1 SAR');
          } else {
            toast('SAR data unavailable via GEE, using visual Sentinel Hub map only', 'info');
            FH_UI.updateLegend('sar', new Date().toISOString().split('T')[0], 'Sentinel-1 SAR');
          }
          await FH_API.renderGrid('sar', new Date().toISOString().split('T')[0], crop.peak);
        } else {
          // Standard Optical and Thermal layers
          await FH_API.renderGrid(layer, _state.analysisData.seed, crop.peak);
          const dateStr = _state.selectedScene ? _state.selectedScene.date : '';
          let satName = 'Sentinel-2 L2A';
          if (layer === 'tvdi') satName = 'Landsat-8 L1C';
          FH_UI.updateLegend(layer, dateStr, satName);
        }
      } catch (e) {
        toast('Failed to load layer', 'err');
      }
      hideLoading();
    }
  }

  // ═══════════ PROFESSIONAL ANALYSIS PIPELINE (GEE) ═══════════
  // Continuous cloud-free composite + clipped SRTM terrain + ML stress
  // decision + trends + zone features — the full end-to-end analysis.
  let _proData = null;

  function renderProIndex(stats, key, name) {
    if (!stats || stats.mean === null || stats.mean === undefined) return '';
    const m = stats.mean;
    const health = m >= 0.6 ? 'var(--healthy)' : m >= 0.4 ? 'var(--moderate)' : m >= 0.2 ? 'var(--below)' : 'var(--poor)';
    return `<div class="stat"><div class="val" style="color:${health};font-size:1.05rem">${m.toFixed(3)}</div><div class="lbl">${name} (mean)</div><div class="hint" style="font-size:0.58rem">p25 ${stats.p25?.toFixed(2)} · p75 ${stats.p75?.toFixed(2)} · ±${stats.std?.toFixed(2)}</div></div>`;
  }

  // Main professional analysis runner
  // opts.silent — when true, runs in the background (no loading overlay /
  //   toasts) so it can be chained automatically from runFullAnalysis.
  async function runProfessionalAnalysis(opts) {
    const silent = opts && opts.silent;
    if (!_state.fieldPoly) {
      if (!silent) return toast('First select your field!', 'err');
      return;
    }
    const btn = $('proAnalyzeBtn');
    if (btn && !silent) { btn.disabled = true; btn.textContent = '⏳ Analyzing (GEE)…'; }

    // Show a live "running" status in the pro card immediately (both modes).
    const proCard = $('proCard');
    const proSummary = $('proSummary');
    const proResults = $('proResults');
    if (proCard) proCard.style.display = '';
    if (proSummary) proSummary.innerHTML = '<b>⏳ Running continuous GEE analysis…</b>';
    if (proResults) proResults.style.display = '';

    try {
      if (!silent) showLoading('Running continuous GEE analysis…', 15);
      const coords = _state.fieldLL.map(ll => [ll[0], ll[1]]);

      // 1. Full analysis: composite indices + clipped terrain + zones + trends
      if (!silent) showLoading('Composite + terrain + zones…', 35);
      const full = await FH_API.fetchFullAnalysis({ coordinates: coords, monthsBack: 4 });
      if (!full || !full.success) throw new Error('GEE full analysis returned no data. Is the backend running with GEE credentials?' + (full && full.error ? ': ' + full.error : ''));

      // 2. ML stress prediction (the backend always returns a prediction via
      //    the trained RF, or its default rules model when untrained).
      if (!silent) showLoading('ML stress decision…', 65);
      let ml = await FH_API.fetchMLStress({ coordinates: coords });
      if (!ml || !ml.success) ml = null;

      _proData = { full, ml, coords };
      renderProfessionalAnalysis();

      // Also store the professional stats into the shared state so the classic
      // dashboard & reports can use the real continuous values.
      _state.proAnalysis = full;
      _state.mlStress = ml;

      if (!silent) {
        hideLoading();
        toast('Professional analysis complete — continuous GEE + clipped terrain + ML');
      } else {
        toast('📈 Continuous GEE analysis ready (clipped terrain + ML)');
      }
    } catch (e) {
      if (!silent) hideLoading();
      console.error('Professional analysis failed:', e);
      // Background runs fail quietly — keep the pro card hidden rather than
      // surfacing an error over a successful classic analysis.
      if (silent) {
        if (proCard) proCard.style.display = 'none';
        return;
      }
      toast('⚠️ ' + e.message, 'err');
    } finally {
      if (btn && !silent) { btn.disabled = false; btn.textContent = '🧪 Run Professional Analysis'; }
    }
  }

  function renderProfessionalAnalysis() {
    const el = $('proResults');
    const card = $('proCard');
    if (!el || !card) return;
    card.style.display = '';
    el.style.display = '';

    const full = _proData.full;
    const ml = _proData.ml;
    const s = full.stats || {};

    // Summary line
    const area = full.areaHa ? full.areaHa.toFixed(2) + ' ha' : '—';
    const scenes = full.timeRange?.scenesUsed ?? '—';
    $('proSummary').innerHTML =
      `<b>Field:</b> ${area} · <b>Scenes composited:</b> ${scenes} (${full.timeRange?.start || '—'} → ${full.timeRange?.end || '—'})<br>` +
      `<b>Source:</b> Google Earth Engine · Sentinel-2 L2A, cloud-masked median · SRTM DEM 30m · <b>fully clipped to your boundary</b>`;

    // Indices grid
    $('proIndexStats').innerHTML =
      renderProIndex(s.ndvi, 'ndvi', 'NDVI') +
      renderProIndex(s.ndwi, 'ndwi', 'NDWI') +
      renderProIndex(s.evi, 'evi', 'EVI') +
      renderProIndex(s.savi, 'savi', 'SAVI') +
      renderProIndex(s.ndmi, 'ndmi', 'NDMI');

    // Terrain
    const e = s.elevation || {}, sl = s.slope || {}, as = s.aspect || {};
    const slopeClass = sl.mean > 5 ? '<b style="color:var(--orange)">Well-drained / erosion risk</b>' : sl.mean > 2 ? '<b style="color:var(--moderate)">Moderate drainage</b>' : '<b style="color:var(--green)">Poor drainage / flat</b>';
    $('proTerrain').innerHTML =
      `Elevation: <b>${e.mean?.toFixed(1) || '—'} m</b> (${e.p0?.toFixed(0) || '—'} – ${e.p100?.toFixed(0) || '—'} m) · ±${e.std?.toFixed(1) || '—'} m<br>` +
      `Slope: <b>${sl.mean?.toFixed(2) || '—'}°</b> (max ${sl.p100?.toFixed(1) || '—'}°) — ${slopeClass}<br>` +
      `Aspect: <b>${as.mean?.toFixed(0) || '—'}°</b> (facing ${aspectName(as.mean)})<br>` +
      `<span style="font-size:0.65rem;color:var(--text-faint)">SRTM DEM clipped to the exact polygon — the field is fully delineated from the surrounding area.</span>`;

    // ML decision — G3: merged advisory (rules + ML confidence) shown first
    if (ml && ml.success) {
      const conf = (ml.confidence * 100).toFixed(0);
      // Advisory now merges rule thresholds + ML confidence into one verdict.
      const mergedText = ml.reasoning || '';
      const adv = (ml.advice || '').replace(/<b>/g, '').replace(/<\/b>/g, '').substring(0, 300);
      const agreeBadge = ml.agreement === false
        ? `<span style="background:#FF9F1C;color:#fff;padding:2px 8px;border-radius:10px;font-size:0.62rem">⚠ signals differ</span>`
        : `<span style="background:#2E8B57;color:#fff;padding:2px 8px;border-radius:10px;font-size:0.62rem">✓ rules + ML agree</span>`;
      $('proML').innerHTML =
        `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap">` +
        `<span style="background:${ml.color || '#888'};color:#fff;padding:3px 10px;border-radius:12px;font-weight:700;font-size:0.72rem">${ml.label}</span>` +
        `<span style="font-size:0.68rem;color:var(--text-muted)">RF confidence ${conf}% · ${ml.model || 'field-trained'}</span> ${agreeBadge}</div>` +
        `<div style="font-size:0.7rem;color:var(--text-muted);margin-bottom:4px">${mergedText}</div>` +
        `<span style="font-size:0.72rem;color:var(--text)">${adv}</span>` +
        `<div style="margin-top:6px;font-size:0.62rem;color:var(--text-faint)">Features: NDVI ${ml.features?.[0]?.toFixed?.(2) ?? ml.features?.[0] ?? '—'} · NDWI ${ml.features?.[1]?.toFixed?.(2) ?? '—'} · slope ${ml.features?.[7]?.toFixed?.(1) ?? '—'}°</div>`;
    } else {
      $('proML').innerHTML = `<span style="color:var(--orange)">ML unavailable (backend/GEE down) — using rule-based class from composite.</span>`;
    }

    // Trends
    const t = full.trends || {};
    $('proTrends').innerHTML =
      `NDVI slope: <b>${(t.ndviPerDay * 1000).toFixed(2)}</b>‰/day (${t.ndviPerDay >= 0 ? 'improving' : 'declining'}) · ` +
      `NDWI slope: <b>${(t.ndwiPerDay * 1000).toFixed(2)}</b>‰/day · ${t.sampleCount || 0} cloud-free observations over the window`;

    // G6: Climate & water — CHIRPS rainfall + SAR soil moisture
    renderProClimate(full);

    // G7: Thermal stress — Landsat LST + CWSI
    renderProThermal(full);

    // G10: Regional comparison — field vs surrounding area
    renderProRegional(full);

    // Zone heatmap on the map (delineated field patches)
    renderZoneOverlay();

    // Research-derived: refresh the Disease Early Warning System with
    // the CHIRPS rainfall data that just arrived (proAnalysis.rainfall).
    try {
      if (window.FH_INTEL && window.FH_INTEL.computeDiseaseEWS) {
        FH_INTEL.computeDiseaseEWS();
        FH_INTEL.renderSurveillance();
      }
    } catch (e) { console.warn('[ProAnalysis] EWS refresh skipped:', e.message); }
  }

  // G6 — rainfall (CHIRPS) + soil moisture (Sentinel-1 SAR)
  function renderProClimate(full) {
    const el = $('proClimate');
    if (!el) return;
    const rain = full.rainfall;
    const soil = full.soilMoisture;
    if (!rain && !soil) { el.innerHTML = '<span style="color:var(--text-faint);font-size:0.65rem">Climate/water unavailable.</span>'; return; }
    let html = '';
    if (rain) {
      const months = (rain.monthly || []).map(m => `<b>${m.month}:</b> ${m.mm} mm`).join(' · ') || '—';
      html += `🌧️ <b>CHIRPS rainfall (${rain.days || '—'}d window):</b> <b style="color:var(--green-light)">${rain.total_mm ?? '—'} mm</b><br><span style="font-size:0.62rem;color:var(--text-faint)">Monthly: ${months}</span>`;
    }
    if (soil) {
      const mi = soil.moistureIndex;
      const miColor = mi === null ? 'var(--text-faint)' : mi >= 0.6 ? 'var(--green)' : mi >= 0.35 ? 'var(--moderate)' : 'var(--poor)';
      html += `<br>🛰️ <b>SAR soil moisture (Sentinel-1):</b> <b style="color:${miColor}">${mi === null ? 'n/a' : (mi * 100).toFixed(0) + '%'}</b>` +
        ` <span style="font-size:0.62rem;color:var(--text-faint)">VV ${soil.vv_db ?? '—'} dB · ${soil.sceneCount || 0} scenes · ${soil.dateRange?.start} → ${soil.dateRange?.end}</span>`;
    }
    el.innerHTML = html;
  }

  // G7 — Landsat surface temperature + approximate CWSI
  function renderProThermal(full) {
    const el = $('proThermal');
    if (!el) return;
    const th = full.thermal;
    if (!th || th.lst_c == null) { el.innerHTML = '<span style="color:var(--text-faint);font-size:0.65rem">Thermal (Landsat) unavailable in this window.</span>'; return; }
    const cwsi = th.cwsi;
    const cwsiColor = cwsi === null ? 'var(--text-faint)' : cwsi >= 0.65 ? 'var(--poor)' : cwsi >= 0.35 ? 'var(--moderate)' : 'var(--green)';
    const cwsiWord = cwsi === null ? 'n/a' : cwsi >= 0.65 ? 'heat-stressed' : cwsi >= 0.35 ? 'moderate' : 'well-watered';
    el.innerHTML =
      `🌡️ <b>LST:</b> <b style="color:${cwsiColor}">${th.lst_c}°C</b> (p5 ${th.p5_c ?? '—'}° · p95 ${th.p95_c ?? '—'}° · max ${th.p100_c ?? '—'}°)<br>` +
      `💧 <b>CWSI (approx):</b> <b style="color:${cwsiColor}">${cwsi === null ? 'n/a' : cwsi.toFixed(2)}</b> — ${cwsiWord}<br>` +
      `<span style="font-size:0.62rem;color:var(--text-faint)">Landsat 8/9 C2 L2 · approximation from field thermal range (no in-situ IRT)</span>`;
  }

  // G10 — field vs surrounding region
  function renderProRegional(full) {
    const el = $('proRegional');
    if (!el) return;
    const r = full.regional;
    if (!r || r.field?.ndvi === null || r.field?.ndvi === undefined) { el.innerHTML = '<span style="color:var(--text-faint);font-size:0.65rem">Regional comparison unavailable.</span>'; return; }
    const d = r.deltas || {};
    const vColor = d.ndvi >= 0.02 ? 'var(--green)' : d.ndvi <= -0.02 ? 'var(--poor)' : 'var(--moderate)';
    const vWord = r.verdict === 'field_better' ? 'better than' : r.verdict === 'field_worse' ? 'worse than' : 'on par with';
    el.innerHTML =
      `📊 <b>Your field NDVI ${d.ndvi >= 0 ? '▲' : '▼'} ${vWord} the local area.</b><br>` +
      `<span style="font-size:0.7rem">Field NDVI <b style="color:${vColor}">${r.field.ndvi?.toFixed(3) ?? '—'}</b> · Region NDVI ${r.region.ndvi?.toFixed(3) ?? '—'} ` +
      `(${d.ndviPct === null ? '—' : (d.ndviPct - 100) >= 0 ? '+' + (d.ndviPct - 100).toFixed(1) : (d.ndviPct - 100).toFixed(1)}%) · ` +
      `Rain: field ${r.field.rainfall_mm ?? '—'} mm vs region ${r.region.rainfall_mm ?? '—'} mm</span>`;
  }

  function aspectName(deg) {
    if (deg === null || deg === undefined) return '—';
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return dirs[Math.round(((deg % 360) / 45)) % 8];
  }

  // Draws the ML zone grid on the map so the field's real patches are visible
  function renderZoneOverlay() {
    if (!_proData || !_proData.full || !_state.map) return;
    const zones = _proData.full.zones || [];
    if (!zones.length || !window.FH_MAP || !FH_MAP.clearZoneOverlay) return;
    FH_MAP.clearZoneOverlay();
    const layer = FH_MAP.getZoneLayer();
    if (!layer) return;
    const peak = (_state.analysisData?.crop?.peak) || 0.8;
    zones.forEach(z => {
      if (z.ndvi === null || z.ndvi === undefined) return;
      const cls = FH_API.valueToClassColor(z.ndvi, 'ndvi', peak);
      const halfLat = (z.cellH || 0.003) / 2;
      const halfLng = (z.cellW || 0.003) / 2;
      L.rectangle([
        [z.lat - halfLat, z.lng - halfLng],
        [z.lat + halfLat, z.lng + halfLng]
      ], {
        color: cls.color, weight: 0.5, opacity: 0.7,
        fillColor: cls.color, fillOpacity: 0.5
      }).bindTooltip(
        `<b>Zone ${z.id}</b><br>NDVI: ${z.ndvi.toFixed(3)} · NDWI: ${z.ndwi?.toFixed(3) ?? '—'}<br>Elev: ${z.elevation?.toFixed(0) ?? '—'} m · Slope: ${z.slope?.toFixed(1) ?? '—'}°`,
        { sticky: true, className: 'ndvi-tooltip' }
      ).addTo(layer);
    });
  }

  // Export zone-feature CSV (ML training table / VBA report input)
  async function exportProZoneCSV() {
    const csv = await FH_API.fetchZoneCSV({ coordinates: _proData?.coords || _state.fieldLL.map(ll => [ll[0], ll[1]]) });
    if (!csv) return toast('Zone CSV failed — is the backend up?', 'err');
    downloadBlob(csv, 'crafty_gis_zone_features.csv', 'text/csv');
    toast('Zone features CSV exported — ready for Excel/VBA report');
  }

  // Export a complete report CSV: one row per date with all parameters
  async function exportProReportCSV() {
    const full = _proData?.full || _state.proAnalysis;
    if (!full) return toast('Run Professional Analysis first', 'err');
    const s = full.stats || {};
    const rows = [];
    const pick = (o, k) => (o && o[k] !== null && o[k] !== undefined) ? +o[k].toFixed(5) : '';
    const header = ['date', 'ndvi', 'ndwi', 'evi', 'savi', 'ndmi', 'elevation_m', 'slope_deg', 'aspect_deg', 'area_ha', 'scenes_used'];
    rows.push(header.join(','));
    (full.timeSeries || []).forEach(p => {
      rows.push([p.date, pick({ ndvi: p.ndvi }, 'ndvi'), pick({ ndwi: p.ndwi }, 'ndwi'), '', '', '', '', '', '', '', ''].join(','));
    });
    // Summary row
    rows.push(['SUMMARY', pick(s.ndvi, 'mean'), pick(s.ndwi, 'mean'), pick(s.evi, 'mean'), pick(s.savi, 'mean'), pick(s.ndmi, 'mean'), pick(s.elevation, 'mean'), pick(s.slope, 'mean'), pick(s.aspect, 'mean'), full.areaHa ? +full.areaHa.toFixed(2) : '', full.timeRange?.scenesUsed || ''].join(','));
    downloadBlob(rows.join('\n'), 'crafty_gis_analysis_report.csv', 'text/csv');
    toast('Analysis report CSV exported — import into Excel and run the VBA report macro');
  }

  // Retrain the ML stress model on this field's zone features
  // G5: real ground-truth labels now override rule thresholds during training.
  async function retrainProModel() {
    const btn = document.querySelector('[onclick="FH.retrainProModel()"]');
    if (btn) btn.textContent = '⏳ Training…';
    try {
      const res = await FH_API.fetchMLTrain({ coordinates: _state.fieldLL.map(ll => [ll[0], ll[1]]), gridSize: 8 });
      if (!res || !res.success) throw new Error(res?.error || 'Train failed');
      toast(`ML model retrained on ${res.zonesTrained} zones (${res.samples} samples${res.groundTruthUsed ? ', ' + res.groundTruthUsed + ' ground-truth labels used' : ''})`);
      // Re-predict with the fresh model
      const ml = await FH_API.fetchMLStress({ coordinates: _state.fieldLL.map(ll => [ll[0], ll[1]]) });
      if (ml && ml.success) { _state.mlStress = ml; _proData.ml = ml; }
      if (_proData) renderProfessionalAnalysis();
      refreshGroundTruthCount();
    } catch (e) {
      toast('⚠️ ' + e.message, 'err');
    } finally {
      if (btn) btn.textContent = '🔁 Retrain ML';
    }
  }

  // ═══════════ G5: GROUND-TRUTH LABEL COLLECTION ═══════════
  // Farmer verifies the TRUE stress class of their field — stored with the
  // zone feature vector so retraining learns from reality, not just rules.
  async function submitGroundTruth() {
    if (!_state.fieldPoly) return toast('First select your field!', 'err');
    const observedClass = parseInt($('gtClassSelect')?.value, 10);
    if (isNaN(observedClass)) return toast('Pick an observed stress class', 'err');
    const btn = $('gtSubmitBtn');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Saving label…'; }
    try {
      const center = _state.fieldCenter;
      const res = await FH_API.submitGroundTruthLabel({
        coordinates: _state.fieldLL.map(ll => [ll[0], ll[1]]),
        observedClass,
        lat: center ? center[0] : null,
        lng: center ? center[1] : null,
        notes: $('gtNotes')?.value || '',
        reporter: $('gtReporter')?.value || '',
        gridSize: 8
      });
      if (!res || !res.success) throw new Error(res?.error || 'Label save failed');
      toast(`✅ Ground-truth saved (${res.saved?.label}). Total labels: ${res.totalLabels}`);
      $('gtNotes').value = '';
      refreshGroundTruthCount();
    } catch (e) {
      toast('⚠️ ' + e.message, 'err');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '📝 Save Ground-Truth Label'; }
    }
  }

  // Show how many farmer-verified labels are stored (feeds retraining)
  async function refreshGroundTruthCount() {
    const el = $('gtCount');
    if (!el) return;
    const res = await FH_API.fetchGroundTruthLabels();
    if (res && res.success) {
      el.textContent = `${res.count} ground-truth label(s) stored — retraining uses them over rule thresholds`;
    } else {
      el.textContent = 'Ground-truth store unavailable (backend offline?)';
    }
  }

  // ═══════════ G8: IN-BROWSER PDF REPORT ═══════════
  // Generates a professional A4 report from the professional analysis data.
  // Falls back to browser print (Save as PDF) if jsPDF isn't loaded.
  function exportPDFReport() {
    const full = _proData?.full || _state.proAnalysis;
    const ml = _proData?.ml || _state.mlStress;
    if (!full) return toast('Run analysis first', 'err');

    if (typeof window.jspdf === 'undefined') {
      // jsPDF not loaded (offline / CDN blocked) — offer print dialog instead
      const w = window.open('', '_blank');
      if (!w) return toast('Popup blocked — allow popups to export the PDF', 'err');
      w.document.write(buildHTMLReport(full, ml));
      w.document.close();
      setTimeout(() => { try { w.print(); } catch (e) {} }, 400);
      return toast('Print dialog opened — choose "Save as PDF"');
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();
    const M = 40;
    let y = 50;
    const s = full.stats || {};

    const heading = (text, size) => { doc.setFontSize(size || 13); doc.setTextColor(33, 122, 62); doc.text(text, M, y); y += 18; };
    const text = (t, size, color) => { doc.setFontSize(size || 10); doc.setTextColor(color || 50); const lines = doc.splitTextToSize(String(t), W - 2 * M); doc.text(lines, M, y); y += lines.length * (size || 10) + 4; };
    const rule = () => { y += 6; doc.setDrawColor(200); doc.line(M, y, W - M, y); y += 10; };

    // Header
    doc.setFillColor(15, 26, 18); doc.rect(0, 0, W, 90, 'F');
    doc.setFontSize(20); doc.setTextColor(255, 255, 255); doc.text('Crafty GIS — Professional Field Report', M, 45);
    doc.setFontSize(9); doc.setTextColor(160, 200, 170);
    doc.text('Precision Satellite Crop Monitor · Google Earth Engine · ' + new Date().toLocaleString(), M, 63);
    doc.text(`Field: ${full.areaHa ? full.areaHa.toFixed(2) + ' ha' : '—'} · Composite ${full.timeRange?.start || '—'} → ${full.timeRange?.end || '—'} · Scenes: ${full.timeRange?.scenesUsed ?? '—'}`, M, 76);
    y = 110;

    heading('1. Vegetation Indices (cloud-free composite, clipped to boundary)');
    [['NDVI', s.ndvi], ['NDWI', s.ndwi], ['EVI', s.evi], ['SAVI', s.savi], ['NDMI', s.ndmi]].forEach(([name, st]) => {
      if (st && st.mean !== null && st.mean !== undefined)
        text(`${name}: mean ${st.mean.toFixed(3)}  (p25 ${(st.p25 ?? 0).toFixed(2)} · p75 ${(st.p75 ?? 0).toFixed(2)} · ±${(st.std ?? 0).toFixed(2)})`, 9.5);
    });
    rule();

    heading('2. Terrain (SRTM DEM clipped to exact boundary)');
    text(`Elevation ${s.elevation?.mean?.toFixed(1) ?? '—'} m (${s.elevation?.p0?.toFixed(0) ?? '—'}–${s.elevation?.p100?.toFixed(0) ?? '—'} m) · Slope ${s.slope?.mean?.toFixed(2) ?? '—'}° (max ${s.slope?.p100?.toFixed(1) ?? '—'}°) · Aspect ${s.aspect?.mean?.toFixed(0) ?? '—'}°`, 9.5);
    rule();

    heading('3. ML Stress Decision (Random Forest + rules merged)');
    if (ml && ml.success) {
      text(`Class: ${ml.label} · Confidence ${(ml.confidence * 100).toFixed(0)}% · ${ml.model || ''}`, 10, ml.color ? hexToRgb(ml.color) : 50);
      text((ml.reasoning || '').replace(/<[^>]+>/g, '') + (ml.advice || '').replace(/<[^>]+>/g, ''), 9);
    } else {
      text('ML decision unavailable (backend/GEE offline).', 9, 150);
    }
    rule();

    heading('4. Trends (continuity)');
    text(`NDVI slope ${((full.trends?.ndviPerDay || 0) * 1000).toFixed(2)}‰/day · NDWI slope ${((full.trends?.ndwiPerDay || 0) * 1000).toFixed(2)}‰/day · ${full.trends?.sampleCount || 0} cloud-free observations`, 9.5);
    rule();

    heading('5. Climate & Water');
    if (full.rainfall) text(`CHIRPS rainfall: ${full.rainfall.total_mm ?? '—'} mm over ${full.rainfall.days || '—'} days`, 9.5);
    if (full.soilMoisture) text(`SAR soil moisture (Sentinel-1): ${full.soilMoisture.moistureIndex === null ? 'n/a' : (full.soilMoisture.moistureIndex * 100).toFixed(0) + '%'}`, 9.5);
    rule();

    heading('6. Thermal Stress (Landsat)');
    if (full.thermal && full.thermal.lst_c !== null)
      text(`LST ${full.thermal.lst_c}°C · CWSI ${full.thermal.cwsi === null ? 'n/a' : full.thermal.cwsi.toFixed(2)}`, 9.5);
    else
      text('Thermal unavailable in window.', 9, 150);
    rule();

    heading('7. Regional Comparison (field vs local area)');
    if (full.regional && full.regional.field?.ndvi !== undefined && full.regional.field?.ndvi !== null)
      text(`Field NDVI ${full.regional.field.ndvi.toFixed(3)} vs region ${full.regional.region.ndvi?.toFixed(3) ?? '—'} (${full.regional.verdict || '—'})`, 9.5);
    else
      text('Regional comparison unavailable.', 9, 150);
    rule();

    // Zones summary table
    heading('8. Zone Summary (per-patch health)');
    const zones = full.zones || [];
    if (zones.length) {
      if (doc.autoTable) {
        doc.autoTable({
          startY: y,
          head: [['Zone', 'NDVI', 'NDWI', 'Slope°', 'Elev m', 'Trend ‰/d']],
          body: zones.slice(0, 30).map(z => [
            z.id, (z.ndvi ?? 0).toFixed(3), (z.ndwi ?? 0).toFixed(3),
            (z.slope ?? 0).toFixed(1), (z.elevation ?? 0).toFixed(0),
            ((z.ndvi_trend ?? 0) * 1000).toFixed(1)
          ]),
          margin: { left: M, right: M },
          styles: { fontSize: 8 },
          headStyles: { fillColor: [33, 122, 62] }
        });
        y = doc.lastAutoTable.finalY + 20;
      } else {
        text(`${zones.length} zones analysed — full table in the CSV export.`, 9);
      }
    }
    rule();

    // Senior GIS: Geospatial metadata section
    heading('0. Geospatial Metadata');
    if (full.gis) {
      text(`CRS: ${full.gis.crs || 'EPSG:4326 WGS 84'} · UTM: ${full.gis.utmZone || 'Auto-detected'}`, 9.5);
      text(`Area: ${full.gis.areaHa?.toFixed(2) || '—'} ha (${full.gis.areaM2?.toFixed(0) || '—'} m²) · Perimeter: ${full.gis.perimeterKm?.toFixed(3) || '—'} km`, 9.5);
      if (full.gis.centroid) {
        const latDMS = FH_GIS ? FH_GIS.decimalToDMS(full.gis.centroid[0], false) : null;
        const lngDMS = FH_GIS ? FH_GIS.decimalToDMS(full.gis.centroid[1], true) : null;
        text(`Centroid: ${latDMS?.formatted || full.gis.centroid[0]}, ${lngDMS?.formatted || full.gis.centroid[1]}`, 9.5);
      }
      text(`BBox: ${full.gis.bbox ? `${full.gis.bbox.south.toFixed(4)}°S → ${full.gis.bbox.north.toFixed(4)}°N, ${full.gis.bbox.west.toFixed(4)}°E → ${full.gis.bbox.east.toFixed(4)}°E` : '—'}`, 9.5);
      text(`Vertices: ${full.gis.coordCount || 0} · Winding: ${full.gis.windingOrder || '—'}`, 9.5);
      if (full.gis.coordValid === false) {
        text(`⚠ Coordinate issues: ${(full.gis.coordErrors || []).join(', ')}`, 9, 200);
      }
    } else {
      text('No geospatial metadata available.', 9, 150);
    }
    rule();

    text('Generated by Crafty GIS — free satellite crop monitoring. Data: Google Earth Engine.', 8, 130);
    doc.save('crafty_gis_report_' + new Date().toISOString().slice(0, 10) + '.pdf');
    toast('📄 PDF report downloaded');
  }

  // Minimal HTML fallback report (used when jsPDF CDN is unavailable)
  function buildHTMLReport(full, ml) {
    const s = full.stats || {};
    const esc = (v) => String(v ?? '—');
    const rows = [['NDVI', s.ndvi?.mean?.toFixed(3)], ['NDWI', s.ndwi?.mean?.toFixed(3)], ['EVI', s.evi?.mean?.toFixed(3)],
                  ['SAVI', s.savi?.mean?.toFixed(3)], ['NDMI', s.ndmi?.mean?.toFixed(3)],
                  ['Elevation (m)', s.elevation?.mean?.toFixed(1)], ['Slope (°)', s.slope?.mean?.toFixed(2)],
                  ['Rainfall (mm)', full.rainfall?.total_mm], ['SAR soil moisture', full.soilMoisture?.moistureIndex === null ? '—' : (full.soilMoisture.moistureIndex * 100).toFixed(0) + '%'],
                  ['LST (°C)', full.thermal?.lst_c], ['CWSI', full.thermal?.cwsi?.toFixed(2)]].map(r =>
      `<tr><td><b>${r[0]}</b></td><td>${esc(r[1])}</td></tr>`).join('');
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Crafty GIS Report</title>` +
      `<style>body{font-family:Inter,Arial,sans-serif;padding:32px;color:#222}h1{color:#1a7a3a;border-bottom:2px solid #1a7a3a;padding-bottom:8px}` +
      `table{border-collapse:collapse;width:100%;margin:14px 0}td,th{border:1px solid #ccc;padding:6px 10px;font-size:13px}` +
      `th{background:#eef7ee}.badge{display:inline-block;padding:4px 12px;border-radius:12px;color:#fff;font-weight:700}</style></head><body>` +
      `<h1>🛰️ Crafty GIS — Professional Field Report</h1>` +
      `<p>${new Date().toLocaleString()} · Field ${full.areaHa ? full.areaHa.toFixed(2) + ' ha' : '—'} · Composite ${full.timeRange?.start || '—'} → ${full.timeRange?.end || '—'} · Scenes ${full.timeRange?.scenesUsed ?? '—'}</p>` +
      (ml && ml.success ? `<p><span class="badge" style="background:${ml.color || '#888'}">${ml.label}</span> &nbsp;RF confidence ${(ml.confidence * 100).toFixed(0)}% · ${ml.model || ''}</p>` +
        `<p style="font-size:14px">${(ml.reasoning || '') + (ml.advice || '')}</p>` : '') +
      `<h2>Parameters</h2><table>${rows}</table>` +
      (full.trends ? `<h2>Trends</h2><p>NDVI ${((full.trends.ndviPerDay || 0) * 1000).toFixed(2)}‰/day · NDWI ${((full.trends.ndwiPerDay || 0) * 1000).toFixed(2)}‰/day · ${full.trends.sampleCount || 0} obs</p>` : '') +
      (full.regional ? `<h2>Regional</h2><p>Field NDVI ${full.regional.field?.ndvi?.toFixed(3) ?? '—'} vs region ${full.regional.region?.ndvi?.toFixed(3) ?? '—'} — ${full.regional.verdict || '—'}</p>` : '') +
      `<h2>Zones (${full.zones?.length || 0})</h2>` +
      (full.zones?.length ? `<table><tr><th>Zone</th><th>NDVI</th><th>NDWI</th><th>Slope</th><th>Elev</th></tr>` +
        full.zones.slice(0, 50).map(z => `<tr><td>${z.id}</td><td>${z.ndvi?.toFixed(3) ?? '—'}</td><td>${z.ndwi?.toFixed(3) ?? '—'}</td><td>${z.slope?.toFixed(1) ?? '—'}</td><td>${z.elevation?.toFixed(0) ?? '—'}</td></tr>`).join('') +
        `</table>` : '<p>No zones</p>') +
      `</body></html>`;
  }

  // hex '#RRGGBB' → [r,g,b] for jsPDF setTextColor
  function hexToRgb(hex) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
    return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [50, 50, 50];
  }

  // ═══════════ EXPORTS ═══════════
  function exportCSV() {
    if (!_state.tsData.length) return toast('Run analysis in Researcher mode first', 'err');
    const headers = ['date', 'mean_ndvi'];
    const rows = _state.tsData.map(d => [d.date, d.ndvi.toFixed(4)]);
    downloadBlob([headers.join(','), ...rows.map(r => r.join(','))].join('\n'), 'crafty_gis_timeseries.csv', 'text/csv');
    toast('Timeseries CSV exported');
  }

  function exportGeoJSON() {
    if (!_state.analysisData) return toast('Run analysis first', 'err');
    const gj = JSON.stringify({
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        geometry: getSHGeoJSON(),
        properties: {
          name: 'Field Boundary',
          area_ha: areaHa(_state.fieldLL).toFixed(2),
          mean_ndvi: _state.analysisData.meanNdvi
        }
      }]
    }, null, 2);
    downloadBlob(gj, 'crafty_gis_field.geojson', 'application/json');
    toast('GeoJSON exported');
  }

  function copyReport() {
    const ad = _state.analysisData;
    if (!ad) return;
    const avg = ad.meanNdvi,
      prob = (ad.cc[0] + ad.cc[1] + ad.cc[2]) / ad.cnt * 100;
    const lines = [
      'Crafty GIS — Real Satellite Crop Monitor Report',
      `Date: ${new Date().toLocaleString()}`,
      `Crop: ${ad.crop.name} | Stage: ${ad.stage} | Scene: ${ad.seed}`,
      `Area: ${areaHa(_state.fieldLL).toFixed(2)} ha`,
      `True Mean NDVI: ${avg.toFixed(3)}`,
      `Problem Area: ${prob.toFixed(1)}%`
    ];
    navigator.clipboard.writeText(lines.join('\n'))
      .then(() => toast('Report copied to clipboard'))
      .catch(() => toast('Copy failed', 'err'));
  }

  function showFullReport() {
    const ad = _state.analysisData;
    if (!ad) return;
    const crop = ad.crop,
      avg = ad.meanNdvi;
    const prob = (ad.cc[0] + ad.cc[1] + ad.cc[2]) / ad.cnt * 100;
    const score = Math.round(Math.min(100, (avg / crop.peak) * 115));

    let html = `
      <div style="text-align:center;margin-bottom:16px">
        <div style="font-size:2rem">${crop.icon}</div>
        <h3 style="color:var(--green-light)">${crop.name} Field Health Report</h3>
        <div style="font-size:0.78rem;color:var(--text-dim)">${new Date().toLocaleString()} | Scene: ${ad.seed}</div>
      </div>
      <div class="stat-grid">
        <div class="stat"><div class="val">${avg.toFixed(3)}</div><div class="lbl">True Avg NDVI</div></div>
        <div class="stat"><div class="val ${score < 50 ? 'bad' : score < 70 ? 'warn' : ''}">${score}%</div><div class="lbl">Health Score</div></div>
        <div class="stat"><div class="val">${areaHa(_state.fieldLL).toFixed(2)}</div><div class="lbl">Area (ha)</div></div>
        <div class="stat"><div class="val ${prob > 30 ? 'bad' : prob > 15 ? 'warn' : ''}">${prob.toFixed(1)}%</div><div class="lbl">Problem Area</div></div>
      </div>
      <h4 style="color:var(--green-light);margin:16px 0 8px">Zone Distribution</h4>`;

    HEALTH_CLASSES.forEach((c, i) => {
      const p = (ad.cc[i] / ad.cnt * 100);
      html += `<div class="bar-row"><div class="bar-name">${c.name}</div><div class="bar-track"><div class="bar-fill" style="width:${p}%;background:${c.col}"></div></div><div class="bar-pct">${p.toFixed(1)}%</div></div>`;
    });

    $('reportBody').innerHTML = html;
    FH_UI.openModal('reportModal');
  }

  // ═══════════ YIELD PROJECTION ═══════════
  function yieldProjection(ndviPeak, cropType, areaHaField) {
    try {
      const coeffs = YIELD_COEFFICIENTS[cropType] || YIELD_COEFFICIENTS.generic;
      if (!ndviPeak || !coeffs) return null;
      
      // Yield = (NDVI_peak / NDVI_max) * max_yield * adjustment_factor
      // Adjustment accounts for stage, conditions
      const ndviRatio = Math.min(1, Math.max(0.1, ndviPeak / coeffs.peak));
      // Non-linear relationship: 10% drop in NDVI doesn't mean 10% drop in yield
      const yieldPerHa = coeffs.yieldMax * Math.pow(ndviRatio, 0.8);
      const totalYield = yieldPerHa * areaHaField;
      
      // Estimate confidence based on stage
      const stage = _state.analysisData?.stage || 'mid';
      let confidence = 'low';
      if (stage.includes('Peak') || stage.includes('late')) confidence = 'medium';
      if (_state.tsData.length > 3) confidence = (stage.includes('Peak') || stage.includes('late')) ? 'high' : 'medium';
      
      return {
        yieldPerHa: parseFloat(yieldPerHa.toFixed(1)),
        totalYield: parseFloat(totalYield.toFixed(1)),
        unit: coeffs.unit,
        cropName: coeffs.name,
        confidence,
        // Qualitative assessment
        rating: ndviRatio > 0.85 ? 'Excellent' :
                ndviRatio > 0.70 ? 'Good' :
                ndviRatio > 0.50 ? 'Average' :
                'Below average',
        // Value estimation (at $200/tonne average)
        estimatedValue: (totalYield * 200).toFixed(0),
        currency: 'USD'
      };
    } catch (e) {
      console.warn('Yield projection failed:', e);
      return null;
    }
  }

  // ═══════════ PEST RISK ASSESSMENT ═══════════
  async function pestRiskAssessment() {
    if (!_state.weatherData?.forecast?.current) return null;
    const c = _state.weatherData.forecast.current;
    const cropType = $('cropSelect').value;
    
    try {
      const result = await FH_API.fetchPestRisk(c.temperature_2m, c.relative_humidity_2m, cropType);
      _state.pestRiskData = result;
      return result;
    } catch (e) {
      console.warn('Pest risk assessment failed:', e);
      return null;
    }
  }

  // ═══════════ COMBINED STRESS & ALERTS ═══════════
  async function generateAlerts() {
    try {
      const ad = _state.analysisData;
      const w = _state.weatherData?.forecast?.current;
      if (!ad || !w) return [];
      
      const alerts = [];
      const avg = ad.meanNdvi;
      const prob = (ad.cc[0] + ad.cc[1] + ad.cc[2]) / ad.cnt * 100;
      
      // 1. NDVI critical alert
      if (avg < ALERT_THRESHOLDS.ndvi_critical) {
        alerts.push({ 
          level: 'critical', 
          icon: '[CRITICAL]',
          title: 'Critical NDVI',
          msg: `NDVI of ${avg.toFixed(2)} is critically low. Immediate irrigation/nutrient intervention needed.`,
          timestamp: new Date().toLocaleString()
        });
      } else if (avg < ALERT_THRESHOLDS.ndvi_warning) {
        alerts.push({ 
          level: 'warning', 
          icon: '[WARNING]',
          title: 'Low NDVI Warning',
          msg: `NDVI of ${avg.toFixed(2)} is below optimum. Consider irrigation or fertilizer.`,
          timestamp: new Date().toLocaleString()
        });
      }
      
      // 2. Problem area alert
      if (prob > 50) {
        alerts.push({ 
          level: 'critical', 
          icon: '[CRITICAL]',
          title: 'Large Problem Area',
          msg: `${prob.toFixed(0)}% of your field shows stress. Immediate scouting recommended.`,
          timestamp: new Date().toLocaleString()
        });
      } else if (prob > 30) {
        alerts.push({ 
          level: 'warning', 
          icon: '[WARNING]',
          title: 'Significant Stress Area',
          msg: `${prob.toFixed(0)}% of field stressed. Spot-check the red/orange zones.`,
          timestamp: new Date().toLocaleString()
        });
      }
      
      // 3. Temperature alert
      if (w.temperature_2m > ALERT_THRESHOLDS.temp_heat) {
        alerts.push({ 
          level: 'warning', 
          icon: '[TEMP]',
          title: 'Heat Stress Risk',
          msg: `Temperature at ${w.temperature_2m.toFixed(1)}°C. Consider evening irrigation to cool crops.`,
          timestamp: new Date().toLocaleString()
        });
      } else if (w.temperature_2m < ALERT_THRESHOLDS.temp_frost) {
        alerts.push({ 
          level: 'critical', 
          icon: '[FROST]',
          title: 'Frost Risk',
          msg: `Temperature at ${w.temperature_2m.toFixed(1)}°C. Protect sensitive crops immediately!`,
          timestamp: new Date().toLocaleString()
        });
      }
      
      // 4. Combined Stress Index alert
      const stressResult = await FH_API.fetchCombinedStress(
        avg, 
        _state.currentIndex === 'ndmi' ? ad.meanNdvi * 0.8 : 0.4, 
        w.temperature_2m, 
        w.relative_humidity_2m
      );
      _state.stressData = stressResult;
      
      if (stressResult.csi > ALERT_THRESHOLDS.stress_critical) {
        alerts.push({ 
          level: 'critical', 
          icon: '[STRESS]',
          title: 'Severe Crop Stress Detected',
          msg: `Combined Stress Index at ${(stressResult.csi * 100).toFixed(0)}%. Pre-visual stress detected — intervene before visible symptoms appear.`,
          timestamp: new Date().toLocaleString()
        });
      } else if (stressResult.csi > ALERT_THRESHOLDS.stress_warning) {
        alerts.push({ 
          level: 'warning', 
          icon: '[STRESS]',
          title: 'Moderate Crop Stress',
          msg: `Combined Stress Index at ${(stressResult.csi * 100).toFixed(0)}%. Monitor closely — early intervention recommended.`,
          timestamp: new Date().toLocaleString()
        });
      }
      
      // 5. Pest risk alert
      const pestData = await pestRiskAssessment();
      if (pestData && pestData.overall > ALERT_THRESHOLDS.pest_high) {
        alerts.push({ 
          level: 'warning', 
          icon: '[PEST]',
          title: `High Pest Risk: ${pestData.risks[0]?.name}`,
          msg: `${pestData.risks[0]?.name} risk at ${pestData.overall}%. ${pestData.risks[0]?.desc}`,
          timestamp: new Date().toLocaleString()
        });
      } else if (pestData && pestData.overall > ALERT_THRESHOLDS.pest_medium) {
        alerts.push({ 
          level: 'info', 
          icon: '[PEST]',
          title: 'Moderate Pest Risk',
          msg: `Pest risk at ${pestData.overall}%. Monitor fields regularly.`,
          timestamp: new Date().toLocaleString()
        });
      }
      
      // Sort: critical first, then warning, then info
      const order = { critical: 0, warning: 1, info: 2 };
      alerts.sort((a, b) => (order[a.level] || 99) - (order[b.level] || 99));
      
      _state.alertsData = alerts;
      return alerts;
    } catch (e) {
      console.warn('Alert generation failed:', e);
      return [];
    }
  }

  // ═══════════ FULL ANALYSIS PIPELINE ═══════════
  // ═══════════ FULL ANALYSIS PIPELINE ═══════════
  async function runFullAnalysis() {
    if (!_state.fieldPoly) return toast('First select your field!', 'err');
    $('analyzeBtn').disabled = true;

    // A fresh analysis should always retry the live satellite API
    if (FH_API.resetSHUnavailable) FH_API.resetSHUnavailable();

    try {
      showLoading('Searching satellite scenes…', 10);
      await FH_API.fetchScenes();
      FH_UI.renderScenes();

      showLoading('Fetching satellite data…', 30);
      const crop = CROPS[$('cropSelect')?.value] || CROPS.generic;
      const dateStr = _state.selectedScene ?
        _state.selectedScene.date :
        new Date().toISOString().split('T')[0];

      // 1. Try GEE first, fall back to Sentinel Hub
      let meanNdvi = 0;
      let gridStats = { cc: [0, 0, 0, 0, 0, 0], cnt: 1 };
      usedDataSource = 'sentinel-hub';

      // Try Google Earth Engine proxy
      try {
        const geeResult = await FH_API.fetchGEEStatistics(
          _state.fieldLL.map(ll => [ll[0], ll[1]]),
          dateStr, crop.peak, _state.currentIndex
        );
        if (geeResult && geeResult.success) {
          meanNdvi = geeResult.meanNdvi;
          gridStats = { cc: geeResult.cc, cnt: geeResult.cnt };
          usedDataSource = 'google-earth-engine';
          toast('Using Google Earth Engine data');
        }
      } catch (e) { /* GEE unavailable, fall through */ }

      // Fallback: Sentinel Hub
      if (usedDataSource === 'sentinel-hub') {
        try {
          meanNdvi = await FH_API.fetchStatistics(dateStr);
        } catch (e) {
          console.warn("Stats API error", e);
          meanNdvi = 0.5;
        }
        showLoading('Rendering satellite imagery…', 50);
        // Pass meanNdvi so simulated fallback matches the reported NDVI
        gridStats = await FH_API.renderGrid(_state.currentIndex, dateStr, crop.peak, meanNdvi);
      }

      // Determine growth stage automatically based on calculated NDVI
      let stage = 'Mid (vegetative)';
      if (meanNdvi < 0.15) stage = 'Bare Soil / Pre-emergence';
      else if (meanNdvi < 0.35) stage = 'Early Stage (germination - tillering)';
      else if (meanNdvi < 0.65) stage = 'Mid Stage (vegetative growth)';
      else stage = 'Peak Stage (flowering - maturity)';

      // ─── Senior GIS: Add geospatial metadata ───
      const fieldBBox = FH_GIS.boundingBox(_state.fieldLL);
      const fieldCentroid = FH_GIS.polygonCentroid(_state.fieldLL);
      const fieldAreaHa = FH_GIS.polygonArea(_state.fieldLL, 'ha');
      const fieldPerimeterKm = FH_GIS.polygonPerimeter(_state.fieldLL, 'km');
      const utmZone = fieldCentroid ? FH_GIS.detectUTMZone(fieldCentroid[1], fieldCentroid[0]) : null;
      const coordValidation = FH_GIS.validateCoordinates(_state.fieldLL);

      _state.analysisData = {
        crop,
        stage,
        seed: dateStr,
        meanNdvi,
        cnt: gridStats.cnt,
        cc: gridStats.cc,
        dataSource: _state.simulatedData ? 'simulated' : usedDataSource,
        // Senior GIS metadata
        gis: {
          bbox: fieldBBox,
          centroid: fieldCentroid,
          areaHa: fieldAreaHa,
          areaM2: fieldAreaHa * 10000,
          perimeterKm: fieldPerimeterKm,
          utmZone: utmZone?.name || null,
          utmEpsg: utmZone?.epsg || null,
          crs: 'EPSG:4326 (WGS 84)',
          coordCount: _state.fieldLL.length,
          coordValid: coordValidation.valid,
          coordErrors: coordValidation.errors,
          windingOrder: FH_GIS.polygonWindingOrder(_state.fieldLL)
        }
      };

      // 3. Update results UI
      showLoading('Generating reports…', 60);
      renderResults(_state.analysisData);
      // Senior GIS: Show geospatial metadata panel
      if (typeof FH_UI.renderGISMetadata === 'function') {
        FH_UI.renderGISMetadata(_state.analysisData);
      }

      if (_state.mode !== 'farmer') {
        var ic = $('indexCard');
        if (ic) ic.style.display = '';
        var ism = $('indexSelectorMap');
        if (ism) ism.style.display = '';
      }

      // 4. Fetch supplementary data
      await FH_API.fetchWeather();
      FH_UI.renderWeather();

      if (_state.mode !== 'farmer') {
        await FH_API.fetchTerrain();
        FH_UI.renderTerrain();
        await FH_API.fetchSoil();
        FH_UI.renderSoil();
      }

      renderAdvice(generateAdvice(_state.analysisData));

      // ═══════════ ML STRESS CLASSIFICATION (G2/P0 — no GEE needed) ═══════════
      // Show "Moderate Stress" category (not just raw NDVI) in the main flow.
      // Tries server-side predict-simple first, then falls back to client-side
      // RF via FH_ML.predictStress() which auto-loads the model from /api/ml/model.
      try {
        const mlStats = {
          ndvi_mean: meanNdvi,
          ndwi_mean: _state.analysisData?.meanNdwi || 0.3,
          evi_mean:  _state.analysisData?.meanEvi || 0.5,
          ndmi_mean: _state.analysisData?.meanNdmi || 0.3,
          ndvi_trend: _state.analysisData?.meanNdviTrend || 0,
          elevation: _state.terrainData?.avgElevation || 150,
          slope: _state.terrainData?.avgSlope || 1
        };
        let mlResult = await fetchMLStressSimple(mlStats);
        if (!mlResult || !mlResult.success) {
          // Backend unavailable — run entirely in the browser
          mlResult = await predictStress(mlStats);
        }
        if (mlResult && mlResult.stressClass !== undefined) {
          _state.analysisData.mlStress = mlResult;
          _state.analysisData.mlLabel = mlResult.label;
          _state.analysisData.mlConfidence = mlResult.confidence;
          _state.analysisData.mlColor = mlResult.color;
          _state.analysisData.mlBadge = mlResult.badge;
          _state.analysisData.mlAgreement = mlResult.agreement;
          _state.analysisData.mlRulesClass = mlResult.rulesClass;
          _state.analysisData.mlModel = mlResult.model;
          // G3: merge advisory into the advice box
          const mlAdvice = generateDecisionSupport(mlResult, _state.analysisData, _state.weatherData, _state.terrainData);
          renderAdvice([mlAdvice]);
        }
      } catch (e) {
        console.warn('[ML] Main-flow prediction skipped:', e.message);
      }

      renderHealthChart();

      // Yield Projection (always show)
      const yieldData = yieldProjection(meanNdvi, $('cropSelect').value, areaHa(_state.fieldLL));
      renderYieldProjection(yieldData);

      // Pest Risk Assessment
      const pestData = await pestRiskAssessment();
      renderPestRiskCards(pestData);

      // Generate Alerts
      const alerts = await generateAlerts();
      renderAlerts(alerts);

      // Professional Data Dashboard
      FH_UI.renderDataDashboard();

      if (_state.mode === 'researcher') {
        showLoading('Computing real time series…', 85);
        if (usedDataSource === 'google-earth-engine') {
          const tsResult = await FH_API.fetchGEETimeSeries(
            _state.fieldLL.map(ll => [ll[0], ll[1]]), 2
          );
          if (tsResult && tsResult.success) {
            _state.tsData = tsResult.data;
          } else {
            await FH_API.generateTimeSeries();
          }
        } else {
          await FH_API.generateTimeSeries();
        }
        renderTSChart();
      }

      $('aiCard').style.display = '';
      hideLoading();

      // Keep the farm dashboard live with the freshest telemetry
      FH_MAP.updateSavedFieldHealth();
      if (FH_UI && FH_UI.renderDashboard && $('dashboardView') && $('dashboardView').style.display !== 'none') {
        FH_UI.renderDashboard();
      }

      $('resultsCard').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      const sourceLabel = _state.simulatedData ? 'DEMO / simulated (real API unavailable)' :
        (usedDataSource === 'google-earth-engine' ? 'Google Earth Engine' : 'Sentinel Hub — REAL data');
      if (FH_API.setDataStatus) {
        FH_API.setDataStatus(!_state.simulatedData, sourceLabel);
      }
      toast(`Analysis complete! Data: ${sourceLabel}`);

      // ── Auto-run the continuous GEE pipeline in the background ──
      // Gives the user the cloud-free composite, clipped SRTM terrain and ML
      // stress decision with NO extra button — the pro card fills in as soon
      // as the data arrives, without blocking the classic results above.
      try {
        runProfessionalAnalysis({ silent: true });
      } catch (e) {
        console.warn('Auto continuous analysis skipped:', e);
      }

      // ── Research-derived cards (from the 12 PDFs) ──
      // Weather-based Disease Early Warning (Kaur 2026), IoT sensor fusion
      // prompt, and the disease-outbreak + management-zone cards all light up
      // with real telemetry once the analysis lands.
      try {
        if (window.FH_INTEL) {
          FH_INTEL.computeDiseaseEWS();
          FH_INTEL.renderSensorFusion();
          FH_INTEL.renderOutbreakLayer();
          FH_INTEL.renderDiseaseTimeline();
          FH_INTEL.renderResearchKB();
          const ewsCard = $('ewsCard');
          if (ewsCard) ewsCard.style.display = '';
          const sensorCard = $('sensorCard');
          if (sensorCard) sensorCard.style.display = '';
          const diseaseCard = $('diseaseCard');
          if (diseaseCard) diseaseCard.style.display = '';
          const mgmtCard = $('mgmtCard');
          if (mgmtCard) mgmtCard.style.display = '';
          const zoneYieldCard = $('zoneYieldCard');
          if (zoneYieldCard) zoneYieldCard.style.display = '';
          const biomassCard = $('biomassCard');
          if (biomassCard) biomassCard.style.display = '';
          const irrCard = $('irrCard');
          if (irrCard) irrCard.style.display = '';
          const researchCard = $('researchCard');
          if (researchCard) researchCard.style.display = '';
          // Crop health surveillance (pone.0324347)
          FH_INTEL.renderSurveillance();
          const survCard = $('survCard');
          if (survCard) survCard.style.display = '';
        }
      } catch (e2) {
        console.warn('Research cards skipped:', e2.message || String(e2));
      }

    } catch (e) {
      console.error(e);
      hideLoading();
      toast('Error: ' + e.message, 'err');
    } finally {
      $('analyzeBtn').disabled = false;
    }
  }

  return {
    setStateRef,
    generateAdvice,
    switchLayer,
    exportCSV,
    exportGeoJSON,
    copyReport,
    showFullReport,
    runFullAnalysis,
    yieldProjection,
    pestRiskAssessment,
    generateAlerts,
    runProfessionalAnalysis,
    renderProfessionalAnalysis,
    exportProZoneCSV,
    exportProReportCSV,
    retrainProModel,
    submitGroundTruth,
    refreshGroundTruthCount,
    exportPDFReport
  };
})();
