/* ═══════════════════════════════════════════════════════════
   Crafty GIS — Client-Side ML Stress Classifier (browser port)
   ═══════════════════════════════════════════════════════════
   A zero-dependency port of server/ml_model.js so the ML stress
   decision ("Moderate Stress", confidence, merged advisory) is
   visible to EVERY user — not just those with Google Earth Engine.

   How it works:
     1. Lazy-loads the pre-trained Random Forest model JSON from
        GET /api/ml/model  (60 trees, 8 features, ~41 KB).
     2. Runs predictRandomForest() entirely in the browser.
     3. Falls back to the deterministic rule-based labelFromRules()
        if the backend is unreachable — model always available.

   Features: ndvi, ndwi, evi, ndmi, ndvi_trend, ndwi_trend,
             elevation, slope
   Classes: 0 Healthy · 1 Mild · 2 Moderate · 3 Severe · 4 Critical
   ═══════════════════════════════════════════════════════════ */
'use strict';

const FH_ML = (function() {
  'use strict';

  const FEATURES = ['ndvi', 'ndwi', 'evi', 'ndmi', 'ndvi_trend', 'ndwi_trend', 'elevation', 'slope'];
  const N_FEATURES = FEATURES.length;

  const NORM = {
    ndvi:       [-0.2, 1.0], ndwi: [-1.0, 1.0], evi: [-0.5, 1.5], ndmi: [-1.0, 1.0],
    ndvi_trend: [-0.02, 0.02], ndwi_trend: [-0.02, 0.02], elevation: [0, 3000], slope: [0, 30]
  };

  const CLASS_NAMES = ['Healthy', 'Mild Stress', 'Moderate Stress', 'Severe Stress', 'Critical'];
  const CLASS_COLORS = ['#2E8B57', '#8FBC4F', '#FFD93B', '#FF9F1C', '#FF5252'];
  const CLASS_BADGE = ['🟢', '🟡', '🟠', '🔴', '🚨'];
  const ADVISORY = [
    'No intervention needed. Maintain current irrigation and nutrient schedule. Continue weekly satellite monitoring.',
    'Early stress signal detected. Scout the affected zone; consider a light irrigation boost and monitor NDWI trend over the next 7 days.',
    'Moderate stress — schedule irrigation within 3-4 days and top-dress nitrogen (20-30 kg/ha) if leaf greenness is declining.',
    'Severe stress — irrigate immediately, verify soil moisture on the ground, and inspect for pest/disease pressure. Re-run analysis after 5 days.',
    'CRITICAL — crop at risk of failure. Immediate on-ground inspection required; consult an agronomist and verify irrigation/soil conditions today.'
  ];

  function normValue(name, v) {
    const [lo, hi] = NORM[name] || [-1, 1];
    return Math.max(0, Math.min(1, (v - lo) / (hi - lo)));
  }
  function normalize(features) {
    const out = new Array(N_FEATURES);
    for (let i = 0; i < N_FEATURES; i++) out[i] = normValue(FEATURES[i], features[i]);
    return out;
  }
    function safeVal(v, fb) {
    if (v === null || v === undefined) return fb;
    if (typeof v === 'number' && isNaN(v)) return fb;
    return v;
  }

  /* ── Bootstrap labeling: agronomic rules → stress class ── */
  function labelFromRules(f) {
    const ndvi = f.ndvi, ndwi = f.ndwi, evi = f.evi, ndmi = f.ndmi;
    const tN = f.ndvi_trend || 0, tW = f.ndwi_trend || 0;
    const slope = f.slope || 0;
    if (ndvi < 0.15) return 4;
    if (ndvi < 0.30 || (ndvi < 0.45 && ndwi < 0.15)) return 3;
    if (ndvi < 0.50 || ndwi < 0.20 || evi < 0.25) return 2;
    if (ndvi < 0.65 || ndmi < 0.25 || tN < -0.003 || tW < -0.003 || slope > 5) return 1;
    return 0;
  }

  /* ── Single tree traversal ── */
  function treePredict(node, features) {
    while (!node.leaf) {
      node = features[node.feat] <= node.thr ? node.left : node.right;
    }
    return node.dist || {};
  }

    /* ── Random Forest prediction (majority vote, matches server) ── */
  function predictRandomForest(model, features) {
    const x = normalize(features);
    const trees = model.trees || [];
    const n = trees.length;
    if (n === 0) {
      const cls = labelFromRules(features);
      return predictFromRules(cls, features);
    }
    const votes = {};
    const treeDistSum = [0, 0, 0, 0, 0];
    for (const tree of trees) {
      const d = treePredict(tree, x);
      let best = 0, bv = -1;
      for (const k in d) { if (d[k] > bv) { bv = d[k]; best = Number(k); } }
      votes[best] = (votes[best] || 0) + 1;
      for (let c = 0; c < 5; c++) treeDistSum[c] += (d[c] || 0);
    }
    let cls = 0, cv = -1;
    for (const k in votes) { if (votes[k] > cv) { cv = votes[k]; cls = Number(k); } }
    const confidence = cv / n;
    const probs = treeDistSum.map(s => s / n);
    return {
      stressClass: cls, confidence: Math.round(confidence * 1000) / 1000,
      probs: probs.map(p => Math.round(p * 1000) / 1000), votes,
      label: CLASS_NAMES[cls], color: CLASS_COLORS[cls],
      badge: CLASS_BADGE[cls],
      model: model.isDefault ? 'default-rules-model' : 'field-trained-rf'
    };
  }

  function predictFromRules(cls, features) {
    return {
      stressClass: cls, confidence: 0.75,
      probs: [0, 0, 0, 0, 0].map((_, i) => i === cls ? 0.75 : 0.0625),
      votes: { [cls]: 100 }, label: CLASS_NAMES[cls],
      color: CLASS_COLORS[cls], badge: CLASS_BADGE[cls], model: 'rule-based'
    };
  }

    function advisoryFor(stressClass) {
    return {
      stressClass, label: CLASS_NAMES[stressClass],
      advice: ADVISORY[stressClass] || '', color: CLASS_COLORS[stressClass],
      badge: CLASS_BADGE[stressClass]
    };
  }

    /* ── Merged advisory (G3): rule thresholds + ML confidence → verdict ──
     Signature matches server/ml_model.js: mergedAdvisory(rulesClass, mlClass, mlConfidence) */
  function mergedAdvisory(rulesClass, mlClass, mlConfidence) {
    const agree = rulesClass === mlClass;
    const finalClass = Math.max(rulesClass, mlClass);
    const confidence = agree
      ? Math.max(mlConfidence, 0.75)
      : Math.min(0.55, Math.max(0.4, mlConfidence * 0.5 + 0.25));
    const base = advisoryFor(finalClass);
    let reasoning;
    if (agree) {
      reasoning = `✅ Rule thresholds and the ML model <b>agree</b> on <b>${CLASS_NAMES[finalClass]}</b>. `;
    } else {
      reasoning = `⚠️ Signals differ: agronomic rules read <b>${CLASS_NAMES[rulesClass]}</b>, ML model predicts <b>${CLASS_NAMES[mlClass]}</b>. Taking the conservative class (<b>${CLASS_NAMES[finalClass]}</b>) — verify on the ground. `;
    }
    return Object.assign({}, base, {
      stressClass: finalClass, rulesClass, mlClass, agreement: agree, merged: true,
      confidence: Math.round(confidence * 1000) / 1000, reasoning,
      advice: reasoning + base.advice
    });
  }

  /* ── Build feature vector from analysis stats ── */
  function buildFeaturesFromStats(stats) {
    const ndvi = safeVal(stats.ndvi, stats.meanNdvi || 0.55);
    const evi  = safeVal(stats.evi,  Math.min(1.5, ndvi * 1.2));
    const ndwi = safeVal(stats.ndwi, ndvi * 0.4 + 0.05);
    const ndmi = safeVal(stats.ndmi, ndwi * 0.8 + 0.05);
    const ndviTrend = safeVal(stats.ndvi_trend, stats.trendSlope || 0);
    const ndwiTrend = safeVal(stats.ndwi_trend, ndviTrend * 0.7 || 0);
    const elevation = safeVal(stats.elevation, stats.avgElevation || 150);
    const slope = safeVal(stats.slope, stats.avgSlope || 1);
    return { ndvi, ndwi, evi, ndmi, ndvi_trend: ndviTrend, ndwi_trend: ndwiTrend, elevation, slope };
  }

    /* ── Main entry: predict field-level stress ──
     Mirrors server/ml_model.js predictField exactly. ── */
    function predictField(stats, model) {
    const m = model || null;
    // Accept all key variants: ndvi / ndvi_mean / meanNdvi, ndwi / ndwi_mean / meanNdwi, etc.
    const ndvi = safeVal(stats.ndvi, safeVal(stats.ndvi_mean, safeVal(stats.meanNdvi, 0.55)));
    const ndwi = safeVal(stats.ndwi, safeVal(stats.ndwi_mean, safeVal(stats.meanNdwi, 0.3)));
    const evi  = safeVal(stats.evi, safeVal(stats.evi_mean, 0.5));
    const ndmi = safeVal(stats.ndmi, safeVal(stats.ndmi_mean, 0.3));
    const ndviTrend = safeVal(stats.ndvi_trend, safeVal(stats.meanNdviTrend, 0));
    const ndwiTrend = safeVal(stats.ndwi_trend, safeVal(stats.meanNdwiTrend, 0));
    const elevation = safeVal(stats.elevation, safeVal(stats.avgElevation, 150));
    const slope = safeVal(stats.slope, safeVal(stats.avgSlope, 1));

    const features = [ndvi, ndwi, evi, ndmi, ndviTrend, ndwiTrend, elevation, slope];
    const featObj = { ndvi, ndwi, evi, ndmi, ndvi_trend: ndviTrend, ndwi_trend: ndwiTrend, elevation, slope };

    let pred;
    if (m && m.trees && m.trees.length > 0) {
      pred = predictRandomForest(m, features);
    } else {
      const rulesCls = labelFromRules(featObj);
      pred = predictFromRules(rulesCls, features);
    }
    const rulesClass = labelFromRules(featObj);
    const merged = mergedAdvisory(rulesClass, pred.stressClass, pred.confidence);
    return Object.assign({}, pred, merged, {
      model: m && m.isDefault ? 'default-rules-model' : (m && m.trainedAt ? 'field-trained-rf' : 'rule-based'),
      features,
      featureNames: FEATURES
    });
  }

  /* ── Decision-support advisory (G3): ML + rules + weather + terrain ── */
  function generateDecisionSupport(mlResult, stats, weather, terrain) {
    const { label, confidence, advice, color, rulesClass, mlClass, agreement } = mlResult;
    const parts = [];
    const confPct = Math.round(confidence * 100);
    parts.push(`<b>🤖 ML Stress Classification: ${label}</b> <span style="color:${color}">(${confPct}% confidence)</span>`);
    if (!agreement) {
      parts.push(`Diagnostic cross-check: rules → ${CLASS_NAMES[rulesClass]} · ML → ${CLASS_NAMES[mlClass]} · <i>conservative consensus: ${label}</i>`);
    } else {
      parts.push(`Diagnostic cross-check: rules and ML both read <b>${label}</b>`);
    }
    parts.push(advice);
    // Weather context
    const w = weather?.forecast?.current;
    if (w) {
      const t = w.temperature_2m;
      if (t > 35 && mlResult.stressClass >= 1) {
        parts.push(`<b>🌡️ Heat watch:</b> ${t.toFixed(1)}°C — heat compounds ${label.toLowerCase()}. Consider evening irrigation.`);
      } else if (t < 5 && mlResult.stressClass >= 2) {
        parts.push(`<b>🧊 Frost alert:</b> ${t.toFixed(1)}°C — protect sensitive crops.`);
      } else {
        parts.push(`<b>🌤️ Weather:</b> ${t?.toFixed(1)}°C. No extreme conditions compounding stress.`);
      }
    }
    // Terrain context
    if (terrain && (terrain.avgSlope > 5 || terrain.avgElevation > 1000)) {
      const notes = [];
      if (terrain.avgSlope > 5) notes.push(`slope ${terrain.avgSlope.toFixed(1)}° (runoff risk)`);
      if (terrain.avgElevation > 1000) notes.push(`elevation ${Math.round(terrain.avgElevation)} m`);
      parts.push(`<b>⛰️ Terrain:</b> ${notes.join('; ')}. Monitor these zones closely.`);
    }
    // NDVI threshold context
    const ndvi = stats.ndvi || stats.meanNdvi || 0;
    let ndviCtx;
    if (ndvi < 0.15) ndviCtx = 'bare/dead canopy';
    else if (ndvi < 0.30) ndviCtx = 'severely stressed';
    else if (ndvi < 0.50) ndviCtx = 'moderate stress';
    else if (ndvi < 0.65) ndviCtx = 'mild stress or early decline';
    else ndviCtx = 'healthy vigor';
        parts.push(`<b>📏 NDVI ${ndvi.toFixed(3)}</b> reads as <i>${ndviCtx}</i> for ${stats.cropName || 'this crop'}.`);
    return parts.join('\n');
  }

  /* ── Model loading: lazy-fetch from backend ── */
  let _modelCache = null;
  let _modelPromise = null;

  async function loadModel() {
    if (_modelCache) return _modelCache;
    if (_modelPromise) return _modelPromise;

    _modelPromise = (async () => {
      try {
        const res = await fetch('/api/ml/model', { signal: AbortSignal.timeout(8000) });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        if (data && data.model) {
          _modelCache = data.model;
          console.log('[ML] Model loaded from server:', data.source);
          return _modelCache;
        }
        throw new Error('No model in response');
      } catch (e) {
        console.warn('[ML] Model load failed, using rule-based fallback:', e.message);
        _modelCache = null;
        return null;
      } finally {
        _modelPromise = null;
      }
    })();
    return _modelPromise;
  }

  /* ── High-level: predict stress with model auto-load ── */
  async function predictStress(stats, modelOverride) {
    let model = modelOverride;
    if (!model) model = await loadModel(); // may return null if backend down
    return predictField(stats, model);
  }

  return {
    FEATURES, CLASS_NAMES, CLASS_COLORS, CLASS_BADGE,
    normalize, normValue, labelFromRules,
    predictRandomForest, treePredict, predictFromRules,
    advisoryFor, mergedAdvisory, buildFeaturesFromStats,
    predictField, generateDecisionSupport, predictStress,
    loadModel
  };
})();

window.FH_ML = FH_ML;



