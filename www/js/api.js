/* ═══════════════════════════════════════════════════════════
   FarmHealth — API Integration Module
   ═══════════════════════════════════════════════════════════ */

const FH_API = (function() {
  'use strict';

  const { $, toast, showLoading, hideLoading, fetchJSON, buildEvalscript, buildNDVIEvalscript, dateStr, polyBBox, polyCenter, areaHa } = FH_UTILS;
  const { SH_CLIENT_ID, SH_CLIENT_SECRET, GEMINI_API_KEY, API, CROPS, HEALTH_CLASSES, WEATHER_CODES } = FH_CONFIG;

  // ─── Data source: 'sentinel-hub' or 'google-earth-engine' ───
  let dataSource = 'sentinel-hub';

  // ─── Shared state reference (set by app module) ───
  let _state = null;

  function setStateRef(state) {
    _state = state;
  }

  function getApiUrl(path) {
    if (typeof window !== 'undefined' && window.location &&
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      if (window.location.port !== '3001') {
        return 'http://localhost:3001' + path;
      }
    }
    return path;
  }

  // ═══════════ SENTINEL HUB AUTH ═══════════
  // Tries, in order:
  //   1. Same-origin backend proxy  (/api/sentinel/token — Node server or Vercel fn)
  //   2. Remote backend proxy        (static hosts like Netlify/GitHub Pages)
  //   3. Direct OAuth in-browser     (last resort so REAL data still works when
  //                                   the app is opened statically, e.g. file://)
  async function getSHToken() {
    const now = Date.now();
    if (_state.shToken && _state.shTokenExpiry > now + 60000) return _state.shToken;

    // If Sentinel Hub failed very recently, don't hammer the network again —
    // fall back to DEMO data instantly so layer switching / Compare stay snappy.
    // A fresh "Run Full Analysis" resets this so live data can be retried.
    if (_state.shUnavailableAt && (now - _state.shUnavailableAt) < 3 * 60 * 1000) {
      throw new Error('Sentinel Hub auth unavailable (recent failure cached)');
    }

    const attempts = [
      { url: getApiUrl('/api/sentinel/token'), name: 'backend proxy' },
      { url: API.SH_TOKEN_PROXY_FALLBACK, name: 'remote backend proxy' }
    ];

    let lastErr = null;
    for (const a of attempts) {
      try {
        // Allow up to 20s per attempt (Render free-tier cold starts can take
        // ~15-30s; the old 6s abort killed valid requests). Applying a timeout
        // to the same-origin path too so a cold/hanging backend proxy on
        // Netlify can't stall the first render before we fall back.
        const ctrl = AbortSignal.timeout(20000);
        const res = await fetch(a.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: ctrl
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        if (data && data.access_token) {
          _state.shToken = data.access_token;
          _state.shTokenExpiry = now + ((data.expires_in || 3600) * 1000);
          return _state.shToken;
        }
        throw new Error('no access_token in response');
      } catch (e) {
        lastErr = e;
        console.warn('[SH] Token via ' + a.name + ' failed:', e.message);
      }
    }

    // Last resort: direct OAuth from the browser using config/settings credentials
    const cid = ($('shClientId')?.value || _state.settings.shClientId || SH_CLIENT_ID || '').trim();
    const csec = ($('shClientSecret')?.value || _state.settings.shClientSecret || SH_CLIENT_SECRET || '').trim();
    if (cid && csec) {
      try {
        const body = 'grant_type=client_credentials&client_id=' + encodeURIComponent(cid) +
                     '&client_secret=' + encodeURIComponent(csec);
        const res = await fetch(API.SH_AUTH, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: body
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.access_token) {
            _state.shToken = data.access_token;
            _state.shTokenExpiry = now + ((data.expires_in || 3600) * 1000);
            console.log('[SH] Direct OAuth token obtained');
            return _state.shToken;
          }
        }
        lastErr = new Error('Sentinel Hub OAuth returned ' + res.status);
      } catch (e) {
        lastErr = e;
      }
    }

    // Remember the outage so subsequent calls fail fast (no repeated 20s waits)
    _state.shUnavailableAt = Date.now();
    throw new Error('Sentinel Hub auth unavailable (' + (lastErr ? lastErr.message : 'no credentials') + ').');
  }

  // Allow a fresh full analysis to retry the live API after an outage
  function resetSHUnavailable() {
    _state.shUnavailableAt = null;
  }

  function getSHGeoJSON() {
    const coords = _state.fieldLL.map(ll => [ll[1], ll[0]]);
    coords.push(coords[0]);
    return { type: "Polygon", coordinates: [coords] };
  }

  // ═══════════ STAC SCENE DISCOVERY ═══════════
  // Tries in order: Element84 (AWS Earth Search) → Microsoft Planetary Computer
  // Both are free, open STAC catalogs of Sentinel-2. If both fail, falls back
  // to rolling date candidates (NDVI still comes from Sentinel Hub / GEE).
  async function fetchScenes() {
    if (!_state.fieldLL.length) return [];
    const bb = polyBBox(_state.fieldLL);
    const months = 6;
    const cloudMax = 30;
    const now = new Date();
    const from = new Date(now);
    from.setMonth(from.getMonth() - months);

    const body = {
      collections: ['sentinel-2-l2a'],
      bbox: [bb.west, bb.south, bb.east, bb.north],
      datetime: `${dateStr(from)}/${dateStr(now)}`,
      query: { 'eo:cloud_cover': { lt: cloudMax } },
      sortby: [{ field: 'properties.datetime', direction: 'desc' }],
      limit: 20
    };

    // Two FREE STAC endpoints (primary + secondary)
    const stacEndpoints = [
      { url: API.STAC_URL + '/search', label: 'AWS Element84 STAC' },
      { url: 'https://planetarycomputer.microsoft.com/api/stac/v1/search', label: 'Microsoft Planetary Computer' }
    ];

    for (const ep of stacEndpoints) {
      try {
        // Element84 expects POST /search; Planetary Computer supports POST too.
        const data = await fetchJSON(ep.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });

        if (data && data.features && data.features.length) {
          _state.scenes = data.features.map(f => ({
            id: f.id,
            date: f.properties.datetime?.split('T')[0] || 'Unknown',
            cloud: Math.round(f.properties['eo:cloud_cover'] || 0),
            thumbnail: f.assets?.thumbnail?.href || null
          }));
          console.log('[STAC] Scenes from', ep.label + ':', _state.scenes.length);
          return _state.scenes;
        }
        console.warn('[STAC] No scenes from', ep.label, '— trying next source');
      } catch (e) {
        console.error('STAC API failed (' + ep.label + '):', e.message);
      }
    }

    // Fallback: generate date candidates spanning the last N months.
    // NOTE: these are only POSSIBLE acquisition dates for the date picker —
    // the actual NDVI values are fetched separately from Sentinel Hub, which
    // searches the archive for the nearest cloud-free image automatically.
    if (_state.scenes && _state.scenes.length === 0) {
      console.warn('[STAC] Scene list unavailable — using rolling date candidates. NDVI comes from Sentinel Hub on analysis.');
      toast('📅 Scene list unavailable — using recent dates', 'info');
    }
    const simulated = [];
    const totalDays = months * 30;
    const step = Math.max(7, Math.floor(totalDays / 10));
    for (let d = totalDays; d >= 0; d -= step) {
      const date = new Date(now);
      date.setDate(date.getDate() - d);
      const cloudPct = Math.round(5 + Math.random() * 25);
      simulated.push({
        id: 'simulated-s2-' + dateStr(date),
        date: dateStr(date),
        cloud: cloudPct,
        thumbnail: null
      });
    }
    _state.scenes = simulated;
    return _state.scenes;
  }

  // ═══════════ SENTINEL HUB STATISTICAL API ═══════════
  async function fetchStatistics(dateStr) {
    const token = await getSHToken();

    // Widen search to ±5 days for better hit rate
    const targetDate = new Date(dateStr);
    const fromDate = new Date(targetDate);
    fromDate.setDate(fromDate.getDate() - 5);
    const toDate = new Date(targetDate);
    toDate.setDate(toDate.getDate() + 5);
    const fromStr = fromDate.toISOString().split('T')[0];
    const toStr = toDate.toISOString().split('T')[0];

    const payload = {
      input: {
        bounds: { geometry: getSHGeoJSON(), properties: { crs: "http://www.opengis.net/def/crs/EPSG/0/4326" } },
        data: [{
          type: "sentinel-2-l2a",
          dataFilter: { 
            timeRange: { from: fromStr + "T00:00:00Z", to: toStr + "T23:59:59Z" },
            mosaickingOrder: "leastCC"
          }
        }]
      },
      aggregation: {
        timeRange: { from: fromStr + "T00:00:00Z", to: toStr + "T23:59:59Z" },
        aggregationInterval: { of: "P10D" },
        evalscript: buildNDVIEvalscript()
      }
    };

    const res = await fetch(API.SH_STATISTICS, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error("Statistics API: " + res.statusText);
    const data = await res.json();
    // Get the most recent interval with valid data
    const validIntervals = (data.data || []).filter(d => d.outputs?.ndvi?.bands?.B0?.stats?.sampleCount > 0);
    if (validIntervals.length > 0) {
      const stats = validIntervals[validIntervals.length - 1].outputs.ndvi.bands.B0.stats;
      return stats.mean;
    }
    return 0.5;
  }

  // ═══════════ POINT-IN-POLYGON (Ray Casting) ═══════════
  function pointInPolygon(lat, lng, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][0], yi = polygon[i][1];
      const xj = polygon[j][0], yj = polygon[j][1];
      const intersect = ((yi > lng) !== (yj > lng)) &&
        (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  // ═══════════ Dynamic Index Value → Color Class Mapper ═══════════
  function valueToClassColor(val, indexType, peak) {
    const type = (indexType || 'ndvi').toLowerCase();
    const classes = FH_CONFIG.getActiveClasses(type);
    
    if (['ndmi', 'smmi', 'ndwi'].includes(type)) {
      // Moisture scale mapping: -1.0 to 1.0 (or 0 to 1)
      if (val <= 0.0) return { color: classes[0].col, cls: 0, label: classes[0].name };
      if (val <= 0.2) return { color: classes[1].col, cls: 1, label: classes[1].name };
      if (val <= 0.4) return { color: classes[2].col, cls: 2, label: classes[2].name };
      if (val <= 0.6) return { color: classes[3].col, cls: 3, label: classes[3].name };
      if (val <= 0.8) return { color: classes[4].col, cls: 4, label: classes[4].name };
      return                 { color: classes[5].col, cls: 5, label: classes[5].name };
    } else if (['tvdi', 'csi'].includes(type)) {
      // Stress / dryness scale mapping (0.0 to 1.0)
      if (val > 0.85) return { color: classes[0].col, cls: 0, label: classes[0].name };
      if (val > 0.70) return { color: classes[1].col, cls: 1, label: classes[1].name };
      if (val > 0.50) return { color: classes[2].col, cls: 2, label: classes[2].name };
      if (val > 0.30) return { color: classes[3].col, cls: 3, label: classes[3].name };
      if (val > 0.15) return { color: classes[4].col, cls: 4, label: classes[4].name };
      return                 { color: classes[5].col, cls: 5, label: classes[5].name };
    } else {
      // Vegetation scale mapping (0.0 to 1.0)
      const p = val / peak;
      if (val < 0.15) return { color: classes[0].col, cls: 0, label: classes[0].name };
      if (p < 0.40)    return { color: classes[1].col, cls: 1, label: classes[1].name };
      if (p < 0.55)    return { color: classes[2].col, cls: 2, label: classes[2].name };
      if (p < 0.72)    return { color: classes[3].col, cls: 3, label: classes[3].name };
      if (p < 0.88)    return { color: classes[4].col, cls: 4, label: classes[4].name };
      return                 { color: classes[5].col, cls: 5, label: classes[5].name };
    }
  }

  // ═══════════ DRAW VISUAL HEALTH GRID ON MAP ═══════════
  // Creates colored rectangle cells inside the field boundary.
  // paneName: 'comparePane' renders into the split-view right pane.
  // indexType: the index these grid values represent (so the compare pane
  //            colours with its own scale, not the left layer's scale).
  function drawHealthGrid(gridData, cropPeak, paneName, indexType) {
    if (!_state.fieldLL || !_state.fieldLL.length) return;
    // Drop compare-pane draws when compare was exited mid-render
    if (paneName && !_state.compareMode) return;
    const target = paneName ? (_state.compareLayers || _state.ndviLayer) : _state.ndviLayer;
    if (!target) return;
    // Don't clear if Sentinel Hub image overlay is already there — add grid on top
    
    const bb = polyBBox(_state.fieldLL);
    const peak = cropPeak || 0.80;
    const GRID = 12; // 12x12 grid cells
    const latStep = (bb.north - bb.south) / GRID;
    const lngStep = (bb.east - bb.west) / GRID;
    
    // Build polygon array for point-in-polygon test
    const poly = _state.fieldLL.map(ll => [ll[0], ll[1]]);
    
    let cc = [0, 0, 0, 0, 0, 0];
    let cnt = 0;
    
    const idx = indexType || _state.currentIndex || 'ndvi';
    
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        const cellLat = bb.south + (r + 0.5) * latStep;
        const cellLng = bb.west + (c + 0.5) * lngStep;
        
        // Only draw cells inside the field boundary
        if (!pointInPolygon(cellLat, cellLng, poly)) continue;
        
        // Get value for this cell from gridData
        const val = gridData[r * GRID + c] || 0;
        const health = valueToClassColor(val, idx, peak);
        cc[health.cls]++;
        cnt++;
        
        // Draw the colored rectangle on the map
        const cellBounds = [
          [bb.south + r * latStep, bb.west + c * lngStep],
          [bb.south + (r + 1) * latStep, bb.west + (c + 1) * lngStep]
        ];
        
        const indexLabel = idx.toUpperCase();
        let pctScore;
        if (['tvdi', 'csi'].includes(idx)) {
          pctScore = ((1 - val) * 100).toFixed(0) + '%';
        } else {
          pctScore = ((val / peak) * 100).toFixed(0) + '%';
        }

        L.rectangle(cellBounds, {
          color: health.color,
          weight: 0.5,
          opacity: 0.6,
          fillColor: health.color,
          fillOpacity: 0.55,
          pane: paneName || 'overlayPane'
        }).bindTooltip(
          `<b>${health.label}</b><br>${indexLabel}: ${val.toFixed(3)}<br>Score: ${pctScore}`,
          { sticky: true, className: 'ndvi-tooltip' }
        ).addTo(target);
      }
    }
    
    return { cc, cnt: Math.max(1, cnt) };
  }

  // ═══════════ DRAW HEALTH GRID FOR REAL DATA ═══════════
  // When the real Sentinel Hub API succeeds, also render a visible grid
  // overlay on the map so problem areas are clearly identifiable.
  function drawHealthGridForRealData(meanNdvi, cropPeak, paneName, indexType) {
    if (!_state.fieldLL || !_state.fieldLL.length) return;
    const peak = cropPeak || 0.80;
    const mean = meanNdvi || 0.60;
    const GRID = 12;
    
    // Generate grid data with subtle variation around the real mean NDVI
    const gridData = [];
    
    // Seed-based pseudo-random for consistent grids on the same field
    const seed = _state.fieldCenter ?
      Math.round(_state.fieldCenter[0] * 1000 + _state.fieldCenter[1] * 100) : 42;
    const rand = (i) => {
      const x = Math.sin(seed + i * 100) * 10000;
      return x - Math.floor(x);
    };
    
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        // Subtle spatial variation based on deterministic hash
        const grad = (Math.sin(r * 0.7 + c * 1.3 + seed) * 0.04 +
                      Math.cos(r * 0.5 - c * 0.9 + seed) * 0.03);
        const noise = (rand(r * GRID + c) - 0.5) * 0.04;
        const ndvi = Math.max(0.05, Math.min(0.95, mean + grad + noise));
        gridData.push(ndvi);
      }
    }
    
    drawHealthGrid(gridData, peak, paneName, indexType);
  }

  // ═══════════ GENERATE SIMULATED GRID DATA + VISUAL OVERLAY ═══════════
  // Creates a realistic NDVI spatial distribution with gradients and stress zones
  function generateSimulatedGrid(meanNdvi, cropPeak, paneName, indexType) {
    const peak = cropPeak || 0.80;
    const mean = meanNdvi || 0.60;
    const GRID = 12;
    const simType = (indexType || _state.currentIndex || 'ndvi').toLowerCase();
    
    // Clear existing overlay (main map or compare pane, depending on target)
    if (paneName) {
      if (_state.compareLayers) _state.compareLayers.clearLayers();
    } else if (_state.ndviLayer) {
      _state.ndviLayer.clearLayers();
    }
    
    // Generate spatially coherent NDVI grid with gradient + hotspots
    const gridData = [];
    
    // Create 2-3 random stress hotspots
    const hotspots = [];
    const numHotspots = 1 + Math.floor(Math.random() * 3);
    for (let h = 0; h < numHotspots; h++) {
      hotspots.push({
        r: Math.floor(Math.random() * GRID),
        c: Math.floor(Math.random() * GRID),
        radius: 1.5 + Math.random() * 2.5,
        intensity: 0.15 + Math.random() * 0.25 // how much NDVI drops near hotspot
      });
    }
    
    // Create a slight NW-SE gradient (common in real fields due to irrigation/drainage)
    const gradientAngle = Math.random() * Math.PI;
    const gradientStrength = 0.03 + Math.random() * 0.05;
    
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        // Base NDVI with spatial gradient
        const gradientEffect = (Math.cos(gradientAngle) * (r / GRID - 0.5) + 
                                Math.sin(gradientAngle) * (c / GRID - 0.5)) * gradientStrength;
        
        // Small random noise
        const u1 = Math.random();
        const u2 = Math.random();
        const noise = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2) * 0.06;
        
        // Stress hotspot effects
        let hotspotDrop = 0;
        for (const hs of hotspots) {
          const dist = Math.sqrt((r - hs.r) ** 2 + (c - hs.c) ** 2);
          if (dist < hs.radius) {
            hotspotDrop += hs.intensity * (1 - dist / hs.radius);
          }
        }
        
        let val;
        if (['tvdi', 'csi'].includes(simType)) {
          // TVDI stress hotspots represent drier/hotter zones (increase value)
          val = Math.max(0.02, Math.min(0.98, mean + gradientEffect + noise + hotspotDrop));
        } else {
          // Vegetation & moisture hotspots represent degradation (decrease value)
          val = Math.max(0.05, Math.min(0.95, mean + gradientEffect + noise - hotspotDrop));
        }
        gridData.push(val);
      }
    }
    
    // Draw visual grid on the map
    const result = drawHealthGrid(gridData, peak, paneName, indexType);
    
    return result || { cc: [0, 0, 0, 0, 0, 0], cnt: 1 };
  }

  // ─── LIVE/DEMO status banner ───
  function setDataStatus(live, msg) {
    _state.simulatedData = !live;
    const bar = $('dataStatusBar');
    if (!bar) return;
    bar.style.display = 'flex';
    bar.className = 'data-status-bar ' + (live ? 'live' : 'demo');
    $('dataStatusIcon').textContent = live ? '🛰️' : '🔄';
    $('dataStatusText').textContent = msg || (live ? 'LIVE satellite data' : 'Demo / simulated data');
    const src = $('legendSource');
    if (src) src.textContent = live ? 'LIVE DATA' : 'DEMO DATA';
  }

  // ═══════════ SENTINEL HUB PROCESS API ═══════════
  // paneName — set to 'comparePane' to render into the split-view right pane.
  // quiet — suppress error toasts/status banner (used by the compare pane so
  //        Compare never spams "API is unavailable" errors).
  // compareSeq — monotonically increasing per compare render; stale renders
  //        (e.g. after Exit or a rapid layer switch) are dropped at commit.
  let _compareSeq = 0;
  async function renderGrid(indexType, dateStr, cropPeak, preferMean, paneName, quiet) {
    const targetGroup = paneName ? (_state.compareLayers || _state.ndviLayer) : _state.ndviLayer;
    const seq = paneName ? ++_compareSeq : 0;
    const stale = () => paneName && seq !== _compareSeq;
    const emptyStats = { cc: [0, 0, 0, 0, 0, 0], cnt: 1 };
    // Fallback: if Sentinel Hub calls fail, use simulated data
    try {
      const token = await getSHToken();
      if (stale()) return emptyStats;
      if (targetGroup && targetGroup.clearLayers) targetGroup.clearLayers();
      
      // Mark as non-simulated — we're successfully connecting to real API
      _state.simulatedData = false;

      let datasetType = "sentinel-2-l2a";
      if (indexType === 'sar') datasetType = "sentinel-1-grd";
      if (indexType === 'tvdi') datasetType = "landsat-8-l1c";

      // Widen search to ±5 days (Sentinel-2 revisit is 5 days)
      const targetDate = new Date(dateStr);
      const fromDate = new Date(targetDate);
      fromDate.setDate(fromDate.getDate() - 5);
      const toDate = new Date(targetDate);
      toDate.setDate(toDate.getDate() + 5);
      const fromStr = fromDate.toISOString().split('T')[0];
      const toStr = toDate.toISOString().split('T')[0];

      const payload = {
        input: {
          bounds: { geometry: getSHGeoJSON(), properties: { crs: "http://www.opengis.net/def/crs/EPSG/0/4326" } },
          data: [{
            type: datasetType,
            dataFilter: { 
              timeRange: { from: fromStr + "T00:00:00Z", to: toStr + "T23:59:59Z" },
              mosaickingOrder: "leastCC"
            }
          }]
        },
        output: { width: 256, height: 256, responses: [{ identifier: "default", format: { type: "image/png" } }] },
        evalscript: buildEvalscript(indexType, cropPeak)
      };

      const res = await fetch(API.SH_PROCESS, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json',
          'Accept': 'image/png'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Process API: ' + res.statusText);
      const blob = await res.blob();
      const imageUrl = URL.createObjectURL(blob);
      const bounds = _state.fieldPoly.getBounds();
      L.imageOverlay(imageUrl, bounds, { opacity: 0.7, pane: paneName || 'overlayPane' }).addTo(targetGroup);

      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
          if (stale()) { resolve(emptyStats); return; }
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

          let cc = [0, 0, 0, 0, 0, 0],
            cnt = 0;
          for (let i = 0; i < imgData.length; i += 4) {
            if (imgData[i + 3] === 0) continue;
            const r = imgData[i],
              g = imgData[i + 1];
            cnt++;
            if (r === 139 && g === 90) cc[0]++;
            else if (r === 231 && g === 76) cc[1]++;
            else if (r === 243 && g === 156) cc[2]++;
            else if (r === 241 && g === 196) cc[3]++;
            else if (r === 122 && g === 201) cc[4]++;
            else if (r === 30 && g === 125) cc[5]++;
            else cc[4]++;
          }
          
          // Measure mean NDVI from pixels to use for the health grid overlay
          const gridMean = preferMean || _state.analysisData?.meanNdvi || 0.6;
          // Grid overlay disabled — showing only satellite image
          // This gives the user clear colored blocks they can read at a glance
          // drawHealthGridForRealData(gridMean, cropPeak, paneName, indexType);
          if (!paneName) {
            setDataStatus(true, 'LIVE — real satellite imagery (' + (FH_CONFIG.INDEX_INFO[indexType]?.name || indexType).toUpperCase() + ' · ' + dateStr + ')');
          }
          
          resolve({ cc, cnt: Math.max(1, cnt) });
        };
        img.src = imageUrl;
      });
    } catch (e) {
      console.error('Sentinel Hub Process API failed:', e);
      // Remember the outage so layer switches / Compare fall back instantly
      _state.shUnavailableAt = Date.now();
      const errorMsg = e.message || 'Unknown error';
      if (!quiet) {
        // One friendly notice per session instead of an error toast on every retry
        if (!_state.shFallbackWarned) {
          _state.shFallbackWarned = true;
          toast('📡 Live satellite API unreachable — showing DEMO map data. Live data resumes automatically when the service responds.', 'info');
        }
        setDataStatus(false, 'DEMO — real satellite data unavailable: ' + errorMsg.substring(0, 80));
        if (!_state.simulatedData) {
          _state.simulatedData = true;
          setTimeout(() => {
            toast('⚠️ Showing simulated data for demonstration. Check browser console for the exact API error.', 'info');
          }, 2000);
        }
      }
      
      if (stale()) return emptyStats;
      // Use the passed preferred mean, or read from existing analysis, or generate a reasonable value
      const fallbackMean = preferMean || _state.analysisData?.meanNdvi || (0.55 + Math.random() * 0.25);
      // Grid overlay disabled — showing only satellite image
      // return generateSimulatedGrid(fallbackMean, cropPeak, paneName, indexType);
      return emptyStats;
    }
  }

  // ═══════════ SENTINEL HUB TIME SERIES ═══════════
  async function generateTimeSeries() {
    try {
      const token = await getSHToken();
      const toDate = new Date();
      const fromDate = new Date();
      fromDate.setMonth(fromDate.getMonth() - 2);

      const payload = {
        input: {
          bounds: { geometry: getSHGeoJSON(), properties: { crs: "http://www.opengis.net/def/crs/EPSG/0/4326" } },
          data: [{
            type: "sentinel-2-l2a",
            dataFilter: { timeRange: { from: dateStr(fromDate) + "T00:00:00Z", to: dateStr(toDate) + "T23:59:59Z" } }
          }]
        },
        aggregation: {
          timeRange: { from: dateStr(fromDate) + "T00:00:00Z", to: dateStr(toDate) + "T23:59:59Z" },
          aggregationInterval: { of: "P5D" },
          evalscript: buildNDVIEvalscript()
        }
      };

      const res = await fetch(API.SH_STATISTICS, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        _state.tsData = [];
        data.data.forEach(int => {
          const stats = int.outputs?.ndvi?.bands?.B0?.stats;
          if (stats && stats.sampleCount > 0) {
            _state.tsData.push({ date: int.interval.from.split('T')[0], ndvi: stats.mean });
          }
        });
        return;
      }
    } catch (e) {
      console.warn('Time Series API failed:', e);
    }

    // Fallback: generate simulated time series
    if (!_state.tsData || _state.tsData.length === 0) {
      _state.tsData = [];
      const baseNdvi = 0.45 + Math.random() * 0.25;
      for (let d = 60; d >= 0; d -= 5) {
        const date = new Date();
        date.setDate(date.getDate() - d);
        _state.tsData.push({
          date: dateStr(date),
          ndvi: Math.max(0.1, Math.min(0.95, baseNdvi + (Math.random() - 0.5) * 0.08 + (60 - d) * 0.003))
        });
      }
    }
  }

  // ═══════════ WEATHER (Open-Meteo) ═══════════
  async function fetchWeather() {
    if (!_state.fieldCenter) return null;
    const [lat, lng] = _state.fieldCenter;

    const fUrl = `${API.METEO_URL}/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code,surface_pressure,et0_fao_evapotranspiration&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,et0_fao_evapotranspiration&hourly=soil_temperature_0cm,soil_moisture_0_to_1cm&timezone=auto&forecast_days=7`;
    const histUrl = `${API.METEO_URL}/forecast?latitude=${lat}&longitude=${lng}&daily=precipitation_sum,temperature_2m_max,temperature_2m_min&timezone=auto&past_days=30&forecast_days=0`;

    try {
      const [forecast, history] = await Promise.all([fetchJSON(fUrl), fetchJSON(histUrl)]);
      if (!forecast || !forecast.current) throw new Error("Forecast data missing");
      _state.weatherData = { forecast, history, lat, lng };
      return _state.weatherData;
    } catch (e) {
      console.warn("fetchWeather failed, generating mock weather:", e);
      const mockForecast = {
        current: {
          temperature_2m: 29.2,
          relative_humidity_2m: 62,
          wind_speed_10m: 11.4,
          precipitation: 0.0,
          weather_code: 1,
          et0_fao_evapotranspiration: 4.8
        },
        daily: {
          time: Array.from({length: 7}, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() + i);
            return d.toISOString().split('T')[0];
          }),
          temperature_2m_min: [22, 23, 22, 21, 22, 23, 24],
          temperature_2m_max: [31, 32, 31, 30, 31, 32, 33],
          precipitation_sum: [0, 1.2, 0, 0, 3.5, 0, 0],
          precipitation_probability_max: [10, 40, 10, 5, 60, 15, 10]
        },
        hourly: {
          soil_moisture_0_to_1cm: [0.26],
          soil_temperature_0cm: [27.4]
        }
      };
      const mockHistory = {
        daily: {
          precipitation_sum: Array.from({length: 30}, () => Math.random() < 0.2 ? Math.random() * 8 : 0)
        }
      };
      _state.weatherData = { forecast: mockForecast, history: mockHistory, lat, lng };
      return _state.weatherData;
    }
  }

  // ═══════════ TERRAIN (Open-Meteo Elevation) ═══════════
  async function fetchTerrain() {
    if (!_state.fieldLL.length) return null;
    const bb = polyBBox(_state.fieldLL);
    const pad = 0.001,
      N = 9;
    const lats = [],
      lngs = [];
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        lats.push((bb.south - pad + (i + 0.5) * (bb.north - bb.south + 2 * pad) / N).toFixed(5));
        lngs.push((bb.west - pad + (j + 0.5) * (bb.east - bb.west + 2 * pad) / N).toFixed(5));
      }
    }

    const url = `${API.METEO_URL}/elevation?latitude=${lats.join(',')}&longitude=${lngs.join(',')}`;
    try {
      const data = await fetchJSON(url);
      if (!data || !data.elevation) throw new Error("Elevation API returned empty response");

      const elev = data.elevation;
      const eMin = Math.min(...elev),
        eMax = Math.max(...elev),
        eMean = elev.reduce((a, b) => a + b, 0) / elev.length;

      let slopes = [];
      for (let i = 0; i < N; i++) {
        for (let j = 0; j < N; j++) {
          const idx = i * N + j;
          const eC = elev[idx];
          const eN = i > 0 ? elev[(i - 1) * N + j] : eC;
          const eS = i < N - 1 ? elev[(i + 1) * N + j] : eC;
          const eW = j > 0 ? elev[i * N + (j - 1)] : eC;
          const eE = j < N - 1 ? elev[i * N + (j + 1)] : eC;
          const latR = parseFloat(lats[idx]) * Math.PI / 180;
          const dLatM = (bb.north - bb.south + 2 * pad) / N * 111320;
          const dLngM = (bb.east - bb.west + 2 * pad) / N * 111320 * Math.cos(latR);
          const dzdx = (eE - eW) / (2 * dLngM);
          const dzdy = (eN - eS) / (2 * dLatM);
          slopes.push(Math.atan(Math.sqrt(dzdx * dzdx + dzdy * dzdy)) * 180 / Math.PI);
        }
      }

      const avgSlope = slopes.reduce((a, b) => a + b, 0) / slopes.length;
      const maxSlope = Math.max(...slopes);
      const drainClass = avgSlope > 5 ? 'Well-drained' : avgSlope > 2 ? 'Moderate' : 'Poor drainage';

      _state.terrainData = { eMin, eMax, eMean, avgSlope, maxSlope, drainClass };
      return _state.terrainData;
    } catch (e) {
      console.warn("fetchTerrain failed, using simulated terrain:", e);
      _state.terrainData = {
        eMin: 180.2,
        eMax: 184.8,
        eMean: 182.5,
        avgSlope: 1.2,
        maxSlope: 2.8,
        drainClass: 'Well-drained'
      };
      return _state.terrainData;
    }
  }

  // ═══════════ SOIL (SoilGrids) ═══════════
  async function fetchSoil() {
    if (!_state.fieldCenter) return null;
    const [lat, lng] = _state.fieldCenter;
    const props = ['phh2o', 'soc', 'clay', 'sand', 'silt', 'nitrogen', 'cec', 'bdod'];
    const url = `${API.SOILGRIDS_URL}?lon=${lng}&lat=${lat}&property=${props.join(',')}&depth=0-5cm&value=mean`;

    try {
      const data = await fetchJSON(url);
      if (!data || !data.properties) throw new Error("SoilGrids response invalid");

      const soil = {};
      data.properties.layers.forEach(layer => {
        soil[layer.name] = layer.depths?.[0]?.values?.mean;
      });

      _state.soilData = soil;
      return soil;
    } catch (e) {
      console.warn("fetchSoil failed, using simulated soil:", e);
      const mockSoil = {
        phh2o: 66,
        soc: 175,
        clay: 240,
        sand: 430,
        silt: 330,
        nitrogen: 140
      };
      _state.soilData = mockSoil;
      return mockSoil;
    }
  }

  function setDataSource(source) {
    dataSource = source;
    toast(`📡 Data source: ${source === 'sentinel-hub' ? 'Sentinel Hub' : 'Google Earth Engine'}`);
  }

  // ═══════════ GEE PROXY CALLS ═══════════
  async function fetchGEEStatistics(coords, dateStr, cropPeak, indexType) {
    try {
      const payload = {
        coordinates: coords,
        dateStr: dateStr,
        cropPeak: cropPeak,
        indexType: indexType || 'ndvi'
      };
      const res = await fetch(API.GEE_PROXY + '/ndvi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('GEE proxy error: ' + res.statusText);
      return await res.json();
    } catch (e) {
      console.warn('GEE proxy call failed:', e);
      return null;
    }
  }

  async function fetchGEETimeSeries(coords, monthsBack) {
    try {
      const payload = { coordinates: coords, monthsBack: monthsBack || 2 };
      const res = await fetch(API.GEE_PROXY + '/time-series', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('GEE time series error: ' + res.statusText);
      return await res.json();
    } catch (e) {
      console.warn('GEE time series failed:', e);
      return null;
    }
  }

  // ═══════════ SAR SOIL MOISTURE (Sentinel-1 via GEE) ═══════════
  async function fetchSAR() {
    if (!_state.fieldLL.length) return null;
    try {
      const payload = {
        coordinates: _state.fieldLL.map(ll => [ll[0], ll[1]]),
        dateStr: _state.selectedScene ? _state.selectedScene.date : null
      };
      const res = await fetch(API.GEE_PROXY + '/sar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('SAR fetch failed: ' + res.statusText);
      const data = await res.json();
      if (data && data.success) {
        // Normalize VV backscatter to 0-1 moisture index
        const rawVV = data.meanVV || -15;
        // Sentinel-1 VV backscatter roughly -25 to -5 dB range
        const moistureIndex = Math.max(0, Math.min(1, (rawVV + 25) / 20));
        return {
          rawVV,
          moistureIndex,
          date: data.date || 'Unknown',
          source: 'sentinel-1-sar'
        };
      }
      return null;
    } catch (e) {
      console.warn('SAR fetch failed:', e);
      return null;
    }
  }

  // ═══════════ GEMINI AI ADVICE ═══════════
  async function getAIAdvice() {
    const key = $('geminiKey')?.value || _state.settings.geminiKey || GEMINI_API_KEY;
    
    if (!_state.analysisData) {
      toast('⚠️ Run analysis first', 'err');
      return;
    }

    $('aiBtn').disabled = true;
    $('aiBtn').textContent = '⏳ Generating…';

    const ad = _state.analysisData;
    const avg = ad.meanNdvi;

    const payload = {
      fieldName: _state.savedFields?.find(f => JSON.stringify(f.coords) === JSON.stringify(_state.fieldLL))?.name || 'My Farm',
      crop: 'generic',
      ndvi: avg,
      soilPh: _state.soilData?.properties?.phh2o_mean?.depths?.[0]?.val || 6.5,
      soilNitrogen: _state.soilData?.properties?.nitrogen_mean?.depths?.[0]?.val || 120,
      soilOrganicCarbon: _state.soilData?.properties?.soc_mean?.depths?.[0]?.val || 1.8,
      growthStage: ad.stage || 'mid',
      weather: _state.weatherData?.forecast?.current ? {
        temp: _state.weatherData.forecast.current.temperature_2m,
        condition: _state.weatherData.forecast.current.weather_code,
        rainProb: _state.weatherData.forecast.daily?.precipitation_probability_max?.[0] || 0
      } : null
    };

    try {
      let text = '';
      let usedBackend = false;

      // 1. Prefer the backend proxy. It now runs the self-hosted AI chain
      //    server-side: Ollama (local LLM) → Gemini → built-in expert
      //    fallback — so AI advice works even fully offline on the laptop.
      try {
        const res = await fetch(getApiUrl('/api/gemini-analysis'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Proxy API error: ' + res.status);
        const data = await res.json();
        text = data.advice;
        // Show which AI source responded
        if (data.source && window.FH_UI && FH_UI.showAISourceIndicator) {
          FH_UI.showAISourceIndicator(data.source);
        }
        usedBackend = true;
      } catch (e) {
        console.warn('[AI] Backend proxy unavailable, trying direct Gemini:', e.message);
        if (window.FH_UI && FH_UI.hideAISourceIndicator) FH_UI.hideAISourceIndicator();
      }

      // 2. Direct browser Gemini — only when NO backend is reachable AND a
      //    key is configured (pure static hosting like file:// or GitHub Pages).
      if (!usedBackend && key) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${key}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: `Analyze crop data: ${JSON.stringify(payload)}. Give 3-5 specific recommendations.` }] }] })
        });
        if (!res.ok) throw new Error('API error');
        const data = await res.json();
        text = data.candidates[0].content.parts[0].text;
        if (window.FH_UI && FH_UI.showAISourceIndicator) FH_UI.showAISourceIndicator('gemini');
      }

      // 3. Built-in expert system fallback
      if (!text) {
        text = getFallbackAdvice(payload);
        if (window.FH_UI && FH_UI.showAISourceIndicator) FH_UI.showAISourceIndicator('expert');
      }

      if (!text) throw new Error('No advice returned');

      $('aiContent').innerHTML = text.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
      $('aiCard').style.display = '';
      toast('🤖 AI analysis ready!');
    } catch (e) {
      toast('⚠️ AI analysis failed.', 'err');
    }

    $('aiBtn').disabled = false;
    $('aiBtn').textContent = '✨ Get AI Analysis';
  }

  // ═══════════ VISION ANALYSIS — Crop Photo Disease Detection ═══════════
  // Uses LLaVA vision model via backend Ollama to analyze crop photos
  async function analyzeCropPhoto(inputElement) {
    const file = inputElement.files?.[0];
    if (!file) return;

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast('⚠️ Image too large. Please select an image under 10MB.', 'err');
      return;
    }

    const resultDiv = $('visionResult');
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = '<div style="padding:12px;background:var(--bg);border-radius:6px;text-align:center">📸 Analyzing photo... <br><small>This may take 30-60 seconds on CPU</small></div>';

    // Convert image to base64
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64Image = e.target.result;

      try {
        const payload = {
          imageBase64: base64Image,
          fieldName: _state.savedFields?.find(f => JSON.stringify(f.coords) === JSON.stringify(_state.fieldLL))?.name || 'My Farm',
          crop: _state.analysisData?.crop?.name || 'Unknown',
          ndvi: _state.analysisData?.meanNdvi || 'N/A',
          weather: _state.weatherData?.forecast?.current ? {
            temp: _state.weatherData.forecast.current.temperature_2m,
            condition: _state.weatherData.forecast.current.weather_code
          } : null
        };

        const res = await fetch(getApiUrl('/api/vision-analysis'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error('Vision API error: ' + res.status);
        const data = await res.json();

        if (data.success && data.analysis) {
          const a = data.analysis;
          // Canonical schema (disease/parameters) with legacy fallbacks for
          // responses from older prompts (disease_detected/color_anomalies).
          const disease = a.disease || a.disease_detected || 'none';
          const params = a.parameters || {};
          const ndvi = params.ndvi !== undefined ? params.ndvi : a.estimated_ndvi_visual;
          const colorAnomaly = params.color_anomaly || a.color_anomalies;
          const texture = params.texture || a.texture_issues;
          const rec = Array.isArray(a.recommendation) ? a.recommendation
            : typeof a.recommendation === 'string'
              ? a.recommendation.split('\n').map(s => s.trim()).filter(Boolean)
              : (a.recommendations || []);

          const isDiseased = !!disease && ['none', 'no disease', 'healthy'].indexOf(disease.toLowerCase()) === -1;
          const statusColor = isDiseased ? '#e74c3c' : '#7ac943';
          const statusLabel = isDiseased ? 'DISEASED' : (a.health_status || 'HEALTHY').toUpperCase();

          let html = '<div style="padding:12px;background:var(--bg);border-radius:6px;border-left:3px solid var(--accent)">';
          html += `<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">`;
          html += `<span style="background:${statusColor};color:white;padding:4px 10px;border-radius:12px;font-size:0.75rem;font-weight:600">${statusLabel}</span>`;
          if (isDiseased) html += `<span style="font-size:0.75rem;color:var(--text)">🦠 ${disease}</span>`;
          html += `</div>`;

          // Confidence, severity, affected area
          if (a.confidence !== undefined) {
            const confidencePct = Math.round(Number(a.confidence) * 100);
            html += `<div style="font-size:0.7rem;color:var(--text-secondary);margin-bottom:6px">`;
            html += `Confidence: ${confidencePct}% | Severity: ${(a.severity || 'unknown').toUpperCase()}`;
            if (a.affected_area) html += ` | Affected: ${a.affected_area}`;
            html += `</div>`;
          }

          // Detailed analysis
          if (a.detailed_analysis) {
            html += `<div style="font-size:0.75rem;line-height:1.5;margin:8px 0">${a.detailed_analysis}</div>`;
          }

          // Visible symptoms (legacy field)
          if (Array.isArray(a.visible_symptoms) && a.visible_symptoms.length) {
            html += `<div style="font-size:0.7rem;margin-top:8px"><b>Visible Symptoms:</b><br>`;
            html += a.visible_symptoms.map(s => `• ${s}`).join('<br>');
            html += `</div>`;
          }

          // Recommendation (string or array)
          if (rec.length) {
            html += `<div style="font-size:0.7rem;margin-top:8px;padding:8px;background:var(--card);border-radius:4px">`;
            html += `<b>📋 Recommendation:</b><br>` + rec.map(r => `• ${String(r).trim()}`).join('<br>');
            html += `</div>`;
          }

          // Parameters: ndvi / color anomaly / texture
          if (ndvi !== undefined || colorAnomaly || texture) {
            html += `<div style="font-size:0.65rem;margin-top:8px;padding:6px;background:rgba(0,0,0,0.2);border-radius:4px;color:var(--text-secondary)">`;
            html += `<b>Parameters:</b> `;
            if (ndvi !== undefined) html += `NDVI: ${Number(ndvi).toFixed(2)} | `;
            if (colorAnomaly) html += `Color: ${colorAnomaly} | `;
            if (texture) html += `Texture: ${texture}`;
            html += `</div>`;
          }

          html += `</div>`;
          resultDiv.innerHTML = html;
          toast('✅ Vision analysis complete!');
        } else {
          resultDiv.innerHTML = '<div style="padding:12px;background:var(--bg);border-radius:6px">⚠️ Analysis unavailable. Ensure Ollama with LLaVA is running.</div>';
        }
      } catch (error) {
        console.error('[Vision] Frontend error:', error);
        resultDiv.innerHTML = '<div style="padding:12px;background:var(--bg);border-radius:6px">⚠️ Analysis failed. Check backend logs.</div>';
        toast('⚠️ Vision analysis failed', 'err');
      }
    };

    reader.onerror = () => {
      resultDiv.style.display = 'none';
      toast('⚠️ Failed to read image', 'err');
    };

    reader.readAsDataURL(file);
  }

  // ═══════════ COMBINED STRESS INDEX (CSI / TVDI-like) ═══════════
  // Uses NDVI + NDMI + Weather to detect pre-visual stress
  // This gives thermal-stress-like detection without needing thermal bands
  async function fetchCombinedStress(ndvi, ndmi, temperature, humidity) {
    try {
      const crop = CROPS[$('cropSelect').value] || CROPS.generic;
      
      // 1. NDVI-based stress: how far from crop peak?
      const ndviStress = Math.max(0, 1 - (ndvi / crop.peak));
      
      // 2. NDMI moisture stress: lower = drier (NDMI range -1 to 1, healthy ~0.3-0.8)
      const moistureStress = Math.max(0, 1 - ((ndmi || 0.4) - (-0.2)) / 0.8);
      
      // 3. Temperature stress
      let tempStress = 0;
      if (temperature !== undefined && temperature !== null) {
        if (temperature > 35) tempStress = Math.min(1, (temperature - 35) / 15);
        else if (temperature > 30) tempStress = 0.2;
        else if (temperature < 5) tempStress = Math.min(1, (5 - temperature) / 10);
      }
      
      // 4. Humidity stress modifier (high humidity + warmth = disease risk)
      let humidityStress = 0;
      if (humidity !== undefined && humidity !== null && temperature !== undefined && temperature !== null) {
        if (humidity > 85 && temperature > 22) humidityStress = 0.3;
        else if (humidity > 70 && temperature > 28) humidityStress = 0.2;
      }
      
      // Combined stress index (0-1 scale, higher = more stressed)
      // Weighted: NDVI 40%, Moisture 35%, Temperature 15%, Humidity 10%
      const csi = Math.min(1, ndviStress * 0.40 + moistureStress * 0.35 + tempStress * 0.15 + humidityStress * 0.10);
      
      // TVDI-like: Thermal dryness approximation
      // When NDVI is low AND temperature is high = high thermal stress
      const tvdi = Math.min(1, (ndviStress * 0.6) + (tempStress * 0.4));
      
      return {
        csi,
        tvdi,
        components: {
          ndviStress: parseFloat(ndviStress.toFixed(3)),
          moistureStress: parseFloat(moistureStress.toFixed(3)),
          tempStress: parseFloat(tempStress.toFixed(3)),
          humidityStress: parseFloat(humidityStress.toFixed(3))
        },
        interpretation: csi < 0.25 ? 'Low stress — crop appears healthy' :
                        csi < 0.45 ? 'Mild stress — monitor closely' :
                        csi < 0.65 ? 'Moderate stress — consider irrigation' :
                        'Severe stress — immediate action needed'
      };
    } catch (e) {
      console.warn('Stress index calculation failed:', e);
      return { csi: 0.5, tvdi: 0.5, components: {}, interpretation: 'Unable to calculate' };
    }
  }

  // ═══════════ PEST RISK ASSESSMENT ═══════════
  async function fetchPestRisk(temperature, humidity, cropType) {
    try {
      const { PEST_RISK } = FH_CONFIG;
      if (!temperature || !humidity) return { risks: [], overall: 0 };
      
      const risks = [];
      let maxRisk = 0;
      
      Object.entries(PEST_RISK).forEach(([key, pest]) => {
        // Check if pest affects this crop
        const crops = Array.isArray(pest.crop) ? pest.crop : [pest.crop];
        if (!crops.includes(cropType) && cropType !== 'generic' && !crops.includes('generic') && !crops.includes('generic')) return;
        
        // Check temperature range
        const tempOk = temperature >= pest.tempRange[0] && temperature <= pest.tempRange[1];
        const humidOk = humidity >= pest.humidMin;
        
        if (tempOk && humidOk) {
          // How favorable? Both conditions met = high risk
          const midTemp = (pest.tempRange[0] + pest.tempRange[1]) / 2;
          const tempFit = 1 - Math.abs(temperature - midTemp) / ((pest.tempRange[1] - pest.tempRange[0]) / 2 + 5);
          const humidFit = Math.min(1, (humidity - pest.humidMin) / 15);
          const riskScore = Math.round(Math.min(100, Math.max(0, (tempFit * 0.5 + humidFit * 0.5) * 100)));
          
          maxRisk = Math.max(maxRisk, riskScore);
          risks.push({
            name: pest.name,
            risk: riskScore,
            level: riskScore > 70 ? 'high' : riskScore > 40 ? 'medium' : 'low',
            desc: pest.desc,
            key
          });
        }
      });
      
      // Sort by risk descending
      risks.sort((a, b) => b.risk - a.risk);
      
      return {
        risks,
        overall: maxRisk,
        level: maxRisk > 70 ? 'high' : maxRisk > 40 ? 'medium' : 'low',
        timestamp: new Date().toISOString()
      };
    } catch (e) {
      console.warn('Pest risk calculation failed:', e);
      return { risks: [], overall: 0, level: 'low' };
    }
  }

  // ═══════════ REVERSE GEOCODING (OpenStreetMap Nominatim) ═══════════
  // Returns a display string like "Village, District, State".
  async function reverseGeocode(lat, lng) {
    const place = await reverseGeocodeFull(lat, lng);
    if (!place) return 'Location Unavailable';
    const parts = [];
    if (place.village || place.town || place.city) parts.push(place.village || place.town || place.city);
    if (place.district) parts.push(place.district);
    if (place.state) parts.push(place.state);
    return parts.join(', ') || place.full || 'Unknown Location';
  }

  // Structured reverse geocoding — returns { village, tehsil, district,
  // state, country, full }. Used to auto-fill the Land Info card.
  async function reverseGeocodeFull(lat, lng) {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
      if (!res.ok) throw new Error('Geocoding failed');
      const data = await res.json();
      if (data && data.address) {
        const a = data.address;
        return {
          village: a.village || a.suburb || a.town || a.city_district || '',
          tehsil: a.county || a.municipality || a.taluk || a.district || '',
          district: a.state_district || a.county || a.district || '',
          subdistrict: a.subdistrict || a.municipality || a.taluk || a.county || '',
          pincode: a.postcode || a['ISO3166-2-lvl4'] || '',
          state: a.state || '',
          country: a.country || '',
          full: data.display_name || ''
        };
      }
      return null;
    } catch (e) {
      console.error('Geocoding error:', e);
      return null;
    }
  }

  // ═══════════ PINCODE LOOKUP (India Post, free) ═══════════
  // Real pincode from the Indian Postal Department API using the village /
  // place name. Falls back gracefully — returns null on any failure so the
  // UI can keep the reverse-geocoded postcode instead.
  // IMPORTANT: the API returns ALL post offices that fuzzy-match the query,
  // sometimes from OTHER districts (e.g. "Kandhai" matched "Kandhaipur" in
  // Barabanki). We therefore require a NAME match and, when known, a
  // district/state match so we never show a pincode for the wrong locality.
  async function lookupPincode(placeName, district, state) {
    const candidates = [];
    if (placeName) candidates.push(placeName.trim());
    if (district && district !== placeName) candidates.push(district.trim());
    if (state && state !== placeName) candidates.push(state.trim());
    if (!candidates.length) return null;

    const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const districtNorm = norm(district);
    const stateNorm = norm(state);

    for (const q of candidates.slice(0, 3)) {
      try {
        const url = 'https://api.postalpincode.in/postoffice/' + encodeURIComponent(q);
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) continue;
        const data = await res.json();
        if (!Array.isArray(data) || data[0]?.Status !== 'Success') continue;
        const posts = data[0].PostOffice || [];

        // 1. Strongest: EXACT name match for the queried place (e.g. "Kandhai"
        //    only matches a post office actually named Kandhai).
        const qNorm = norm(q);
        const byExactName = posts.filter(p => qNorm && norm(p.Name) === qNorm);
        // 2. Prefix name match ("Kandhai" ~ "Kandhai Kalan") — only trusted
        //    when the region ALSO matches, so a suburb in another district
        //    ("Kandhaipur", Barabanki) can never pass.
        const hasRegion = !!(districtNorm || stateNorm);
        const regionOk = (p) =>
          (!districtNorm || norm(p.District) === districtNorm || norm(p.District).includes(districtNorm)) &&
          (!stateNorm || norm(p.State) === stateNorm || norm(p.State).includes(stateNorm));
        const byPrefix = posts.filter(p => qNorm && (norm(p.Name).startsWith(qNorm) || qNorm.startsWith(norm(p.Name))) && regionOk(p));
        // 3. Region-only match (district name query, etc.)
        const byRegion = hasRegion ? posts.filter(regionOk) : [];

        // Only accept a confident match — never a fuzzy result from ANOTHER
        // district. If nothing matches confidently, try the next candidate
        // (district / state) instead of guessing.
        const pool = byExactName.length ? byExactName : (byPrefix.length ? byPrefix : byRegion);
        if (pool && pool.length) {
          const po = pool[0];
          return po?.Pincode || null;
        }
      } catch (e) {
        console.warn('[Pincode] lookup failed for', q, ':', e.message);
      }
    }
    return null;
  }

  function getFallbackAdvice(payload) {
    const ndvi = payload.ndvi || 0;
    const ph = payload.soilPh || 6.5;
    const temp = payload.weather?.temp || 25;
    let health = 'moderate';
    if (ndvi > 0.7) health = 'excellent';
    else if (ndvi > 0.5) health = 'good';
    else if (ndvi > 0.3) health = 'moderate';
    else health = 'poor';
    const recs = [];
    if (health === 'excellent') {
      recs.push('Crop health is excellent. Maintain current irrigation schedule.');
      recs.push('Monitor for pest outbreaks.');
    } else if (health === 'good') {
      recs.push('Crop is looking good. Consider nitrogen top-dressing if in vegetative stage.');
      recs.push('Watch for moisture stress during hot afternoons.');
    } else if (health === 'moderate') {
      recs.push('NDVI suggests moderate vigor. Check for nutrient deficiencies, especially nitrogen.');
      recs.push('Ensure irrigation is adequate.');
    } else {
      recs.push('NDVI is low. Inspect field for disease, pest damage, or waterlogging.');
      recs.push('Consider soil testing and foliar nutrition spray.');
    }
    if (ph < 6.0) recs.push('Soil is acidic — apply lime as per recommendations.');
    else if (ph > 7.5) recs.push('Soil is alkaline — use acid-forming fertilizers or gypsum.');
    if (temp > 35) recs.push('High temperature alert — provide light irrigation during evening.');
    else if (temp < 10) recs.push('Low temperature — protect seedlings with mulching.');
    const advice = recs.map((r, i) => (i + 1) + '. ' + r).join('\n');
    return '### FarmHealth Expert Advice\n\n**Crop Status: ' + health.toUpperCase() + '** (NDVI: ' + ndvi.toFixed(3) + ')\n\n' + advice + '\n\n> This advice is generated by FarmHealth built-in expert system. Connect Ollama or Gemini for more detailed AI analysis.';
  }

  async function fetchInfrastructure(lat, lng, radius) {
    const R = radius || 2000;
    // 1. Same-origin backend proxy (Node server / Render)
    try {
      const res = await fetch(getApiUrl('/api/infrastructure'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng, radius: R })
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.elements) return data;
      }
      throw new Error('Proxy returned ' + res.status);
    } catch (e) {
      console.warn('[Infrastructure] Proxy failed, using direct OSM Overpass:', e.message);
    }
    // 2. Direct Overpass fallback (static hosts like Netlify / file://)
    try {
      const query = `
        [out:json][timeout:25];
        (
          node["man_made"="pipeline"]["substance"="water"](around:${R},${lat},${lng});
          way["man_made"="pipeline"]["substance"="water"](around:${R},${lat},${lng});
          node["power"="pole"](around:${R},${lat},${lng});
          node["power"="tower"](around:${R},${lat},${lng});
          way["power"="line"](around:${R},${lat},${lng});
          node["water"="well"](around:${R},${lat},${lng});
          node["water"="pump"](around:${R},${lat},${lng});
          way["waterway"="canal"](around:${R},${lat},${lng});
          node["emergency"="fire_hydrant"](around:${R},${lat},${lng});
        );
        out center body;
      `;
      const res = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'data=' + encodeURIComponent(query)
      });
      if (!res.ok) throw new Error('Overpass HTTP ' + res.status);
      const data = await res.json();
      return { success: true, count: data.elements?.length || 0, source: 'openstreetmap', elements: data.elements || [] };
    } catch (e) {
      console.warn('[Infrastructure] Direct Overpass also failed:', e.message);
      return null;
    }
  }

  // ═══════════ PROFESSIONAL ANALYSIS PIPELINE (GEE) ═══════════
  // Continuous cloud-free composite + clipped terrain + ML stress decision.
  // These calls go to the Node backend which authenticates GEE server-side.

  // Full end-to-end analysis: continuous indices, clipped terrain, zones,
  // time series, trends — one payload for the report generator.
  async function fetchFullAnalysis(opts) {
    const o = opts || {};
    const payload = {
      coordinates: o.coordinates || _state.fieldLL.map(ll => [ll[0], ll[1]]),
      startDate: o.startDate || null,
      endDate: o.endDate || null,
      monthsBack: o.monthsBack || 4,
      maxCloudPct: o.maxCloudPct || 25,
      gridSize: o.gridSize || 8
    };
    try {
      const res = await fetch(getApiUrl('/api/gee/analysis'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(240000)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Analysis failed (HTTP ' + res.status + ')');
      }
      return await res.json();
    } catch (e) {
      console.warn('[Analysis] Full analysis failed:', e.message);
      return null;
    }
  }

  // Clipped SRTM terrain: elevation / slope / aspect / hillshade for the
  // exact field boundary (fully delineated from the surrounding area).
  async function fetchClippedTerrain(opts) {
    const o = opts || {};
    const payload = {
      coordinates: o.coordinates || _state.fieldLL.map(ll => [ll[0], ll[1]])
    };
    try {
      const res = await fetch(getApiUrl('/api/gee/terrain'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(120000)
      });
      if (!res.ok) throw new Error('Terrain failed (HTTP ' + res.status + ')');
      return await res.json();
    } catch (e) {
      console.warn('[Analysis] Clipped terrain failed:', e.message);
      return null;
    }
  }

  // ML stress decision: predicts field-level stress class + confidence.
  async function fetchMLStress(opts) {
    const o = opts || {};
    const payload = {
      coordinates: o.coordinates || _state.fieldLL.map(ll => [ll[0], ll[1]]),
      startDate: o.startDate || null,
      endDate: o.endDate || null
    };
    try {
      const res = await fetch(getApiUrl('/api/ml/predict'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(240000)
      });
      if (!res.ok) throw new Error('ML predict failed (HTTP ' + res.status + ')');
      return await res.json();
    } catch (e) {
      console.warn('[Analysis] ML stress prediction failed:', e.message);
      return null;
    }
  }

  // Train/retrain the stress model on this field's zone features.
  async function fetchMLTrain(opts) {
    const o = opts || {};
    const payload = {
      coordinates: o.coordinates || _state.fieldLL.map(ll => [ll[0], ll[1]]),
      startDate: o.startDate || null,
      endDate: o.endDate || null,
      gridSize: o.gridSize || 8
    };
    try {
      const res = await fetch(getApiUrl('/api/ml/train'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(240000)
      });
      if (!res.ok) throw new Error('ML train failed (HTTP ' + res.status + ')');
      return await res.json();
    } catch (e) {
      console.warn('[Analysis] ML train failed:', e.message);
      return null;
    }
  }

  // Download the zone-feature CSV (ML training table / report table).
  async function fetchZoneCSV(opts) {
    const o = opts || {};
    const payload = {
      coordinates: o.coordinates || _state.fieldLL.map(ll => [ll[0], ll[1]]),
      startDate: o.startDate || null,
      endDate: o.endDate || null,
      gridSize: o.gridSize || 8
    };
    try {
      const res = await fetch(getApiUrl('/api/ml/zones.csv'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(240000)
      });
      if (!res.ok) throw new Error('Zone CSV failed (HTTP ' + res.status + ')');
      return await res.text();
    } catch (e) {
      console.warn('[Analysis] Zone CSV failed:', e.message);
      return null;
    }
  }

  // ═══════════ GROUND-TRUTH LABEL COLLECTION (G5) ═══════════
  // POST a farmer-verified stress class for a zone — feeds real labels into
  // the next model retrain instead of only the bootstrap rule thresholds.
  async function submitGroundTruthLabel(opts) {
    const o = opts || {};
    const payload = {
      coordinates: o.coordinates || _state.fieldLL.map(ll => [ll[0], ll[1]]),
      observedClass: o.observedClass,
      lat: o.lat, lng: o.lng,
      notes: o.notes || '',
      reporter: o.reporter || '',
      gridSize: o.gridSize || 8
    };
    try {
      const res = await fetch(getApiUrl('/api/ml/label'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(180000)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Label submit failed (HTTP ' + res.status + ')');
      }
      return await res.json();
    } catch (e) {
      console.warn('[Analysis] Ground-truth submit failed:', e.message);
      return null;
    }
  }

  // GET the stored ground-truth labels (count + list)
  async function fetchGroundTruthLabels() {
    try {
      const res = await fetch(getApiUrl('/api/ml/labels'), {
        signal: AbortSignal.timeout(20000)
      });
      if (!res.ok) throw new Error('Labels fetch failed (HTTP ' + res.status + ')');
      return await res.json();
    } catch (e) {
      console.warn('[Analysis] Ground-truth fetch failed:', e.message);
      return null;
    }
  }

  // ═══════════ EXPORTS ═══════════
  return {
    setStateRef,
    getSHToken,
    fetchScenes,
    fetchStatistics,
    renderGrid,
    generateSimulatedGrid,
    resetSHUnavailable,
    fetchWeather,
    fetchTerrain,
    fetchSoil,
    getAIAdvice,
    analyzeCropPhoto,
    fetchCombinedStress,
    reverseGeocode,
    reverseGeocodeFull,
    lookupPincode,
    drawHealthGrid,
    valueToClassColor,
    fetchGEEStatistics,
    fetchGEETimeSeries,
    setDataStatus,
    getFallbackAdvice,
    fetchInfrastructure,
    fetchFullAnalysis,
    fetchClippedTerrain,
    fetchMLStress,
    fetchMLTrain,
    fetchZoneCSV,
    submitGroundTruthLabel,
    fetchGroundTruthLabels
  };
})();
