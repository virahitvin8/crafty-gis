# 🗺️ Implementation Plan: CeresFlow
> "Universal GIS & Remote Sensing Automation System"

* **Project Type**: WEB (Streamlit Web Portal)
* **Status**: Discovery Complete; Ready for Phase 1.

---

## 🎯 Success Criteria
- [x] 1-Click execution: Input place/coordinates $\rightarrow$ Download $\rightarrow$ Compute indices $\rightarrow$ Output PDF report.
- [x] Zero API credentials needed for initial launch (uses public AWS/Google Cloud STAC mirrors).
- [x] Scientific procedure documentation attached to every output.
- [x] Dual-panel Folium map rendering raw vs. analyzed GeoTIFF.
- [x] Exportable clean GeoTIFF and GeoJSON formats.

---

## 🏗️ Folder Structure
```plaintext
ceresflow/
├── app.py                     # Main Streamlit UI Entrypoint
├── requirements.txt           # Python dependencies
├── README.md                  # Installation & documentation
├── core/
│   ├── __init__.py
│   ├── geocoding.py           # Address/Coordinate parser
│   └── agronomist.py          # AI Plain-English recommendations engine
├── services/
│   ├── __init__.py
│   ├── satellite_source.py    # Public mirror STAC downloader
│   ├── raster_math.py         # Multi-spectral computations (NDVI, NDWI, Carbon)
│   ├── dem_processor.py       # Terrain calculations (Slope, Contours, Drainage)
│   └── pdf_builder.py         # ReportLab PDF compile module
└── utils/
    ├── __init__.py
    └── geo_helpers.py         # Projection conversions (WGS84 -> UTM)
```

---

## 🛠️ Task Breakdown

### Phase 1: Foundation & Bounding Box (Skeletal System)
*   **Task 1.1**: Initialize Streamlit structure and dependencies.
    *   *Input*: Create `ceresflow/requirements.txt` and template `ceresflow/app.py`.
    *   *Output*: Basic layout running locally.
    *   *Verify*: Running `streamlit run ceresflow/app.py` loads page.
    *   *Agent*: `frontend-specialist` | *Skill*: `frontend-design`
*   **Task 1.2**: Implement Geocoding and Bounding Box calculator.
    *   *Input*: Create `ceresflow/core/geocoding.py` using `geopy` and `shapely`.
    *   *Output*: Module that converts place names/coordinates into local UTM projected boundary boxes.
    *   *Verify*: Unit tests run coordinates and return valid GeoJSON bbox.
    *   *Agent*: `backend-specialist` | *Skill*: `python-patterns`

### Phase 2: Open Ingestion (Sensory/Eyes System)
*   **Task 2.1**: Implement STAC catalog queries.
    *   *Input*: Create `ceresflow/services/satellite_source.py` querying STAC endpoints (Sentinel/Landsat AWS mirrors).
    *   *Output*: Functions returning cloud-free band URLs for specific bounding boxes.
    *   *Verify*: Run query and print valid HTTP raster URLs without API keys.
    *   *Agent*: `backend-specialist` | *Skill*: `api-patterns`
*   **Task 2.2**: Implement Raster Downloader.
    *   *Input*: Download red, NIR, water, and DEM bands using `rasterio` windowed reads.
    *   *Output*: Local temp GeoTIFF files.
    *   *Verify*: Verify file metadata and coordinate systems.
    *   *Agent*: `backend-specialist` | *Skill*: `python-patterns`

### Phase 3: Spatial Processing Engines (The Brain Lobe)
*   **Task 3.1**: Build Raster Indices Calculator.
    *   *Input*: Create `ceresflow/services/raster_math.py`.
    *   *Output*: Clean matrices for NDVI, NDWI, and carbon index outputs.
    *   *Verify*: Indices output arrays are within correct mathematical ranges (e.g., NDVI in [-1, 1]).
    *   *Agent*: `backend-specialist` | *Skill*: `database-design`
*   **Task 3.2**: Build Terrain and Hydrology Mappers.
    *   *Input*: Create `ceresflow/services/dem_processor.py`.
    *   *Output*: Calculations for slope angles, drainage accumulation pathways, and contours.
    *   *Verify*: Slope and drainage outputs output matching dimensions.
    *   *Agent*: `backend-specialist` | *Skill*: `python-patterns`

### Phase 4: Reports & GUI Mapping (The Voice/Mouth)
*   **Task 4.1**: Build PDF Agronomy Report compiler.
    *   *Input*: Create `ceresflow/services/pdf_builder.py` using `reportlab`.
    *   *Output*: Compiled PDF combining procedure metadata, index maps, and agronomical suggestions.
    *   *Verify*: Test generation prints out a multi-page, formatted PDF.
    *   *Agent*: `documentation-writer` | *Skill*: `documentation-templates`
*   **Task 4.2**: Connect Leaflet before/after map and triggers in GUI.
    *   *Input*: Finalize `ceresflow/app.py` combining Folium dual maps and the downloader/processor pipeline.
    *   *Output*: Completely functional dashboard.
    *   *Verify*: Entering coordinate and clicking run performs download -> processing -> renders map and displays PDF download.
    *   *Agent*: `frontend-specialist` | *Skill*: `frontend-design`

---

## ✅ PHASE X: Verification Checklist
- [x] No hardcoded API keys/secrets in codebase.
- [x] Running `python .agent/scripts/checklist.py .` passes all security/lint loops.
- [x] Reprojection calculations correctly output coordinates in meters, not degrees.
- [x] System handles empty coordinates or zero-intersect downloads gracefully.
- [x] Streamlit interface matches visual guidelines (no default raw HTML, premium colors).
