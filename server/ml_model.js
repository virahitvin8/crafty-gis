/* ═══════════════════════════════════════════════════════════
   Crafty GIS — Crop Stress Decision Model (pure JS, zero deps)
   ═══════════════════════════════════════════════════════════
   A real Random Forest classifier implemented from scratch in
   Node.js (no scikit-learn needed). Trained on "bootstrap labels"
   derived from agronomic threshold rules applied to per-zone
   satellite/terrain features — exactly the pipeline the roadmap
   describes (bootstrap-label zones → train → predict).

   Features per zone (normalized before training):
     ndvi, ndwi, evi, ndmi,          // vegetation / moisture indices
     ndvi_trend, ndwi_trend,         // slope of index over time
     elevation, slope                // terrain

   Target classes (0-4):
     0 Healthy · 1 Mild · 2 Moderate · 3 Severe · 4 Critical
   ═══════════════════════════════════════════════════════════ */
'use strict';

const fs = require('fs');
const path = require('path');

const MODEL_DIR = path.join(__dirname, 'models');
const MODEL_PATH = path.join(MODEL_DIR, 'crop_stress_rf.json');

// ── Ground-truth label store (farmer-verified observations) ──
// P3: farmers verify a zone's true stress class in the field; these REAL
// labels override the bootstrap rule labels during retraining.
const LABELS_DIR = path.join(__dirname, 'labels');
const LABELS_PATH = path.join(LABELS_DIR, 'ground_truth.json');

const FEATURES = ['ndvi', 'ndwi', 'evi', 'ndmi', 'ndvi_trend', 'ndwi_trend', 'elevation', 'slope'];
const N_FEATURES = FEATURES.length;

// Feature normalization ranges (fit on agro-realistic value ranges).
const NORM = {
  ndvi:       [-0.2, 1.0],
  ndwi:       [-1.0, 1.0],
  evi:        [-0.5, 1.5],
  ndmi:       [-1.0, 1.0],
  ndvi_trend: [-0.02, 0.02],   // per-day NDVI slope
  ndwi_trend: [-0.02, 0.02],
  elevation:  [0, 3000],       // metres ASL
  slope:      [0, 30]          // degrees
};

function normValue(name, v) {
  const [lo, hi] = NORM[name] || [-1, 1];
  const n = (v - lo) / (hi - lo);
  return Math.max(0, Math.min(1, n));
}

function normalize(features) {
  const out = new Array(N_FEATURES);
  for (let i = 0; i < N_FEATURES; i++) out[i] = normValue(FEATURES[i], features[i]);
  return out;
}

/* ── Bootstrap labeling: agronomic rules → stress class ───────── */
function labelFromRules(f) {
  const ndvi = f.ndvi, ndwi = f.ndwi, evi = f.evi, ndmi = f.ndmi;
  const tN = f.ndvi_trend || 0, tW = f.ndwi_trend || 0;
  const slope = f.slope || 0;

  if (ndvi < 0.15) return 4;                       // bare / dead
  if (ndvi < 0.30 || (ndvi < 0.45 && ndwi < 0.15)) return 3;  // severe
  if (ndvi < 0.50 || ndwi < 0.20 || evi < 0.25) return 2;      // moderate
  if (ndvi < 0.65 || ndmi < 0.25 || tN < -0.003 || tW < -0.003 || slope > 5) return 1; // mild
  return 0;                                        // healthy
}

/* ── Random Forest ────────────────────────────────────────────── */
function randInt(n) { return Math.floor(Math.random() * n); }

class Node {
  constructor() {
    this.feat = -1; this.thr = 0; this.left = null; this.right = null;
    this.leaf = true; this.dist = null;  // dist: class probability distribution
  }
}

// Best split via Gini impurity over a random feature subset.
function bestSplit(X, y, idx, mtry, rng) {
  let best = { gain: -Infinity, feat: -1, thr: 0 };
  const n = idx.length;
  if (n < 2) return best;

  // class distribution in parent
  const parentCounts = {};
  for (const i of idx) parentCounts[y[i]] = (parentCounts[y[i]] || 0) + 1;
  let parentGini = 1;
  for (const k in parentCounts) { const p = parentCounts[k] / n; parentGini -= p * p; }
  if (parentGini === 0) return best;

  // random feature subset
  const feats = [];
  for (let f = 0; f < N_FEATURES; f++) feats.push(f);
  for (let i = 0; i < feats.length; i++) { const j = randInt(feats.length); [feats[i], feats[j]] = [feats[j], feats[i]]; }
  const subset = feats.slice(0, Math.max(1, Math.min(mtry, N_FEATURES)));

  for (const f of subset) {
    // candidate thresholds at random sample points
    const vals = [];
    for (let t = 0; t < Math.min(20, n); t++) vals.push(X[idx[randInt(n)]][f]);
    for (const thr of vals) {
      const left = [], right = [];
      for (const i of idx) (X[i][f] <= thr ? left : right).push(i);
      if (!left.length || !right.length) continue;
      const giniL = giniOf(X, y, left), giniR = giniOf(X, y, right);
      const wL = left.length / n, wR = right.length / n;
      const gain = parentGini - (wL * giniL + wR * giniR);
      if (gain > best.gain) { best = { gain, feat: f, thr }; }
    }
  }
  return best;
}

function giniOf(X, y, idx) {
  const counts = {};
  for (const i of idx) counts[y[i]] = (counts[y[i]] || 0) + 1;
  let g = 1;
  for (const k in counts) { const p = counts[k] / idx.length; g -= p * p; }
  return g;
}

function buildTree(X, y, idx, depth, maxDepth, minLeaf, mtry, rng) {
  const node = new Node();
  const dist = {};
  for (const i of idx) dist[y[i]] = (dist[y[i]] || 0) + 1;
  for (const k in dist) dist[k] /= idx.length;
  node.dist = dist;

  if (depth >= maxDepth || idx.length < minLeaf) return node;

  const s = bestSplit(X, y, idx, mtry, rng);
  if (s.feat < 0 || s.gain <= 0) return node;

  const left = [], right = [];
  for (const i of idx) (X[i][s.feat] <= s.thr ? left : right).push(i);

  node.leaf = false;
  node.feat = s.feat;
  node.thr = s.thr;
  node.left = buildTree(X, y, left, depth + 1, maxDepth, minLeaf, mtry, rng);
  node.right = buildTree(X, y, right, depth + 1, maxDepth, minLeaf, mtry, rng);
  return node;
}

function treePredict(tree, x) {
  let node = tree;
  while (!node.leaf) {
    node = (x[node.feat] <= node.thr) ? node.left : node.right;
  }
  return node.dist;
}

function trainRandomForest(X, y, opts) {
  const n = X.length;
  const nTrees = opts.nTrees || 60;
  const maxDepth = opts.maxDepth || 8;
  const minLeaf = opts.minLeaf || 2;
  const mtry = opts.mtry || Math.max(2, Math.floor(Math.sqrt(N_FEATURES)));
  const trees = [];

  for (let t = 0; t < nTrees; t++) {
    const idx = [];
    for (let i = 0; i < n; i++) idx.push(randInt(n));  // bootstrap sample
    trees.push(buildTree(X, y, idx, 0, maxDepth, minLeaf, mtry, Math.random));
  }
  return { trees, nFeatures: N_FEATURES, features: FEATURES, trainedAt: new Date().toISOString(), nSamples: n };
}

// Predict: majority vote across trees → class + confidence.
function predictRandomForest(model, features) {
  const x = normalize(features);
  const votes = {};
  const treeDistSum = new Array(5).fill(0);
  for (const tree of model.trees) {
    const d = treePredict(tree, x);
    let best = 0, bv = -1;
    for (const k in d) { if (d[k] > bv) { bv = d[k]; best = Number(k); } }
    votes[best] = (votes[best] || 0) + 1;
    for (let c = 0; c < 5; c++) treeDistSum[c] += (d[c] || 0);
  }
  let cls = 0, cv = -1;
  for (const k in votes) { if (votes[k] > cv) { cv = votes[k]; cls = Number(k); } }
  const confidence = cv / model.trees.length;
  const probs = treeDistSum.map(s => s / model.trees.length);
  return { stressClass: cls, confidence, probs, votes };
}

/* ── Persistence ──────────────────────────────────────────────── */
function saveModel(model) {
  try {
    if (!fs.existsSync(MODEL_DIR)) fs.mkdirSync(MODEL_DIR, { recursive: true });
    fs.writeFileSync(MODEL_PATH, JSON.stringify(model));
    return MODEL_PATH;
  } catch (e) { console.warn('[ML] Could not persist model:', e.message); return null; }
}

function loadModel() {
  try {
    if (fs.existsSync(MODEL_PATH)) return JSON.parse(fs.readFileSync(MODEL_PATH, 'utf8'));
  } catch (e) { console.warn('[ML] Model load failed:', e.message); }
  return null;
}

/* ── Training entry point ───────────────────────────────────────
   zoneRows: array of { ndvi, ndwi, evi, ndmi, ndvi_trend,
                        ndwi_trend, elevation, slope } per zone.
   Labels are bootstrap-derived from agronomic rules; we also add
   small synthetic perturbations so the forest learns a general
   decision boundary, not just the exact rule thresholds.        */
function trainFromZones(zoneRows, groundTruth) {
  if (!zoneRows || zoneRows.length < 10) {
    throw new Error('Need at least 10 zone rows to train the model');
  }
  let gtUsed = 0;
  const X = [], y = [];
  for (const z of zoneRows) {
    // Real farmer-verified labels override the bootstrap rule label.
    let label = labelFromRules(z);
    const gt = groundTruthLabelFor(z, groundTruth);
    if (gt !== null && gt !== undefined) { label = gt; gtUsed++; }
    X.push(normalize([z.ndvi, z.ndwi, z.evi, z.ndmi, z.ndvi_trend || 0, z.ndwi_trend || 0, z.elevation || 150, z.slope || 1]));
    y.push(label);
    // deterministic-ish synthetic augmentation (±2% noise, 4 copies)
    for (let k = 1; k <= 4; k++) {
      const eps = (f) => f * (1 + (Math.sin(k * 7.13 + f * 13.7) * 0.02));
      X.push(normalize([
        eps(z.ndvi), eps(z.ndwi), eps(z.evi), eps(z.ndmi),
        (z.ndvi_trend || 0) * (1 + 0.1 * k),
        (z.ndwi_trend || 0) * (1 + 0.1 * k),
        (z.elevation || 150) + Math.sin(k) * 2,
        (z.slope || 1) + Math.cos(k) * 0.2
      ]));
      y.push(label);
    }
  }
  const model = trainRandomForest(X, y, { nTrees: 60, maxDepth: 8, minLeaf: 2 });
  saveModel(model);
  return { model, nZones: zoneRows.length, nSamples: X.length, groundTruthUsed: gtUsed };
}

// A pre-trained default model (trained on a dense synthetic grid) so the
// classifier ALWAYS works even before real field data arrives.
function defaultModel() {
  const rows = [];
  const grid = [0.08, 0.2, 0.35, 0.5, 0.6, 0.72, 0.85, 0.92];
  for (const ndvi of grid)
    for (const ndwi of grid)
      for (const evi of [0.2, 0.4, 0.8])
        for (const slope of [1, 3, 6, 10])
          rows.push({
            ndvi, ndwi, evi,
            ndmi: ndwi * 0.8 + 0.05,
            ndvi_trend: (ndvi - 0.55) * 0.02,
            ndwi_trend: (ndwi - 0.4) * 0.02,
            elevation: 150 + slope * 5,
            slope
          });
  const { model } = trainFromZones(rows);
  model.isDefault = true;
  return model;
}

/* ── Advisory text for a predicted class ───────────────────────── */
const CLASS_NAMES = ['Healthy', 'Mild Stress', 'Moderate Stress', 'Severe Stress', 'Critical'];
const ADVISORY = [
  'No intervention needed. Maintain current irrigation and nutrient schedule. Continue weekly satellite monitoring.',
  'Early stress signal detected. Scout the affected zone; consider a light irrigation boost and monitor NDWI trend over the next 7 days.',
  'Moderate stress — schedule irrigation within 3-4 days and top-dress nitrogen (20-30 kg/ha) if leaf greenness is declining.',
  'Severe stress — irrigate immediately, verify soil moisture on the ground, and inspect for pest/disease pressure. Re-run analysis after 5 days.',
  'CRITICAL — crop at risk of failure. Immediate on-ground inspection required; consult an agronomist and verify irrigation/soil conditions today.'
];

/* ── G3: MERGED ADVISORY — rule thresholds + ML confidence ───────
   Combines the deterministic agronomic rules (labelFromRules) with the
   Random Forest class prediction into ONE decision-support verdict:
     • if both agree → high-confidence single recommendation
     • if they disagree → the conservative (worse) class wins, and the
       reasoning explicitly surfaces which signal flagged what.         */
function mergedAdvisory(rulesClass, mlClass, mlConfidence) {
  const agree = rulesClass === mlClass;
  // Conservative merge: worst case of the two signals drives the action.
  const finalClass = Math.max(rulesClass, mlClass);
  // Confidence: agreement boosts it; disagreement caps it near 50%.
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
    stressClass: finalClass,
    rulesClass,
    mlClass,
    agreement: agree,
    merged: true,
    confidence,
    reasoning,
    advice: reasoning + base.advice
  });
}

/* ── G5: GROUND-TRUTH LABEL STORE ─────────────────────────────────
   Farmer-verified zone observations, persisted to server/labels/
   so retraining can use REAL field labels instead of only rules.   */
function loadGroundTruth() {
  try {
    if (fs.existsSync(LABELS_PATH)) {
      const arr = JSON.parse(fs.readFileSync(LABELS_PATH, 'utf8'));
      return Array.isArray(arr) ? arr : [];
    }
  } catch (e) { console.warn('[ML] Ground-truth load failed:', e.message); }
  return [];
}

function addGroundTruth(record) {
  const all = loadGroundTruth();
  const entry = Object.assign({
    id: 'gt_' + Date.now() + '_' + Math.floor(Math.random() * 1e6),
    createdAt: new Date().toISOString()
  }, record);
  all.push(entry);
  try {
    if (!fs.existsSync(LABELS_DIR)) fs.mkdirSync(LABELS_DIR, { recursive: true });
    fs.writeFileSync(LABELS_PATH, JSON.stringify(all, null, 2));
  } catch (e) { console.warn('[ML] Ground-truth save failed:', e.message); }
  return entry;
}

// Match a ground-truth record to the nearest zone row (within ~150 m)
// so a farmer's observation can override that zone's bootstrap label.
function groundTruthLabelFor(zoneRow, groundTruth) {
  if (!groundTruth || !groundTruth.length) return null;
  // Both the record and the zone MUST carry finite coordinates, else the
  // old `|| 0` fallback could match any label at lat≈0 and mislabel zones.
  if (!isFinite(zoneRow.lat) || !isFinite(zoneRow.lng)) return null;
  let best = null, bestD = 0.003; // ~333 m max match radius
  for (const g of groundTruth) {
    if (g.observedClass === undefined || g.observedClass === null) continue;
    if (!isFinite(g.lat) || !isFinite(g.lng)) continue;
    const dLat = Math.abs(g.lat - zoneRow.lat);
    const dLng = Math.abs(g.lng - zoneRow.lng);
    const d = Math.max(dLat, dLng);
    if (d < bestD) { bestD = d; best = g; }
  }
  return best ? Number(best.observedClass) : null;
}

function advisoryFor(stressClass) {
  return {
    stressClass,
    label: CLASS_NAMES[stressClass] || 'Unknown',
    advice: ADVISORY[stressClass] || '',
    color: ['#2E8B57', '#8FBC4F', '#FFD93B', '#FF9F1C', '#FF5252'][stressClass] || '#888'
  };
}

/* ── CSV builder: zone-feature table for the ML/report pipeline ── */
function zonesToCSV(zoneRows) {
  const header = ['zone_id', 'ndvi', 'ndwi', 'evi', 'ndmi', 'ndvi_trend', 'ndwi_trend', 'elevation', 'slope', 'stress_class', 'label'];
  const lines = [header.join(',')];
  zoneRows.forEach((z, i) => {
    const cls = labelFromRules(z);
    lines.push([i, z.ndvi, z.ndwi, z.evi, z.ndmi, z.ndvi_trend || 0, z.ndwi_trend || 0,
      z.elevation || 0, z.slope || 0, cls, CLASS_NAMES[cls]].map(v => Number.isFinite(v) ? +v.toFixed(5) : v).join(','));
  });
  return lines.join('\n');
}

/* ── NaN-safe value guard ────────────────────────────────────────
   GEE reduceRegion may return null for a band (water, missing data).
   Replace null/NaN with mid-range defaults so the tree traversal
   never sees NaN (NaN comparisons silently always go right).     */
function safeVal(v, fallback) {
  if (v === null || v === undefined) return fallback;
  if (typeof v === 'number' && isNaN(v)) return fallback;
  return v;
}

/* ── Single-field prediction helper ──────────────────────────────
   Builds a field-level feature vector from GEE composite stats and
   returns the model's decision with confidence + advisory.        */
function predictField(stats, model) {
  const m = model || loadModel() || defaultModel();
  const features = [
    safeVal(stats.ndvi_mean, 0.5),
    safeVal(stats.ndwi_mean, 0.3),
    safeVal(stats.evi_mean, 0.5),
    safeVal(stats.ndmi_mean, 0.3),
    safeVal(stats.ndvi_trend, 0),
    safeVal(stats.ndwi_trend, 0),
    safeVal(stats.elevation, 150),
    safeVal(stats.slope, 1)
  ];
  const pred = predictRandomForest(m, features);
  // G3: merge rule-based class + ML class + confidence into one verdict.
  const rulesClass = labelFromRules({
    ndvi: features[0], ndwi: features[1], evi: features[2], ndmi: features[3],
    ndvi_trend: features[4], ndwi_trend: features[5], slope: features[7]
  });
  const merged = mergedAdvisory(rulesClass, pred.stressClass, pred.confidence);
  return Object.assign({}, pred, merged, {
    model: m.isDefault ? 'default-rules-model' : 'field-trained-rf',
    features
  });
}

module.exports = {
  FEATURES, CLASS_NAMES, ADVISORY,
  normalize, normValue, labelFromRules,
  trainFromZones, predictRandomForest, predictField,
  mergedAdvisory, advisoryFor,
  loadGroundTruth, addGroundTruth, groundTruthLabelFor,
  saveModel, loadModel, defaultModel, zonesToCSV,
  MODEL_PATH, LABELS_PATH
};
