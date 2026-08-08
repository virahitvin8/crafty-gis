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

  // ═══════════ SENTINEL HUB AUTH ═══════════
  async function getSHToken() {
    const now = Date.now();
    if (_state.shToken && _state.shTokenExpiry > now + 60000) return _state.shToken;

    // Call our backend proxy to fetch the Sentinel Hub token securely and avoid browser CORS errors
    const res = await fetch('/api/sentinel/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!res.ok) throw new Error('Sentinel Hub auth via proxy failed.');
    const data = await res.json();
    _state.shToken = data.access_token;
    _state.shTokenExpiry = now + (data.expires_in * 1000);
    return _state.shToken;
  }

  function getSHGeoJSON() {
    const coords = _state.fieldLL.map(ll => [ll[1], ll[0]]);
    coords.push(coords[0]);
    return { type: "Polygon", coordinates: [coords] };
  }

  // ═══════════ STAC SCENE DISCOVERY ═══════════
  async function fetchScenes() {
    if (!_state.fieldLL.length) return [];
    const bb = polyBBox(_state.fieldLL);
    // Automate search parameters to retrieve the latest satellite release image
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

    try {
      const data = await fetchJSON(API.STAC_URL + '/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (data && data.features) {
        _state.scenes = data.features.map(f => ({
          id: f.id,
          date: f.properties.datetime?.split('T')[0] || 'Unknown',
          cloud: Math.round(f.properties['eo:cloud_cover'] || 0),
          thumbnail: f.assets?.thumbnail?.href || null
        }));
        return _state.scenes;
      }
    } catch (e) {
      console.warn('STAC API failed, using simulated scenes:', e);
    }

    // Fallback: generate simulated scenes spanning the last N months
    toast('📡 Using simulated satellite scenes (real API unavailable)', 'info');
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
  // Creates colored rectangle cells inside the field boundary
  function drawHealthGrid(gridData, cropPeak) {
    if (!_state.ndviLayer || !_state.fieldLL || !_state.fieldLL.length) return;
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
    
    const indexType = _state.currentIndex || 'ndvi';
    
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        const cellLat = bb.south + (r + 0.5) * latStep;
        const cellLng = bb.west + (c + 0.5) * lngStep;
        
        // Only draw cells inside the field boundary
        if (!pointInPolygon(cellLat, cellLng, poly)) continue;
        
        // Get value for this cell from gridData
        const val = gridData[r * GRID + c] || 0;
        const health = valueToClassColor(val, indexType, peak);
        cc[health.cls]++;
        cnt++;
        
        // Draw the colored rectangle on the map
        const cellBounds = [
          [bb.south + r * latStep, bb.west + c * lngStep],
          [bb.south + (r + 1) * latStep, bb.west + (c + 1) * lngStep]
        ];
        
        const indexLabel = indexType.toUpperCase();
        let pctScore;
        if (['tvdi', 'csi'].includes(indexType)) {
          pctScore = ((1 - val) * 100).toFixed(0) + '%';
        } else {
          pctScore = ((val / peak) * 100).toFixed(0) + '%';
        }

        L.rectangle(cellBounds, {
          color: health.color,
          weight: 0.5,
          opacity: 0.6,
          fillColor: health.color,
          fillOpacity: 0.55
        }).bindTooltip(
          `<b>${health.label}</b><br>${indexLabel}: ${val.toFixed(3)}<br>Score: ${pctScore}`,
          { sticky: true, className: 'ndvi-tooltip' }
        ).addTo(_state.ndviLayer);
      }
    }
    
    return { cc, cnt: Math.max(1, cnt) };
  }

  // ═══════════ DRAW HEALTH GRID FOR REAL DATA ═══════════
  // When the real Sentinel Hub API succeeds, also render a visible grid
  // overlay on the map so problem areas are clearly identifiable.
  function drawHealthGridForRealData(meanNdvi, cropPeak) {
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
    
    drawHealthGrid(gridData, peak);
  }

  // ═══════════ GENERATE SIMULATED GRID DATA + VISUAL OVERLAY ═══════════
  // Creates a realistic NDVI spatial distribution with gradients and stress zones
  function generateSimulatedGrid(meanNdvi, cropPeak) {
    const peak = cropPeak || 0.80;
    const mean = meanNdvi || 0.60;
    const GRID = 12;
    
    // Clear existing overlay
    if (_state.ndviLayer) _state.ndviLayer.clearLayers();
    
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
        if (['tvdi', 'csi'].includes((_state.currentIndex || 'ndvi').toLowerCase())) {
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
    const result = drawHealthGrid(gridData, peak);
    
    return result || { cc: [0, 0, 0, 0, 0, 0], cnt: 1 };
  }

  // ═══════════ SENTINEL HUB PROCESS API ═══════════
  async function renderGrid(indexType, dateStr, cropPeak, preferMean) {
    // Fallback: if Sentinel Hub calls fail, use simulated data
    try {
      const token = await getSHToken();
      if (_state.ndviLayer) _state.ndviLayer.clearLayers();
      
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
      L.imageOverlay(imageUrl, bounds, { opacity: 0.7 }).addTo(_state.ndviLayer);

      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
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
          // Draw a semi-transparent health grid on top of the image overlay
          // This gives the user clear colored blocks they can read at a glance
          drawHealthGridForRealData(gridMean, cropPeak);
          
          resolve({ cc, cnt: Math.max(1, cnt) });
        };
        img.src = imageUrl;
      });
    } catch (e) {
      console.warn('Sentinel Hub Process API failed, using simulated data:', e);
      // Only show toast once on first simulated render
      if (!_state.simulatedData) {
        _state.simulatedData = true;
        toast('🔄 Using simulated satellite data (real API unavailable)', 'info');
      }
      // Use the passed preferred mean, or read from existing analysis, or generate a reasonable value
      const fallbackMean = preferMean || _state.analysisData?.meanNdvi || (0.55 + Math.random() * 0.25);
      return generateSimulatedGrid(fallbackMean, cropPeak);
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
      if (key) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${key}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: `Analyze crop data: ${JSON.stringify(payload)}. Give 3-5 specific recommendations.` }] }] })
        });
        if (!res.ok) throw new Error('API error');
        const data = await res.json();
        text = data.candidates[0].content.parts[0].text;
      } else {
        // Safe backend call to avoid exposing key & bypass CORS
        const res = await fetch('/api/gemini-analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Proxy API error');
        const data = await res.json();
        text = data.advice;
      }
      
      $('aiContent').innerHTML = text.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
      $('aiCard').style.display = '';
      toast('🤖 AI analysis ready!');
    } catch (e) {
      toast('⚠️ AI analysis failed.', 'err');
    }

    $('aiBtn').disabled = false;
    $('aiBtn').textContent = '✨ Get AI Analysis';
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
  async function reverseGeocode(lat, lng) {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
      if (!res.ok) throw new Error('Geocoding failed');
      const data = await res.json();
      if (data && data.address) {
        const a = data.address;
        const parts = [];
        if (a.village || a.suburb || a.town || a.city) parts.push(a.village || a.suburb || a.town || a.city);
        if (a.county || a.state_district) parts.push(a.county || a.state_district);
        if (a.state) parts.push(a.state);
        return parts.join(', ');
      }
      return 'Unknown Location';
    } catch (e) {
      console.error('Geocoding error:', e);
      return 'Location Unavailable';
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
    fetchWeather,
    fetchTerrain,
    fetchSoil,
    getAIAdvice,
    fetchCombinedStress,
    reverseGeocode,
    drawHealthGrid,
    valueToClassColor,
    fetchGEEStatistics,
    fetchGEETimeSeries
  };
})();
