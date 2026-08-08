/* ═══════════════════════════════════════════════════════════
   FarmHealth — Utilities Module
   ═══════════════════════════════════════════════════════════ */

const FH_UTILS = (function() {
  'use strict';

  // ─── DOM Shortcut ───
  function $(id) {
    return document.getElementById(id);
  }

  // ─── Toast Notification ───
  function toast(msg, type) {
    const el = $('toast');
    if (!el) return;
    el.textContent = msg;
    el.className = (type === 'err' ? 'err' : type === 'info' ? 'info' : '') + ' show';
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), 3500);
  }

  // ─── Loading Overlay ───
  function showLoading(msg, pct) {
    const ov = $('loadingOverlay');
    if (!ov) return;
    $('loadingText').textContent = msg || 'Analyzing…';
    if (pct !== undefined) $('progressFill').style.width = pct + '%';
    ov.classList.add('show');
  }

  function hideLoading() {
    const ov = $('loadingOverlay');
    if (!ov) return;
    ov.classList.remove('show');
    $('progressFill').style.width = '0%';
  }

  // ─── DMS Coordinate Parsing ───
  function parseDMS(str) {
    if (!str || typeof str !== 'string') return NaN;
    str = str.trim();
    const n = parseFloat(str);
    if (!isNaN(n) && !str.includes('°')) return n;
    const m = str.match(/(\d+)[°]\s*(\d+)[′']\s*([\d.]+)[″"]?\s*([NSEW])?/i);
    if (!m) return NaN;
    let v = parseInt(m[1]) + parseInt(m[2]) / 60 + parseFloat(m[3]) / 3600;
    if (m[4] && /[SW]/i.test(m[4])) v = -v;
    return v;
  }

  // ─── Geometry Helpers ───
  function areaHa(p) {
    if (!p || p.length < 3) return 0;
    const lat0 = p[0][0] * Math.PI / 180,
      ml = 111320,
      mg = 111320 * Math.cos(lat0);
    let a = 0;
    for (let i = 0, j = p.length - 1; i < p.length; j = i++)
      a += (p[j][1] * mg * p[i][0] * ml) - (p[i][1] * mg * p[j][0] * ml);
    return Math.abs(a / 2) / 10000;
  }

  function polyCenter(p) {
    let lat = 0,
      lng = 0;
    p.forEach(c => { lat += c[0];
      lng += c[1]; });
    return [lat / p.length, lng / p.length];
  }

  function polyBBox(p) {
    let s = 90,
      n = -90,
      w = 180,
      e = -180;
    p.forEach(c => {
      s = Math.min(s, c[0]);
      n = Math.max(n, c[0]);
      w = Math.min(w, c[1]);
      e = Math.max(e, c[1]);
    });
    return { south: s, north: n, west: w, east: e };
  }

  // ─── Date Helpers ───
  function dateStr(d) { return d.toISOString().split('T')[0]; }

  function daysAgo(n) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d;
  }

  // ─── Generic JSON Fetcher ───
  async function fetchJSON(url, opts) {
    try {
      const r = await fetch(url, opts);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } catch (e) {
      console.error('Fetch error:', url, e);
      return null;
    }
  }

  // ─── Download Blob ───
  function downloadBlob(content, filename, type) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ─── EVSscript Builder for Sentinel Hub ───
  function buildEvalscript(indexType, cropPeak) {
    if (indexType === 'sar') {
      return `
        //VERSION=3
        function setup() {
          return { input: ["VV", "VH", "dataMask"], output: { bands: 4 } };
        }
        function evaluatePixel(sample) {
          if (sample.dataMask === 0) return [0,0,0,0];
          // Simple moisture proxy: Normalize VV backscatter
          let val = (sample.VV - sample.VH) / (sample.VV + sample.VH + 0.0001);
          if (val < -0.2) return [139/255, 90/255, 43/255, 0.9];
          if (val < 0.1) return [212/255, 167/255, 106/255, 0.9];
          if (val < 0.4) return [133/255, 193/255, 233/255, 0.9];
          return [46/255, 134/255, 193/255, 0.9];
        }
      `;
    }

    if (indexType === 'tvdi') {
      return `
        //VERSION=3
        function setup() {
          return { input: ["B04", "B05", "B10", "dataMask"], output: { bands: 4 } };
        }
        function evaluatePixel(sample) {
          if (sample.dataMask === 0) return [0,0,0,0];
          // Proxies for NDVI and LST in Landsat 8
          let ndvi = (sample.B05 - sample.B04) / (sample.B05 + sample.B04 + 0.0001);
          let temp = sample.B10 * 0.00341802 + 149.0 - 273.15; // Rough Celsius approximation
          // TVDI color mapping (red = hot/stressed, blue = cool/watered)
          if (temp > 35) return [231/255, 76/255, 60/255, 0.9];
          if (temp > 28) return [243/255, 156/255, 18/255, 0.9];
          if (temp > 20) return [241/255, 196/255, 15/255, 0.9];
          return [46/255, 204/255, 113/255, 0.9];
        }
      `;
    }

    // Default Sentinel-2 L2A Scripts
    return `
      //VERSION=3
      function setup() {
        return { input: ["B02","B03","B04","B05","B08","B11","dataMask"], output: { bands: 4 } };
      }
      function evaluatePixel(sample) {
        if (sample.dataMask === 0) return [0,0,0,0];
        let nir = sample.B08, red = sample.B04, green = sample.B03, blue = sample.B02, swir = sample.B11, rEdge = sample.B05;
        let val = 0;
        if ('${indexType}' === 'ndvi') val = (nir - red) / (nir + red);
        else if ('${indexType}' === 'evi') val = 2.5 * (nir - red) / (nir + 6 * red - 7.5 * blue + 1);
        else if ('${indexType}' === 'savi') val = 1.5 * (nir - red) / (nir + red + 0.5);
        else if ('${indexType}' === 'gndvi') val = (nir - green) / (nir + green);
        else if ('${indexType}' === 'ndmi') val = (nir - swir) / (nir + swir);
        else if ('${indexType}' === 'ndwi') val = (green - nir) / (green + nir);
        else if ('${indexType}' === 'ndre') val = (nir - rEdge) / (nir + rEdge);
        else if ('${indexType}' === 'pest') {
          // Anomaly detection: extremely sensitive to minor red-edge / NIR drops
          val = (nir - rEdge) / (nir + rEdge);
          if (val < 0.25) return [255/255, 0/255, 0/255, 0.9]; // Severe anomaly (Pest/Disease)
          if (val < 0.35) return [255/255, 165/255, 0/255, 0.9]; // Warning
          return [0, 255/255, 0/255, 0.5]; // Normal
        }
        else val = (nir - red) / (nir + red);
        let p = val / ${cropPeak};
        if (val < 0.15) return [139/255, 90/255, 43/255, 0.9];
        if (p < 0.40) return [231/255, 76/255, 60/255, 0.9];
        if (p < 0.55) return [243/255, 156/255, 18/255, 0.9];
        if (p < 0.72) return [241/255, 196/255, 15/255, 0.9];
        if (p < 0.88) return [122/255, 201/255, 67/255, 0.9];
        return [30/255, 125/255, 50/255, 0.9];
      }
    `;
  }

  function buildNDVIEvalscript() {
    return `
      //VERSION=3
      function setup() {
        return { input: ["B04", "B08", "dataMask"], output: [{ id: "ndvi", bands: 1, sampleType: "FLOAT32" }, { id: "dataMask", bands: 1 }] };
      }
      function evaluatePixel(sample) {
        return { ndvi: [(sample.B08 - sample.B04) / (sample.B08 + sample.B04)], dataMask: [sample.dataMask] };
      }
    `;
  }

  return {
    $,
    toast,
    showLoading,
    hideLoading,
    parseDMS,
    areaHa,
    polyCenter,
    polyBBox,

    dateStr,
    daysAgo,
    fetchJSON,
    downloadBlob,
    buildEvalscript,
    buildNDVIEvalscript
  };
})();
