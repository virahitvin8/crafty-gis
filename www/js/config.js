/* ═══════════════════════════════════════════════════════════
   Crafty GIS — Configuration Module
   ═══════════════════════════════════════════════════════════ */

const FH_CONFIG = (function() {
  'use strict';

  // ─── Sentinel Hub Credentials ───
  // Primary path: the backend proxy at /api/sentinel/token handles OAuth2
  // server-side (secure). Credentials live ONLY in backend env vars.
  // The browser never sees them — it calls the backend token proxy instead.
  const SH_CLIENT_ID = '';
  const SH_CLIENT_SECRET = '';

  // ─── Gemini AI API Key ───
  // ⚠️ Set your own key in Settings > Gemini API Key for AI features
  // Get a free key: https://aistudio.google.com/app/apikey
  const GEMINI_API_KEY = '';

  // ─── GCP Service Account & Auth ───
  const GCP_SERVICE_ACCOUNT = '';
  const GCP_API_KEY = '';

  // ─── Crop Profiles ───
  const CROPS = {
    wheat:      { peak: 0.80, name: 'Wheat',      icon: '🌾' },
    rice:       { peak: 0.78, name: 'Rice',       icon: '🍚' },
    maize:      { peak: 0.85, name: 'Maize',      icon: '🌽' },
    cotton:     { peak: 0.75, name: 'Cotton',     icon: '☁️' },
    sugarcane:  { peak: 0.88, name: 'Sugarcane',  icon: '🎋' },
    mustard:    { peak: 0.72, name: 'Mustard',    icon: '🟡' },
    soybean:    { peak: 0.82, name: 'Soybean',    icon: '🫘' },
    potato:     { peak: 0.76, name: 'Potato',     icon: '🥔' },
    pulses:     { peak: 0.74, name: 'Pulses',     icon: '🫛' },
    vegetables: { peak: 0.78, name: 'Vegetables', icon: '🥬' },
    orchards:   { peak: 0.82, name: 'Orchards',   icon: '🍎' },
    generic:    { peak: 0.80, name: 'Crop',       icon: '🌿' }
  };

  // ─── Health Classification Colors ───
  const HEALTH_CLASSES = [
    { name: 'Bare soil',    col: '#8b5a2b', rgb: [139, 90, 43] },
    { name: 'Poor',         col: '#e74c3c', rgb: [231, 76, 60] },
    { name: 'Below avg',    col: '#f39c12', rgb: [243, 156, 18] },
    { name: 'Moderate',     col: '#f1c40f', rgb: [241, 196, 15] },
    { name: 'Healthy',      col: '#7ac943', rgb: [122, 201, 67] },
    { name: 'Very healthy', col: '#1e7d32', rgb: [30, 125, 50] }
  ];

  // ─── Vegetation Index Definitions ───
  const INDEX_INFO = {
    ndvi:  { name: 'NDVI',  desc: 'Most common vegetation health indicator. Uses Red and NIR bands.' },
    evi:   { name: 'EVI',   desc: 'Better than NDVI in dense canopies. Uses blue band for atmospheric correction.' },
    savi:  { name: 'SAVI',  desc: 'Corrects for soil brightness, good for sparse vegetation.' },
    gndvi: { name: 'GNDVI', desc: 'Sensitive to chlorophyll concentration. Good for nitrogen assessment.' },
    ndmi:  { name: 'NDMI',  desc: 'Measures leaf water content. Detects water stress 3-5 days BEFORE wilting!', stress: 'pre-visual' },
    ndwi:  { name: 'NDWI',  desc: 'Identifies water bodies and wet surfaces using green and NIR bands.' },
    ndre:  { name: 'NDRE',  desc: 'Uses Red Edge band. Sensitive to chlorophyll in later growth stages.' },
    smmi:  { name: 'SMMI',  desc: 'Soil Moisture Monitoring Index using Sentinel-1 SAR radar. Works through clouds!', stress: 'pre-visual', sar: true }
  };

  // ─── Moisture Color Scale (for NDMI & SMMI) ───
  const MOISTURE_COLORS = [
    { min: -1.0, max: 0.0,  col: '#8b5a2b', label: 'Dry / Bare soil' },
    { min:  0.0, max: 0.2,  col: '#d4a76a', label: 'Low moisture' },
    { min:  0.2, max: 0.4,  col: '#f0d48a', label: 'Moderate' },
    { min:  0.4, max: 0.6,  col: '#7ec8e3', label: 'Adequate' },
    { min:  0.6, max: 0.8,  col: '#3498db', label: 'High moisture' },
    { min:  0.8, max: 1.0,  col: '#1a5276', label: 'Saturated' }
  ];

  // ─── Official Land Records Portals (All India) ───
  // Deep-links to each state's official land record / khatauni portal.
  // Owner details on these portals require OTP verification from the
  // registered mobile — that is a government security requirement.
  const LAND_PORTALS = [
    { state: 'Uttar Pradesh',            url: 'https://upbhulekh.gov.in',                       note: 'UP Bhulekh — khatauni/khasra, OTP required' },
    { state: 'Madhya Pradesh',           url: 'https://mpbhulekh.gov.in',                       note: 'MP Bhulekh' },
    { state: 'Maharashtra',              url: 'https://bhulekh.mahabhumi.gov.in',               note: 'Mahabhumi — 7/12 extracts' },
    { state: 'Karnataka',                url: 'https://landrecords.karnataka.gov.in',           note: 'Bhoomi — RTC records' },
    { state: 'Telangana',                url: 'https://dharani.telangana.gov.in',               note: 'Dharani — land records' },
    { state: 'Andhra Pradesh',           url: 'https://meebhoomi.ap.gov.in',                    note: 'Mee Bhoomi' },
    { state: 'Tamil Nadu',               url: 'https://eservices.tn.gov.in',                    note: 'Patta Chitta / FMB' },
    { state: 'Kerala',                   url: 'https://revenuedepartment.kerala.gov.in',        note: 'Revenue Dept — land records' },
    { state: 'West Bengal',              url: 'https://banglarbhumi.gov.in',                    note: 'Banglar Bhumi' },
    { state: 'Bihar',                    url: 'https://lrc.bihar.gov.in',                       note: 'Bihar Bhulekh' },
    { state: 'Odisha',                   url: 'https://bhulekh.odisha.gov.in',                  note: 'Odisha Bhulekh' },
    { state: 'Rajasthan',                url: 'https://apnakhata.rajasthan.gov.in',             note: 'Apna Khata' },
    { state: 'Gujarat',                  url: 'https://anyror.gujarat.gov.in',                  note: 'AnyROR — land records' },
    { state: 'Haryana',                  url: 'https://jamabandi.nic.in',                       note: 'Jamabandi (Haryana)' },
    { state: 'Punjab',                   url: 'https://jamabandi.punjab.gov.in',                note: 'Punjab Jamabandi' },
    { state: 'Himachal Pradesh',         url: 'https://himrevenue.gov.in',                      note: 'Him Bhoomi' },
    { state: 'Uttarakhand',              url: 'https://bhulekh.uk.gov.in',                      note: 'UK Bhulekh' },
    { state: 'Jharkhand',                url: 'https://jharbhoomi.jharkhand.gov.in',            note: 'Jhar Bhoomi' },
    { state: 'Chhattisgarh',             url: 'https://cglandrecords.cg.gov.in',                note: 'CG Land Records' },
    { state: 'Assam',                    url: 'https://revenue.assam.gov.in',                   note: 'Assam Revenue Dept' },
    { state: 'Goa',                      url: 'https://egov.goa.nic.in',                        note: 'Goa Land Records' },
    { state: 'Jammu and Kashmir',        url: 'https://landrecords.jk.gov.in',                  note: 'JK Land Records' },
    { state: 'Ladakh',                   url: 'https://landrecords.ladakh.gov.in',              note: 'Ladakh Land Records' },
    { state: 'Delhi',                    url: 'https://dilrms.delhi.gov.in',                    note: 'DLRMS — Delhi land records' },
    { state: 'Puducherry',               url: 'https://revenue.py.gov.in',                      note: 'Puducherry Revenue' },
    { state: 'Sikkim',                   url: 'https://sikkimrevenue.gov.in',                   note: 'Sikkim Revenue' },
    { state: 'Manipur',                  url: 'https://manipur.gov.in',                         note: 'Manipur Revenue Dept' },
    { state: 'Meghalaya',                url: 'https://megrevenuenic.in',                       note: 'Meghalaya Revenue' },
    { state: 'Mizoram',                  url: 'https://revenue.mizoram.gov.in',                 note: 'Mizoram Revenue' },
    { state: 'Nagaland',                 url: 'https://nagaland.gov.in',                        note: 'Nagaland Revenue' },
    { state: 'Tripura',                  url: 'https://triphoodr.tripura.gov.in',               note: 'Tripura Revenue' },
    { state: 'Arunachal Pradesh',        url: 'https://arunachalpradesh.gov.in',                note: 'Arunachal Revenue' },
    { state: 'Andaman and Nicobar',      url: 'https://db.and.nic.in',                          note: 'Andaman Records' },
    { state: 'Chandigarh',               url: 'https://chandigarh.gov.in',                      note: 'Chandigarh' },
    { state: 'Dadra and Nagar Haveli',   url: 'https://dnh.gov.in',                             note: 'DNH' },
    { state: 'Lakshadweep',              url: 'https://lakshadweep.gov.in',                     note: 'Lakshadweep' }
  ];

  // Find the official portal for a state name (fuzzy match, case-insensitive)
  function findLandPortal(stateName) {
    if (!stateName) return null;
    const s = stateName.trim().toLowerCase();
    let best = LAND_PORTALS.find(p => p.state.toLowerCase() === s);
    if (best) return best;
    // fuzzy: state names sometimes include suffixes like 'India'
    best = LAND_PORTALS.find(p => s.includes(p.state.toLowerCase()) || p.state.toLowerCase().includes(s));
    return best || null;
  }

  // ─── API Endpoints ───
  const API = {
    STAC_URL: 'https://earth-search.aws.element84.com/v1',
    METEO_URL: 'https://api.open-meteo.com/v1',
    SOILGRIDS_URL: 'https://rest.isric.org/soilgrids/v2.0/properties/query',
    SH_AUTH: 'https://services.sentinel-hub.com/oauth/token',
    SH_STATISTICS: 'https://services.sentinel-hub.com/api/v1/statistics',
    SH_PROCESS: 'https://services.sentinel-hub.com/api/v1/process',
    // Remote backend proxy used when the app is served from a static host
    // (no same-origin /api/sentinel/token). Kept in sync with netlify/render configs.
    // NOTE: this must match your LIVE Render service URL (crafty-gis backend, legacy name farmhealth1-backend).
    SH_TOKEN_PROXY_FALLBACK: 'https://farmhealth1-backend.onrender.com/api/sentinel/token',
    GEE_PROXY: (typeof window !== 'undefined' && window.location && 
                 (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
      ? (window.location.port === '3001' ? '/api/gee' : 'http://localhost:3001/api/gee')
      : 'https://farmhealth1-backend.onrender.com/api/gee'
  };

  // ─── Guided Onboarding Steps ───
  const ONBOARDING_STEPS = [
    {
      icon: '🛰️',
      title: 'Welcome to Crafty GIS',
      desc: 'Your complete satellite crop monitoring system. Let us walk you through your first field analysis — step by step.',
      tip: 'This tour takes 2 minutes. You can skip anytime.'
    },
    {
      icon: '📍',
      title: 'Select Your Field',
      target: '#fieldTabs',
      desc: 'Choose how to mark your field:\n• Coordinates — Enter GPS lat/lng\n• Click Map — Tap corners on the map\n• KML — Upload from Google Earth\n• Walk — Use your phone GPS in the field',
      tip: 'Walk mode is best when you\'re actually standing in the field.'
    },
    {
      icon: '🗺️',
      title: 'Interactive Map',
      target: '#map',
      desc: 'The map shows your field with satellite imagery. Use the controls:\n• Zoom in/out to see details\n• Click corners to mark your boundary\n• Switch basemaps (Satellite/Street/Terrain)',
      tip: 'Satellite basemap gives the best context for field boundaries.'
    },
    {
      icon: '🎛️',
      title: 'Map Layer Selector',
      target: '#layerSelectorCard',
      desc: 'After analysis, pick what you want to see on the map:\n• NDVI — Crop health (greenness)\n• NDMI — Leaf water content (stress)\n• SMMI — Soil moisture via radar\n• EVI — Dense canopy analysis',
      tip: 'Each layer shows its own color legend with the satellite date.'
    },
    {
      icon: '🌱',
      title: 'Crop & Analysis',
      target: '#cropSelect',
      desc: 'Tell us what you\'re growing and the growth stage:\n• Crop type matters — different crops have different NDVI peaks\n• Growth stage affects how we interpret the colors',
      tip: 'Rice peaks at ~0.78 NDVI, while sugarcane can reach 0.88.'
    },
    {
      icon: '🛰️',
      title: 'Run Full Analysis',
      target: '#analyzeBtn',
      desc: 'Press the big button! The app will:\n1. Find satellite scenes in Sentinel-2 archive\n2. Fetch real NDVI data from space\n3. Pull live weather, terrain & soil data\n4. Generate your field health report\n5. Show AI-powered advice',
      tip: 'Make sure you\'re connected to the internet — satellite data comes live!'
    },
    {
      icon: '📊',
      title: 'Read Your Report',
      target: '#resultsCard',
      desc: 'Your field report shows:\n• Average NDVI — Overall crop health\n• Health Score — How your crop compares to peak\n• Problem Area — Stressed zones that need attention\n• Color bars — Distribution of health classes',
      tip: 'Red/orange zones need irrigation or nutrients. Green is healthy!'
    },
    {
      icon: '🤖',
      title: 'AI Insights & Next Steps',
      target: '#aiCard',
      desc: 'Get personalized field advice from Gemini AI.\n• Paste your Gemini API key in Settings\n• Click "Get AI Analysis" for actionable recommendations\n• Export your report as CSV, GeoJSON, or copy to clipboard',
      tip: 'Come back every week to track changes with the Time Series chart!'
    },
    {
      icon: '📁',
      title: 'My Land Records (auto-match)',
      target: '#landRecordsCsvInput',
      desc: 'Make every field auto-show YOUR records — survey, khata, owner, motor, pipeline, electricity.\n\nHow to build the CSV from official records:\n1. Open your state\'s land portal (UP Bhulekh, MP Bhulekh, etc.)\n2. Select District → Tehsil → Village\n3. Open the Khatauni → note the Khata & Khasra numbers and owner name\n4. Open a spreadsheet (Excel / Google Sheets)\n5. Header row: lat, lng, survey, khata, owner, motor, pipeline, electricity, village, district, state, pincode\n6. One row per plot — only village or district is required\n7. Save as CSV and upload it here',
      tip: 'No coordinates? No problem — village + district is enough; the app matches by name.'
    }
  ];

  // ─── Combined Stress Index Definition ───
  // TVDI-like index combining NDVI + NDMI + Temperature for pre-visual stress
  const STRESS_INDEX_INFO = {
    csi: { name: 'CSI', desc: 'Combined Stress Index. Integrates NDVI, NDMI, and temperature to detect water stress 3-5 days BEFORE visible symptoms.', stress: 'pre-visual', threshold: 0.3 },
    tvdi: { name: 'TVDI', desc: 'Thermal Vegetation Dryness Index. Uses thermal relationship between vegetation and temperature for early drought detection.', stress: 'pre-visual', threshold: 0.4 }
  };

  // ─── Yield Coefficients by Crop ───
  const YIELD_COEFFICIENTS = {
    wheat:      { peak: 0.80, yieldMax: 5.5, unit: 't/ha', name: 'Wheat' },
    rice:       { peak: 0.78, yieldMax: 6.5, unit: 't/ha', name: 'Rice' },
    maize:      { peak: 0.85, yieldMax: 8.0, unit: 't/ha', name: 'Maize' },
    cotton:     { peak: 0.75, yieldMax: 3.5, unit: 't/ha', name: 'Cotton' },
    sugarcane:  { peak: 0.88, yieldMax: 80,  unit: 't/ha', name: 'Sugarcane' },
    mustard:    { peak: 0.72, yieldMax: 2.5, unit: 't/ha', name: 'Mustard' },
    soybean:    { peak: 0.82, yieldMax: 3.0, unit: 't/ha', name: 'Soybean' },
    potato:     { peak: 0.76, yieldMax: 30,  unit: 't/ha', name: 'Potato' },
    pulses:     { peak: 0.74, yieldMax: 2.0, unit: 't/ha', name: 'Pulses' },
    vegetables: { peak: 0.78, yieldMax: 25,  unit: 't/ha', name: 'Vegetables' },
    orchards:   { peak: 0.82, yieldMax: 15,  unit: 't/ha', name: 'Orchards' },
    generic:    { peak: 0.80, yieldMax: 10,  unit: 't/ha', name: 'Crop' }
  };

  // ─── Pest Risk Thresholds ───
  // Based on temperature + humidity combinations favorable to common diseases
  const PEST_RISK = {
    blast:    { name: 'Rice Blast',   crop: 'rice',    tempRange: [24, 30],  humidMin: 85,  desc: 'Fungal blast — common in wet, warm rice fields' },
    mildew:   { name: 'Powdery Mildew', crop: ['wheat','mustard'], tempRange: [15, 25], humidMin: 70, desc: 'White powdery fungus on leaves' },
    blight:   { name: 'Late Blight',  crop: ['potato','vegetables'], tempRange: [10, 20], humidMin: 80, desc: 'Water-soaked lesions — spreads fast in cool wet weather' },
    rust:     { name: 'Leaf Rust',    crop: 'wheat',    tempRange: [20, 28],  humidMin: 75,  desc: 'Orange-brown pustules on leaves and stems' },
    wilt:     { name: 'Fusarium Wilt', crop: ['cotton','pulses'], tempRange: [25, 32], humidMin: 60, desc: 'Vascular wilt — causes sudden drooping' },
    bph:      { name: 'Brown Plant Hopper', crop: 'rice', tempRange: [25, 35], humidMin: 80, desc: 'Sucking pest — causes "hopper burn" yellowing' },
    aphid:    { name: 'Aphids',       crop: ['mustard','vegetables'], tempRange: [20, 30], humidMin: 65, desc: 'Sap-sucking insects — stunt growth, spread viruses' }
  };

  // ─── Alert Thresholds ───
  const ALERT_THRESHOLDS = {
    ndvi_critical: 0.35,
    ndvi_warning: 0.50,
    ndmi_critical: 0.20,
    stress_critical: 0.65,
    stress_warning: 0.45,
    temp_heat: 38,
    temp_frost: 5,
    pest_high: 75,
    pest_medium: 50
  };

  // ─── Weather Code Descriptions ───
  const WEATHER_CODES = {
    0: '☀️ Clear', 1: '🌤️ Mostly clear', 2: '⛅ Partly cloudy', 3: '☁️ Overcast',
    45: '🌫️ Fog', 48: '🌫️ Rime fog',
    51: '🌦️ Light drizzle', 53: '🌧️ Drizzle', 55: '🌧️ Heavy drizzle',
    61: '🌧️ Light rain', 63: '🌧️ Rain', 65: '🌧️ Heavy rain',
    71: '🌨️ Light snow', 73: '🌨️ Snow', 75: '🌨️ Heavy snow',
    80: '🌦️ Showers', 81: '🌧️ Heavy showers', 82: '⛈️ Violent showers',
    95: '⛈️ Thunderstorm', 96: '⛈️ Hail storm'
  };

  // ─── Get Active Classes and Colors for Dynamic Indexing ───
  function getActiveClasses(indexType) {
    const type = (indexType || 'ndvi').toLowerCase();
    if (['ndmi', 'smmi', 'ndwi'].includes(type)) {
      return [
        { name: 'Dry / Bare soil', col: '#8b5a2b', rgb: [139, 90, 43] },
        { name: 'Low moisture',    col: '#d4a76a', rgb: [212, 167, 106] },
        { name: 'Moderate moisture', col: '#f0d48a', rgb: [240, 212, 138] },
        { name: 'Adequate',        col: '#7ec8e3', rgb: [126, 200, 227] },
        { name: 'High moisture',   col: '#3498db', rgb: [52, 152, 219] },
        { name: 'Saturated',       col: '#1a5276', rgb: [26, 82, 118] }
      ];
    } else if (['tvdi', 'csi'].includes(type)) {
      return [
        { name: 'Severe Drought',  col: '#8b0000', rgb: [139, 0, 0] },
        { name: 'High Stress',     col: '#e74c3c', rgb: [231, 76, 60] },
        { name: 'Moderate Stress', col: '#e67e22', rgb: [230, 126, 34] },
        { name: 'Mild Stress',     col: '#f1c40f', rgb: [241, 196, 15] },
        { name: 'Normal / Cool',   col: '#7ac943', rgb: [122, 201, 67] },
        { name: 'Optimal / Cool',  col: '#2ecc71', rgb: [46, 204, 113] }
      ];
    } else {
      return HEALTH_CLASSES;
    }
  }

  // ─── Default State Template ───
  function createDefaultState() {
    return {
      mode: 'farmer',
      map: null,
      fieldPoly: null,
      fieldLL: [],
      fieldCenter: null,
      drawMode: false,
      drawPts: [],
      drawMarkers: null,
      drawLine: null,
      ndviLayer: null,
      labelsOn: true,
      basemapIdx: 0,
      satLayer: null,
      lblLayer: null,
      basemaps: [],
      scenes: [],
      selectedScene: null,
      analysisData: null,
      weatherData: null,
      terrainData: null,
      soilData: null,
      currentIndex: 'ndvi',
      tsData: [],
      charts: {},
      lessonIdx: 0,
      settings: {},
      shToken: null,
      shTokenExpiry: 0,
      shUnavailableAt: null,      // timestamp of last Sentinel Hub failure (cached demo mode)
      shFallbackWarned: false,    // only warn about DEMO fallback once per session
      // Professional features
      fullscreen: false,
      compareMode: false,
      compareLayer: null,
      compareDate: null,
      compareLayers: null,        // layer group for the split-view right pane
      compareSlider: null,
      compareOverlay: null,
      timeAnimating: false,
      timeAnimFrame: null,
      timeAnimScenes: [],
      timeAnimIdx: 0,
      savedFields: [],
      sceneThumbnails: [],
      simulatedData: false,
      // Research-derived features (FH_INTEL)
      mgmtZones: null
    };
  }

  return {
    SH_CLIENT_ID,
    SH_CLIENT_SECRET,
    GEMINI_API_KEY,
    GCP_SERVICE_ACCOUNT,
    GCP_API_KEY,
    CROPS,
    HEALTH_CLASSES,
    INDEX_INFO,
    MOISTURE_COLORS,
    API,
    LAND_PORTALS,
    findLandPortal,
    ONBOARDING_STEPS,
    WEATHER_CODES,
    STRESS_INDEX_INFO,
    YIELD_COEFFICIENTS,
    PEST_RISK,
    ALERT_THRESHOLDS,
    createDefaultState,
    getActiveClasses
  };
})();
