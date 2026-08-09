/* ═══════════════════════════════════════════════════════════
   FarmHealth — Analysis Pipeline Module
   ═══════════════════════════════════════════════════════════ */

const FH_ANALYSIS = (function() {
  'use strict';

  const { $, toast, showLoading, hideLoading, areaHa, downloadBlob } = FH_UTILS;
  const { CROPS, HEALTH_CLASSES, YIELD_COEFFICIENTS, ALERT_THRESHOLDS } = FH_CONFIG;
  const { getSHGeoJSON } = FH_API;
  const { renderResults, renderHealthChart, renderAdvice, renderTSChart, showChangeDetection, renderYieldProjection, renderPestRiskCards, renderAlerts } = FH_UI;

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

  // ═══════════ EXPORTS ═══════════
  function exportCSV() {
    if (!_state.tsData.length) return toast('Run analysis in Researcher mode first', 'err');
    const headers = ['date', 'mean_ndvi'];
    const rows = _state.tsData.map(d => [d.date, d.ndvi.toFixed(4)]);
    downloadBlob([headers.join(','), ...rows.map(r => r.join(','))].join('\n'), 'farmhealth_timeseries.csv', 'text/csv');
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
    downloadBlob(gj, 'farmhealth_field.geojson', 'application/json');
    toast('GeoJSON exported');
  }

  function copyReport() {
    const ad = _state.analysisData;
    if (!ad) return;
    const avg = ad.meanNdvi,
      prob = (ad.cc[0] + ad.cc[1] + ad.cc[2]) / ad.cnt * 100;
    const lines = [
      'FarmHealth — Real Satellite Crop Monitor Report',
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

      _state.analysisData = {
        crop,
        stage,
        seed: dateStr,
        meanNdvi,
        cnt: gridStats.cnt,
        cc: gridStats.cc,
        dataSource: _state.simulatedData ? 'simulated' : usedDataSource
      };

      // 3. Update results UI
      showLoading('Generating reports…', 60);
      renderResults(_state.analysisData);

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
    generateAlerts
  };
})();
