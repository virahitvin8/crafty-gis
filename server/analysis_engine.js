/* ═══════════════════════════════════════════════════════════
   Crafty GIS — GEE Analysis Engine (continuous + clipped)
   ═══════════════════════════════════════════════════════════
   Professional-grade analysis pipeline:
     • Cloud-free MEDIAN composite over a date range (no more
       single-date 404s — continuous, multi-scene)
     • All vegetation indices computed in one pass (NDVI, NDWI,
       EVI, SAVI, NDMI)
     • SRTM DEM clipped to the EXACT field polygon → elevation,
       slope, aspect, hillshade (terrain fully delineated)
     • Per-zone feature grid (the ML training/prediction table)
     • Full analysis payload for the report generator

   Pure async helpers — no Express dependency, so it can be
   unit-tested and reused by any route handler.
   ═══════════════════════════════════════════════════════════ */
'use strict';

// ── Image collection names ──
const S2_COLLECTION = 'COPERNICUS/S2_SR_HARMONIZED';
const DEM_COLLECTION = 'USGS/SRTMGL1_003';

// Scale per index band (Sentinel-2 native resolutions)
const SCALE_10M = 10;
const SCALE_20M = 20;

function toClosedRing(coords) {
  // coords: [[lat,lng],...] → closed [[lng,lat],...] ring for ee
  const ring = coords.map(c => [c[1], c[0]]);
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) ring.push(first);
  return ring;
}

// Sentinel-2 cloud mask (Scene Classification Layer — works on both L1C and
// SR products; SR has no B10, so cirrus is covered by SCL class 9).
function cloudMask(image) {
  const scl = image.select('SCL');
  // 3=cloud shadows? (SCL: 2=dark features/shadow, 3=cloud shadow, 8=cloud
  // medium prob, 9=cloud high prob/cirrus, 10=thin cirrus, 11=snow)
  const clouds = scl.eq(3).or(scl.eq(8)).or(scl.eq(9)).or(scl.eq(10)).or(scl.eq(11));
  const shadow = scl.eq(2).or(scl.eq(3));
  return image.updateMask(clouds.not().and(shadow.not()));
}

// Compute all indices on one image (returns multiband image)
function addIndices(image) {
  const ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI');
  const ndwi = image.normalizedDifference(['B3', 'B8']).rename('NDWI');
  const evi = image.expression(
    '2.5 * ((NIR - RED) / (NIR + 6 * RED - 7.5 * BLUE + 1))',
    { NIR: image.select('B8'), RED: image.select('B4'), BLUE: image.select('B2') }
  ).rename('EVI');
  const savi = image.expression(
    '1.5 * ((NIR - RED) / (NIR + RED + 0.5))',
    { NIR: image.select('B8'), RED: image.select('B4') }
  ).rename('SAVI');
  const ndmi = image.normalizedDifference(['B8', 'B11']).rename('NDMI');
  return image.addBands(ndvi).addBands(ndwi).addBands(evi).addBands(savi).addBands(ndmi);
}

// Build cloud-free composite with all indices for a geometry + date range
function buildComposite(ee, geometry, startDate, endDate, maxCloudPct) {
  const now = new Date();
  const end = endDate || now.toISOString().split('T')[0];
  const start = startDate || new Date(now.getTime() - 120 * 86400000).toISOString().split('T')[0];
  const collection = ee.ImageCollection(S2_COLLECTION)
    .filterBounds(geometry)
    .filterDate(start, end)
    .filter(ee.Filter.lte('CLOUDY_PIXEL_PERCENTAGE', maxCloudPct || 25))
    .map(cloudMask)
    .map(addIndices);

  // Count scenes actually used (for transparency/continuity reporting)
  const sceneCount = collection.size();

  // Median composite → per-pixel robust estimate over the whole window
  const composite = collection.median()
    .select(['NDVI', 'NDWI', 'EVI', 'SAVI', 'NDMI'])
    .clip(geometry);   // ← THE field is delineated: everything outside masked

  return { composite, collection, sceneCount };
}

// ── Terrain: SRTM DEM clipped to polygon → elevation/slope/aspect ──
function buildTerrain(ee, geometry) {
  const dem = ee.Image(DEM_COLLECTION).select('elevation').clip(geometry);
  const slope = ee.Terrain.slope(dem).rename('slope');
  const aspect = ee.Terrain.aspect(dem).rename('aspect');
  const hillshade = ee.Terrain.hillshade(dem).rename('hillshade');
  return ee.Image.cat([dem, slope, aspect, hillshade]).clip(geometry);
}

// ── Evaluate a reducer over a geometry (promisified) ──
function reduceRegion(ee, image, geometry, scale, bestEffort) {
  return new Promise((resolve, reject) => {
    // Combined reducer (percentile + mean + stdDev).
    // Output keys arrive as: <band>_p0, <band>_p50, <band>_mean, <band>_stdDev ...
    const reducer = ee.Reducer.percentile([0, 5, 25, 50, 75, 95, 100], ['p0', 'p5', 'p25', 'p50', 'p75', 'p95', 'p100'])
      .combine(ee.Reducer.mean(), null, true)
      .combine(ee.Reducer.stdDev(), null, true);
    const r = image.reduceRegion({
      reducer,
      geometry,
      scale: scale || SCALE_10M,
      bestEffort: bestEffort !== false,
      maxPixels: 1e9
    });
    r.evaluate((res, err) => (err ? reject(err) : resolve(res || {})));
  });
}

function summarizeStats(raw, band) {
  // raw: { band_p0, band_p5, ..., band_mean, band_stdDev, ... }
  const g = (suffix) => {
    const v = raw[band + '_' + suffix];
    return (v === undefined || v === null || isNaN(v)) ? null : +v;
  };
  return {
    mean: g('mean'),
    std: g('stdDev'),
    p0: g('p0'), p5: g('p5'), p25: g('p25'),
    p50: g('p50'), p75: g('p75'), p95: g('p95'), p100: g('p100')
  };
}  // Per-zone grid: divide the polygon bbox into GRID×GRID cells, keep cells
  // whose centroid is inside the polygon, return zone cells for reduceRegions.
  // (Extracted so the time-series trend builder can reuse the same grid.)
  function buildZoneGrid(coords, gridSize) {
    const n = Math.max(3, Math.min(12, gridSize || 8));
    // lat/lng bounds computed in JS from the original coordinate list
    const lats = coords.map(c => c[0]);
    const lngs = coords.map(c => c[1]);
    const s = Math.min(...lats), nBound = Math.max(...lats);
    const w = Math.min(...lngs), e = Math.max(...lngs);
    const dLat = (nBound - s) / n, dLng = (e - w) / n;

    // point-in-polygon (ray casting) — reuse in Node
    function inPoly(lat, lng) {
      let inside = false;
      for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
        const xi = coords[i][0], yi = coords[i][1];
        const xj = coords[j][0], yj = coords[j][1];
        const intersect = ((yi > lng) !== (yj > lng)) &&
          (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
      }
      return inside;
    }

    const zones = [];
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const lat = s + (r + 0.5) * dLat;
        const lng = w + (c + 0.5) * dLng;
        if (!inPoly(lat, lng)) continue;
        zones.push({ id: `z${r}_${c}`, lat, lng, cellW: dLng, cellH: dLat });
      }
    }
    return zones;
  }

  function buildZoneFeatures(ee, composite, terrain, geometry, coords, gridSize) {
    const zones = buildZoneGrid(coords, gridSize);

  // Build ee FeatureCollection of zone CELL RECTANGLES (true zone aggregates,
  // not single-pixel samples) so each zone's stats represent the whole cell.
  const feats = zones.map(z =>
    ee.Feature(ee.Geometry.Rectangle([
      z.lng - z.cellW / 2, z.lat - z.cellH / 2,
      z.lng + z.cellW / 2, z.lat + z.cellH / 2
    ]), { zone: z.id })
  );
  const fc = ee.FeatureCollection(feats);

  // reduceRegions for composite indices (10m) + terrain (30m)
  const zoneImg = composite.select(['NDVI', 'NDWI', 'EVI', 'SAVI', 'NDMI'])
    .reduceRegions({ collection: fc, reducer: ee.Reducer.mean(), scale: SCALE_10M });
  const terrainZone = terrain.select(['elevation', 'slope', 'aspect'])
    .reduceRegions({ collection: fc, reducer: ee.Reducer.mean(), scale: 30 });

  return new Promise((resolve, reject) => {
    zoneImg.evaluate((idxRes, err1) => {
      if (err1) return reject(err1);
      terrainZone.evaluate((terrRes, err2) => {
        if (err2) return reject(err2);
        const idxMap = {};
        (idxRes && idxRes.features || []).forEach(f => {
          const zone = f.properties.zone;
          idxMap[zone] = {
            ndvi: f.properties.NDVI,
            ndwi: f.properties.NDWI,
            evi: f.properties.EVI,
            savi: f.properties.SAVI,
            ndmi: f.properties.NDMI
          };
        });
        const terrMap = {};
        (terrRes && terrRes.features || []).forEach(f => {
          const zone = f.properties.zone;
          terrMap[zone] = {
            elevation: f.properties.elevation,
            slope: f.properties.slope,
            aspect: f.properties.aspect
          };
        });

        const rows = zones.map(z => Object.assign({}, z, idxMap[z.id] || {}, terrMap[z.id] || {}));
        resolve({ zones, rows });
      });
    });
  });
}

// Time series: per-scene mean NDVI/NDWI over the range (continuity)
function buildTimeSeries(ee, geometry, startDate, endDate) {
  const now = new Date();
  const end = endDate || now.toISOString().split('T')[0];
  const start = startDate || new Date(now.getTime() - 120 * 86400000).toISOString().split('T')[0];
  const collection = ee.ImageCollection(S2_COLLECTION)
    .filterBounds(geometry)
    .filterDate(start, end)
    .filter(ee.Filter.lte('CLOUDY_PIXEL_PERCENTAGE', 30))
    .map(cloudMask)
    .map(addIndices);

  const series = collection.map(img => {
    const ndviMean = img.select('NDVI').reduceRegion({
      reducer: ee.Reducer.mean(), geometry, scale: SCALE_10M, bestEffort: true
    }).get('NDVI');
    const ndwiMean = img.select('NDWI').reduceRegion({
      reducer: ee.Reducer.mean(), geometry, scale: SCALE_10M, bestEffort: true
    }).get('NDWI');
    return ee.Feature(null, {
      date: img.date().format('YYYY-MM-dd'),
      ndvi: ndviMean,
      ndwi: ndwiMean
    });
  });

  return new Promise((resolve, reject) => {
    series.evaluate((res, err) => {
      if (err) return reject(err);
      const data = (res && res.features || [])
        .map(f => ({
          date: f.properties.date,
          ndvi: (f.properties.ndvi === null || f.properties.ndvi === undefined) ? null : +f.properties.ndvi,
          ndwi: (f.properties.ndwi === null || f.properties.ndwi === undefined) ? null : +f.properties.ndwi
        }))
        .filter(p => p.ndvi !== null)
        .sort((a, b) => a.date.localeCompare(b.date));
      resolve(data);
    });
  });
}

function trendOf(series, field) {
  const pts = series.filter(p => p[field] !== null && p[field] !== undefined);
  if (pts.length < 2) return 0;
  const t0 = new Date(pts[0].date).getTime();
  let sx = 0, sy = 0, sxy = 0, sxx = 0, m = 0;
  for (const p of pts) {
    const x = (new Date(p.date).getTime() - t0) / 86400000; // days
    const y = p[field];
    sx += x; sy += y; sxy += x * y; sxx += x * x; m++;
  }
  const denom = m * sxx - sx * sx;
  if (denom === 0) return 0;
  return (m * sxy - sx * sy) / denom; // per-day slope
}

/* ═══════════════ G6: CHIRPS RAINFALL + SENTINEL-1 SOIL MOISTURE ═══════════════
   Precipitation totals + monthly breakdown from CHIRPS daily rainfall, and a
   relative soil-moisture proxy from Sentinel-1 SAR backscatter (works through
   clouds — exactly the value the roadmap's "SAR soil moisture" week promised). */
const CHIRPS_COLLECTION = 'UCSB-CHG/CHIRPS/DAILY';
const S1_COLLECTION = 'COPERNICUS/S1_GRD';

// Total + monthly rainfall (mm) for the window over the field polygon
async function buildRainfall(ee, geometry, startDate, endDate) {
  const now = new Date();
  const end = endDate || now.toISOString().split('T')[0];
  const start = startDate || new Date(now.getTime() - 120 * 86400000).toISOString().split('T')[0];
  const col = ee.ImageCollection(CHIRPS_COLLECTION)
    .filterBounds(geometry)
    .filterDate(start, end);
  const totalImg = col.sum().select('precipitation');
  const total = await reduceRegion(ee, totalImg, geometry, 5000, true);

  // Monthly breakdown — only months that OVERLAP the analysis window (a month
  // outside the range can be empty in CHIRPS and break the sum, so skip it).
  const monthly = [];
  const winStart = new Date(start);
  const winEnd = new Date(end);
  const cursor = new Date(winStart.getFullYear(), winStart.getMonth(), 1);
  let guard = 0;
  while (cursor < winEnd && guard++ < 24) {
    const mEnd = new Date(cursor);
    mEnd.setMonth(mEnd.getMonth() + 1);
    try {
      const mCol = ee.ImageCollection(CHIRPS_COLLECTION)
        .filterBounds(geometry)
        .filterDate(cursor.toISOString().split('T')[0], mEnd.toISOString().split('T')[0]);
      const mImg = mCol.sum().select('precipitation');
      const mStats = await reduceRegion(ee, mImg, geometry, 5000, true);
      monthly.push({ month: cursor.toISOString().slice(0, 7), mm: Math.round((mStats.precipitation_mean || 0) * 10) / 10 });
    } catch (e) {
      console.warn('[Analysis] Rainfall month skipped (' + cursor.toISOString().slice(0, 7) + '):', e.message || String(e));
    }
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return {
    total_mm: Math.round((total.precipitation_mean || 0) * 10) / 10,
    days: Math.round((new Date(end) - new Date(start)) / 86400000) + 1,
    monthly
  };
}

// Sentinel-1 SAR soil-moisture proxy (0–1 relative wetness within the field)
async function buildSoilMoisture(ee, geometry, startDate, endDate) {
  const now = new Date();
  const end = endDate || now.toISOString().split('T')[0];
  const start = startDate || new Date(now.getTime() - 30 * 86400000).toISOString().split('T')[0];
  const col = ee.ImageCollection(S1_COLLECTION)
    .filterBounds(geometry)
    .filterDate(start, end)
    .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
    .filter(ee.Filter.eq('instrumentMode', 'IW'))
    .map(img => img.select('VV').addBands(img.select('VH').rename('VH')).addBands(img.select('angle').rename('angle')));
  const vv = col.select('VV').median().clip(geometry);
  const vh = col.select('VH').median().clip(geometry);
  const stats = await reduceRegion(ee, vv, geometry, 100);
  const vhStats = await reduceRegion(ee, vh, geometry, 100);
  const sceneCount = await new Promise((res, rej) => col.size().evaluate(v => res(v), rej));

  const p5 = stats.VV_p5, p95 = stats.VV_p95, mean = stats.VV_mean;
  // Normalize within-field percentile range → relative wetness 0..1
  let moistureIndex = null;
  if (p5 !== null && p95 !== null && mean !== null && p95 - p5 > 0.01) {
    moistureIndex = Math.max(0, Math.min(1, (p95 - mean) / (p95 - p5)));
  }
  return {
    moistureIndex,
    vv_db: mean !== null ? Math.round(mean * 10) / 10 : null,
    vh_db: vhStats.VH_mean !== null ? Math.round(vhStats.VH_mean * 10) / 10 : null,
    p5: p5 !== null ? Math.round(p5 * 10) / 10 : null,
    p95: p95 !== null ? Math.round(p95 * 10) / 10 : null,
    sceneCount,
    dateRange: { start, end },
    note: 'Relative soil wetness from Sentinel-1 SAR (works through clouds)'
  };
}

/* ═══════════════ G7: LANDSAT THERMAL + CWSI (canopy temp) ═══════════════
   Landsat 8/9 Collection 2 Level-2 surface temperature (ST_B10, °C) clipped to
   the field + a simplified Crop Water Stress Index (CWSI) using the field's own
   thermal range. Flagged as an approximation in the UI (no in-situ IRTs). */
const L8_COLLECTION = 'LANDSAT/LC08/C02/T1_L2';
const L9_COLLECTION = 'LANDSAT/LC09/C02/T1_L2';

function buildThermal(ee, geometry, startDate, endDate) {
  const now = new Date();
  const end = endDate || now.toISOString().split('T')[0];
  const start = startDate || new Date(now.getTime() - 90 * 86400000).toISOString().split('T')[0];
  const l8 = ee.ImageCollection(L8_COLLECTION)
    .filterBounds(geometry).filterDate(start, end)
    .filter(ee.Filter.lt('CLOUD_COVER', 40));
  const l9 = ee.ImageCollection(L9_COLLECTION)
    .filterBounds(geometry).filterDate(start, end)
    .filter(ee.Filter.lt('CLOUD_COVER', 40));
  const merged = l8.merge(l9);
  // ST_B10: scale 0.00341802, offset 149.0 → °C
  const lst = merged.map(img => img.select('ST_B10').multiply(0.00341802).add(149.0).rename('LST')).median().clip(geometry);
  const stats = reduceRegion(ee, lst, geometry, 30);
  return stats.then(s => {
    const mean = s.LST_mean, p5 = s.LST_p5, p95 = s.LST_p95, p100 = s.LST_p100;
    // Simplified CWSI: where the field sits between its cool (wet) and hot (dry) edges.
    // Small fields can have a tiny thermal spread, so accept any spread > 0.2°C.
    let cwsi = null;
    if (mean !== null && p5 !== null && p95 !== null && p95 - p5 > 0.2) {
      cwsi = Math.max(0, Math.min(1, (mean - p5) / (p95 - p5)));
    }
    return {
      lst_c: mean !== null ? Math.round(mean * 10) / 10 : null,
      p5_c: p5 !== null ? Math.round(p5 * 10) / 10 : null,
      p95_c: p95 !== null ? Math.round(p95 * 10) / 10 : null,
      p100_c: p100 !== null ? Math.round(p100 * 10) / 10 : null,
      cwsi,
      note: 'Landsat 8/9 C2 L2 surface temperature (°C); CWSI is an approximation from the field thermal range'
    };
  });
}

/* ═══════════ G1/G4: PER-ZONE TRENDS OVER TIME ═══════════
   Splits the window into N sub-windows, composites each, and reduces the zone
   grid per window → a per-zone {ndvi_trend, ndwi_trend} feature. This is the
   "feature vectors over TIME" gap: each zone gets its own slope, not just a
   single-date snapshot. Returns a map zoneId → trends. */
async function buildZoneTrends(ee, geometry, coords, startDate, endDate, gridSize, nWindows) {
  const zones = buildZoneGrid(coords, gridSize);
  const now = new Date();
  const end = endDate || now.toISOString().split('T')[0];
  const start = startDate || new Date(now.getTime() - 120 * 86400000).toISOString().split('T')[0];
  const n = Math.max(3, Math.min(6, nWindows || 4));
  const tStart = new Date(start).getTime();
  const tEnd = new Date(end).getTime();
  const step = (tEnd - tStart) / n;

  // One reduceRegions call per window (gridSize ≤ 12 keeps this cheap).
  // Zone cells are RECTANGLES (not points) — same proven approach as
  // buildZoneFeatures, so a masked pixel never voids a whole zone.
  const windows = [];
  for (let i = 0; i < n; i++) {
    const wStart = new Date(tStart + i * step).toISOString().split('T')[0];
    const wEnd = new Date(tStart + (i + 1) * step).toISOString().split('T')[0];
    windows.push([wStart, wEnd]);
  }

  const feats = zones.map(z =>
    ee.Feature(ee.Geometry.Rectangle([
      z.lng - z.cellW / 2, z.lat - z.cellH / 2,
      z.lng + z.cellW / 2, z.lat + z.cellH / 2
    ]), { zone: z.id })
  );
  const fc = ee.FeatureCollection(feats);

  // zoneId → [{date, ndvi, ndwi}]
  const series = {};
  zones.forEach(z => { series[z.id] = []; });

  for (const [ws, we] of windows) {
    try {
      const comp = ee.ImageCollection(S2_COLLECTION)
        .filterBounds(geometry)
        .filterDate(ws, we)
        .filter(ee.Filter.lte('CLOUDY_PIXEL_PERCENTAGE', 30))
        .map(cloudMask)
        .map(addIndices)
        .median()
        .select(['NDVI', 'NDWI']);
      const sampled = comp.sampleRegions({ collection: fc, scale: 10, tileScale: 4 });
      const res = await new Promise((resolve, reject) => {
        sampled.evaluate((r, err) => (err ? reject(err) : resolve(r || {})));
      });
      (res.features || []).forEach(f => {
        const zid = f.properties.zone;
        const ndvi = f.properties.NDVI;
        const ndwi = f.properties.NDWI;
        if (!series[zid]) series[zid] = [];
        if (ndvi !== null && ndvi !== undefined) {
          series[zid].push({ date: ws, ndvi, ndwi: ndwi === null || ndwi === undefined ? null : ndwi });
        }
      });
    } catch (e) {
      // Empty window (no cloud-free scenes) — skip; other windows still count.
      console.warn('[Analysis] Zone-trend window skipped (' + ws + '):', e.message || String(e));
    }
  }

  const out = {};
  zones.forEach(z => {
    const pts = series[z.id];
    out[z.id] = {
      ndvi_trend: trendOf(pts, 'ndvi'),
      ndwi_trend: trendOf(pts, 'ndwi'),
      observations: pts.length
    };
  });
  return { trends: out, zones };
}

/* ═══════════ G10: REGIONAL COMPARISON (field vs district) ═══════════
   Adapts the side-by-side regional analysis idea: field stats vs the NDVI /
   rainfall / thermal of a ~2km surrounding region, so a farmer can see whether
   their field is better or worse than the local area. */
async function buildRegionalComparison(ee, geometry, startDate, endDate, maxCloudPct) {
  const now = new Date();
  const end = endDate || now.toISOString().split('T')[0];
  const start = startDate || new Date(now.getTime() - 120 * 86400000).toISOString().split('T')[0];
  const region = geometry.buffer(2000); // ~2 km buffer around the field

  // Composite indices over region + field
  const col = ee.ImageCollection(S2_COLLECTION)
    .filterBounds(region)
    .filterDate(start, end)
    .filter(ee.Filter.lte('CLOUDY_PIXEL_PERCENTAGE', maxCloudPct || 25))
    .map(cloudMask)
    .map(addIndices);
  const comp = col.median().select(['NDVI', 'NDWI', 'EVI', 'NDMI']);
  const [fieldStats, regionStats] = await Promise.all([
    reduceRegion(ee, comp, geometry, 10),
    reduceRegion(ee, comp, region, 100)
  ]);

  // Rainfall for field vs region
  const rainCol = ee.ImageCollection(CHIRPS_COLLECTION)
    .filterBounds(region)
    .filterDate(start, end);
  const [fieldRain, regionRain] = await Promise.all([
    reduceRegion(ee, rainCol.sum().select('precipitation'), geometry, 5000, true),
    reduceRegion(ee, rainCol.sum().select('precipitation'), region, 5000, true)
  ]);

  const pct = (a, b) => (a === null || a === undefined || !b) ? null : Math.round((a / b) * 1000) / 10;
  return {
    field: {
      ndvi: fieldStats.NDVI_mean,
      ndwi: fieldStats.NDWI_mean,
      rainfall_mm: Math.round((fieldRain.precipitation_mean || 0) * 10) / 10
    },
    region: {
      ndvi: regionStats.NDVI_mean,
      ndwi: regionStats.NDWI_mean,
      rainfall_mm: Math.round((regionRain.precipitation_mean || 0) * 10) / 10
    },
    deltas: {
      ndvi: fieldStats.NDVI_mean !== null ? Math.round((fieldStats.NDVI_mean - regionStats.NDVI_mean) * 1000) / 1000 : null,
      ndviPct: pct(fieldStats.NDVI_mean, regionStats.NDVI_mean),
      // FIXED: numerator must be the FIELD rainfall, not NDVI truthiness.
      rainfallPct: pct(fieldRain.precipitation_mean, regionRain.precipitation_mean)
    },
    verdict: fieldStats.NDVI_mean !== null && regionStats.NDVI_mean !== null
      ? (fieldStats.NDVI_mean > regionStats.NDVI_mean * 1.05 ? 'field_better' :
         fieldStats.NDVI_mean < regionStats.NDVI_mean * 0.95 ? 'field_worse' : 'field_par')
      : null,
    buffer_m: 2000
  };
}

/* ═══════════════ GEDI REAL LIDAR FOOTPRINTS (RH98 + AGBD) ═══════════════
   Pulls actual GEDI footprints over the field from Earth Engine so the
   frontend's biomass estimate uses real LiDAR canopy height instead of the
   NDVI proxy:
     • L4A (GEDI04_A_002_MONTHLY) — above-ground biomass density agbd (Mg/ha)
     • L2A (GEDI02_A_002_MONTHLY) — RH98 relative height (m), the LiDAR
       canopy-top-height metric
   GEDI footprints are sparse 25 m orbital shots, so every zone also gets a
   footprint count; the frontend falls back to the NDVI-proxy height for any
   zone without a footprint. Quality-masked via l4_quality_flag /
   algorithm_run_flag / quality_flag / degrade_flag. */
const GEDI_L4A_COLLECTION = 'LARSE/GEDI/GEDI04_A_002_MONTHLY';
const GEDI_L2A_COLLECTION = 'LARSE/GEDI/GEDI02_A_002_MONTHLY';

async function buildGEDIBiomass(ee, geometry, coords, gridSize) {
  const zones = buildZoneGrid(coords, gridSize);
  // GEDI archive spans Apr 2019 → mid 2025 — use the whole archive so small
  // fields have the best chance of a footprint hit.
  const start = '2019-04-01';
  const end = '2025-07-01';

  // L4A: above-ground biomass density (Mg/ha ≈ t/ha)
  const l4a = ee.ImageCollection(GEDI_L4A_COLLECTION)
    .filterBounds(geometry)
    .filterDate(start, end)
    .filter(ee.Filter.eq('l4_quality_flag', 1))
    .filter(ee.Filter.eq('algorithm_run_flag', 1))
    .filter(ee.Filter.eq('degrade_flag', 0));
  // L2A: RH98 = relative height at the 98th percentile → canopy top height (m)
  const l2a = ee.ImageCollection(GEDI_L2A_COLLECTION)
    .filterBounds(geometry)
    .filterDate(start, end)
    .filter(ee.Filter.eq('quality_flag', 1))
    .filter(ee.Filter.eq('degrade_flag', 0));

  // Footprints are sparse → collapse the whole archive to one median image.
  const l4aImg = l4a.select('agbd').median().clip(geometry);
  const l2aImg = l2a.select('rh98').median().clip(geometry);

  // Per-zone footprint sampling: mean + footprint count over each zone cell.
  const feats = zones.map(z =>
    ee.Feature(ee.Geometry.Rectangle([
      z.lng - z.cellW / 2, z.lat - z.cellH / 2,
      z.lng + z.cellW / 2, z.lat + z.cellH / 2
    ]), { zone: z.id })
  );
  const fc = ee.FeatureCollection(feats);
  const reducer = ee.Reducer.mean().combine(ee.Reducer.count(), null, true);

  const sampleZones = (img) => new Promise((resolve, reject) => {
    img.reduceRegions({ collection: fc, reducer, scale: 25, tileScale: 4 })
      .evaluate((r, err) => (err ? reject(err) : resolve((r && r.features) || [])));
  });

  const [l4aSampled, l2aSampled] = await Promise.all([sampleZones(l4aImg), sampleZones(l2aImg)]);

  const zoneMap = {};
  zones.forEach(z => { zoneMap[z.id] = { agbd: null, agbd_n: 0, rh98: null, rh98_n: 0 }; });
  l4aSampled.forEach(f => {
    const p = f.properties;
    if (zoneMap[p.zone]) {
      zoneMap[p.zone].agbd = (p.agbd_mean === null || p.agbd_mean === undefined) ? null : +p.agbd_mean;
      zoneMap[p.zone].agbd_n = p.count || 0;
    }
  });
  l2aSampled.forEach(f => {
    const p = f.properties;
    if (zoneMap[p.zone]) {
      zoneMap[p.zone].rh98 = (p.rh98_mean === null || p.rh98_mean === undefined) ? null : +p.rh98_mean;
      zoneMap[p.zone].rh98_n = p.count || 0;
    }
  });

  // Field-level summary (mean of whatever footprints hit the polygon)
  const fieldStats = async (img) => {
    try {
      const r = img.reduceRegion({ reducer, geometry, scale: 25, bestEffort: true, maxPixels: 1e9 });
      return await new Promise((res, rej) => r.evaluate((v, e) => (e ? rej(e) : res(v || {}))));
    } catch (e) { return {}; }
  };
  const [l4aField, l2aField] = await Promise.all([fieldStats(l4aImg), fieldStats(l2aImg)]);

  const field = {
    rh98: (l2aField.rh98_mean === null || l2aField.rh98_mean === undefined) ? null : +l2aField.rh98_mean,
    agbd: (l4aField.agbd_mean === null || l4aField.agbd_mean === undefined) ? null : +l4aField.agbd_mean,
    footprints: (l4aField.count || l2aField.count || 0)
  };

  const footprintCount = zones.reduce(
    (a, z) => a + (zoneMap[z.id].agbd_n || 0) + (zoneMap[z.id].rh98_n || 0), 0);

  return {
    source: 'gedi-lidar',
    field,
    zones: zones.map(z => Object.assign({}, z, zoneMap[z.id])),
    footprintCount,
    dateRange: { start, end },
    note: 'GEDI L4A above-ground biomass density (agbd, t/ha) + L2A RH98 canopy height (m) from real LiDAR footprints'
  };
}

/* ═══════════════════════════════════════════════════════════════
   MAIN: fullAnalysis — the complete end-to-end pipeline
   Returns one JSON payload with every parameter the report needs.
   ═══════════════════════════════════════════════════════════════ */
async function fullAnalysis(ee, opts) {
  const { coordinates, startDate, endDate, maxCloudPct, gridSize, monthsBack } = opts;
  if (!coordinates || coordinates.length < 3) throw new Error('Field polygon needs at least 3 points');

  const geometry = ee.Geometry.Polygon([toClosedRing(coordinates)]);

  const now = new Date();
  const end = endDate || now.toISOString().split('T')[0];
  const start = startDate || new Date(now.getTime() - (monthsBack || 4) * 30 * 86400000).toISOString().split('T')[0];

  // 1. Cloud-free composite (continuous, multi-scene)
  const { composite, sceneCount } = buildComposite(ee, geometry, start, end, maxCloudPct);

  // 2. Terrain clipped to the exact field boundary
  const terrain = buildTerrain(ee, geometry);

  // 3. Full-field index statistics
  const [idxStats, terrainStats, tsData] = await Promise.all([
    reduceRegion(ee, composite.select(['NDVI', 'NDWI', 'EVI', 'SAVI', 'NDMI']), geometry, SCALE_10M),
    reduceRegion(ee, terrain.select(['elevation', 'slope', 'aspect']), geometry, 30),
    buildTimeSeries(ee, geometry, start, end)
  ]);

  const stats = {
    ndvi: summarizeStats(idxStats, 'NDVI'),
    ndwi: summarizeStats(idxStats, 'NDWI'),
    evi: summarizeStats(idxStats, 'EVI'),
    savi: summarizeStats(idxStats, 'SAVI'),
    ndmi: summarizeStats(idxStats, 'NDMI'),
    elevation: summarizeStats(terrainStats, 'elevation'),
    slope: summarizeStats(terrainStats, 'slope'),
    aspect: summarizeStats(terrainStats, 'aspect')
  };

  // Trends (continuity measure)
  const ndviTrend = trendOf(tsData, 'ndvi');
  const ndwiTrend = trendOf(tsData, 'ndwi');

  // 4. Per-zone features (ML table)
  let zoneResult = { zones: [], rows: [] };
  try {
    zoneResult = await buildZoneFeatures(ee, composite, terrain, geometry, coordinates, gridSize);
  } catch (e) {
    console.warn('[Analysis] Zone features failed (falling back to empty):', e.message);
  }

  // 4b. Per-zone trend features over time (G1/G4) — separate from the
  //     single-date zone grid so each zone gets its own slope.
  let zoneTrends = {};
  try {
    const zt = await buildZoneTrends(ee, geometry, coordinates, start, end, gridSize, 4);
    zoneTrends = zt.trends;
  } catch (e) {
    console.warn('[Analysis] Zone trend features failed (using flat 0):', e.message);
  }

  // 5. Scene count
  let nScenes = null;
  try {
    nScenes = await new Promise((res, rej) =>
      sceneCount.evaluate(v => res(v), rej)
    );
  } catch (e) { nScenes = null; }

  const areaHa = await new Promise((resolve) => {
    geometry.area(1).evaluate((v, err) => {
      if (err || v === undefined || v === null) return resolve(null);
      resolve(v / 10000);
    });
  });

  // 6. Climate & water (G6) — CHIRPS rainfall + SAR soil moisture
  let rainfall = null, soilMoisture = null, thermal = null, regional = null;
  try { rainfall = await buildRainfall(ee, geometry, start, end); } catch (e) { console.warn('[Analysis] Rainfall failed:', e.message); }
  try { soilMoisture = await buildSoilMoisture(ee, geometry, start, end); } catch (e) { console.warn('[Analysis] SAR soil moisture failed:', e.message); }
  try { thermal = await buildThermal(ee, geometry, start, end); } catch (e) { console.warn('[Analysis] Thermal/CWSI failed:', e.message); }
  try { regional = await buildRegionalComparison(ee, geometry, start, end, maxCloudPct); } catch (e) { console.warn('[Analysis] Regional comparison failed:', e.message); }

  return {
    success: true,
    pipeline: 'full-analysis-v2',
    source: 'google-earth-engine',
    geometry: { type: 'Polygon', coordinates: [toClosedRing(coordinates)] },
    timeRange: { start, end, continuous: true, scenesUsed: nScenes },
    areaHa,
    stats,
    trends: { ndviPerDay: ndviTrend, ndwiPerDay: ndwiTrend, sampleCount: tsData.length },
    timeSeries: tsData,
    zones: zoneResult.rows.map(r => ({
      id: r.id,
      lat: r.lat, lng: r.lng,
      cellW: r.cellW, cellH: r.cellH,
      ndvi: r.ndvi, ndwi: r.ndwi, evi: r.evi, savi: r.savi, ndmi: r.ndmi,
      elevation: r.elevation, slope: r.slope, aspect: r.aspect,
      // per-zone temporal trends (G1/G4)
      ndvi_trend: zoneTrends[r.id]?.ndvi_trend ?? null,
      ndwi_trend: zoneTrends[r.id]?.ndwi_trend ?? null,
      trend_observations: zoneTrends[r.id]?.observations ?? 0
    })),
    zoneCount: zoneResult.zones.length,
    // G6: climate & water
    rainfall,
    soilMoisture,
    // G7: thermal stress
    thermal,
    // G10: field vs region
    regional
  };
}

module.exports = {
  S2_COLLECTION, DEM_COLLECTION,
  CHIRPS_COLLECTION, S1_COLLECTION,
  L8_COLLECTION, L9_COLLECTION,
  GEDI_L4A_COLLECTION, GEDI_L2A_COLLECTION,
  toClosedRing, cloudMask, addIndices,
  buildComposite, buildTerrain,
  reduceRegion, summarizeStats,
  buildZoneGrid, buildZoneFeatures, buildTimeSeries,
  trendOf,
  buildRainfall, buildSoilMoisture, buildThermal,
  buildZoneTrends, buildRegionalComparison,
  buildGEDIBiomass,
  fullAnalysis
};
