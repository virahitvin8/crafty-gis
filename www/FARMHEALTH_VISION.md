# 🛰️ FarmHealth — Full Architecture Vision

## The Core Philosophy
> "The biggest challenge in agriculture isn't lack of information — it's getting the **right information at the right time**. By the time crops show visible stress, days of yield are already lost."

**FarmHealth solves this by detecting field stress BEFORE it's visible to the naked eye — using satellite data.**

---

## 📊 Complete Data Layer System

The user selects what they want to see on the map. Every layer has:
- **Colored visualization** on the map
- **Auto-updating legend** with scale values
- **Satellite info** (which satellite, acquisition date, resolution)
- **Scale bar**

### Layer Category 1: Vegetation Health
| Layer | Satellite | Resolution | Revisit | What It Detects |
|-------|-----------|-----------|---------|-----------------|
| **NDVI** | Sentinel-2 | 10m | 5 days | General vegetation greenness ✅ *Built* |
| **EVI** | Sentinel-2 | 10m | 5 days | Dense canopy health ✅ *Built* |
| **GNDVI** | Sentinel-2 | 10m | 5 days | Chlorophyll / Nitrogen ✅ *Built* |
| **NDRE** | Sentinel-2 | 20m | 5 days | Mid-late season chlorophyll ✅ *Built* |
| **LAI** | Sentinel-2 | 20m | 5 days | Leaf Area Index 🔜 *Add* |

### Layer Category 2: Water / Moisture Stress ⭐ (KEY FEATURE)
| Layer | Satellite | Resolution | Revisit | What It Detects |
|-------|-----------|-----------|---------|-----------------|
| **NDMI** | Sentinel-2 | 20m | 5 days | Leaf water content ✅ *Built* |
| **NDWI** | Sentinel-2 | 10m | 5 days | Open water / wet surfaces ✅ *Built* |
| **SMMI** | Sentinel-1 SAR | 10m | 6-12 days | **Soil moisture** — works through clouds! 🔜 *Add* |
| **TVDI** | Landsat + MODIS | 30m-1km | 8-16 days | Temperature-Vegetation Dryness Index 🔜 *Add* |
| **Sentinel-1 σ°** | Sentinel-1 SAR | 10m | 6-12 days | Radar backscatter = soil wetness 🔜 *Add* |

### Layer Category 3: Terrain
| Layer | Source | Resolution | What It Detects |
|-------|--------|-----------|-----------------|
| **Elevation** | SRTM / ALOS | 30m / 12.5m | Height above sea ✅ *Built* |
| **Slope** | Calculated | 30m | Steepness ✅ *Built* |
| **Aspect** | Calculated | 30m | Direction slope faces 🔜 *Add* |
| **Hillshade** | Calculated | 30m | 3D terrain visualization 🔜 *Add* |
| **Flow Accum.** | Calculated | 30m | Water drainage paths 🔜 *Add* |
| **Wetness Index** | Calculated | 30m | Areas where water pools 🔜 *Add* |

### Layer Category 4: Soil
| Layer | Source | What It Detects |
|-------|--------|-----------------|
| **pH** | SoilGrids | Acidity/Alkalinity ✅ *Built* |
| **Texture** | SoilGrids | Clay/Sand/Silt ratio ✅ *Built* |
| **Organic Carbon** | SoilGrids | Soil health ✅ *Built* |
| **Nitrogen** | SoilGrids | Nutrient availability ✅ *Built* |

### Layer Category 5: Land Records (NEW)
| Layer | Source | What It Shows |
|-------|--------|---------------|
| **Survey Number** | Manual + saved | Government land ID |
| **Owner Name** | Manual + saved | Farmer/owner name |
| **Village/Tehsil** | Reverse geocode | Administrative location |
| **Saved Farms** | localStorage | All previously visited farms |

---

## 🛰️ Satellite Sources Strategy

```
                    ┌─────────────────────────┐
                    │   Sentinel-2 (ESA)       │ ← PRIMARY optical
                    │   • NDVI, EVI, NDMI      │   10m, 5-day revisit
                    │   • All vegetation indices│   Free, global
                    └──────────┬──────────────┘
                               │
 ┌─────────────────┐    ┌──────┴──────┐    ┌──────────────────┐
 │ Sentinel-1 (ESA) │    │  Landsat    │    │   MODIS (NASA)   │
 │ C-band SAR       │    │  8/9 (NASA) │    │   Daily coarse   │
 │ Soil moisture    │    │ Thermal IR  │    │   TVDI, LST      │
 │ Through clouds!  │    │ TVDI index  │    │   250m-1km       │
 │ 10m, 6-12 days   │    │ 30m, 16 day │    │   Daily          │
 └────────┬─────────┘    └──────┬──────┘    └────────┬─────────┘
          │                     │                     │
          └──────────┬──────────┴──────────┬──────────┘
                     │                     │
              ┌──────┴──────┐      ┌───────┴────────┐
              │ Google Earth │      │  ALOS PALSAR   │
              │ Engine (GEE) │      │  L-band SAR    │
              │ Compute hub  │      │  Deeper soil   │
              │ All sources  │      │  25m resolution│
              └─────────────┘      └────────────────┘
```

### Integration Strategy
1. **Sentinel Hub** — Already connected ✅ For direct imagery fetch
2. **Google Earth Engine** — Server proxy built ✅ For computation
3. **STAC API** — Scene discovery ✅ Already connected
4. **Open-Meteo** — Weather + terrain ✅ Already connected
5. **SoilGrids** — Soil data ✅ Already connected

---

## 🎯 The "Pre-Visual Stress Detection" Pipeline

This is the KEY innovation you described:

```
                    DAY 1 (No visible stress)
                           │
              Satellite passes overhead
                           │
              ┌────────────────────────────┐
              │ Sentinel-1 SAR detects     │ ← RADAR sees through clouds
              │ soil moisture dropping     │
              │ NDMI detects leaf water    │ ← Before leaves look dry
              │ decreasing                 │
              └────────────┬───────────────┘
                           │
              ⚠️ ALERT: Water stress detected
              Map shows red zones
                           │
                    DAY 3-5 (Farmer irrigates)
                           │
              ┌────────────────────────────┐
              │ Farmer sees stressed area  │ ← Visible: leaves wilting
              │ on map BEFORE visible       │
              │ symptoms appear             │
              └────────────────────────────┘
                           │
                    YIELD SAVED 🎉
```

**The science:** Satellite indices detect changes in:
- **Cell structure** (SAR backscatter changes with moisture)
- **Leaf water content** (NDMI dips before leaves visibly wilt)  
- **Canopy temperature** (TVDI rises as plants stop transpiring)

...all **3-5 days before** the farmer sees anything wrong with their eyes.

---

## 📱 User Interface Concept

### The Layer Selector
```
┌─────────────────────────────────────────┐
│  🛰️  What do you want to see?           │
│  ┌────────────────────────────────────┐ │
│  │ 🌿 Vegetation    💧 Moisture       │ │
│  │   ○ NDVI          ○ NDMI    [✓]   │ │ ← Active layer highlighted
│  │   ○ EVI           ○ SMMI          │ │
│  │   ○ GNDVI         ○ TVDI          │ │
│  │   ○ NDRE          ○ SAR σ°        │ │
│  ├────────────────────────────────────┤ │
│  │ ⛰️ Terrain       🧪 Soil          │ │
│  │   ○ Elevation     ○ pH            │ │
│  │   ○ Slope         ○ Texture       │ │
│  │   ○ Aspect        ○ Organic C     │ │
│  │   ○ Hillshade     ○ Nitrogen      │ │
│  ├────────────────────────────────────┤ │
│  │ 📋 Land Records  🛰️ Satellite     │ │
│  │   ○ Survey#       ○ Sentinel-2    │ │
│  │   ○ Owner         ○ Sentinel-1    │ │
│  │   ○ Saved Farms   ○ Landsat 8/9   │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### The Info Bar (always visible)
```
┌──────────────────────────────────────────────────┐
│ 📅 12 July 2026  │ 🛰️ Sentinel-2 L2A  │ ☁️ 8%  │
│ ─── Scale 1:5,000 ───  │ 📍 25.4358°N, 81.8463°E │
│ Legend: [■] <0.15 [■] 0.3 [■] 0.5 [■] 0.7 [■] >0.85 │
└──────────────────────────────────────────────────┘
```

### The GPS "+" Flow
```
┌──────────────────┐
│      📍          │ ← Floating "+" button on map
│      +           │    Tapping captures GPS position
│      🗺️          │    Walk & tap corners
│                  │    Auto-connects to boundary
│      ✅          │    "Finish" → Full analysis runs
│                  │
│   [Run Analysis] │
└──────────────────┘
```

---

## 🏗️ Architecture Blueprint

```
┌──────────────────────────────────────────────────────────┐
│                   FRONTEND (Browser/Mobile)               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐ │
│  │ Leaflet  │ │ Chart.js │ │ Layer    │ │ GPS Geo      │ │
│  │ Map      │ │ Charts   │ │ Selector │ │ Location API │ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘ │
│                         │                                 │
│            ┌────────────┴────────────┐                    │
│            │   Layer Manager          │                    │
│            │   • Active layer state   │                    │
│            │   • Legend builder       │                    │
│            │   • Color palette engine │                    │
│            │   • Scale/date display   │                    │
│            └────────────┬────────────┘                    │
│                         │                                 │
│         ┌───────────────┼───────────────┐                 │
│         │               │               │                 │
│   Sentinel Hub    GEE Proxy     Open APIs                 │
│   (Direct API)  (Node Server)   (Weather/Soil)            │
│         │               │               │                 │
└─────────┼───────────────┼───────────────┼─────────────────┘
          │               │               │
     ┌────┴────┐    ┌────┴────┐    ┌─────┴─────┐
     │Sentinel │    │Google   │    │ Open-Meteo│
     │ Hub     │    │Earth    │    │ SoilGrids │
     │         │    │Engine   │    │ Nominatim │
     └─────────┘    └─────────┘    └───────────┘
```

---

## 📋 Development Roadmap

### Phase 1: Complete ✅ (Current State)
- ✅ Sentinel Hub integration (real NDVI)
- ✅ 7 vegetation indices
- ✅ Live weather, terrain, soil
- ✅ AI advice (Gemini)
- ✅ Education module (lessons + quiz)
- ✅ Time series + change detection
- ✅ PWA support (manifest + service worker)
- ✅ Responsive mobile layout
- ✅ Modular code architecture

### Phase 2: GPS + Field Intelligence 🔜 (Next)
- ⬜ GPS "+" button on map (floating action button)
- ⬜ Walk-and-tag boundary mode
- ⬜ Auto area/slope/elevation/drainage on capture
- ⬜ Reverse geocoding (address from GPS)
- ⬜ Land info card (survey #, owner name)
- ⬜ Farm history (saved fields with localStorage)
- ⬜ Sentinel-1 SAR soil moisture (through GEE)

### Phase 3: Layer System 🔜 (Next)
- ⬜ Layer selector UI with categories
- ⬜ Dynamic legend per layer (with scale values)
- ⬜ Satellite metadata display (date, source, resolution)
- ⬜ Terrain analysis (aspect, hillshade, flow accumulation)
- ⬜ TVDI (thermal stress) from Landsat

### Phase 4: Mobile Native 🔜 (Future)
- ⬜ Capacitor/Cordova wrapper for Play Store
- ⬜ Native GPS background tracking
- ⬜ Offline map tiles caching
- ⬜ Push notifications for stress alerts

---

## 🔗 References

- **GeoLibre** (Qiusheng Wu) — Browser-based GIS with 700+ tools
- **Leafmap** — Python geospatial analysis
- **Sentinel Hub** — Satellite data API
- **Google Earth Engine** — Planetary-scale geospatial computation

---

> **Bottom line:** Everything you described is **buildable**. The core already exists — Sentinel Hub, 7 indices, weather, terrain, soil. The next steps are: (1) GPS walk-and-tag, (2) Layer selector UI with dynamic legends, (3) Sentinel-1 SAR for soil moisture, (4) Land info system. The vision of detecting water stress before visible symptoms is real science — NDMI + SAR data can do exactly that.
