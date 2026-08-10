/* ═══════════════════════════════════════════════════════════
   Crafty GIS — Research Intelligence Module (FH_INTEL)
   ═══════════════════════════════════════════════════════════
   Implements the capabilities prescribed by the 12 research
   papers in /pdfs:
     • Research Methodology Knowledge Base (all papers + pulls)
     • Disease Outbreak Surveillance GIS — geotag detections,
       heatmaps, temporal timeline, weather-driven spread risk
       (s44163 Maged 2026 · pone.0324347 · remotesensing-13-02486)
     • IoT Sensor Fusion — in-field soil moisture / temperature /
       humidity / pH combined with satellite NDVI
       (Geo-Intelligent 2025 · 09119071 Shafi 2020 · pone.0324347)
     • Weather-Based Disease Early Warning — blight / rust risk
       from CHIRPS rainfall + temperature + humidity
       (1-s2.0 ANN-RF potato study · 8-CBA climate-smart review)
     • Site-Specific Management Zones — geostatistical clustering
       of the zone-feature grid into management zones
       (Geo-Intelligent · Geospatial Intelligence for Sustainable)
   ═══════════════════════════════════════════════════════════ */

const FH_INTEL = (function() {
  'use strict';

  const { $, toast, showLoading, hideLoading, downloadBlob } = FH_UTILS;

  // ─── Shared state reference ───
  let _state = null;

  function setStateRef(state) {
    _state = state;
  }

  // ═══════════════════════════════════════════════════════════
  // 1. RESEARCH METHODOLOGY KNOWLEDGE BASE
  //    Every paper: methodology steps, models+accuracy, the data
  //    pulls it prescribes, and how Crafty GIS implements it.
  // ═══════════════════════════════════════════════════════════
  function renderResearchKB() {
    const el = $('researchBody');
    if (!el) return;
    const papers = FH_RESEARCH.papers();
    const pulls = FH_RESEARCH.pulls();

    // Create the inner structure if it doesn't exist yet
    if (!el.querySelector('#researchPulls')) {
      el.innerHTML = `
        <div class="advice info" style="font-size:0.72rem;margin-bottom:10px">
          <b>📚 Evidence base:</b> ${papers.length} peer-reviewed papers analysed (see /pdfs).
          Each card shows the methodology, the models with reported accuracy, the
          <b>data pulls</b> it requires, and where Crafty GIS already implements it.
        </div>
        <div style="font-weight:700;font-size:0.72rem;color:var(--green-light);margin:8px 0 4px">
          🗂️ Required data pulls (all 12 papers, consolidated)
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:12px" id="researchPulls"></div>
        <div id="researchPapers"></div>`;
    }

    // Pull chips with built/roadmap status
    const pullEl = $('researchPulls');
    if (pullEl) {
      pullEl.innerHTML = Object.entries(pulls).map(([key, p]) => `
        <span class="badge ${p.status === 'built' ? 'badge-live' : 'badge-warn'}" title="${p.label}">
          ${p.status === 'built' ? '✅' : '🔜'} ${p.label}
        </span>`).join('');
    }

    const papersEl = $('researchPapers');
    if (papersEl) {
      papersEl.innerHTML = papers.map((p, i) => `
        <div class="research-paper" style="border:1px solid rgba(255,255,255,0.12);border-radius:10px;padding:10px;margin-bottom:8px;background:var(--bg-input)">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
            <div style="font-weight:700;font-size:0.78rem;color:var(--text)">${i + 1}. ${p.title}</div>
            <span class="badge badge-live" style="white-space:nowrap">${p.year}</span>
          </div>
          <div style="font-size:0.66rem;color:var(--text-muted);margin:2px 0 6px">${p.authors} · ${p.journal}</div>
          <div style="font-size:0.7rem;color:var(--green-light);margin-bottom:4px">🎯 ${p.focus}</div>
          <div style="font-size:0.7rem;margin-bottom:4px"><b style="color:var(--text-muted)">Methodology:</b></div>
          <ol style="margin:0 0 6px 0;padding-left:18px;font-size:0.68rem;line-height:1.6;color:var(--text)">${p.methodology.map(m => `<li>${m}</li>`).join('')}</ol>
          ${p.models.length ? `
          <div style="font-size:0.7rem;margin-bottom:4px"><b style="color:var(--text-muted)">Models & accuracy:</b></div>
          <div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:6px">${p.models.map(m => `<span class="badge" style="background:rgba(46,204,113,0.15);color:var(--green-light)">${m.name} — <b>${m.accuracy}</b></span>`).join('')}</div>` : ''}
          <div style="font-size:0.7rem;margin-bottom:4px"><b style="color:var(--text-muted)">Required pulls:</b></div>
          <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px">${(p.requiredPulls || []).map(r => `<span class="badge" style="background:rgba(52,152,219,0.15);color:var(--blue-light,#5dade2)">${r}</span>`).join('')}</div>
          <div style="font-size:0.66rem;color:var(--text-muted);background:rgba(0,0,0,0.25);border-radius:8px;padding:7px"><b style="color:var(--green-light)">🏗️ In Crafty GIS:</b> ${p.craftyBuild}</div>
        </div>`).join('');
    }
    const card = $('researchCard');
    if (card) card.style.display = '';
  }

  function toggleResearchCard() {
    const card = $('researchCard');
    if (!card) return;
    const hidden = card.style.display === 'none';
    card.style.display = hidden ? '' : 'none';
    if (hidden) renderResearchKB();
  }

  // ═══════════════════════════════════════════════════════════
  // 2. DISEASE OUTBREAK SURVEILLANCE GIS
  //    Geotag photo/manual detections, heatmap layer, temporal
  //    timeline, and weather-driven spread-risk (s44163 formula:
  //    base radius 5 km scaled by ΔT, humidity H, wind W).
  // ═══════════════════════════════════════════════════════════
  const DISEASES = [
    { id: 'late-blight', label: 'Late Blight', icon: '🥔', tempLo: 15, tempHi: 22, hum: 90 },
    { id: 'early-blight', label: 'Early Blight', icon: '🍂', tempLo: 20, tempHi: 30, hum: 80 },
    { id: 'rust', label: 'Rust', icon: '🦠', tempLo: 18, tempHi: 25, hum: 85 },
    { id: 'powdery-mildew', label: 'Powdery Mildew', icon: '🌫️', tempLo: 18, tempHi: 27, hum: 60 },
    { id: 'leaf-spot', label: 'Leaf Spot', icon: '🍃', tempLo: 20, tempHi: 28, hum: 85 },
    { id: 'wilt', label: 'Wilt / Stem Rot', icon: '🥀', tempLo: 22, tempHi: 35, hum: 75 }
  ];

  function _loadOutbreaks() {
    try { return JSON.parse(localStorage.getItem('crafty_gis_outbreaks') || '[]'); } catch (e) { return []; }
  }
  function _saveOutbreaks(list) {
    localStorage.setItem('crafty_gis_outbreaks', JSON.stringify(list));
  }

  // Record a disease detection at the field (or a clicked point).
  async function recordDiseaseOutbreak() {
    if (!_state.fieldPoly) return toast('First select your field!', 'err');
    const sel = $('diseaseType');
    const diseaseId = sel ? sel.value : 'leaf-spot';
    const disease = DISEASES.find(d => d.id === diseaseId) || DISEASES[0];
    const conf = parseFloat($('diseaseConf')?.value) || 70;
    const notes = ($('diseaseNotes')?.value || '').slice(0, 300);

    const center = _state.fieldCenter || [0, 0];
    const rec = {
      id: 'ob_' + Date.now(),
      disease: disease.id,
      diseaseLabel: disease.label,
      icon: disease.icon,
      lat: center[0], lng: center[1],
      confidence: Math.min(100, Math.max(10, conf)),
      notes,
      source: 'photo-analysis',
      ts: new Date().toISOString(),
      fieldName: $('savedFieldSelect')?.value || 'current field'
    };
    const list = _loadOutbreaks();
    list.push(rec);
    _saveOutbreaks(list);

    renderOutbreakLayer();
    renderDiseaseTimeline();
    computeSpreadRisk();
    toast(`🗺️ ${disease.label} detection geotagged (${rec.confidence}% confidence)`);
  }

  // Draw outbreak points + intensity heat circles on the map.
  function renderOutbreakLayer() {
    if (!_state.map || !window.FH_MAP) return;
    const list = _loadOutbreaks().filter(o => o.lat && o.lng);
    if (!list.length) { if (FH_MAP.clearOutbreakLayer) FH_MAP.clearOutbreakLayer(); return; }
    const layer = FH_MAP.getOutbreakLayer();
    if (!layer) return;
    layer.clearLayers();
    list.forEach(o => {
      const r = 8 + (o.confidence / 100) * 26; // heat radius in m, scaled by confidence
      const color = o.confidence >= 80 ? '#e74c3c' : o.confidence >= 55 ? '#f39c12' : '#f1c40f';
      L.circle([o.lat, o.lng], {
        radius: r, color: 'rgba(231,76,60,0.9)', weight: 1.5,
        fillColor: color, fillOpacity: 0.45
      }).bindTooltip(
        `<b>${o.icon} ${o.diseaseLabel}</b><br>${new Date(o.ts).toLocaleDateString()} ${new Date(o.ts).toLocaleTimeString()}<br>Confidence: <b>${o.confidence}%</b>${o.notes ? '<br>' + o.notes : ''}`,
        { sticky: true }
      ).addTo(layer);
    });
    // Fit to all outbreaks if the field hasn't been drawn yet
    if (list.length === 1 && _state.map.getZoom() < 12) {
      _state.map.setView([list[0].lat, list[0].lng], 14);
    }
  }

  function clearOutbreaks() {
    _saveOutbreaks([]);
    if (window.FH_MAP && FH_MAP.clearOutbreakLayer) FH_MAP.clearOutbreakLayer();
    const t = $('diseaseTimeline');
    if (t) t.innerHTML = '<span style="color:var(--text-muted);font-size:0.7rem">No recorded outbreaks.</span>';
    const r = $('diseaseRisk');
    if (r) r.innerHTML = '';
    toast('Outbreak layer cleared');
  }

  // Temporal tracking: show every detection ordered by date.
  function renderDiseaseTimeline() {
    const el = $('diseaseTimeline');
    if (!el) return;
    const list = _loadOutbreaks().sort((a, b) => a.ts.localeCompare(b.ts)).reverse();
    if (!list.length) {
      el.innerHTML = '<span style="color:var(--text-muted);font-size:0.7rem">No recorded outbreaks yet — detect a disease via photo analysis or record manually.</span>';
      return;
    }
    const active = (list[0].ts === list[list.length - 1].ts && list.length === 1) ? list[0].ts : null;
    el.innerHTML = list.map(o => `
      <div style="display:flex;gap:8px;align-items:flex-start;padding:6px 0;border-bottom:1px dashed rgba(255,255,255,0.1)">
        <span style="font-size:1rem">${o.icon}</span>
        <div style="flex:1;font-size:0.7rem;line-height:1.5">
          <div style="font-weight:700">${o.diseaseLabel}
            <span class="badge ${o.confidence >= 80 ? 'badge-critical' : 'badge-warn'}" style="font-size:0.6rem">${o.confidence}%</span>
          </div>
          <div style="color:var(--text-muted);font-size:0.62rem">${new Date(o.ts).toLocaleString()} · ${o.lat.toFixed(4)}, ${o.lng.toFixed(4)}</div>
          ${o.notes ? `<div style="color:var(--text);font-size:0.64rem">${o.notes}</div>` : ''}
        </div>
      </div>`).join('');
  }

  // Weather-driven spread risk (s44163): base 5 km scaled by
  // temperature deviation (ΔT), humidity (H) and wind (W).
  // Accepts an optional rec (for chaining) but reads from state.
  function computeSpreadRisk(rec) {
    const el = $('diseaseRisk');
    if (!el) return;
    const w = _state.weatherData;
    if (!w || !w.forecast || !w.forecast.current) {
      el.innerHTML = '<span style="color:var(--text-muted);font-size:0.7rem">Run Full Analysis first (weather telemetry needed) to compute spread risk.</span>';
      return;
    }
    const cur = w.forecast.current;
    const T = cur.temperature_2m;
    const H = cur.relative_humidity_2m;
    const W = cur.wind_speed_10m || 10;

    const list = _loadOutbreaks();
    if (!list.length) {
      el.innerHTML = `<div style="font-size:0.7rem;color:var(--text-muted)">🌡️ Current: ${T}°C · ${H}% RH · ${W} km/h wind. Spread risk appears once a detection is recorded.</div>`;
      return;
    }

    // Per-disease favorability: 0..1 from temp-in-range + humidity
    const rows = list.slice(-3).map(o => {
      const d = DISEASES.find(x => x.id === o.disease) || DISEASES[0];
      const inTemp = T >= d.tempLo && T <= d.tempHi;
      const tempScore = inTemp ? 1 : Math.max(0, 1 - Math.abs(T - (d.tempLo + d.tempHi) / 2) / 15);
      const humScore = H >= d.hum ? 1 : Math.max(0, H / d.hum);
      const fav = Math.min(1, tempScore * 0.6 + humScore * 0.4);
      // ΔT deviation vs disease optimum → spread multiplier
      const deltaT = Math.min(8, Math.abs(T - (d.tempLo + d.tempHi) / 2));
      const spreadKm = 5 * (1 + (0.25 * deltaT) / 8) * (1 + fav * 0.6) * Math.max(0.4, 1 - W / 60);
      const level = fav >= 0.75 ? 'High' : fav >= 0.45 ? 'Moderate' : 'Low';
      const col = fav >= 0.75 ? 'var(--red)' : fav >= 0.45 ? 'var(--orange)' : 'var(--green)';
      return { o, d, fav, spreadKm, level, col };
    });

    el.innerHTML = rows.map(({ o, d, fav, spreadKm, level, col }) => `
      <div style="font-size:0.7rem;line-height:1.6;padding:6px 0;border-bottom:1px dashed rgba(255,255,255,0.1)">
        <span style="font-weight:700;color:${col}">${o.icon} ${o.diseaseLabel}: ${level} spread risk</span><br>
        <span style="color:var(--text-muted)">Favorability ${(fav * 100).toFixed(0)}% (temp ${T}°C vs ${d.tempLo}–${d.tempHi}°C, RH ${H}%) · est. spread radius <b>${spreadKm.toFixed(1)} km</b> (wind ${W} km/h) — inspect ${spreadKm > 8 ? 'adjacent fields' : 'nearby fields'} within this radius.</span>
      </div>`).join('') +
      `<div style="font-size:0.62rem;color:var(--text-muted);margin-top:6px">Spread model: base 5 km radius scaled by temperature deviation ΔT, humidity H and wind speed W (Maged et al. 2026, s44163).</div>`;
  }

  // Wire a photo-analysis detection straight into the outbreak layer.
  function addDetectionFromVision(result) {
    if (!result || !_state.fieldPoly) return;
    const diseaseId = (result.disease || '').toLowerCase().includes('blight') ? 'late-blight' : 'leaf-spot';
    const rec = {
      id: 'ob_' + Date.now(),
      disease: diseaseId,
      diseaseLabel: result.disease || 'Unknown',
      icon: '🔬',
      lat: _state.fieldCenter[0], lng: _state.fieldCenter[1],
      confidence: result.confidence || 60,
      notes: result.summary || '',
      source: 'vision-analysis',
      ts: new Date().toISOString()
    };
    const list = _loadOutbreaks();
    list.push(rec);
    _saveOutbreaks(list);
    renderOutbreakLayer();
    renderDiseaseTimeline();
    computeSpreadRisk();
  }

  // ═══════════════════════════════════════════════════════════
  // 3. IoT SENSOR FUSION
  //    In-field soil moisture / temperature / humidity / pH /
  //    NPK readings fused with satellite NDVI → zone health score
  //    (Geo-Intelligent · 09119071 · pone.0324347).
  // ═══════════════════════════════════════════════════════════
  function _loadSensors() {
    try { return JSON.parse(localStorage.getItem('crafty_gis_sensors') || '[]'); } catch (e) { return []; }
  }
  function _saveSensors(list) {
    localStorage.setItem('crafty_gis_sensors', JSON.stringify(list));
  }

  function saveSensorReading() {
    if (!_state.fieldPoly) return toast('First select your field!', 'err');
    const npk = String($('sensorNPK')?.value || '0-0-0').split('-').map(v => parseFloat(v) || 0);
    const read = {
      ts: new Date().toISOString(),
      lat: _state.fieldCenter[0], lng: _state.fieldCenter[1],
      soilMoisture: parseFloat($('sensorMoisture')?.value) || 0,
      soilTemp: parseFloat($('sensorSoilTemp')?.value) || 0,
      airTemp: parseFloat($('sensorAirTemp')?.value) || 0,
      humidity: parseFloat($('sensorHumidity')?.value) || 0,
      ph: parseFloat($('sensorPh')?.value) || 7,
      n: npk[0] || 0,
      p: npk[1] || 0,
      k: npk[2] || 0,
      source: 'iot'
    };
    const list = _loadSensors();
    list.push(read);
    _saveSensors(list);
    renderSensorFusion(read);
    toast('📡 IoT reading saved & fused with satellite data');
  }

  function renderSensorFusion(latest) {
    const el = $('sensorResult');
    if (!el) return;
    const list = _loadSensors();
    const read = latest || list[list.length - 1];
    const ndvi = _state.proAnalysis?.stats?.ndvi?.mean ?? _state.analysisData?.meanNdvi ?? null;

    if (!read) {
      el.innerHTML = `<div class="hint">Enter in-field sensor readings (from a DHT11/moisture probe, field kit, or manual observation) to fuse with the satellite NDVI composite.</div>`;
      return;
    }

    // Fused health score (0..1): satellite NDVI (40%) + soil moisture (20%)
    // + soil temp (10%) + air temp (10%) + humidity (10%) + pH (10%).
    const smScore = Math.min(1, read.soilMoisture / 35);          // 0–35% VWC optimal-ish
    const stScore = Math.min(1, Math.max(0, 1 - Math.abs(read.soilTemp - 25) / 20));
    const atScore = Math.min(1, Math.max(0, 1 - Math.abs(read.airTemp - 26) / 18));
    const hScore = Math.min(1, Math.max(0, 1 - Math.abs(read.humidity - 65) / 50));
    const phScore = Math.min(1, Math.max(0, 1 - Math.abs(read.ph - 6.5) / 2.5));
    const sat = ndvi !== null && ndvi !== undefined ? Math.min(1, Math.max(0, ndvi / 0.85)) : null;

    const weights = { sat: 0.40, sm: 0.20, st: 0.10, at: 0.10, h: 0.10, ph: 0.10 };
    let score = (sat !== null ? sat * weights.sat : 0)
      + smScore * weights.sm + stScore * weights.st + atScore * weights.at
      + hScore * weights.h + phScore * weights.ph;
    if (sat === null) score = score / (1 - weights.sat); // renormalize when no satellite

    const pct = (score * 100).toFixed(0);
    const col = score >= 0.7 ? 'var(--green)' : score >= 0.45 ? 'var(--orange)' : 'var(--red)';
    const level = score >= 0.7 ? 'Healthy' : score >= 0.45 ? 'Moderate' : 'Stressed';

    el.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;padding:8px;background:var(--bg-input);border-radius:10px;margin-bottom:8px">
        <div style="width:54px;height:54px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:1rem;color:#fff;background:conic-gradient(${col} ${pct}%, rgba(255,255,255,0.12) 0)">${pct}%</div>
        <div style="font-size:0.75rem;line-height:1.5">
          <div style="font-weight:800;color:${col};font-size:0.85rem">${level} — fused health score</div>
          <div style="color:var(--text-muted);font-size:0.66rem">Fusion of satellite NDVI ${ndvi !== null ? ndvi.toFixed(3) : 'n/a'} + ${list.length} IoT reading${list.length !== 1 ? 's' : ''}</div>
        </div>
      </div>
      <div class="stat-grid" style="grid-template-columns:repeat(3,1fr);font-size:0.66rem">
        <div class="stat"><div class="val">${read.soilMoisture}%</div><div class="lbl">Soil moisture</div></div>
        <div class="stat"><div class="val">${read.soilTemp}°C</div><div class="lbl">Soil temp</div></div>
        <div class="stat"><div class="val">${read.airTemp}°C</div><div class="lbl">Air temp</div></div>
        <div class="stat"><div class="val">${read.humidity}%</div><div class="lbl">Humidity</div></div>
        <div class="stat"><div class="val">${read.ph}</div><div class="lbl">Soil pH</div></div>
        <div class="stat"><div class="val">${read.n}‑${read.p}‑${read.k}</div><div class="lbl">NPK (kg/ha)</div></div>
      </div>
      <div class="hint" style="font-size:0.62rem;margin-top:6px">Multi-modal fusion per 09119071 & pone.0324347 — NDVI (40%) + soil moisture (20%) + soil temp (10%) + air temp (10%) + humidity (10%) + pH (10%).</div>`;

    // Optional: draw a small moisture grid circle on the map
    if (window.FH_MAP && FH_MAP.renderMoistureGrid) {
      try { FH_MAP.renderMoistureGrid(read.lat, read.lng, read.soilMoisture); } catch (e) {}
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 4. WEATHER-BASED DISEASE EARLY WARNING
  //    Blight / rust risk from CHIRPS rainfall + temperature +
  //    humidity (1-s2.0 Kaur 2026: weather-driven spore forecasts,
  //    R²=0.80). Uses live Open-Meteo + GEE CHIRPS rainfall.
  // ═══════════════════════════════════════════════════════════
  function computeDiseaseEWS() {
    const el = $('ewsBody');
    if (!el) return;
    const w = _state.weatherData;
    const rain = _state.proAnalysis?.rainfall;
    if (!w || !w.forecast || !w.forecast.current) {
      el.innerHTML = '<span style="color:var(--text-muted);font-size:0.7rem">Run Full Analysis first — the EWS needs weather + rainfall telemetry.</span>';
      return;
    }
    const cur = w.forecast.current;
    const T = cur.temperature_2m;
    const H = cur.relative_humidity_2m;
    const rainSum = (rain && rain.totalMm !== null && rain.totalMm !== undefined) ? rain.totalMm : 0;

    // Risk rules (1-s2.0): favorable windows per pathogen
    const checks = [
      { name: 'Late Blight (Phytophthora)', icon: '🥔', fav: T >= 15 && T <= 22 && H >= 90, tLo: 15, tHi: 22, hLo: 90 },
      { name: 'Early Blight (Alternaria)', icon: '🍂', fav: T >= 20 && T <= 30 && H >= 80, tLo: 20, tHi: 30, hLo: 80 },
      { name: 'Leaf Rust (Puccinia)', icon: '🦠', fav: T >= 18 && T <= 25 && H >= 85, tLo: 18, tHi: 25, hLo: 85 },
      { name: 'Powdery Mildew', icon: '🌫️', fav: T >= 18 && T <= 27 && H >= 60, tLo: 18, tHi: 27, hLo: 60 }
    ];

    // Rain adds risk (leaf wetness hours ≈ wet days). 7-day forecast wet days:
    const wetDays = (w.forecast.daily?.precipitation_sum || []).filter(p => p > 1).length;
    const rainBoost = Math.min(0.35, (rainSum / 100) * 0.25 + wetDays * 0.05);

    const rows = checks.map(c => {
      let risk = 0;
      if (T >= c.tLo && T <= c.tHi) risk += 0.45;
      else risk += Math.max(0, 0.45 - Math.abs(T - (c.tLo + c.tHi) / 2) / 30);
      risk += (H >= c.hLo) ? 0.4 : Math.max(0, 0.4 - (c.hLo - H) / 200);
      risk += rainBoost;
      risk = Math.min(1, risk);
      const lvl = risk >= 0.7 ? 'HIGH' : risk >= 0.4 ? 'MODERATE' : 'LOW';
      const col = risk >= 0.7 ? 'var(--red)' : risk >= 0.4 ? 'var(--orange)' : 'var(--green)';
      return { c, risk, lvl, col };
    });

    const top = rows.reduce((a, b) => b.risk > a.risk ? b : a);
    const worst = rows.filter(r => r.risk >= 0.7);
    // Store the max EWS risk (0..1) so the Health Surveillance dimension can use it.
    _state.ewsRisk = top ? top.risk : 0;

    el.innerHTML = `
      <div class="advice ${worst.length ? 'warn' : 'info'}" style="font-size:0.7rem;margin-bottom:8px">
        <b>🌡️ Current conditions:</b> ${T}°C · ${H}% RH · wind ${cur.wind_speed_10m || '—'} km/h ·
        <b>CHIRPS rainfall:</b> ${rainSum.toFixed(1)} mm (${rain && rain.period ? rain.period : 'analysis window'}) ·
        ${wetDays} wet day${wetDays !== 1 ? 's' : ''} in the 7-day forecast.
        <br>${worst.length ? `⚠️ <b>${worst.length} disease risk(s) at HIGH</b> — inspect fields and consider preventive treatment within 48 h.` : `Risk outlook: ${top.c.icon} <b style="color:${top.col}">${top.c.name} (${top.lvl})</b> is the top threat.`}
      </div>
      ${rows.map(r => `
        <div style="display:flex;align-items:center;gap:8px;padding:5px 0;font-size:0.7rem;border-bottom:1px dashed rgba(255,255,255,0.1)">
          <span>${r.c.icon}</span>
          <span style="flex:1">${r.c.name}</span>
          <div style="width:70px;height:8px;background:rgba(255,255,255,0.1);border-radius:4px;overflow:hidden">
            <div style="width:${(r.risk * 100).toFixed(0)}%;height:100%;background:${r.col}"></div>
          </div>
          <span style="font-weight:700;color:${r.col};width:58px;text-align:right">${r.lvl}</span>
        </div>`).join('')}
      <div style="font-size:0.62rem;color:var(--text-muted);margin-top:6px">EWS rules from Kaur et al. 2026 (ANN-RF potato disease, R²=0.80 weather regression): temperature + humidity windows × rainfall/leaf-wetness boost.</div>`;
  }

  // ═══════════════════════════════════════════════════════════
  // 5. SITE-SPECIFIC MANAGEMENT ZONES (SSMZ)
  //    Geostatistical-style clustering of the zone-feature grid
  //    (NDVI · NDWI · slope · elevation · trends) into 3–5
  //    management zones with per-zone recommendations.
  // ═══════════════════════════════════════════════════════════
  function runManagementZones() {
    const el = $('mgmtBody');
    if (!el) return;
    const full = _state.proAnalysis || _state.proData?.full;
    const zones = full?.zones || [];
    if (!zones.length) {
      el.innerHTML = `<div class="hint">Run <b>Full Analysis</b> (or Professional Analysis) first — the zone-feature grid feeds the clustering.</div>`;
      return;
    }
    showLoading('Clustering management zones…', 30);
    try {
      const k = Math.min(5, Math.max(3, Math.min(6, Math.round(zones.length / 6))));
      const clusters = _kmeans(zones, k);
      _state.mgmtZones = clusters;
      renderManagementZones();
      _drawManagementZones(clusters);
      hideLoading();
      toast(`🗺️ ${clusters.length} management zones delineated (geostatistical clustering)`);
      // Auto-chain: once zones are clustered, run the zone-level yield
      // forecast silently so the Yield card fills in immediately.
      try { runZoneYieldPrediction({ silent: true }); } catch (e) { console.warn('Yield chain skipped:', e.message); }
    } catch (e) {
      hideLoading();
      toast('⚠️ Zone clustering failed: ' + e.message, 'err');
    }
  }

  // Simple k-means on normalized zone features.
  function _kmeans(zones, k) {
    const feat = zones.map(z => ({
      ndvi: z.ndvi ?? 0, ndwi: z.ndwi ?? 0,
      slope: z.slope ?? 0, elev: z.elevation ?? 0,
      trend: z.ndvi_trend ?? 0
    }));
    // Normalize each feature to 0..1
    const ranges = {};
    ['ndvi', 'ndwi', 'slope', 'elev', 'trend'].forEach(f => {
      const vals = feat.map(x => x[f]);
      const mn = Math.min(...vals), mx = Math.max(...vals);
      ranges[f] = { mn, mx };
      feat.forEach(x => x[f + 'n'] = mx - mn > 1e-9 ? (x[f] - mn) / (mx - mn) : 0.5);
    });
    const vecs = feat.map(x => [x.ndvin, x.ndwin, x.slopn, x.elevn, x.trendn]);
    const n = vecs.length, dim = 5;
    // k-means++ init
    let cents = [vecs[Math.floor(Math.random() * n)]];
    while (cents.length < k) {
      const dists = vecs.map(v => Math.min(...cents.map(c => _dist(v, c))));
      const total = dists.reduce((a, b) => a + b, 0) + 1e-9;
      let r = Math.random() * total, idx = 0;
      for (let i = 0; i < n; i++) { r -= dists[i]; if (r <= 0) { idx = i; break; } }
      cents.push(vecs[idx]);
    }
    const assign = new Array(n).fill(0);
    for (let iter = 0; iter < 40; iter++) {
      let changed = false;
      vecs.forEach((v, i) => {
        let best = 0, bd = Infinity;
        cents.forEach((c, ci) => { const d = _dist(v, c); if (d < bd) { bd = d; best = ci; } });
        if (assign[i] !== best) { assign[i] = best; changed = true; }
      });
      if (!changed) break;
      // recompute centroids
      const sums = Array.from({ length: k }, () => new Array(dim).fill(0));
      const cnt = new Array(k).fill(0);
      vecs.forEach((v, i) => { const a = assign[i]; cnt[a]++; v.forEach((x, d) => sums[a][d] += x); });
      cents = sums.map((s, ci) => cnt[ci] ? s.map(x => x / cnt[ci]) : s);
    }
    // Build result rows with zone ids + labels
    const COLORS = ['#2ecc71', '#f39c12', '#e74c3c', '#3498db', '#9b59b6'];
    const labels = ['Optimal', 'Good', 'Fair', 'Stressed', 'Critical'];
    const groups = Array.from({ length: k }, () => []);
    zones.forEach((z, i) => groups[assign[i]].push(z));
    // Order groups by mean NDVI desc → optimal first
    const order = groups.map((g, i) => ({ i, meanNdvi: g.reduce((a, z) => a + (z.ndvi || 0), 0) / (g.length || 1) }))
      .sort((a, b) => b.meanNdvi - a.meanNdvi);
    const orderedLabel = order.map((o, rank) => ({ idx: o.i, label: labels[Math.min(rank, labels.length - 1)], color: COLORS[Math.min(rank, COLORS.length - 1)], rank }));
    const byIdx = {};
    orderedLabel.forEach(o => byIdx[o.idx] = o);
    return groups.map((g, i) => {
      const meta = byIdx[i];
      const mean = v => g.reduce((a, z) => a + (z[v] || 0), 0) / (g.length || 1);
      const avgN = mean('ndvi'), avgW = mean('ndwi'), avgS = mean('slope'), avgT = mean('ndvi_trend');
      return {
        label: meta.label, color: meta.color, rank: meta.rank,
        zoneCount: g.length, pct: (g.length / n * 100).toFixed(1),
        avgNdvi: avgN, avgNdwi: avgW, avgSlope: avgS, avgTrend: avgT,
        zones: g,
        advice: _zoneAdvice(meta.label, avgN, avgW, avgS, avgT)
      };
    });
  }

  function _dist(a, b) {
    let s = 0;
    for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2;
    return Math.sqrt(s);
  }

  function _zoneAdvice(label, ndvi, ndwi, slope, trend) {
    const parts = [];
    if (label === 'Optimal' || label === 'Good') {
      parts.push(ndwi < 0.1 ? 'maintain current irrigation schedule' : 'continue balanced irrigation');
      if (slope > 5) parts.push('slope > 5° — watch drainage / erosion');
      if (trend > 0) parts.push('vigour improving (positive NDVI trend)');
      else parts.push('vigour stable — monitor weekly');
    } else if (label === 'Fair') {
      parts.push(ndwi < 0.15 ? 'increase irrigation in this zone by 10–15%' : 'top-up irrigation slightly');
      parts.push('apply a split nitrogen dose (30–40 kg/ha N)');
      if (slope > 5) parts.push('install contour bunds to hold water');
    } else {
      parts.push('⚠️ priority zone — soil-sample and inspect on ground');
      parts.push(ndwi < 0.2 ? 'urgently irrigate (low moisture)' : 'check drainage / root health');
      parts.push('consider variable-rate fertilizer + disease scouting');
      if (trend < 0) parts.push('declining trend — investigate stress source now');
    }
    return parts.join(' · ');
  }

  function renderManagementZones() {
    const el = $('mgmtBody');
    if (!el || !_state.mgmtZones) return;
    const zones = _state.mgmtZones;
    el.innerHTML = `
      <div style="font-weight:700;font-size:0.72rem;color:var(--green-light);margin-bottom:6px">🗺️ ${zones.length} Site-Specific Management Zones <span class="badge badge-live">SSMZ</span></div>
      <div class="hint" style="font-size:0.62rem;margin-bottom:8px">Geostatistical-style clustering of the zone-feature grid (NDVI · NDWI · slope · elevation · trend) — variable-rate irrigation & fertilization per zone (Geo-Intelligent 2025).</div>
      ${zones.map(z => `
        <div style="border-left:3px solid ${z.color};background:var(--bg-input);border-radius:8px;padding:8px;margin-bottom:6px;font-size:0.7rem">
          <div style="font-weight:800;color:${z.color}">${z.label} zone — ${z.pct}% of field (${z.zoneCount} cells)</div>
          <div style="color:var(--text-muted);margin:2px 0">NDVI ${z.avgNdvi.toFixed(3)} · NDWI ${z.avgNdwi.toFixed(3)} · slope ${z.avgSlope.toFixed(1)}° · trend ${(z.avgTrend * 1000).toFixed(1)}‰/day</div>
          <div style="font-size:0.66rem;color:var(--text)">💡 ${z.advice}</div>
        </div>`).join('')}
      <button class="btn-secondary btn-sm" style="margin-top:6px" onclick="FH.exportMgmtZonesCSV()">⬇️ Zones CSV</button>`;
  }

  function _drawManagementZones(clusters) {
    if (!_state.map || !window.FH_MAP) return;
    const layer = FH_MAP.getMgmtLayer();
    if (!layer) return;
    layer.clearLayers();
    clusters.forEach(cl => {
      cl.zones.forEach(z => {
        if (z.ndvi === null || z.ndvi === undefined) return;
        const halfLat = (z.cellH || 0.003) / 2;
        const halfLng = (z.cellW || 0.003) / 2;
        L.rectangle([
          [z.lat - halfLat, z.lng - halfLng],
          [z.lat + halfLat, z.lng + halfLng]
        ], {
          color: cl.color, weight: 0.8, opacity: 0.9,
          fillColor: cl.color, fillOpacity: 0.5
        }).bindTooltip(
          `<b style="color:${cl.color}">${cl.label} zone</b><br>NDVI ${z.ndvi?.toFixed(3)} · NDWI ${z.ndwi?.toFixed(3) ?? '—'}<br>${cl.advice}`,
          { sticky: true }
        ).addTo(layer);
      });
    });
  }

  function exportMgmtZonesCSV() {
    const zones = _state.mgmtZones;
    if (!zones) return toast('Run Management Zones first', 'err');
    const rows = ['zone_label,zone_rank,pct_of_field,mean_ndvi,mean_ndwi,mean_slope,mean_trend_per_day,advice'];
    zones.forEach(z => z.zones.forEach(cell => {
      rows.push([z.label, z.rank, z.pct, cell.ndvi ?? '', cell.ndwi ?? '', cell.slope ?? '', cell.ndvi_trend ?? '', '"' + z.advice.replace(/"/g, '""') + '"'].join(','));
    }));
    downloadBlob(rows.join('\n'), 'crafty_gis_management_zones.csv', 'text/csv');
    toast('Management zones CSV exported');
  }

  // ═══════════════════════════════════════════════════════════
  // 5b. ZONE YIELD PREDICTION (per management zone)
  //     Crop-specific empirical yield model built from the RS+ML
  //     yield stack reviewed in agronomy-14-01975 (Wang 2024):
  //     potential yield × non-linear NDVI response × water (NDWI)
  //     × slope × vigour-trend modifiers, evaluated against each
  //     management zone's feature vector (NDVI · NDWI · slope ·
  //     trends) — the zone-level counterpart of the classic
  //     field-level Yield Projection.
  // ═══════════════════════════════════════════════════════════
  // Crop-specific modifiers. yieldMax + peak come from
  // FH_CONFIG.YIELD_COEFFICIENTS so they stay consistent with the
  // classic Yield Projection; these extend it with the RS-ML
  // response shapes the review reports for yield prediction.
  const YIELD_MODIFIERS = {
    wheat:      { power: 0.85, waterSens: 0.35, slopePen: 0.020, slopeTol: 5, trendGain: 50 },
    rice:       { power: 0.80, waterSens: 0.50, slopePen: 0.010, slopeTol: 3, trendGain: 40 },
    maize:      { power: 0.82, waterSens: 0.40, slopePen: 0.020, slopeTol: 5, trendGain: 45 },
    cotton:     { power: 0.85, waterSens: 0.30, slopePen: 0.020, slopeTol: 6, trendGain: 40 },
    sugarcane:  { power: 0.78, waterSens: 0.45, slopePen: 0.010, slopeTol: 4, trendGain: 35 },
    mustard:    { power: 0.85, waterSens: 0.25, slopePen: 0.020, slopeTol: 6, trendGain: 45 },
    soybean:    { power: 0.82, waterSens: 0.35, slopePen: 0.020, slopeTol: 5, trendGain: 45 },
    potato:     { power: 0.80, waterSens: 0.45, slopePen: 0.010, slopeTol: 4, trendGain: 40 },
    pulses:     { power: 0.85, waterSens: 0.25, slopePen: 0.020, slopeTol: 6, trendGain: 40 },
    vegetables: { power: 0.80, waterSens: 0.40, slopePen: 0.010, slopeTol: 5, trendGain: 45 },
    orchards:   { power: 0.82, waterSens: 0.35, slopePen: 0.010, slopeTol: 8, trendGain: 35 },
    generic:    { power: 0.80, waterSens: 0.35, slopePen: 0.020, slopeTol: 5, trendGain: 45 }
  };

  function _populateZoneYieldCrop() {
    const sel = $('zoneYieldCrop');
    if (!sel || sel.options.length > 1) return;
    const crops = (typeof FH_CONFIG !== 'undefined' && FH_CONFIG.CROPS) || {};
    const current = ($('cropSelect') && $('cropSelect').value) || 'generic';
    sel.innerHTML = Object.keys(crops).map(id =>
      `<option value="${id}" ${id === current ? 'selected' : ''}>${crops[id].icon} ${crops[id].name}</option>`
    ).join('');
  }

  // Main runner — predict yield for every management zone from its
  // feature vector. opts.silent skips the loading overlay + toast
  // (used when auto-chained from Management Zones clustering).
  function runZoneYieldPrediction(opts) {
    const el = $('zoneYieldResult');
    if (!el) return;
    const silent = !!(opts && opts.silent);
    const full = _state.proAnalysis || _state.proData?.full;
    const clusters = _state.mgmtZones;
    if (!clusters || !clusters.length) {
      el.innerHTML = `<div class="hint">Run <b>Management Zones</b> first — the model predicts yield for each delineated zone from its feature vector.</div>`;
      return;
    }
    _populateZoneYieldCrop();
    const cropId = ($('zoneYieldCrop') && $('zoneYieldCrop').value) || 'generic';
    const base = (typeof FH_CONFIG !== 'undefined' && FH_CONFIG.YIELD_COEFFICIENTS[cropId])
      || (typeof FH_CONFIG !== 'undefined' && FH_CONFIG.YIELD_COEFFICIENTS.generic)
      || { peak: 0.8, yieldMax: 10, unit: 't/ha', name: 'Crop' };
    const mods = YIELD_MODIFIERS[cropId] || YIELD_MODIFIERS.generic;
    const fieldHa = (full && full.areaHa) || _state.fieldAreaHa || FH_UTILS.areaHa(_state.fieldLL) || 1;

    if (!silent) showLoading('Running zone yield model…', 40);
    try {
      const zones = clusters.map(z => {
        const ndviRatio = Math.min(1, Math.max(0.05, z.avgNdvi / base.peak));
        const veg = Math.pow(ndviRatio, mods.power);
        const water = Math.min(1.25, Math.max(0.6, 1 + mods.waterSens * Math.max(-0.6, Math.min(0.6, z.avgNdwi - 0.1))));
        const slope = Math.max(0.7, 1 - mods.slopePen * Math.max(0, z.avgSlope - mods.slopeTol));
        const trend = Math.min(1.15, Math.max(0.85, 1 + mods.trendGain * (z.avgTrend || 0)));
        // Clamp so a zone can never forecast more than ~20% above its
        // crop potential (favorable trend/water can boost, but the
        // agronomy review caps RS-yield estimates near the ceiling).
        const perHa = Math.min(base.yieldMax * 1.2, base.yieldMax * veg * water * slope * trend);
        const zoneArea = fieldHa * (parseFloat(z.pct) || 0) / 100;
        const total = perHa * zoneArea;
        return {
          label: z.label, color: z.color, rank: z.rank, pct: z.pct, zoneCount: z.zoneCount,
          avgNdvi: z.avgNdvi ?? 0, avgNdwi: z.avgNdwi ?? 0,
          avgSlope: z.avgSlope ?? 0, avgTrend: z.avgTrend ?? 0,
          perHa, zoneArea, total, factors: { veg, water, slope, trend },
          cells: z.zones || []   // carry the cell grid for the map overlay
        };
      });
      const fieldTotal = zones.reduce((a, z) => a + z.total, 0);
      const weightedPerHa = zones.reduce((a, z) => a + z.perHa * (parseFloat(z.pct) || 0), 0) / 100;
      const avgRatio = zones.reduce((a, z) => a + z.avgNdvi / base.peak, 0) / (zones.length || 1);
      const confidence = avgRatio > 0.85 ? 'high' : avgRatio > 0.65 ? 'medium' : 'low';

      _state.zoneYield = {
        zones, fieldTotal, weightedPerHa, cropId, cropName: base.name, unit: base.unit,
        fieldHa, confidence, ts: Date.now()
      };
      renderZoneYield();
      _drawYieldOverlay(zones, base);
      if (!silent) hideLoading();
      if (!silent) toast(`🌾 Yield forecast: ${fieldTotal.toFixed(1)} ${base.unit} across ${zones.length} zones (${base.name})`);
    } catch (e) {
      if (!silent) hideLoading();
      if (!silent) toast('⚠️ Yield model failed: ' + e.message, 'err');
    }
  }

  function renderZoneYield() {
    const el = $('zoneYieldResult');
    if (!el || !_state.zoneYield) return;
    const y = _state.zoneYield;
    const card = $('zoneYieldCard');
    if (card) card.style.display = '';
    const maxPer = Math.max(...y.zones.map(z => z.perHa), 0.001);
    const potential = (typeof FH_CONFIG !== 'undefined' && FH_CONFIG.YIELD_COEFFICIENTS[y.cropId]?.yieldMax) || '—';
    el.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;padding:8px;background:var(--bg-input);border-radius:10px;margin-bottom:8px">
        <div style="flex:1">
          <div style="font-weight:800;font-size:0.9rem">🌾 ${y.cropName}: <span style="color:var(--green-light)">${y.fieldTotal.toFixed(1)} ${y.unit}</span> expected</div>
          <div style="color:var(--text-muted);font-size:0.64rem">Field ${y.fieldHa.toFixed(2)} ha · weighted avg <b>${y.weightedPerHa.toFixed(1)} ${y.unit}/ha</b> · potential ${potential} ${y.unit}/ha</div>
          <span class="badge ${y.confidence === 'high' ? 'badge-live' : y.confidence === 'medium' ? 'badge-new' : 'badge-warn'}">confidence ${y.confidence}</span>
        </div>
        <button class="btn-secondary btn-sm" onclick="FH.exportZoneYieldCSV()">⬇️ CSV</button>
      </div>
      ${y.zones.map(z => `
        <div style="border-left:3px solid ${z.color};background:var(--bg-input);border-radius:8px;padding:8px;margin-bottom:6px;font-size:0.7rem">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-weight:800;color:${z.color}">${z.label} zone (${z.pct}% of field)</span>
            <span style="font-weight:800">${z.perHa.toFixed(1)} ${y.unit}/ha</span>
          </div>
          <div style="height:8px;background:rgba(255,255,255,0.1);border-radius:4px;margin:4px 0;overflow:hidden">
            <div style="width:${(z.perHa / maxPer * 100).toFixed(0)}%;height:100%;background:${z.color}"></div>
          </div>
          <div style="color:var(--text-muted);font-size:0.62rem">
            NDVI ${z.avgNdvi.toFixed(3)} · NDWI ${z.avgNdwi.toFixed(3)} · slope ${z.avgSlope.toFixed(1)}° · trend ${(z.avgTrend * 1000).toFixed(1)}‰/day
            → <b>${z.total.toFixed(1)} ${y.unit}</b> on ${z.zoneArea.toFixed(2)} ha
          </div>
        </div>`).join('')}
      <div style="font-size:0.62rem;color:var(--text-muted);margin-top:6px">Yield model: potential × (NDVI/peak)<sup>power</sup> × water (NDWI) × slope × trend factors per zone — RS-ML yield stack per agronomy-14-01975 (Wang et al. 2024).</div>`;
  }

  // Colour the map by predicted yield per management-zone patch.
  function _drawYieldOverlay(zones, base) {
    if (!_state.map || !window.FH_MAP || !FH_MAP.getYieldLayer) return;
    const layer = FH_MAP.getYieldLayer();
    if (!layer) return;
    layer.clearLayers();
    zones.forEach(z => {
      (z.cells || []).forEach(cell => {
        if (cell.ndvi === null || cell.ndvi === undefined) return;
        const halfLat = (cell.cellH || 0.003) / 2;
        const halfLng = (cell.cellW || 0.003) / 2;
        L.rectangle([
          [cell.lat - halfLat, cell.lng - halfLng],
          [cell.lat + halfLat, cell.lng + halfLng]
        ], {
          color: z.color, weight: 0.8, opacity: 0.9,
          fillColor: z.color, fillOpacity: 0.5
        }).bindTooltip(
          `<b style="color:${z.color}">${z.label} zone — ${z.perHa.toFixed(1)} ${base.unit}/ha</b><br>Predicted ${z.total.toFixed(1)} ${base.unit} (${z.pct}% of field)`,
          { sticky: true }
        ).addTo(layer);
      });
    });
  }

  function exportZoneYieldCSV() {
    const y = _state.zoneYield;
    if (!y) return toast('Run Zone Yield Forecast first', 'err');
    const rows = ['zone_label,pct_of_field,area_ha,mean_ndvi,mean_ndwi,mean_slope_deg,mean_trend_per_day,yield_per_ha_' + y.unit + ',zone_total_' + y.unit];
    y.zones.forEach(z => rows.push(
      [z.label, z.pct, z.zoneArea.toFixed(4), z.avgNdvi.toFixed(4), z.avgNdwi.toFixed(4), z.avgSlope.toFixed(2), z.avgTrend.toFixed(6), z.perHa.toFixed(2), z.total.toFixed(2)].join(',')
    ));
    rows.push(['FIELD_TOTAL', '', '', '', '', '', '', y.weightedPerHa.toFixed(2), y.fieldTotal.toFixed(2)].join(','));
    downloadBlob(rows.join('\n'), 'crafty_gis_zone_yield_forecast.csv', 'text/csv');
    toast('Zone yield forecast CSV exported');
  }

  // ═══════════════════════════════════════════════════════════
  // 6. CROP HEALTH SURVEILLANCE
  //    Unified multi-dimensional health score combining all
  //    telemetry into one at-a-glance view. Based on:
  //      - pone.0324347 (Ayid 2025) — intelligent framework for
  //        crop health surveillance & disease management
  //      - 09119071 (Shafi 2020) — multi-modal crop health maps
  //      - Geo-Intelligent (2025) — GIS+RS+IoT health fusion
  //    Dimensions: Vegetation / Water / Temperature / Disease /
  //    Soil-Nutrient / Trend — fused into overall score, with
  //    history timeline stored per field.
  // ═══════════════════════════════════════════════════════════
  const HEALTH_DIMS = [
    { id: 'veg',    label: 'Vegetation',   icon: '🌿', weight: 0.25 },
    { id: 'water',  label: 'Water',        icon: '💧', weight: 0.20 },
    { id: 'temp',   label: 'Temperature',  icon: '🌡️', weight: 0.15 },
    { id: 'disease',label: 'Pest/Disease', icon: '🦠', weight: 0.15 },
    { id: 'soil',   label: 'Soil/Nutrient',icon: '🧪', weight: 0.15 },
    { id: 'trend',  label: 'Vigour Trend', icon: '📈', weight: 0.10 }
  ];

  function _clamp01(v) {
    return Math.min(1, Math.max(0, v));
  }

  // Compute the 6 dimension scores (each 0..1) from all telemetry.
  function healthDimensions() {
    const full = _state.proAnalysis || _state.proData?.full || null;
    const ad = _state.analysisData;
    const ml = _state.mlStress;
    const s = full?.stats || {};
    const peak = ad?.crop?.peak || 0.80;

    // Vegetation (NDVI normalized to crop peak)
    const ndvi = s.ndvi?.mean ?? ad?.meanNdvi ?? null;
    const veg = ndvi !== null && ndvi !== undefined ? _clamp01(ndvi / peak) : null;

    // Water: NDWI + CWSI + SAR soil moisture + rainfall
    const ndwi = s.ndwi?.mean ?? null;
    const cwsi = full?.thermal?.cwsi ?? full?.thermal?.CWSI ?? null;
    const rain = full?.rainfall?.totalMm ?? null;
    const sensorWater = _lastSensor()?.soilMoisture ?? null;
    let water = 0.5;
    const parts = [];
    if (ndwi !== null) { parts.push(_clamp01((ndwi + 0.4) / 0.8)); }
    if (cwsi !== null) { parts.push(1 - _clamp01(cwsi)); }
    if (rain !== null) { parts.push(_clamp01(rain / 80)); }
    if (sensorWater !== null) { parts.push(_clamp01(sensorWater / 35)); }
    if (parts.length) water = parts.reduce((a, b) => a + b, 0) / parts.length;

    // Temperature: thermal LST + weather air temp vs comfort window
    const lst = full?.thermal?.lstMean ?? null;
    const airT = _state.weatherData?.forecast?.current?.temperature_2m ?? null;
    const tempReading = lst !== null ? lst : airT;
    let temp = 0.5;
    if (tempReading !== null && tempReading !== undefined) {
      temp = _clamp01(1 - Math.abs(tempReading - 26) / 22);
    }

    // Disease: ML stress class + EWS risk (inverse)
    let disease = 0.7;
    let ewsRisk = 0;
    if (_state.ewsRisk !== undefined && _state.ewsRisk !== null) ewsRisk = _state.ewsRisk;
    const mlClass = ml ? (ml.stressClass !== undefined ? ml.stressClass : (ml.label ? { 'Healthy': 0, 'Mild Stress': 1, 'Moderate Stress': 2, 'Severe Stress': 3, 'Critical': 4 }[ml.label] : null)) : null;
    if (mlClass !== null) disease = 1 - _clamp01(mlClass / 4);
    disease = _clamp01(disease * (1 - ewsRisk * 0.5));

    // Soil / nutrient: IoT pH + NPK + terrain suitability
    const s1 = _lastSensor();
    let soil = 0.6;
    const sparts = [];
    if (s1) {
      sparts.push(_clamp01(1 - Math.abs(s1.ph - 6.5) / 2.5));
      const npk = s1.n + s1.p + s1.k;
      sparts.push(_clamp01(npk / 120));
    }
    const slope = s.slope?.mean ?? null;
    if (slope !== null) sparts.push(_clamp01(1 - slope / 15));
    if (sparts.length) soil = sparts.reduce((a, b) => a + b, 0) / sparts.length;

    // Vigour trend: NDVI per-day slope (positive = improving)
    const trendVal = full?.trends?.ndviPerDay ?? ad?.meanNdviTrend ?? _state.mlStress?.trendData?.ndvi_trend ?? null;
    let trend = 0.5;
    if (trendVal !== null && trendVal !== undefined) {
      trend = _clamp01(0.5 + trendVal * 800);
    }

    return {
      veg, water, temp, disease, soil, trend,
      _ndvi: ndvi, _cwsi: cwsi, _airT: airT, _rain: rain, _ewsRisk: ewsRisk
    };
  }

  function _lastSensor() {
    const list = _loadSensors();
    return list[list.length - 1] || null;
  }

  // Overall fused health score (0..1) using dimension weights.
  function _overallHealth(dims) {
    let sum = 0, wt = 0;
    HEALTH_DIMS.forEach(d => {
      const v = dims[d.id];
      if (v !== null && v !== undefined) { sum += v * d.weight; wt += d.weight; }
    });
    return wt ? sum / wt : null;
  }

  // Persist a health snapshot per field for the surveillance timeline.
  function _pushHealthSnapshot(overall, dims) {
    if (!_state.fieldCenter) return [];
    const key = 'crafty_gis_health_' + _state.fieldCenter[0].toFixed(4) + '_' + _state.fieldCenter[1].toFixed(4);
    let log = [];
    try { log = JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) {}
    log.push({ ts: Date.now(), overall, dims: { veg: dims.veg, water: dims.water, temp: dims.temp, disease: dims.disease, soil: dims.soil, trend: dims.trend } });
    if (log.length > 30) log = log.slice(-30);
    try { localStorage.setItem(key, JSON.stringify(log)); } catch (e) {}
    return log;
  }

  function _loadHealthLog() {
    if (!_state.fieldCenter) return [];
    const key = 'crafty_gis_health_' + _state.fieldCenter[0].toFixed(4) + '_' + _state.fieldCenter[1].toFixed(4);
    try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) { return []; }
  }

  // Main surveillance renderer — builds the full card UI.
  function renderSurveillance() {
    const el = $('survBody');
    if (!el) return;
    const dims = healthDimensions();
    const overall = _overallHealth(dims);
    const log = _pushHealthSnapshot(overall, dims);

    const card = $('survCard');
    if (card && (dims.veg !== null || dims.water !== null || dims._airT !== null)) card.style.display = '';

    const pct = overall !== null ? Math.round(overall * 100) : null;
    const level = pct === null ? 'NODATA' : pct >= 75 ? 'HEALTHY' : pct >= 50 ? 'MONITOR' : pct >= 35 ? 'STRESSED' : 'CRITICAL';
    const col = pct === null ? '#888' : pct >= 75 ? 'var(--green)' : pct >= 50 ? 'var(--orange)' : pct >= 35 ? 'var(--moderate)' : 'var(--red)';

    // Trending arrow from history
    let trendArrow = '';
    if (log.length >= 2) {
      const prev = log[log.length - 2].overall;
      if (prev !== null && overall !== null && prev !== undefined) {
        const d = overall - prev;
        trendArrow = d > 0.02 ? '<span style="color:var(--green)">▲ improving</span>' : d < -0.02 ? '<span style="color:var(--red)">▼ declining</span>' : '<span style="color:var(--orange)">→ stable</span>';
      }
    }

    // Dimension bars
    const barHTML = HEALTH_DIMS.map(d => {
      const v = dims[d.id];
      const vp = v === null || v === undefined ? null : Math.round(v * 100);
      const c = vp === null ? '#888' : vp >= 75 ? 'var(--green)' : vp >= 50 ? 'var(--orange)' : vp >= 35 ? 'var(--moderate)' : 'var(--red)';
      const note = vp === null ? '—' : vp + '%';
      return '<div style="margin-bottom:7px">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;font-size:0.7rem">' +
        '<span>' + d.icon + ' ' + d.label + '</span>' +
        '<span style="font-weight:700;color:' + c + '">' + note + '</span></div>' +
        '<div style="height:8px;background:rgba(255,255,255,0.1);border-radius:4px;overflow:hidden">' +
        '<div style="width:' + (vp === null ? 0 : vp) + '%;height:100%;background:' + c + ';transition:width .6s"></div></div></div>';
    }).join('');

    // Health timeline (sparkline of past snapshots)
    const hist = log.slice(-14);
    let spark = '';
    if (hist.length >= 2) {
      const maxBar = 40;
      spark = '<div style="display:flex;align-items:flex-end;height:' + maxBar + 'px;gap:2px;margin-top:6px">' +
        hist.map(h => {
          const hp = h.overall !== null ? Math.round(h.overall * 100) : 0;
          const col2 = hp >= 75 ? 'var(--green)' : hp >= 50 ? 'var(--orange)' : 'var(--red)';
          return '<div style="flex:1;display:flex;align-items:flex-end;justify-content:center">' +
            '<div title="' + new Date(h.ts).toLocaleString() + ' — ' + hp + '%" style="width:70%;height:' + Math.max(3, hp / 100 * maxBar) + 'px;background:' + col2 + ';border-radius:3px 3px 0 0"></div></div>';
        }).join('') + '</div>';
    }

    // Top priority recommendation (lowest dimension)
    let minDim = null, minV = 1;
    HEALTH_DIMS.forEach(d => { if (dims[d.id] !== null && dims[d.id] < minV) { minV = dims[d.id]; minDim = d; } });
    const rec = minDim ? _dimensionAdvice(minDim.id, dims) : 'Run a full analysis to begin surveillance.';

    el.innerHTML =
      '<div style="display:flex;align-items:center;gap:12px;padding:10px;background:var(--bg-input);border-radius:12px;margin-bottom:10px">' +
      '<div style="width:72px;height:72px;border-radius:50%;flex:0 0 auto;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:1.15rem;color:#fff;background:conic-gradient(' + col + ' ' + (pct || 0) + '%, rgba(255,255,255,0.12) 0)"><span>' + (pct === null ? '—' : pct) + '</span></div>' +
      '<div style="flex:1;font-size:0.75rem;line-height:1.5">' +
      '<div style="font-weight:800;color:' + col + ';font-size:0.95rem">' + level + ' ' + trendArrow + '</div>' +
      '<div style="color:var(--text-muted);font-size:0.66rem">Fused from satellite / IoT / weather / ML / disease EWS / ' + log.length + ' snapshot' + (log.length !== 1 ? 's' : '') + '</div>' +
      '<div style="color:var(--text-muted);font-size:0.64rem">Last scan: ' + new Date().toLocaleString() + '</div></div>' +
      '<div style="display:flex;flex-direction:column;gap:4px">' +
      '<button class="btn-primary btn-sm" onclick="FH.refreshSurveillance()">Refresh</button>' +
      '<button class="btn-secondary btn-sm" onclick="FH.exportSurveillanceCSV()">CSV</button></div></div>' +

      '<div style="font-weight:700;font-size:0.72rem;color:var(--green-light);margin:4px 0 6px">Health dimensions</div>' +
      '<div style="background:var(--bg-input);border-radius:10px;padding:10px">' + barHTML + '</div>' +

      (hist.length >= 2 ? '<div style="font-weight:700;font-size:0.72rem;color:var(--green-light);margin:10px 0 4px">Health history (' + log.length + ' scans)</div><div style="background:var(--bg-input);border-radius:10px;padding:8px">' + spark + '</div>' : '') +

      '<div class="advice ' + (level === 'CRITICAL' || level === 'STRESSED' ? 'warn' : 'info') + '" style="font-size:0.7rem;margin-top:10px">' +
      '<b>Priority &mdash; ' + (minDim ? minDim.icon + ' ' + minDim.label : 'Setup') + ':</b> ' + rec + '</div>' +
      '<div style="font-size:0.62rem;color:var(--text-muted);margin-top:6px">Crop health surveillance per Ayid et al. 2025 (pone.0324347) &amp; Shafi et al. 2020 (09119071) &mdash; multi-modal fusion for continuous monitoring.</div>';
  }

  function _dimensionAdvice(dimId, dims) {
    switch (dimId) {
      case 'veg': return 'Vegetation vigour low. Check for nutrient deficiency or disease; consider a foliar N split and scout the low-NDVI zones.';
      case 'water': return 'Moisture balance suboptimal. Adjust irrigation &mdash; if NDWI/CWSI indicate stress, irrigate sooner with ~10% more volume; improve drainage if waterlogged.';
      case 'temp': return 'Thermal stress detected. Use protective irrigation during heat, shade netting for sensitive crops, and schedule fieldwork during cooler hours.';
      case 'disease': return 'Elevated pest/disease risk. Scout fields, apply preventive fungicide within 48h if EWS is HIGH, and rotate crops next season per pone.0324347.';
      case 'soil': return 'Soil balance off. Correct pH toward 6.5&ndash;7.0, top-up NPK to target (100-60-40), and incorporate organic matter to improve structure.';
      case 'trend': return 'Vigour trend declining. Monitor weekly; investigate the glide path early &mdash; declining NDVI slope often precedes visible stress.';
      default: return 'Maintain routine surveillance and rescan weekly.';
    }
  }

  function exportSurveillanceCSV() {
    const dims = healthDimensions();
    const overall = _overallHealth(dims);
    const log = _loadHealthLog();
    const rows = ['timestamp,overall_health,ndvi,ndwi,cwsi,air_temp_c,rainfall_mm,disease_ews_risk,soil_moisture,ph'];
    const s1 = _lastSensor();
    const cur = [new Date().toISOString(), overall !== null ? overall.toFixed(3) : '', dims._ndvi ?? '', (dims.water ?? ''), dims._cwsi ?? '', dims._airT ?? '', dims._rain ?? '', dims._ewsRisk ?? '', s1?.soilMoisture ?? '', s1?.ph ?? ''].join(',');
    rows.push(cur);
    log.forEach(h => rows.push([new Date(h.ts).toISOString(), h.overall !== null ? h.overall.toFixed(3) : '', '', '', '', '', '', '', '', ''].join(',')));
    downloadBlob(rows.join('\n'), 'crafty_gis_health_surveillance.csv', 'text/csv');
    toast('Health surveillance CSV exported');
  }

  function refreshSurveillance() {
    renderSurveillance();
    toast('Health surveillance refreshed');
  }

  // ═══════════ EXPORTS ═══════════
  return {
    setStateRef,
    // Research KB
    renderResearchKB,
    toggleResearchCard,
    // Disease outbreak surveillance
    recordDiseaseOutbreak,
    renderOutbreakLayer,
    renderDiseaseTimeline,
    computeSpreadRisk,
    clearOutbreaks,
    addDetectionFromVision,
    // IoT sensor fusion
    saveSensorReading,
    renderSensorFusion,
    // Disease early warning
    computeDiseaseEWS,
    // Management zones
    runManagementZones,
    renderManagementZones,
    exportMgmtZonesCSV,
    // Zone yield prediction (agronomy-14-01975)
    runZoneYieldPrediction,
    renderZoneYield,
    exportZoneYieldCSV,
    // Crop health surveillance
    renderSurveillance,
    refreshSurveillance,
    exportSurveillanceCSV,
    healthDimensions
  };
})();
