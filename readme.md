<a name="readme-top"></a>

<div align="center">
  
  # 🌾 FarmHealth — Satellite Crop Monitor
  
  ### *Advanced Satellite Vision for Precision Agriculture*
  
  **Real-time, pixel-level crop health monitoring and analytics — straight from space to your pocket 🛰️📱**
  
  <br>

  <!-- ====== CATEGORY: FRAMEWORK & LANGUAGES ====== -->
  **📦 Framework & Languages**
  
  [![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://javascript.com)
  [![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)](https://html.spec.whatwg.org)
  [![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)](https://www.w3.org/Style/CSS/)
  [![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org)

  <br>

  <!-- ====== CATEGORY: MAPS & VISUALIZATION ====== -->
  **🗺️ Mapping & Visualization**
  
  [![Leaflet](https://img.shields.io/badge/Leaflet-199900?style=for-the-badge&logo=leaflet&logoColor=white)](https://leafletjs.com)
  [![OpenStreetMap](https://img.shields.io/badge/OpenStreetMap-7EBC6F?style=for-the-badge&logo=openstreetmap&logoColor=white)](https://openstreetmap.org)
  [![Sentinel Hub](https://img.shields.io/badge/Sentinel_Hub-004488?style=for-the-badge&logo=esa&logoColor=white)](https://www.sentinel-hub.com/)
  [![Chart.js](https://img.shields.io/badge/Chart.js-FF6384?style=for-the-badge&logo=chartdotjs&logoColor=white)](https://www.chartjs.org/)

  <br>

  <!-- ====== CATEGORY: PLATFORMS ====== -->
  **📱 Platforms**
  
  [![Android](https://img.shields.io/badge/Android-3DDC84?style=for-the-badge&logo=android&logoColor=white)](https://developer.android.com)
  [![PWA](https://img.shields.io/badge/PWA-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)
  [![Capacitor](https://img.shields.io/badge/Capacitor-119EFF?style=for-the-badge&logo=capacitor&logoColor=white)](https://capacitorjs.com/)

  <br>
  
  <!-- ====== STATUS BADGES ====== -->
  <br>
  
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)
  [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](CONTRIBUTING.md)
  
  <br>
</div>

<br>

---

<p align="center">
  <a href="#-features">✨ Features</a> •
  <a href="#️-how-it-works">🛰️ How It Works</a> •
  <a href="#-authentication-roles">🔐 Roles</a> •
  <a href="#-satellite-data-sources">📡 Satellites</a>
</p>

---

## ✨ Features

FarmHealth brings the power of multi-spectral satellites directly to farmers and researchers.

<div align="center">

| | Feature | Description | Tech |
|---|---|---|---|
| 🛰️ | **Multi-Satellite Analysis** | Sentinel-2, Sentinel-1 SAR, and Landsat-8 Thermal | ESA + NASA |
| 🌿 | **Crop Health Indices** | NDVI, EVI, NDWI, GNDVI, REIP, SAVI | Sentinel Hub API |
| 🌾 | **Yield Prediction** | Real-time yield algorithmic projection based on area & health | JS Algorithm |
| 🐛 | **Pest Risk Anomaly** | Flagging sudden Red-Edge/NIR drops before visible yellowing | Evalscript |
| 🌡️ | **Thermal Stress (TVDI)** | Land Surface Temperature map using Landsat-8 | Landsat L1C |
| 💧 | **Field Moisture (SAR)** | Soil moisture index using radar backscatter (works through clouds) | Sentinel-1 GRD |
| 🤖 | **AI Agronomist** | Gemini-powered AI field advice based on your coordinates & health | Google Gemini API |
| 🌤️ | **Weather Integration** | Live weather, evapotranspiration, and soil temp | Open-Meteo |
| 📱 | **Offline PWA & Android** | Installs as a native app or PWA via Capacitor | Capacitor JS |
| 🔐 | **Role-based Access** | Admin & User roles to protect API credentials | Secure UI |

</div>

<p align="right"><a href="#readme-top">⬆ Back to top</a></p>

---

## 🛰️ How It Works

```mermaid
graph LR
    A[📍 Draw/Select Field] --> B[🛰️ Fetch Satellites]
    B --> C[📊 Compute Evalscripts]
    C --> D[🧠 AI Generates Advice]
    D --> E[📱 FarmHealth Dashboard]
    
    B --> F[Sentinel-2 <br/> Multispectral]
    B --> G[Landsat-8 <br/> Thermal]
    B --> H[Sentinel-1 <br/> SAR Radar]
    
    C --> I[NDVI & Health Indices]
    C --> J[Pest/Disease Anomaly]
    C --> K[Moisture & TVDI]
    C --> L[Yield Prediction]
    
    style A fill:#2E7D32,color:white
    style B fill:#1976D2,color:white
    style C fill:#F9A825,color:white
    style D fill:#8E44AD,color:white
    style E fill:#2ECC71,color:white
```

---

## 🔐 Authentication Roles

FarmHealth includes a dual-role mock authentication system for demonstration and security:

| Role | Username | Password | Privileges |
|------|----------|----------|------------|
| **Admin** | `admin` | `admin` | Full access to platform. **Can view and edit API credentials** in Settings. |
| **User** | `user` | `user` | Full access to platform features, but API keys are hidden and secured. |

---

## 📡 Satellite Data Sources

1. **Copernicus Sentinel-2**: Provides high-resolution (10m) multispectral imagery for NDVI, EVI, REIP, and pest detection.
2. **Copernicus Sentinel-1 (SAR)**: Synthetic Aperture Radar provides soil moisture measurements that penetrate cloud cover.
3. **NASA Landsat-8/9**: Thermal infrared sensors provide Land Surface Temperature for the Thermal Vegetation Dryness Index (TVDI).

---

<div align="center">
  <p><b>Made with ❤️ for Global Agriculture</b></p>
</div>
