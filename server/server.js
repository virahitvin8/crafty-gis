/* ═══════════════════════════════════════════════════════════
   FarmHealth — Backend Server
   ═══════════════════════════════════════════════════════════
   Serves the static frontend and provides API endpoints.
   Google Earth Engine integration is optional — if the
   native module fails to load, the server still works and
   the frontend falls back to simulated/sentinel-hub data.
   
   Run: node server/server.js
   ═══════════════════════════════════════════════════════════ */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Load environment variables from .env manually to avoid extra dependencies
// Check multiple possible locations for .env file
function loadEnvFile() {
  const possiblePaths = [
    path.join(__dirname, '..', '.env'),           // root/.env (when server is in server/)
    path.join(__dirname, '..', '..', '.env'),     // root/.env
    path.join(process.cwd(), '.env'),             // current working directory
    '.env'                                        // relative path
  ];

  for (const envPath of possiblePaths) {
    try {
      if (fs.existsSync(envPath)) {
        const envFile = fs.readFileSync(envPath, 'utf8');
        let loadedCount = 0;
        envFile.split('\n').forEach(line => {
          const parts = line.split('=');
          if (parts.length > 1 && !line.trim().startsWith('#')) {
            const key = parts[0].trim();
            const val = parts.slice(1).join('=').trim().replace(/(^['"]|['"]$)/g, '');
            if (key && val && !process.env[key]) {
              process.env[key] = val;
              loadedCount++;
            }
          }
        });
        console.log(`[Server] Loaded .env from: ${envPath} (${loadedCount} variables)`);
        return true;
      }
    } catch (e) {
      console.warn(`[Server] Error reading .env from ${envPath}:`, e.message);
    }
  }

  console.warn('[Server] No .env file found in any location');
  return false;
}

loadEnvFile();

// Log critical environment variables (without exposing secrets)
console.log('[Server] Environment check:');
console.log('  GEE_SERVICE_ACCOUNT:', process.env.GEE_SERVICE_ACCOUNT ? 'SET (' + process.env.GEE_SERVICE_ACCOUNT + ')' : 'NOT SET');
console.log('  GEE_PRIVATE_KEY:', process.env.GEE_PRIVATE_KEY ? 'SET (Length: ' + process.env.GEE_PRIVATE_KEY.length + ')' : 'NOT SET');
console.log('  SENTINEL_HUB_CLIENT_ID:', process.env.SENTINEL_HUB_CLIENT_ID ? 'SET (' + process.env.SENTINEL_HUB_CLIENT_ID.substring(0, 8) + '...)' : 'NOT SET');
console.log('  GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? 'SET (' + process.env.GEMINI_API_KEY.substring(0, 8) + '...)' : 'NOT SET');
console.log('  OLLAMA_BASE_URL:', process.env.OLLAMA_BASE_URL || 'http://localhost:11434 (default)');
console.log('  OLLAMA_MODEL:', process.env.OLLAMA_MODEL || 'deepseek-r1:7b (default)');

// ─── Google Earth Engine (optional) ───
// The @google/earthengine package has native dependencies that may
// fail on cloud platforms. We catch the error so the server still runs.
let geeAvailable = false;
let ee = null;

try {
  const gee = require('@google/earthengine');
  ee = gee;
  geeAvailable = true;
  console.log('[GEE] Earth Engine module loaded successfully');
} catch (e) {
  console.warn('[GEE] Earth Engine module not available:', e.message);
  console.warn('[GEE] Server will start without GEE support. Frontend uses Sentinel Hub / simulated data.');
}

// ─── Configuration ───
const PORT = process.env.PORT || 3001;

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' })); // 20mb so crop photos (base64) fit in /api/vision-analysis

// ─── Serve Static Frontend ───
app.use(express.static(path.join(__dirname, '..')));

// ─── GEE Authentication State ───
let geeInitialized = false;
let geeInitializing = false;

async function initGEE() {
  if (!geeAvailable) return false;
  if (geeInitialized) return true;
  if (geeInitializing) {
    await new Promise(r => setTimeout(r, 2000));
    return geeInitialized;
  }

  geeInitializing = true;
  try {
    const serviceAccount = process.env.GEE_SERVICE_ACCOUNT;
    let privateKey = process.env.GEE_PRIVATE_KEY;

    if (!serviceAccount || !privateKey) {
      console.warn('[GEE] Missing GEE_SERVICE_ACCOUNT or GEE_PRIVATE_KEY environment variables');
      geeInitializing = false;
      return false;
    }

    // Replace escaped newlines if passed as a single line string
    privateKey = privateKey.replace(/\\n/g, '\n');

    console.log(`[GEE] Authenticating via Service Account: ${serviceAccount}`);

    const initPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('GEE initialization timed out after 15s'));
      }, 15000);

      ee.data.authenticateViaPrivateKey(
        {
          client_email: serviceAccount,
          private_key: privateKey,
        },
        () => {
          ee.initialize(
            null,
            null,
            () => {
              clearTimeout(timeout);
              console.log('[GEE] Initialized successfully!');
              geeInitialized = true;
              geeInitializing = false;
              resolve();
            },
            (error) => {
              clearTimeout(timeout);
              console.error('[GEE] Initialization failed:', error);
              geeInitializing = false;
              reject(error);
            }
          );
        },
        (error) => {
          clearTimeout(timeout);
          console.error('[GEE] Service account authentication failed:', error);
          geeInitializing = false;
          reject(error);
        }
      );
    });

    await initPromise;
    return true;
  } catch (e) {
    console.error('[GEE] Failed to initialize:', e.message);
    geeInitialized = false;
    geeInitializing = false;
    return false;
  }
}

// Automatically trigger GEE initialization on startup
if (geeAvailable) {
  initGEE().catch(err => console.error('[GEE] Auto-init background error:', err.message));
}

// ─── Root Status Route ───
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'FarmHealth API Backend is running',
    geeStatus: geeInitialized ? 'connected' : 'disconnected',
    endpoints: {
      health: '/api/gee/health',
      generalHealth: '/api/health',
      ndvi: '/api/gee/ndvi',
      sar: '/api/gee/sar',
      timeSeries: '/api/gee/time-series',
      geminiAnalysis: '/api/gemini-analysis',
      visionAnalysis: '/api/vision-analysis',
      aiHealth: '/api/ai/health'
    }
  });
});

// ─── Health Check ───
app.get('/api/gee/health', (req, res) => {
  if (!geeAvailable) {
    return res.json({ status: 'unavailable', initialized: false, message: 'Earth Engine module not loaded' });
  }
  const status = geeInitialized ? 'connected' : (geeInitializing ? 'initializing' : 'disconnected');
  res.json({ status, initialized: geeInitialized });
});

// ─── General Health Check (used by Docker healthchecks + Uptime Kuma) ───
app.get('/api/health', async (req, res) => {
  const ollama = await ollamaPing();
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    gee: geeInitialized ? 'connected' : 'disconnected',
    ollama: ollama.connected ? 'connected' : 'unavailable',
    ai: {
      model: OLLAMA_MODEL,
      visionModel: OLLAMA_VISION_MODEL,
      gemini: process.env.GEMINI_API_KEY ? 'configured' : 'not-configured'
    }
  });
});

// ─── Infrastructure Proxy (OSM Overpass API) ───
// Proxies Overpass queries to avoid CORS issues and add caching.
// All data comes from OpenStreetMap — no government scraping.
app.post('/api/infrastructure', express.json(), async (req, res) => {
  try {
    const { lat, lng, radius = 2000 } = req.body;
    if (!lat || !lng) {
      return res.status(400).json({ error: 'lat and lng required' });
    }

    const query = `
      [out:json][timeout:25];
      (
        node["man_made"="pipeline"]["substance"="water"](around:${radius},${lat},${lng});
        way["man_made"="pipeline"]["substance"="water"](around:${radius},${lat},${lng});
        node["power"="pole"](around:${radius},${lat},${lng});
        node["power"="tower"](around:${radius},${lat},${lng});
        way["power"="line"](around:${radius},${lat},${lng});
        node["water"="well"](around:${radius},${lat},${lng});
        node["water"="pump"](around:${radius},${lat},${lng});
        way["waterway"="canal"](around:${radius},${lat},${lng});
        node["emergency"="fire_hydrant"](around:${radius},${lat},${lng});
      );
      out body;
    `;

    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        // Overpass rejects requests without a proper User-Agent (HTTP 406)
        'User-Agent': 'FarmHealthApp/1.0 (precision-agriculture; contact: farmhealth@localhost)'
      },
      body: 'data=' + encodeURIComponent(query)
    });

    if (!response.ok) {
      throw new Error('Overpass API returned ' + response.status);
    }

    const data = await response.json();
    res.json({
      success: true,
      count: data.elements?.length || 0,
      source: 'openstreetmap',
      elements: data.elements || []
    });
  } catch (e) {
    console.error('[Infrastructure] Proxy error:', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

// ─── Initialize Endpoint ───
app.post('/api/gee/init', async (req, res) => {
  if (!geeAvailable) {
    return res.status(503).json({ success: false, message: 'Earth Engine not available on this server' });
  }
  try {
    const success = await initGEE();
    if (success) {
      res.json({ success: true, message: 'GEE initialized' });
    } else {
      res.status(500).json({ success: false, message: 'GEE initialization failed' });
    }
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ─── Compute NDVI for a Polygon ───
app.post('/api/gee/ndvi', async (req, res) => {
  if (!geeAvailable) {
    return res.status(503).json({ error: 'Earth Engine not available on this server' });
  }
  try {
    const { coordinates, dateStr, cropPeak, indexType } = req.body;

    if (!coordinates || !coordinates.length) {
      return res.status(400).json({ error: 'No coordinates provided' });
    }

    if (!(await initGEE())) {
      return res.status(500).json({ error: 'GEE not initialized' });
    }

    const coords = coordinates.map(c => [c[1], c[0]]);
    coords.push(coords[0]);
    const geometry = ee.Geometry.Polygon([coords]);

    const startDate = dateStr || new Date().toISOString().split('T')[0];
    const endDate = startDate;

    const collection = ee.ImageCollection('COPERNICUS/S2_SR')
      .filterBounds(geometry)
      .filterDate(startDate, endDate)
      .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 30))
      .sort('CLOUDY_PIXEL_PERCENTAGE');

    const image = collection.first();

    if (!image) {
      return res.status(404).json({ error: 'No images found for this date/location' });
    }

    let indexImage;
    switch (indexType || 'ndvi') {
      case 'ndvi':
        indexImage = image.normalizedDifference(['B8', 'B4']).rename('NDVI');
        break;
      case 'evi':
        indexImage = image.expression(
          '2.5 * ((NIR - RED) / (NIR + 6 * RED - 7.5 * BLUE + 1))',
          { NIR: image.select('B8'), RED: image.select('B4'), BLUE: image.select('B2') }
        ).rename('EVI');
        break;
      case 'savi':
        indexImage = image.expression(
          '1.5 * ((NIR - RED) / (NIR + RED + 0.5))',
          { NIR: image.select('B8'), RED: image.select('B4') }
        ).rename('SAVI');
        break;
      case 'ndmi':
        indexImage = image.normalizedDifference(['B8', 'B11']).rename('NDMI');
        break;
      case 'ndwi':
        indexImage = image.normalizedDifference(['B3', 'B8']).rename('NDWI');
        break;
      default:
        indexImage = image.normalizedDifference(['B8', 'B4']).rename('NDVI');
    }

    const stats = indexImage.reduceRegion({
      reducer: ee.Reducer.mean(),
      geometry: geometry,
      scale: 10,
      bestEffort: true
    });

    const meanValue = await new Promise((resolve, reject) => {
      stats.evaluate((result, error) => {
        if (error) reject(error);
        else resolve(Object.values(result)[0] || 0);
      });
    });

    const sampled = indexImage.sample({
      region: geometry,
      scale: 10,
      numPixels: 5000,
      geometries: true
    });

    const values = await new Promise((resolve, reject) => {
      sampled.aggregate_array('NDVI').evaluate((result, error) => {
        if (error) reject(error);
        else resolve(result || []);
      });
    });

    const peak = cropPeak || 0.80;
    let cc = [0, 0, 0, 0, 0, 0];
    values.forEach(v => {
      const ndvi = v || 0;
      if (ndvi < 0.15) cc[0]++;
      else if (ndvi / peak < 0.40) cc[1]++;
      else if (ndvi / peak < 0.55) cc[2]++;
      else if (ndvi / peak < 0.72) cc[3]++;
      else if (ndvi / peak < 0.88) cc[4]++;
      else cc[5]++;
    });

    const total = cc.reduce((a, b) => a + b, 0);

    res.json({
      success: true,
      meanNdvi: meanValue,
      sampleCount: values.length,
      cc: cc,
      cnt: Math.max(1, total),
      source: 'google-earth-engine'
    });

  } catch (e) {
    console.error('[GEE] NDVI error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ─── Compute SAR (Soil Moisture) ───
app.post('/api/gee/sar', async (req, res) => {
  if (!geeAvailable) {
    return res.status(503).json({ error: 'Earth Engine not available on this server' });
  }
  try {
    const { coordinates, dateStr } = req.body;

    if (!coordinates || !coordinates.length) {
      return res.status(400).json({ error: 'No coordinates provided' });
    }

    if (!(await initGEE())) {
      return res.status(500).json({ error: 'GEE not initialized' });
    }

    const coords = coordinates.map(c => [c[1], c[0]]);
    coords.push(coords[0]);
    const geometry = ee.Geometry.Polygon([coords]);

    const endDate = dateStr ? new Date(dateStr) : new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 15);

    const collection = ee.ImageCollection('COPERNICUS/S1_GRD')
      .filterBounds(geometry)
      .filterDate(startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0])
      .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
      .filter(ee.Filter.eq('instrumentMode', 'IW'))
      .sort('system:time_start', false);

    const image = collection.first();

    if (!image) {
      return res.status(404).json({ error: 'No SAR images found for this date/location' });
    }

    const vvImage = image.select('VV');

    const stats = vvImage.reduceRegion({
      reducer: ee.Reducer.mean(),
      geometry: geometry,
      scale: 10,
      bestEffort: true
    });

    const meanValue = await new Promise((resolve, reject) => {
      stats.evaluate((result, error) => {
        if (error) reject(error);
        else resolve(Object.values(result)[0] || 0);
      });
    });

    const imageDate = await new Promise((resolve, reject) => {
      image.date().format('YYYY-MM-dd').evaluate((result, error) => {
        if (error) reject(error);
        else resolve(result || 'Unknown');
      });
    });

    res.json({
      success: true,
      meanVV: meanValue,
      date: imageDate,
      source: 'google-earth-engine-sar'
    });

  } catch (e) {
    console.error('[GEE] SAR error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ─── Time Series ───
app.post('/api/gee/time-series', async (req, res) => {
  if (!geeAvailable) {
    return res.status(503).json({ error: 'Earth Engine not available on this server' });
  }
  try {
    const { coordinates, monthsBack } = req.body;

    if (!coordinates || !coordinates.length) {
      return res.status(400).json({ error: 'No coordinates provided' });
    }

    if (!(await initGEE())) {
      return res.status(500).json({ error: 'GEE not initialized' });
    }

    const coords = coordinates.map(c => [c[1], c[0]]);
    coords.push(coords[0]);
    const geometry = ee.Geometry.Polygon([coords]);

    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - (monthsBack || 2));

    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    const collection = ee.ImageCollection('COPERNICUS/S2_SR')
      .filterBounds(geometry)
      .filterDate(startStr, endStr)
      .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 30));

    const withNdvi = collection.map(img => {
      const ndvi = img.normalizedDifference(['B8', 'B4']).rename('NDVI');
      const meanNdvi = ndvi.reduceRegion({
        reducer: ee.Reducer.mean(),
        geometry: geometry,
        scale: 10,
        bestEffort: true
      });
      return ee.Feature(null, {
        date: img.date().format('YYYY-MM-dd'),
        ndvi: meanNdvi.get('NDVI')
      });
    });

    const features = await new Promise((resolve, reject) => {
      withNdvi.evaluate((result, error) => {
        if (error) reject(error);
        else resolve(result?.features || []);
      });
    });

    const timeSeries = features
      .map(f => ({
        date: f.properties.date,
        ndvi: f.properties.ndvi || 0
      }))
      .filter(f => f.ndvi !== null && f.ndvi !== undefined)
      .sort((a, b) => a.date.localeCompare(b.date));

    res.json({
      success: true,
      data: timeSeries,
      source: 'google-earth-engine'
    });

  } catch (e) {
    console.error('[GEE] Time series error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ─── Sentinel Hub Token Proxy ───
app.post('/api/sentinel/token', async (req, res) => {
  try {
    const clientId = process.env.SENTINEL_HUB_CLIENT_ID;
    const clientSecret = process.env.SENTINEL_HUB_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return res.status(400).json({ error: 'Sentinel Hub credentials missing on server' });
    }

    const body = 'grant_type=client_credentials&client_id=' +
      encodeURIComponent(clientId) +
      '&client_secret=' + encodeURIComponent(clientSecret);

    const authRes = await fetch('https://services.sentinel-hub.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'FarmHealth/1.0 (contact: akshitvinay4636@gmail.com)' },
      body: body
    });

    if (!authRes.ok) {
      const errText = await authRes.text();
      throw new Error(`Sentinel Hub auth returned status ${authRes.status}: ${errText}`);
    }

    const data = await authRes.json();
    res.json(data);
  } catch (error) {
    console.error('Sentinel Hub Token Proxy Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper function to return beautiful, structured fallback advice matching the field criteria
function getFallbackAdvice(crop, ndvi, ph, nitrogen, stage) {
  const isHealthy = ndvi >= 0.7;
  const isCritical = ndvi < 0.3;

  let advice = `### fallback_advisory\n`;

  advice += `### 🌿 Vegetation Health Evaluation\n`;
  if (isHealthy) {
    advice += `The field exhibits an outstanding average value of **${ndvi}**, signifying dense activity and a robust vegetative canopy. Growth is currently matching or exceeding target yield curves for this stage (**${stage}**).\n\n`;
  } else if (isCritical) {
    advice += `**CRITICAL WARNING**: The index is extremely depressed at **${ndvi}**. This indicates severe stress, crop damage, or an almost complete absence of vegetative cover. Urgent on-ground ground-truthing is required.\n\n`;
  } else {
    advice += `The field exhibits moderate value of **${ndvi}**. There are localized indications of stress or non-uniform growth. Chlorophyll density is slightly suppressed for ${crop} at this stage.\n\n`;
  }

  advice += `### 🧪 Soil & Nutrient Advisory\n`;
  if (ph < 6.0) {
    advice += `The soil pH is acidic at **${ph}**. Acidic soils restrict phosphorus uptake and reduce root efficiency. Consider variable-rate lime application (calcium carbonate) to buffer the pH toward the optimal 6.5–7.0 range.\n`;
  } else if (ph > 7.5) {
    advice += `The soil pH is slightly alkaline at **${ph}**. Micro-nutrient absorption (especially Iron and Zinc) may be restricted. Consider applying sulfur or acidifying fertilizers.\n`;
  } else {
    advice += `The soil pH of **${ph}** is within the ideal neutral zone, facilitating optimal micro and macro-nutrient transport.\n`;
  }

  if (nitrogen < 100) {
    advice += `**Nitrogen Deficit Detected**: Telemetry shows nitrogen is low at **${nitrogen} kg/ha**. We highly recommend a top-dressing of nitrogenous fertilizer (such as urea or ammonium nitrate) at 20–30 kg/ha within the next 4 days to stimulate vegetative recovery.\n\n`;
  } else {
    advice += `Soil Nitrogen is excellent at **${nitrogen} kg/ha**, supporting strong protein synthesis and leaf division.\n\n`;
  }

  advice += `### 🐛 Pest & Disease Risk Prediction\n`;
  if (isHealthy) {
    advice += `Due to current weather conditions and dense crop canopy, there is a **moderate** risk of foliar fungal pathogens (such as leaf rust or mildew). Conduct regular scouting in dense pockets.\n\n`;
  } else if (isCritical) {
    advice += `Severe stress patterns correlate with high susceptibility to root-rot or crop diseases. Inspect lower leaf collars for active necrosis immediately.\n\n`;
  } else {
    advice += `Elevated humidity may trigger early pest vectors. Preventive organic neem-oil application or light chemical spraying is recommended if field scouting reveals >5% pest population threshold.\n\n`;
  }

  advice += `### 💧 Water & Irrigation Optimization\n`;
  if (ndvi < 0.6) {
    advice += `Moisture stress indices suggest restricted water uptake. Boost irrigation by 10% or apply micro-sprinklers in identified high-stress zones.\n\n`;
  } else {
    advice += `Transpiration levels are balanced. Maintain the current standard irrigation schedule, keeping an eye on upcoming weather reports.\n\n`;
  }

  advice += `### 📅 14-Day Action Plan\n`;
  advice += `- **Days 1–3**: Conduct targeted ground-scouting in any yellow-stressed sectors.\n`;
  advice += `- **Days 4–7**: Apply nutrient top-dress if nitrogen depletion is verified.\n`;
  advice += `- **Days 8–14**: Recalculate health curves upon next satellite pass.\n`;

  return advice;
}

// ═══════════ SELF-HOSTED LLM (OLLAMA) ═══════════
// Primary AI backend for the self-hosted migration. Reads the Ollama
// server directly over its HTTP API (no npm dependency needed).
//   OLLAMA_BASE_URL  — default http://localhost:11434 (http://ollama:11434 in Docker)
//   OLLAMA_MODEL     — default deepseek-r1:7b (DeepSeek-R1-Distill-Qwen-7B)
const OLLAMA_BASE_URL = (process.env.OLLAMA_BASE_URL || 'http://localhost:11434').replace(/\/+$/, '');
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'deepseek-r1:7b';
// CPU inference is slow: 7B Q4 ≈ 4-8 tok/s + cold-start model load (~30s).
// 180s default covers a full report on first request; tune via env if needed.
const OLLAMA_TIMEOUT_MS = parseInt(process.env.OLLAMA_TIMEOUT_MS || '180000', 10) || 180000;

// Single non-streaming chat completion with an abort timeout (cold model
// load + generation on a small CPU box can take a couple of minutes).
async function ollamaChat(messages, timeoutMs = OLLAMA_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(OLLAMA_BASE_URL + '/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({ model: OLLAMA_MODEL, stream: false, messages })
    });
    if (!res.ok) throw new Error('Ollama returned HTTP ' + res.status);
    const data = await res.json();
    return (data.message && data.message.content) || '';
  } finally {
    clearTimeout(timer);
  }
}

// Lightweight connectivity + model list probe (used by /api/ai/health)
async function ollamaPing() {
  try {
    const res = await fetch(OLLAMA_BASE_URL + '/api/tags', { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return { connected: false, error: 'HTTP ' + res.status };
    const data = await res.json();
    return { connected: true, models: (data.models || []).map(m => m.name) };
  } catch (e) {
    return { connected: false, error: e.message };
  }
}

// ─── Build the agronomist prompt (shared by Ollama and Gemini) ───
function buildAgronomistPrompt(fieldName, crop, ndvi, soilPh, soilNitrogen, soilOrganicCarbon, growthStage, weather) {
  return `
    You are FarmHealth's Lead Agronomist AI, powered by satellite and soil telemetry.
    Analyze the following crop and field telemetry:
    
    - Field Name: ${fieldName || "Unknown"}
    - Crop / Cover: ${crop || "Wheat"}
    - Current Average Index Value: ${ndvi || 0.74}
    - Growth Stage: ${growthStage || "Mid (vegetative)"}
    - Soil pH: ${soilPh || 6.8}
    - Soil Nitrogen: ${soilNitrogen || 142} kg/ha
    - Organic Carbon: ${soilOrganicCarbon || 2.4}%
    - Current Weather: Temp ${weather?.temp || 28}°C, Condition: ${weather?.condition || "Sunny"}, Rain Prob: ${weather?.rainProb || 12}%
    
    Provide an expert agricultural analysis with the following sections formatted in clean Markdown:
    1. **Vegetation Health Evaluation**: Interpret the health index score for this crop/stage. Is it optimal, stressed, or critical?
    2. **Soil & Nutrient Advisory**: Analyze the Soil pH, Nitrogen, and Organic Carbon. Give specific, actionable suggestions.
    3. **Pest & Disease Risk Prediction**: Based on weather conditions and vegetative stress patterns, identify the risk of common pests (like rust, borers, or aphids) and recommend preventative actions.
    4. **Water & Irrigation Optimization**: Give guidance on whether irrigation should be adjusted based on weather conditions.
    5. **Harvest Window & Action Plan**: Recommend a direct action timeline for the next 7-14 days.
    
    Keep the tone professional, precise, scientific, and highly encouraging. Limit to around 300-400 words. Do not use generic introductions.
  `;
}

// ─── AI advisory proxy ───
// Fallback chain (self-hosted migration):
//   1. Ollama  (self-hosted LLM — PRIMARY, zero cost, private)
//   2. Gemini  (cloud — only if OLLAMA is unreachable AND a key is set)
//   3. getFallbackAdvice()  (built-in offline expert model — ALWAYS available)
app.post('/api/gemini-analysis', async (req, res) => {
  const { fieldName, crop, ndvi, soilPh, soilNitrogen, soilOrganicCarbon, growthStage, weather } = req.body;
  const prompt = buildAgronomistPrompt(fieldName, crop, ndvi, soilPh, soilNitrogen, soilOrganicCarbon, growthStage, weather);
  const fallbackNote = (msg) => `\n\n*(Note: Analysis fell back to the built-in expert model due to: ${msg})*`;

  // ── 1. Ollama (self-hosted primary) ──
  if (process.env.OLLAMA_DISABLED !== 'true') {
    try {
      const advice = await ollamaChat([
        { role: 'system', content: 'You are an expert precision-agriculture agronomist. Answer in clean Markdown, be concise and specific.' },
        { role: 'user', content: prompt }
      ]);
      if (advice && advice.trim()) {
        console.log('[Ollama] Advice generated with model:', OLLAMA_MODEL);
        return res.json({ advice, isFallback: false, source: 'ollama', model: OLLAMA_MODEL });
      }
      console.warn('[Ollama] Empty response, falling through to next backend.');
    } catch (e) {
      console.warn('[Ollama] Unavailable, falling through to next backend:', e.message);
    }
  }

  // ── 2. Gemini (optional cloud fallback) ──
  const key = process.env.GEMINI_API_KEY;
  if (key && key !== 'your_gemini_api_key_here') {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });

      if (!response.ok) {
        throw new Error(`Gemini API returned ${response.status}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No analysis could be generated.';
      return res.json({ advice: text, isFallback: false, source: 'gemini' });
    } catch (error) {
      console.error('Gemini API Proxy Error:', error);
    }
  }

  // ── 3. Built-in expert fallback (always works, offline) ──
  const ollamaTried = process.env.OLLAMA_DISABLED !== 'true';
  const geminiTried = !!(key && key !== 'your_gemini_api_key_here');
  const reasonParts = [];
  reasonParts.push(ollamaTried ? 'Ollama unreachable' : 'Ollama disabled');
  reasonParts.push(geminiTried ? 'Gemini errored' : 'no Gemini key configured');
  const reason = reasonParts.join(', ');
  console.log('[Server] Returning expert fallback advice (' + reason + ').');
  res.json({
    advice: getFallbackAdvice(crop || 'Wheat', ndvi || 0.74, soilPh || 6.8, soilNitrogen || 142, growthStage || 'mid') + fallbackNote(reason),
    isFallback: true,
    source: 'fallback'
  });
});

// ─── AI health check (for Uptime Kuma / status pages) ───
app.get('/api/ai/health', async (req, res) => {
  const ollama = await ollamaPing();
  res.json({
    status: ollama.connected ? 'ok' : 'degraded',
    ollama: ollama.connected ? 'connected' : 'unavailable',
    model: OLLAMA_MODEL,
    ollamaBaseUrl: OLLAMA_BASE_URL,
    models: ollama.models || [],
    error: ollama.error || null,
    gemini: process.env.GEMINI_API_KEY ? 'configured' : 'not-configured',
    fallback: 'getFallbackAdvice (built-in, always available)'
  });
});

// ═══════════════════════════════════════════════════════════
// VISION ANALYSIS — Crop Photo Disease Detection (LLaVA)
// Analyzes uploaded field/crop photos for diseases, pests, stress
// ═══════════════════════════════════════════════════════════

// 8GB CPU laptop: use llava-phi3 (~2.9GB). llava:13b needs ~10GB+ RAM and is
// far too slow on CPU-only inference. moondream (~1.7GB) is the ultra-light alt.
const OLLAMA_VISION_MODEL = process.env.OLLAMA_VISION_MODEL || 'llava-phi3';

app.post('/api/vision-analysis', async (req, res) => {
  try {
    const { imageBase64, prompt: customPrompt, fieldName, crop, ndvi, weather } = req.body;
    
    if (!imageBase64) {
      return res.status(400).json({ error: 'No image provided' });
    }

    // Default prompt for crop analysis
    const defaultPrompt = `
      You are an expert agricultural diagnostician. Analyze this crop/field image and provide:
      
      1. **Crop Health Assessment**: Describe the overall health visible in the image (color, density, vigor)
      2. **Disease/Pest Detection**: Identify any visible symptoms of diseases, pests, or nutrient deficiencies (spots, discoloration, wilting, holes, etc.)
      3. **Severity Rating**: Rate severity as mild/moderate/severe with estimated affected area percentage
      4. **Specific Issues**: Name specific diseases if recognizable (rust, blight, mildew, aphids, etc.)
      5. **Immediate Actions**: Provide 3-5 specific, actionable recommendations
      6. **Parameters**: Estimate visible NDVI proxy, color anomalies, texture issues
      
      Field context: ${crop || 'Unknown crop'} in ${fieldName || 'field'} (NDVI: ${ndvi || 'N/A'}, Weather: ${weather?.temp || 'N/A'}°C, ${weather?.condition || 'N/A'})
      
      Respond in structured JSON format ONLY (no markdown, no extra text):
      {
        "disease": "rust or none",
        "confidence": 0.87,
        "severity": "mild|moderate|severe",
        "affected_area": "upper leaves",
        "recommendation": "Apply fungicide within 3 days",
        "parameters": {
          "ndvi": 0.62,
          "color_anomaly": "yellow-brown spots",
          "texture": "necrotic patches"
        }
      }
      Rules:
      - "disease": name the disease/pest if visible, otherwise "none"
      - "confidence": 0.0 to 1.0 (how sure you are about the diagnosis)
      - "recommendation": ONE concise, actionable string
      - "parameters.ndvi": your visual estimate of crop greenness (0.0-1.0)
    `;

    const prompt = customPrompt || defaultPrompt;

    // Try Ollama vision model (LLaVA)
    try {
      console.log('[Vision] Trying Ollama LLaVA...');
      
      // Prepare the image for Ollama (base64 without data URL prefix)
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      
      const visionResponse = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: OLLAMA_VISION_MODEL,
          prompt: prompt,
          images: [base64Data],
          stream: false,
          options: {
            temperature: 0.3, // Lower temperature for more consistent JSON
            top_p: 0.85,
            num_ctx: 8192 // Larger context for detailed analysis
          }
        }),
        signal: AbortSignal.timeout(180000) // 3-minute timeout for vision models
      });

      if (!visionResponse.ok) {
        throw new Error(`Ollama vision API returned ${visionResponse.status}`);
      }

      const visionData = await visionResponse.json();
      const analysisText = visionData.response || '';
      
      console.log('[Vision] LLaVA analysis completed');
      
      // Try to parse JSON from the response
      let analysisJson;
      try {
        // Extract JSON from markdown code blocks if present
        const jsonMatch = analysisText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/) || 
                          analysisText.match(/(\{[\s\S]*\})/);
        const jsonStr = jsonMatch ? jsonMatch[1] : analysisText;
        analysisJson = JSON.parse(jsonStr);
      } catch (parseError) {
        // If JSON parsing fails, return structured text response
        console.warn('[Vision] JSON parse failed, returning text response');
        analysisJson = {
          health_status: "analysis_available",
          detailed_analysis: analysisText,
          raw_response: true
        };
      }

      return res.json({
        success: true,
        analysis: analysisJson,
        model: OLLAMA_VISION_MODEL,
        timestamp: new Date().toISOString()
      });

    } catch (ollamaError) {
      console.warn('[Vision] Ollama vision failed:', ollamaError.message);
      
      // Fallback: Basic image analysis using metadata only
      return res.json({
        success: true,
        analysis: {
          health_status: "analysis_unavailable",
          detailed_analysis: "Vision model (LLaVA) is not available. Please ensure Ollama is running with the vision model: `ollama pull " + OLLAMA_VISION_MODEL + "`",
          error: ollamaError.message,
          recommendations: [
            "Install Ollama: https://ollama.ai",
            `Pull vision model: ollama pull ${OLLAMA_VISION_MODEL}`,
            "Ensure Ollama server is running: ollama serve"
          ]
        },
        model: 'fallback',
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('[Vision] Analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Vision analysis failed',
      message: error.message
    });
  }
});

// ─── Start Server ───
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  🛰️  FarmHealth Server is running!`);
  console.log(`  ─────────────────────────────`);
  console.log(`  🌐  http://0.0.0.0:${PORT}`);
  console.log(`  🔌  Endpoints:`);
  console.log(`        GET  /api/health         — General health (Docker/Uptime Kuma)`);
  console.log(`        GET  /api/gee/health     — Connection status`);
  console.log(`        POST /api/gee/init       — Initialize GEE`);
  console.log(`        POST /api/gee/ndvi       — Compute NDVI`);
  console.log(`        POST /api/gee/time-series — Time series`);
  console.log(`        POST /api/gemini-analysis — AI advice (Ollama → Gemini → expert fallback)`);
  console.log(`        POST /api/vision-analysis — Crop photo disease detection (LLaVA)`);
  console.log(`        GET  /api/ai/health       — AI/Ollama status (Uptime Kuma probe)`);
  console.log(`  📡  GEE module: ${geeAvailable ? 'LOADED' : 'NOT AVAILABLE (optional)'}`);
  console.log(`  🤖  LLM: ${process.env.OLLAMA_DISABLED === 'true' ? 'Ollama DISABLED' : 'Ollama @ ' + OLLAMA_BASE_URL + ' model=' + OLLAMA_MODEL}`);
  console.log(`  📋  Serving frontend from: ${path.join(__dirname, '..')}\n`);
});
