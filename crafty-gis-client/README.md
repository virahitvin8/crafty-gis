# 🛰️ Crafty GIS — Agricultural Geospatial Intelligence Platform

> AI-Powered Precision Agriculture Platform. Monitor crop health, analyze soil, predict yields using satellite imagery and machine learning.

## 🌟 Features

### Vegetation Analysis
- **NDVI** — Normalized Difference Vegetation Index (general vegetation health)
- **EVI** — Enhanced Vegetation Index (dense canopy health)
- **GNDVI** — Green NDVI (chlorophyll/nitrogen content)
- **NDRE** — Normalized Difference Red Edge (mid-late season chlorophyll)
- **NDMI** — Normalized Difference Moisture Index (leaf water content)
- **NDWI** — Normalized Difference Water Index (open water/wet surfaces)
- **LAI** — Leaf Area Index estimation

### Soil Analysis
- pH levels
- Organic carbon content
- Nitrogen content
- Soil texture (clay/sand/silt)
- Cation Exchange Capacity (CEC)
- Bulk density
- Soil moisture
- Health score (0-100)

### Terrain Analysis
- Elevation mapping
- Slope calculation
- Aspect analysis
- Hillshade visualization
- Topographic Wetness Index
- Flow accumulation

### Weather Integration
- Current conditions (temperature, humidity, rainfall, wind)
- 7-day forecast
- Reference evapotranspiration (FAO-56 Penman-Monteith)
- Crop water stress indicators

### Crop Monitoring
- Crop health assessment
- Stress detection (water, nutrient, disease)
- Growth stage estimation
- Yield prediction (ML-based)
- Management recommendations

### Field Management
- Save and manage field boundaries
- Field health history
- Management zone delineation
- Quick analysis tools

## 🚀 Tech Stack

### Frontend
- **Next.js 16** — React framework
- **React 19** — UI library
- **Tailwind CSS 4** — Styling
- **MapLibre GL** — Interactive maps
- **Lucide React** — Icons
- **TypeScript** — Type safety

### Backend
- **FastAPI** — Python web framework
- **Rasterio** — Raster data processing
- **GeoPandas** — Vector data processing
- **GDAL** — Geospatial Data Abstraction Library
- **NumPy/Pandas** — Data analysis
- **Scikit-learn** — Machine learning

### Data Sources
- **Sentinel-2** — ESA Copernicus (10m, 5-day revisit)
- **Sentinel-1** — ESA Copernicus (SAR, all-weather)
- **Landsat 8/9** — NASA/USGS (30m, 16-day)
- **SoilGrids** — ISRIC (global soil data)
- **Open-Meteo** — Weather data
- **Open Elevation** — Global DEM

## 📦 Installation

### Frontend
```bash
cd crafty-gis-client
npm install
npm run dev
```

### Backend
```bash
cd crafty-gis-server
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## 🔧 Configuration

Create a `.env` file in the server directory:
```env
# AI Backends
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3

# Satellite Data APIs
COPERNICUS_USERNAME=your_username
COPERNICUS_PASSWORD=your_password

# NASA Earthdata
NASA_EARTHDATA_USERNAME=your_username
NASA_EARTHDATA_PASSWORD=your_password
```

## 📚 Research Foundation

This application is built on research from 11 agricultural PDFs covering:

1. **ML Yield Prediction** — Random Forest and XGBoost models for wheat yield prediction
2. **IoT + Satellite Integration** — Real-time monitoring systems
3. **Digital Agriculture** — GPS guidance, variable rate technology
4. **Computer Vision** — CNN and U-Net for crop/soil monitoring
5. **AI/ML in Remote Sensing** — SVM, RF, XGBoost for crop mapping
6. **Watershed Management** — Soil conservation and water quality
7. **Soil Organic Carbon** — Sentinel-1/2 based prediction
8. **GIS/RS Applications** — Precision agriculture and climate adaptation
9. **Evapotranspiration** — FAO-56 Penman-Monteith methodology
10. **Geospatial Intelligence** — Sustainable development applications
11. **Crop Mapping** — Time-series classification with ML

## 🎯 API Endpoints

### Vegetation
- `POST /api/vegetation/ndvi` — Compute NDVI
- `POST /api/vegetation/evi` — Compute EVI
- `POST /api/vegetation/gndvi` — Compute GNDVI
- `POST /api/vegetation/ndre` — Compute NDRE
- `POST /api/vegetation/ndmi` — Compute NDMI
- `POST /api/vegetation/ndwi` — Compute NDWI

### Soil
- `POST /api/soil/properties` — Get soil properties
- `POST /api/soil/health-score` — Calculate soil health

### Terrain
- `POST /api/terrain/elevation` — Get elevation
- `POST /api/terrain/slope` — Calculate slope
- `POST /api/terrain/aspect` — Calculate aspect

### Weather
- `GET /api/weather/current` — Current weather
- `GET /api/weather/forecast` — 7-day forecast
- `GET /api/weather/et0` — Reference evapotranspiration

### Crop
- `POST /api/crop/health` — Crop health assessment
- `POST /api/crop/stress` — Stress detection
- `POST /api/crop/yield-prediction` — Yield prediction

### Fields
- `GET /api/field/list` — List fields
- `POST /api/field/save` — Save field
- `GET /api/field/{id}` — Get field
- `PUT /api/field/{id}` — Update field
- `DELETE /api/field/{id}` — Delete field

## 📱 PWA Support

The application is Progressive Web App enabled:
- Works offline
- Installable on mobile devices
- App-like experience
- Push notifications (planned)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- ESA Copernicus for Sentinel satellite data
- NASA for Landsat and MODIS data
- ISRIC for SoilGrids data
- Open-Meteo for weather data
- The open-source GIS community
