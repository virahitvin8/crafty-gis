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
try {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach(line => {
      const parts = line.split('=');
      if (parts.length > 1 && !line.trim().startsWith('#')) {
        const key = parts[0].trim();
        const val = parts.slice(1).join('=').trim().replace(/(^['"]|['"]$)/g, '');
        process.env[key] = val;
      }
    });
    console.log('[Server] Loaded .env configuration manually');
  }
} catch (e) {
  console.warn('[Server] Error reading .env file:', e.message);
}

// ─── Google Earth Engine (optional) ───
// The @google/earthengine package has native dependencies that may
// fail on cloud platforms. We catch the error so the server still runs.
let geeAvailable = false;
let ee = null;
let geeInit = null;

try {
  const gee = require('@google/earthengine');
  ee = gee.ee;
  geeInit = gee.initialize;
  geeAvailable = true;
  console.log('[GEE] Earth Engine module loaded successfully');
} catch (e) {
  console.warn('[GEE] Earth Engine module not available:', e.message);
  console.warn('[GEE] Server will start without GEE support. Frontend uses Sentinel Hub / simulated data.');
}

// ─── Configuration ───
const PORT = process.env.PORT || 3001;
const GCLOUD_CREDENTIALS_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  path.join(process.env.HOME || '/root', '.config', 'gcloud', 'application_default_credentials.json');

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

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
    console.log(`[GEE] Initializing with credentials from: ${GCLOUD_CREDENTIALS_PATH}`);
    
    const initPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('GEE initialization timed out after 15s'));
      }, 15000);
      
      geeInit(null, null, () => {
        clearTimeout(timeout);
        console.log('[GEE] Initialized successfully!');
        geeInitialized = true;
        geeInitializing = false;
        resolve();
      }, (error) => {
        clearTimeout(timeout);
        console.error('[GEE] Initialization failed:', error);
        geeInitializing = false;
        reject(error);
      });
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

// ─── Health Check ───
app.get('/api/gee/health', (req, res) => {
  if (!geeAvailable) {
    return res.json({ status: 'unavailable', initialized: false, message: 'Earth Engine module not loaded' });
  }
  const status = geeInitialized ? 'connected' : (geeInitializing ? 'initializing' : 'disconnected');
  res.json({ status, initialized: geeInitialized });
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
    const clientId = process.env.SENTINEL_HUB_CLIENT_ID || '29fb6ce6-bbb5-4088-b647-0eed6488c253';
    const clientSecret = process.env.SENTINEL_HUB_CLIENT_SECRET || '0QRRQfKPsKx8rsGbjFAtZeLjILvBKUu7';
    
    if (!clientId || !clientSecret) {
      return res.status(400).json({ error: 'Sentinel Hub credentials missing on server' });
    }
    
    const body = 'grant_type=client_credentials&client_id=' +
      encodeURIComponent(clientId) +
      '&client_secret=' + encodeURIComponent(clientSecret);
      
    const authRes = await fetch('https://services.sentinel-hub.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
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

// ─── Gemini advisory analysis proxy ───
app.post('/api/gemini-analysis', async (req, res) => {
  const { fieldName, crop, ndvi, soilPh, soilNitrogen, soilOrganicCarbon, growthStage, weather } = req.body;
  const key = process.env.GEMINI_API_KEY;
  
  if (!key || key === 'your_gemini_api_key_here') {
    console.log("[Server] No Gemini API key found, returning expert fallback advice.");
    return res.json({
      advice: getFallbackAdvice(crop || 'Wheat', ndvi || 0.74, soilPh || 6.8, soilNitrogen || 142, growthStage || 'mid'),
      isFallback: true
    });
  }

  const prompt = `
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
    res.json({
      advice: text || "No analysis could be generated.",
      isFallback: false
    });
  } catch (error) {
    console.error("Gemini API Proxy Error:", error);
    res.json({
      advice: getFallbackAdvice(crop || 'Wheat', ndvi || 0.74, soilPh || 6.8, soilNitrogen || 142, growthStage || 'mid') + `\n\n*(Note: Analysis fell back to local expert model due to API response: ${error?.message || "connection issues"})*`,
      isFallback: true
    });
  }
});

// ─── Start Server ───
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  🛰️  FarmHealth Server is running!`);
  console.log(`  ─────────────────────────────`);
  console.log(`  🌐  http://0.0.0.0:${PORT}`);
  console.log(`  🔌  Endpoints:`);
  console.log(`       GET  /api/gee/health     — Connection status`);
  console.log(`       POST /api/gee/init       — Initialize GEE`);
  console.log(`       POST /api/gee/ndvi       — Compute NDVI`);
  console.log(`       POST /api/gee/time-series — Time series`);
  console.log(`  📡  GEE module: ${geeAvailable ? 'LOADED' : 'NOT AVAILABLE (optional)'}`);
  console.log(`  📋  Serving frontend from: ${path.join(__dirname, '..')}\n`);
});
