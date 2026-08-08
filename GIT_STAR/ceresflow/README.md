# CeresFlow — Universal Open-Source GIS & Remote Sensing Engine

CeresFlow is a local, production-grade geographic information systems (GIS) and remote sensing automation portal. Designed for both developers and non-technical farmers, it performs 1-click downloads, re-projections, spectral analyses, terrain modeling, and PDF agronomy report compilations.

## 🚀 Key Features

*   **1-Click Location Analysis:** Enter an address or coordinates and specify an analysis radius; the engine does all geocoding, boundary conversions, and downloads automatically.
*   **Credentials-Free Ingestion:** Searches Element 84 public STAC APIs for cloud-free Sentinel-2 granules, falling back gracefully to local synthetic raster generation for offline testing.
*   **Band Mathematics & Spectral Indices:** Computes NDVI (Normalized Difference Vegetation Index), NDWI (Normalized Difference Water Index / Soil Moisture), and empirical Biomass Carbon Density indices.
*   **Digital Elevation Model (DEM) Processor:** Calculates exact terrain slope angles using Horn's 3x3 kernel convolution, extracts contours as GeoJSON lines, and traces watershed drainage flow channels.
*   **Farmer Report Compiler:** Formulates plain-English agronomy recommendations and builds a print-ready PDF containing structured metrics and validation logs.
*   **Interactive Leaflet GUI Dashboard:** Features dual-map folium layouts comparing the raw satellite map view with color-mapped index overlays.

---

## 🛠️ Codebase Structure

```plaintext
ceresflow/
├── app.py                     # Streamlit Portal Dashboard
├── requirements.txt           # Python dependencies
├── README.md                  # User Documentation
├── core/
│   ├── geocoding.py           # Geocoding & UTM grid resolutions
│   └── agronomist.py          # Plain-English advice logic
├── services/
│   ├── satellite_source.py    # STAC searching & downloader
│   ├── raster_math.py         # NDVI, NDWI, Carbon calculators
│   ├── dem_processor.py       # Terrain, contours, and streams
│   └── pdf_builder.py         # ReportLab PDF compiler
├── utils/
│   └── geo_helpers.py         # CRS reprojection helpers
└── tests/
    ├── run_all_tests.py       # Master E2E validation script
    ├── test_geocoding.py      # Geocoding tests
    ├── test_satellite.py      # Satellite simulation tests
    ├── test_processing.py     # Indices & terrain tests
    ├── test_pdf.py            # PDF compilation tests
```

---

## ⚙️ Setup & Installation

### 1. Pre-requisites
Ensure you have Python 3.10+ installed.

### 2. Install Dependencies
Install all system dependencies listed in `requirements.txt`:
```bash
pip install -r ceresflow/requirements.txt
```

### 3. Run Validation Suite
Execute the master suite to verify georeferencing, calculation engines, and report compilation:
```bash
python ceresflow/tests/run_all_tests.py
```

### 4. Launch Dashboard
Start the local Streamlit web application:
```bash
streamlit run ceresflow/app.py
```
Open the provided local URL (typically `http://localhost:8501`) in your browser.
