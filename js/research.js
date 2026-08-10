/* ═══════════════════════════════════════════════════════════
   Crafty GIS — Research Knowledge Base
   Compiled from the 12 peer-reviewed papers in /pdfs
   Each entry: methodology + required data pulls + models +
   accuracy + the status of that capability inside Crafty GIS.
   ═══════════════════════════════════════════════════════════ */

const FH_RESEARCH = (function() {
  'use strict';

  // The "required pulls" taxonomy — every external dataset/model the
  // research prescribes. The `status` field says whether Crafty GIS
  // already pulls it (BUILT) or exposes it as a live capability.
  const DATA_PULLS = {
    sentinel2:   { label: 'Sentinel-2 L2A (10 m, cloud-free median composite)',      status: 'built' },
    sentinel1:   { label: 'Sentinel-1 SAR (C-band VV — soil moisture)',              status: 'built' },
    landsat:     { label: 'Landsat 8/9 Collection-2 (thermal LST → CWSI)',           status: 'built' },
    srtm:        { label: 'SRTM DEM 30 m (elevation / slope / aspect / hillshade)',  status: 'built' },
    chirps:      { label: 'CHIRPS rainfall (0.05° daily → field + regional sums)',   status: 'built' },
    meteo:       { label: 'Open-Meteo (temp, humidity, wind, ET₀, soil probe)',      status: 'built' },
    irrigation:  { label: 'Automated irrigation scheduler (FAO-56 ET₀ × Kc, per zone)', status: 'built' },
    mlRf:        { label: 'Random Forest stress classifier + merged advisory',       status: 'built' },
    mlYield:     { label: 'Server-side Random Forest yield regression (per zone)',   status: 'built' },
    groundTruth: { label: 'Ground-truth label store (farmer-verified retraining)',   status: 'built' },
    trends:      { label: 'Per-zone time-windowed NDVI/NDWI trend slopes',           status: 'built' },
    pdfReport:   { label: 'In-browser PDF report generator (jsPDF)',                 status: 'built' },
    iotFusion:   { label: 'IoT sensor fusion (soil moisture, temp, humidity, pH)',   status: 'built' },
    diseaseGIS:  { label: 'Disease outbreak GIS (geotag + heatmap + temporal)',      status: 'built' },
    diseaseEWS:  { label: 'Weather-based disease early warning (blight/rust risk)',  status: 'built' },
    mgmtZones:   { label: 'Site-specific management zones (geostatistical clusters)', status: 'built' },
    zoneYield:   { label: 'Per-zone yield forecast (crop coefficients × zone vectors)', status: 'built' },
    yieldHistory: { label: 'Yield history timeline (per-zone snapshots + trend sparkline)', status: 'built' },
    yieldLoss:   { label: 'Yield-loss heatmap (yield gap × crop price per zone)', status: 'built' },
    cnnVision:   { label: 'CNN / vision disease detection (Ollama LLaVA photo)',     status: 'built' },
    sarPulse:    { label: 'Polarimetric SAR (full PolSAR decomposition)',            status: 'roadmap' },
    gediBiomass: { label: 'GEDI biomass / carbon — real L4A AGBD + L2A RH98 LiDAR footprints (EE)', status: 'built' },
    cropModel:   { label: 'Crop growth model (DSSAT-style phenology)',               status: 'roadmap' },
    digitalTwin: { label: 'Digital-twin farm simulation',                            status: 'roadmap' },
    hyperspec:   { label: 'Hyperspectral (HyspIRI / PRISMA) narrow-band indices',    status: 'roadmap' }
  };

  const PAPERS = [
    {
      id: 's44163',
      file: 's44163-025-00811-x.pdf',
      title: 'Deep learning and GIS integration for plant disease diagnosis and management',
      authors: 'Maged, Elsayed, Mahmoud & Thabet',
      year: 2026,
      journal: 'Discover Artificial Intelligence 6:344',
      focus: 'Disease diagnosis + spatial outbreak monitoring',
      methodology: [
        'Train CNN classifiers (DenseNet169, MobileNetV2, Custom-CNN) on PlantVillage tomato + potato subset (18,163 RGB images, 13 classes) with a 70/15/15 split.',
        'Transfer learning (ImageNet weights) accelerates convergence; Custom-CNN from scratch underperforms (82.6%).',
        'Best model (DenseNet169, 98.24%) is fused with a GIS module: every prediction is geotagged.',
        'Outbreaks are visualized as crop-specific layers, heatmaps and temporal tracking to monitor disease progression.',
        'A spread-risk radius is modelled from temperature deviation (ΔT), relative humidity (H) and wind speed (W), with a base radius of 5 km.',
        'Grad-CAM heatmaps make model decisions interpretable; bilingual (Arabic/English) web UI for field use.'
      ],
      models: [
        { name: 'DenseNet169 (transfer)', accuracy: '98.24%' },
        { name: 'MobileNetV2 (transfer)', accuracy: '94.66%' },
        { name: 'Custom-CNN (from scratch)', accuracy: '82.60%' }
      ],
      dataPulls: ['cnnVision', 'diseaseGIS', 'meteo', 'diseaseEWS'],
      requiredPulls: ['PlantVillage image dataset', 'Weather telemetry (temp, humidity, wind)', 'Geographic coordinates per diagnosis', 'Grad-CAM interpretability layer'],
      craftyBuild: 'Photo-based disease detection (Ollama LLaVA) geotags detections onto the map; Disease Outbreak card adds heatmaps, a temporal timeline and a weather-driven spread-risk model.'
    },
    {
      id: 'geo-intelligent',
      file: 'Geo-Intelligent+Agriculture....pdf',
      title: 'Geo-Intelligent Agriculture: Integrating GIS, Remote Sensing, and IoT for Real-Time Soil and Crop Health Monitoring and Predictive Farm Management',
      authors: 'Wassay, Khalid, Ashraf, Riaz, Khan & Maqbool',
      year: 2025,
      journal: 'Agricultural Research Reports 3(2)',
      focus: 'GIS + RS + IoT convergence (the Geo-Intelligence Triad)',
      methodology: [
        'Fuse three sensing pillars — GIS (spatial analytics), Remote Sensing (UAV + satellite spectral/thermal), IoT (in-situ soil moisture, temperature, air) — into one decision-support system.',
        'Delineate Site-Specific Management Zones (SSMZs) via geostatistical interpolation (kriging, inverse distance weighting) of soil and crop variability.',
        'UAV multispectral + thermal imagery provides continuous crop-vigour and stress dynamics; satellites give synoptic coverage.',
        'IoT sensor networks create real-time feedback loops for adaptive irrigation, nutrient optimization and pest management.',
        'Cloud + edge computing turns raw spatial data into a self-learning agroecosystem; explainable AI and digital-twin simulations are the stated future direction.'
      ],
      models: [
        { name: 'Geostatistical interpolation (kriging / IDW)', accuracy: '—' },
        { name: 'Predictive diagnostics (general ML)', accuracy: '—' }
      ],
      dataPulls: ['sentinel2', 'landsat', 'iotFusion', 'mgmtZones', 'srtm', 'meteo'],
      requiredPulls: ['UAV/aircraft multispectral + thermal', 'IoT soil-moisture/temp/humidity nodes', 'Soil + yield variability surveys', 'Geostatistical clustering engine'],
      craftyBuild: 'Management Zones card clusters the GEE zone grid into site-specific zones; IoT Sensor Fusion combines in-field readings with satellite NDVI; the Irrigation Scheduler automates water management per zone from ET₀ × Kc, CHIRPS rainfall and soil-moisture fusion (FAO-56) — the paper\'s adaptive irrigation feedback loop.'
    },
    {
      id: '09119071',
      file: '09119071.pdf',
      title: 'A Multi-Modal Approach for Crop Health Mapping Using Low Altitude Remote Sensing, Internet of Things (IoT) and Machine Learning',
      authors: 'Shafi, Mumtaz, Iqbal, Zaidi, Zaidi, Hussain & Mahmood',
      year: 2020,
      journal: 'IEEE Access 8',
      focus: 'IoT + drone multispectral + ML health maps',
      methodology: [
        'IoT nodes stream environmental parameters (temp, humidity, soil moisture) in real time at fine temporal fidelity.',
        'Drone multispectral imagery computes NDVI at high spatial resolution — but NDVI alone is misleading across growth stages.',
        'Variable-length time series from both modalities are converted to a fixed-size representation (feature engineering).',
        'Several ML/DL algorithms were compared; a deep neural network with two hidden layers won (98.4%).',
        'Outputs are crop health maps localizing stressed areas, validated via ground surveys and agronomy experts.'
      ],
      models: [
        { name: 'Deep NN (2 hidden layers)', accuracy: '98.4%' },
        { name: 'Classic ML baselines (compared)', accuracy: 'lower' }
      ],
      dataPulls: ['iotFusion', 'sentinel2', 'mlRf'],
      requiredPulls: ['IoT sensor network (soil moisture, temp, humidity)', 'Multispectral imagery (drone or satellite)', 'Growth-stage calibration tables'],
      craftyBuild: 'IoT Sensor Fusion card reproduces the multi-modal idea: in-field readings are fused with the satellite NDVI composite and growth-stage peak to score crop health per zone.'
    },
    {
      id: 'agronomy-14-01975',
      file: 'agronomy-14-01975.pdf',
      title: 'Integration of Remote Sensing and Machine Learning for Precision Agriculture: A Comprehensive Perspective on Applications',
      authors: 'Wang, Wang, Li & Qi',
      year: 2024,
      journal: 'Agronomy 14, 1975',
      focus: 'Systematic review (330+ papers) of RS + ML applications',
      methodology: [
        'Systematic literature review across Web of Science, Scopus, Google Scholar and PubMed over the last 10 years.',
        'Applications: agricultural monitoring, disease & pest detection, land-use/land-cover, yield prediction, LAI monitoring.',
        'Data mix: hyperspectral most used (>30%), UAV rising (~24%), plus Landsat-8, Sentinel-2, MODIS.',
        'Model mix: SVM most used (~20%), Random Forest ~18%, plus DT, CNN, RNN/LSTM, XGBoost, SVR, ANN.',
        'Highlights: Sentinel-2 10 m NDVI enables fast accurate crop monitoring; XGBoost/LightGBM/CatBoost hit 90%+ on soil classification; CNNs reach 98.5% on disease classification (F1 ≈ 0.99).'
      ],
      models: [
        { name: 'SVM (most used)', accuracy: '—' },
        { name: 'Random Forest', accuracy: '~18% of studies' },
        { name: 'CNN (disease detection)', accuracy: '98.5% / F1 0.989' },
        { name: 'XGBoost / LightGBM / CatBoost (soil)', accuracy: '90%+' },
        { name: 'LSTM / RNN (time series)', accuracy: '—' }
      ],
      dataPulls: ['sentinel2', 'landsat', 'mlRf', 'trends', 'cnnVision', 'zoneYield', 'yieldHistory'],
      requiredPulls: ['Hyperspectral + UAV imagery (optional)', 'Multispectral time series', 'Soil sample spectra for classification'],
      craftyBuild: 'The app already ships the review\'s core stack — Random Forest stress model, Sentinel-2/Landsat composites, per-zone trends and CNN-style photo diagnosis — plus CHIRPS rainfall, SAR soil moisture, and a per-zone Yield Forecast card that applies crop-specific coefficients to each management zone\'s feature vector (NDVI · NDWI · slope · trend). A yield-history timeline snapshots every zone\'s forecast per analysis and renders a trend sparkline, and a Yield-Loss Heatmap prices the per-zone yield gap (potential − predicted × area × crop price) so farmers see exactly where money is leaving the field.'
    },
    {
      id: 'remotesensing-13-02486',
      file: 'remotesensing-13-02486.pdf',
      title: 'Computer Vision, IoT and Data Fusion for Crop Disease Detection Using Machine Learning: A Survey and Ongoing Research',
      authors: 'Ouhami, Hafiane, Es-Saady, El Hajji & Canals',
      year: 2021,
      journal: 'Remote Sensing 13, 2486',
      focus: 'Disease detection via IoT / ground / UAV / satellite + data fusion',
      methodology: [
        'Surveys ML/DL for plant disease across four acquisition modalities: IoT sensing, ground imaging, UAV imaging, satellite imaging.',
        'Advocates intelligent data fusion from heterogeneous sources to improve plant-health prediction.',
        'Disease surveillance captures data from soil, plant cover, remote sensing and ground equipment simultaneously.',
        'Reported baselines: ResNet34 99.67%, DenseNet161 (transfer) 95.65%, Random Forest disease discrimination 89.3%, AdaBoost 100% (single dataset).'
      ],
      models: [
        { name: 'ResNet34', accuracy: '99.67%' },
        { name: 'DenseNet161 (transfer)', accuracy: '95.65%' },
        { name: 'Random Forest (disease discrimination)', accuracy: '89.3%' }
      ],
      dataPulls: ['cnnVision', 'iotFusion', 'diseaseGIS', 'sentinel2'],
      requiredPulls: ['Multi-modality sensor data', 'Fusion engine for heterogeneous sources', 'Disease ground-truth'],
      craftyBuild: 'Disease Outbreak card fuses photo-diagnosis (vision), satellite stress (RF) and weather telemetry into a surveillance layer; the GEDI Biomass & Carbon card pulls real LiDAR footprints from Earth Engine (GEDI04_A L4A AGBD biomass density + GEDI02_A L2A RH98 canopy height, quality-masked) per management zone, with allometric fallback where footprints are sparse and carbon = 0.47×biomass / CO₂e = 3.67×C.'
    },
    {
      id: 's42360-021-00334-2',
      file: 's42360-021-00334-2.pdf',
      title: 'Precision agriculture and geospatial techniques for sustainable disease control',
      authors: 'Roberts, Short, Sill, Lakshman, Hu & Buser (USDA-ARS / ESRI)',
      year: 2021,
      journal: 'Indian Phytopathology 74, 287–305',
      focus: 'Geoinformatics for sustainable, reduced-pesticide disease control',
      methodology: [
        'Leverages geoinformatics + cloud big-data to monitor and manage pesticides and biologicals (cover crops, beneficial microbes).',
        'Geospatial tools aid the farmer in managing cropping systems and disease strategies that are sustainable but increasingly complex.',
        'Soil sensors + soil-moisture monitoring feed site-specific decisions; pest outbreaks are mapped spatially.',
        'Advanced geoinformatics accelerate germplasm improvement (pathogen / abiotic-stress tolerant varieties).'
      ],
      models: [],
      dataPulls: ['sentinel2', 'iotFusion', 'diseaseGIS', 'groundTruth'],
      requiredPulls: ['Soil sensor network', 'Pest/disease spatial records', 'Crop & germplasm databases'],
      craftyBuild: 'Ground-Truth labels, IoT sensor fusion and the disease outbreak layer operationalize this paper\'s "monitor and manage spatially" thesis.'
    },
    {
      id: '10994795',
      file: '10994795.pdf',
      title: 'When Machine Learning Meets Geospatial Data: A Comprehensive GeoAI Review',
      authors: 'Boutayeb, Lahsen-Cherif & El Khadimi',
      year: 2025,
      journal: 'IEEE JSTARS 18, 13135',
      focus: 'GeoAI — ML applied to geospatial data at scale',
      methodology: [
        'Census-style review of GeoAI: how ML/DL (LR, SVM, RF, CNN, LSTM, autoencoders) is applied to big geodata.',
        'Precision-agriculture applications: crop segmentation (FPN3D), yield prediction, precision irrigation, land classification.',
        'Datasets come from satellites, drones and GPS receivers; large-scale distributed infrastructure (e.g. Tectonic) supports training.',
        'Frames GeoAI as the synthesis of GIS + ML + big geodata for actionable geospatial intelligence.'
      ],
      models: [
        { name: 'FPN3D + CNN aggregator (crop segmentation)', accuracy: '—' },
        { name: 'Yield prediction models', accuracy: '—' },
        { name: 'LSTM (temporal)', accuracy: '—' }
      ],
      dataPulls: ['sentinel2', 'mlRf', 'trends', 'pdfReport'],
      requiredPulls: ['High-resolution imagery for segmentation', 'Yield ground truth', 'Distributed compute (optional)'],
      craftyBuild: 'The app\'s Yield Projection + time-series trends + Random Forest pipeline is a working subset of the GeoAI stack this review describes.'
    },
    {
      id: 'geospatial-sustainable',
      file: 'Geospatial_Intelligence_for_Sustainable.pdf',
      title: 'Geospatial Intelligence for Sustainable Agriculture: Integrating GIS and Image Processing',
      authors: 'Borah, Kalita, Konwar, Bora & Sethi',
      year: 2025,
      journal: 'Journal of Scientific Research and Reports 31(12), 441–460',
      focus: 'GIS platform + image processing fusion for smart farming',
      methodology: [
        'GIS provides the platform to manage, analyse and visualise georeferenced data; image processing quantitatively extracts crop, soil and environmental information.',
        'Fusion drives crop monitoring, vegetation-index mapping, soil-variability analysis and crop-anomaly detection.',
        'AI/ML automates feature extraction, classification and prediction in complex geospatial datasets.',
        'Frames the future as data-empowered, tech-enabled farming for developing agricultural economies.'
      ],
      models: [],
      dataPulls: ['sentinel2', 'srtm', 'mgmtZones', 'mlRf'],
      requiredPulls: ['Multisource imagery (satellite/UAV/proximal)', 'Soil variability surveys', 'ML feature-extraction stack'],
      craftyBuild: 'Map layers, vegetation-index mapping, terrain/soil cards and the Management Zones card mirror this GIS+image-processing fusion.'
    },
    {
      id: '8-cba',
      file: '8-CBA2020-13MY-Thakuri.pdf',
      title: 'Integrating geospatial technologies in climate-smart agriculture planning and management: A review focused on South Asia',
      authors: 'Thakuri, Adhikari, Tashi, Acharya, Chauhan, Maharjan, Chaudhary, Aryal & Shrestha',
      year: 2025,
      journal: 'APN Science Bulletin 15(1), 98–122',
      focus: 'Climate-smart agriculture (CSA) + early-warning in South Asia',
      methodology: [
        'Reviews GIS, RS and GNSS for climate-risk assessment, crop modelling and precision agriculture in South Asia.',
        'Spatial Data Infrastructures (SDIs) enable information exchange and preventive/emergency planning.',
        'Farmers engage through Volunteered Geographic Information (VGI) applications.',
        'Real-time data monitoring and Early Warning Systems (EWSs) manage extreme weather and adapt to climate change.',
        'Carbon monitoring and climate-resilient agriculture (CRA) are explicit mitigation outputs.'
      ],
      models: [],
      dataPulls: ['chirps', 'meteo', 'diseaseEWS', 'pdfReport'],
      requiredPulls: ['Rainfall + temperature climate records', 'GNSS field locations', 'VGI reporting channel'],
      craftyBuild: 'CHIRPS rainfall + Open-Meteo telemetry feed the Disease Early-Warning card and the climate blocks of the Professional Analysis — a lightweight EWS for South Asian fields.'
    },
    {
      id: '1-s2.0-potato',
      file: '1-s2.0-S2666154326001031-main.pdf',
      title: 'Crop disease surveillance through integration of machine and deep learning in the face of climate change',
      authors: 'Kaur, Randhawa, Farooque, Ali, Singh, Al-Mughrabi, Bell & Singh',
      year: 2026,
      journal: 'Journal of Agriculture and Food Research 26, 102733',
      focus: 'Hybrid ANN-RF potato disease (Early Blight / Gray Mold) forecasting',
      methodology: [
        'Novel potato dataset: 5,630 spore-detection instances across PEI, New Brunswick and Maine.',
        'Hybrid Artificial Neural Network — Random Forest (ANN-RF) binary classifier: presence of Early Blight or Gray Mold spores = diseased.',
        'Weather-based forecasting: 10 years of temperature, rainfall and wind-speed history feed the model (R² = 0.80 for late-blight regression models).',
        'A 10-year weather + spore pipeline compiles field data (Airspore) into fully numeric features for classification.'
      ],
      models: [
        { name: 'Hybrid ANN-RF (spore presence)', accuracy: '91% PEI · 86.5% NB · 87.5% combined' },
        { name: 'Stepwise regression (late blight)', accuracy: 'R² = 0.80' }
      ],
      dataPulls: ['meteo', 'chirps', 'diseaseEWS', 'mlRf'],
      requiredPulls: ['Multi-year weather history (temp, rain, wind)', 'Spore / disease presence records', 'Hybrid ANN-RF classifier'],
      craftyBuild: 'Disease Early-Warning card computes blight/rust risk from temperature + humidity + CHIRPS rainfall using this paper\'s risk rules; the RF stress model is the hybrid-model analogue.'
    },
    {
      id: 'pone.0324347',
      file: 'pone.0324347.pdf',
      title: 'An intelligent framework for crop health surveillance and disease management',
      authors: 'Ayid, Fouad, Kaddes & El-Hoseny',
      year: 2025,
      journal: 'PLOS ONE 20(5): e0324347',
      focus: 'DL + cloud + embedded IoT crop-health framework',
      methodology: [
        'Deep learning (CNN, MobileNet-1/2, ResNet-50, ResNet-50+InceptionV3) classifies plant diseases from the New Plant Diseases Kaggle dataset.',
        'Embedded IoT (Node-MCU with DHT11, moisture, LDR, water-pump, LED strip) continuously monitors soil moisture, temperature, humidity and water levels.',
        'Sensor + imagery data stream to the cloud for live monitoring, alerts and automated irrigation control.',
        'The framework recommends disease-management strategies including crop rotation and targeted treatment.'
      ],
      models: [
        { name: 'ResNet-50 + InceptionV3 ensemble', accuracy: 'top performer' },
        { name: 'MobileNet-1 / MobileNet-2', accuracy: 'lightweight' }
      ],
      dataPulls: ['cnnVision', 'iotFusion', 'diseaseEWS', 'diseaseGIS'],
      requiredPulls: ['IoT sensor array (DHT11, moisture, pump)', 'Disease image dataset', 'Cloud telemetry store'],
      craftyBuild: 'IoT Sensor Fusion + Disease cards implement the same sensing + diagnosis + advisory loop: enter DHT-style readings, add a photo, and get a fused health assessment with treatment advice.'
    }
  ];

  function papers() {
    return PAPERS;
  }

  function pulls() {
    return DATA_PULLS;
  }

  return { papers, pulls };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = FH_RESEARCH;
}
