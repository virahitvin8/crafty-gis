import sys
import os
# Append project root to sys.path to allow absolute imports when running streamlit
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import streamlit as st
import folium
from streamlit_folium import st_folium
import shutil
import json
import numpy as np
import rasterio
import matplotlib.pyplot as plt
from datetime import datetime

# Core & Service Imports
from ceresflow.core.geocoding import geocode_address, get_bbox_from_point, get_utm_zone
from ceresflow.services.satellite_source import search_sentinel_scenes, download_cropped_band, generate_simulated_bands
from ceresflow.services.raster_math import (
    calculate_ndvi, calculate_ndwi, calculate_carbon_index,
    calculate_soil_composition, calculate_lst_proxy, calculate_canopy_cover
)
from ceresflow.services.dem_processor import calculate_slope, extract_contours, map_drainage_pathways
from ceresflow.core.agronomist import generate_agronomy_advice
from ceresflow.services.pdf_builder import build_pdf_report

# Page configuration
st.set_page_config(
    page_title="CeresFlow — Universal GIS Engine",
    page_icon="🌾",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Initialize Session State variables to keep data persistent across renders
if "proc_complete" not in st.session_state:
    st.session_state.proc_complete = False
    st.session_state.bbox = None
    st.session_state.utm_info = None
    st.session_state.agronomy_data = None
    st.session_state.pdf_path = None
    st.session_state.location_name = ""
    st.session_state.paths = {}
    st.session_state.calc_ndvi = True
    st.session_state.calc_moisture = True
    st.session_state.calc_carbon = True
    st.session_state.calc_soil = True
    st.session_state.calc_thermal = True
    st.session_state.calc_canopy = True
    st.session_state.calc_dem = True
    st.session_state.calc_drainage = True

# Custom CSS for Premium Design & Glassmorphism
st.markdown("""
<style>
    /* Styling headers and custom cards */
    .header-container {
        background: linear-gradient(135deg, #12281e 0%, #060e0a 100%);
        padding: 1.8rem;
        border-radius: 12px;
        border: 1px solid #1e3f31;
        margin-bottom: 2rem;
        box-shadow: 0 4px 30px rgba(0, 0, 0, 0.4);
    }
    .header-title {
        color: #76e1a9;
        font-family: 'Outfit', sans-serif;
        font-size: 2.4rem;
        font-weight: 700;
        margin: 0;
    }
    .header-subtitle {
        color: #a4c9b7;
        font-size: 1.05rem;
        margin-top: 0.4rem;
        font-weight: 300;
    }
    .card {
        background: rgba(18, 30, 24, 0.6);
        border: 1px solid rgba(46, 98, 76, 0.3);
        border-radius: 8px;
        padding: 1.2rem;
        margin-bottom: 1rem;
    }
</style>
""", unsafe_allow_html=True)

# Main Header
st.markdown("""
<div class="header-container">
    <h1 class="header-title">🌾 CeresFlow</h1>
    <div class="header-subtitle">Universal Open-Source GIS & Remote Sensing Automation Engine</div>
</div>
""", unsafe_allow_html=True)

# Sidebar Configuration
with st.sidebar:
    st.markdown("### ⚙️ Control Panel")
    
    # 🤖 AI Query Search Input
    ai_query = st.text_input(
        "🤖 AI Prompt Assistant", 
        value="", 
        placeholder="e.g., Check soil moisture and erosion risk", 
        help="Describe what analysis you want to perform. AI will automatically select the matching modules."
    )
    
    input_mode = st.radio("Location Input Method", ["Place Name", "Coordinates"])
    
    if input_mode == "Place Name":
        location_input = st.text_input("Enter Address or Region", value="Cairo, Egypt", placeholder="e.g. Cairo, Egypt")
    else:
        col1, col2 = st.columns(2)
        with col1:
            lat = st.number_input("Latitude", value=30.0444, format="%.6f")
        with col2:
            lon = st.number_input("Longitude", value=31.2357, format="%.6f")
        location_input = f"{lat}, {lon}"
            
    buffer_km = st.slider("Analysis Radius (km) [Buffer Zone]", min_value=1, max_value=15, value=5)
    
    # Parse intent if query is entered
    calc_ndvi_val = True
    calc_moisture_val = True
    calc_carbon_val = True
    calc_soil_val = True
    calc_thermal_val = True
    calc_canopy_val = True
    calc_dem_val = True
    calc_drainage_val = True
    
    if ai_query:
        q = ai_query.lower()
        c_ndvi = "health" in q or "vegetation" in q or "crop" in q or "ndvi" in q
        c_moisture = "moisture" in q or "water" in q or "wetness" in q or "dryness" in q or "ndwi" in q or "rain" in q
        c_carbon = "carbon" in q or "biomass" in q or "organic" in q
        c_dem = "slope" in q or "contour" in q or "elevation" in q or "topo" in q or "terrain" in q or "erosion" in q or "dem" in q
        c_soil = "soil" in q or "clay" in q or "sand" in q or "composition" in q or "soci" in q or "mineral" in q
        c_thermal = "temp" in q or "heat" in q or "thermal" in q or "lst" in q or "warm" in q or "hot" in q
        c_canopy = "canopy" in q or "spacing" in q or "row" in q or "cover" in q or "ccf" in q
        
        if any([c_ndvi, c_moisture, c_carbon, c_dem, c_soil, c_thermal, c_canopy]):
            calc_ndvi_val = c_ndvi
            calc_moisture_val = c_moisture
            calc_carbon_val = c_carbon
            calc_soil_val = c_soil
            calc_thermal_val = c_thermal
            calc_canopy_val = c_canopy
            calc_dem_val = c_dem
            calc_drainage_val = c_dem
            st.success("🤖 AI applied custom module selections.")
            
    st.markdown("---")
    st.markdown("### 🔍 Select Analysis Modules")
    calc_ndvi = st.checkbox("Crop Health Index (NDVI)", value=calc_ndvi_val)
    calc_moisture = st.checkbox("Soil Moisture Index (NDWI)", value=calc_moisture_val)
    calc_carbon = st.checkbox("Biomass Carbon Index", value=calc_carbon_val)
    calc_soil = st.checkbox("Soil Composition (SOCI)", value=calc_soil_val)
    calc_thermal = st.checkbox("Land Surface Temp (LST)", value=calc_thermal_val)
    calc_canopy = st.checkbox("Canopy Cover & Spacing (CCF)", value=calc_canopy_val)
    calc_dem = st.checkbox("Slope Gradient & Contours", value=calc_dem_val)
    calc_drainage = st.checkbox("Watershed Drainage Streams", value=calc_drainage_val)
    
    st.markdown("---")
    run_btn = st.button("🚀 Run Automation Pipeline", use_container_width=True)

# Function to translate a raster to a color-mapped PNG overlay for Folium
def raster_to_png_overlay(raster_path, colormap_name="RdYlGn", vmin=None, vmax=None):
    with rasterio.open(raster_path) as src:
        data = src.read(1).astype(np.float32)
        # Handle nodata/nans
        data[data == src.nodata] = np.nan
        
        # Determine scaling limits
        if vmin is None:
            vmin = np.nanmin(data)
        if vmax is None:
            vmax = np.nanmax(data)
            
        # Normalize to [0, 1]
        data_norm = (data - vmin) / (vmax - vmin)
        data_norm = np.clip(data_norm, 0.0, 1.0)
        
        # Apply colormap
        cmap = plt.get_cmap(colormap_name)
        rgba_img = cmap(data_norm)
        
        # Set alpha to 0 for nan values
        rgba_img[np.isnan(data), 3] = 0.0
        
        # Save as temporary PNG
        overlay_path = raster_path.replace(".tif", "_overlay.png")
        plt.imsave(overlay_path, rgba_img)
        return overlay_path

# Execute Pipeline Trigger
if run_btn:
    st.session_state.proc_complete = False
    
    # 1. Geocoding (Ears)
    with st.spinner("Resolving coordinates and projected boundary box..."):
        coords = geocode_address(location_input)
        if not coords:
            st.error("Could not geocode input location. Please verify format.")
            st.stop()
            
        lat_c, lon_c = coords
        bbox = get_bbox_from_point(lat_c, lon_c, buffer_km)
        utm_info = get_utm_zone(lat_c, lon_c)
        st.session_state.bbox = bbox
        st.session_state.utm_info = utm_info
        st.session_state.location_name = location_input
        
    # Create working directory
    working_dir = "./data_run"
    if os.path.exists(working_dir):
        shutil.rmtree(working_dir)
    os.makedirs(working_dir, exist_ok=True)
    
    # 2. Query and Download Satellite Data (Eyes)
    with st.spinner("Querying Sentinel-2 & DEM catalogs..."):
        scene = search_sentinel_scenes(bbox)
        download_success = False
        
        paths = {}
        if scene:
            st.info(f"Sentinel-2 scene found. Downloading bands via windowed COGs...")
            # Attempt windowed band download
            try:
                assets = scene["assets"]
                # Support standard band identifiers and friendly names (Element84 search schema)
                b04_asset = assets.get("B04") or assets.get("red")
                b08_asset = assets.get("B08") or assets.get("nir")
                b03_asset = assets.get("B03") or assets.get("green")
                
                if b04_asset and b08_asset and b03_asset:
                    paths["B04"] = download_cropped_band(b04_asset["href"], bbox, f"{working_dir}/B04.tif")
                    paths["B08"] = download_cropped_band(b08_asset["href"], bbox, f"{working_dir}/B08.tif")
                    paths["B03"] = download_cropped_band(b03_asset["href"], bbox, f"{working_dir}/B03.tif")
                    
                    # Fetch global elevation data (DEM)
                    dem_url = "https://copernicus-dem-30m.s3.amazonaws.com/copernicus-dem-30m.tif"
                    paths["DEM"] = download_cropped_band(dem_url, bbox, f"{working_dir}/DEM.tif")
                    
                    # If DEM is unreachable, generate simulated terrain but retain real satellite bands
                    if not paths.get("DEM") or not os.path.exists(paths["DEM"]):
                        st.warning("DEM elevation server offline. Generating synthetic contours matching area coordinate zone.")
                        sim_paths = generate_simulated_bands(bbox, data_dir=working_dir)
                        paths["DEM"] = sim_paths["DEM"]
                        
                    if paths.get("B04") and paths.get("B08") and paths.get("B03"):
                        download_success = True
                else:
                    st.warning("Found scene is missing required Red, Green, or NIR assets.")
            except Exception as e:
                st.warning(f"Remote download failed: {e}. Falling back to simulation mode.")
                
        if not download_success:
            st.warning("Could not download satellite imagery. Initializing local high-resolution simulation fallback.")
            paths = generate_simulated_bands(bbox, data_dir=working_dir)
            
        st.session_state.paths = paths

    # Store checkbox configurations in session state for cross-rerun map rendering
    st.session_state.calc_ndvi = calc_ndvi
    st.session_state.calc_moisture = calc_moisture
    st.session_state.calc_carbon = calc_carbon
    st.session_state.calc_soil = calc_soil
    st.session_state.calc_thermal = calc_thermal
    st.session_state.calc_canopy = calc_canopy
    st.session_state.calc_dem = calc_dem
    st.session_state.calc_drainage = calc_drainage

    # 3. Process Spatial Calculators (Brain)
    with st.spinner("Running calculations and contours extraction..."):
        ndvi_path = f"{working_dir}/ndvi.tif"
        ndwi_path = f"{working_dir}/ndwi.tif"
        carbon_path = f"{working_dir}/carbon.tif"
        slope_path = f"{working_dir}/slope.tif"
        soil_path = f"{working_dir}/soil.tif"
        lst_path = f"{working_dir}/lst.tif"
        ccf_path = f"{working_dir}/ccf.tif"
        streams_path = f"{working_dir}/streams.geojson"
        
        # Calculate indices based on selections
        calculate_ndvi(paths["B04"], paths["B08"], ndvi_path)
        raster_to_png_overlay(ndvi_path, "RdYlGn", vmin=0, vmax=0.9)
        
        if calc_moisture:
            calculate_ndwi(paths["B03"], paths["B08"], ndwi_path)
            raster_to_png_overlay(ndwi_path, "YlGnBu", vmin=-0.5, vmax=0.5)
            
        if calc_carbon:
            calculate_carbon_index(ndvi_path, carbon_path)
            raster_to_png_overlay(carbon_path, "Greens", vmin=0, vmax=150)
            
        if calc_soil:
            calculate_soil_composition(paths["B04"], paths["B03"], soil_path)
            raster_to_png_overlay(soil_path, "YlOrBr", vmin=-0.5, vmax=0.5)
            
        if calc_thermal:
            calculate_lst_proxy(ndvi_path, paths["DEM"], lst_path)
            raster_to_png_overlay(lst_path, "coolwarm", vmin=15, vmax=45)
            
        if calc_canopy:
            calculate_canopy_cover(ndvi_path, ccf_path)
            raster_to_png_overlay(ccf_path, "Greens", vmin=0, vmax=1.0)
            
        if calc_dem or calc_drainage:
            calculate_slope(paths["DEM"], slope_path)
            raster_to_png_overlay(slope_path, "inferno", vmin=0, vmax=30)
            extract_contours(paths["DEM"], interval_meters=10.0)
            map_drainage_pathways(paths["DEM"], streams_path)
        
    # 4. Generate AI Recommendations & PDF Report (Mouth/Immune)
    with st.spinner("Formulating agronomy advice and compiling PDF report booklet..."):
        agronomy_data = generate_agronomy_advice(
            ndvi_path=ndvi_path,
            ndwi_path=ndwi_path,
            slope_path=slope_path,
            soil_path=soil_path if calc_soil else None,
            lst_path=lst_path if calc_thermal else None,
            ccf_path=ccf_path if calc_canopy else None
        )
        st.session_state.agronomy_data = agronomy_data
        
        pdf_path = f"{working_dir}/CeresFlow_Report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        build_pdf_report(
            location_name=location_input,
            bbox_info=bbox,
            utm_info=utm_info,
            agronomy_data=agronomy_data,
            output_path=pdf_path
        )
        st.session_state.pdf_path = pdf_path
        st.session_state.proc_complete = True
        st.success("✅ Analysis Pipeline execution completed successfully.")

# --- RENDER DASHBOARD INTERACTIVE VIEW ---
if st.session_state.proc_complete:
    bbox = st.session_state.bbox
    utm_info = st.session_state.utm_info
    agronomy_data = st.session_state.agronomy_data
    paths = st.session_state.paths
    
    # 🗂️ Professional Layout Tabs
    tab_analysis, tab_gis = st.tabs(["📊 Interactive Analysis Maps", "🌐 Professional QGIS & GIS Integration"])
    
    with tab_analysis:
        col_left, col_right = st.columns(2)
        
        # Left Column: Raw Basemap View
        with col_left:
            st.markdown("### 🗺️ Target Location Map (Before)")
            m_before = folium.Map(
                location=[bbox["center_lat"], bbox["center_lon"]],
                zoom_start=14,
                tiles="cartodbpositron"
            )
            
            # Add high-resolution satellite imagery basemap layer
            folium.TileLayer(
                tiles='https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                attr='Esri Satellite',
                name='Esri Satellite'
            ).add_to(m_before)
            
            # Outline bounding box bounds
            bounds_geom = [
                [bbox["min_lat"], bbox["min_lon"]],
                [bbox["min_lat"], bbox["max_lon"]],
                [bbox["max_lat"], bbox["max_lon"]],
                [bbox["max_lat"], bbox["min_lon"]],
                [bbox["min_lat"], bbox["min_lon"]]
            ]
            folium.PolyLine(bounds_geom, color="red", weight=2.5, opacity=0.8, tooltip="Analysis Area Bounds").add_to(m_before)
            
            st_folium(m_before, height=450, use_container_width=True, key="rendered_map_before")

        # Right Column: Index Overlay Map
        with col_right:
            st.markdown("### 📊 Calculated Spatial Analysis (After)")
            
            # Build available list of layer overlays
            options = ["Crop Health (NDVI)"]
            if st.session_state.calc_moisture:
                options.append("Soil Moisture (NDWI)")
            if st.session_state.calc_carbon:
                options.append("Biomass Carbon Index")
            if st.session_state.calc_soil:
                options.append("Soil Composition (SOCI)")
            if st.session_state.calc_thermal:
                options.append("Land Surface Temp (LST)")
            if st.session_state.calc_canopy:
                options.append("Canopy Cover (CCF)")
            if st.session_state.calc_dem:
                options.append("Slope Gradient (DEM)")
                options.append("Elevation Contours")
            if st.session_state.calc_drainage:
                options.append("Drainage Stream channels")
                
            index_layer = st.selectbox("Select Map Analysis Layer", options)
            
            m_after = folium.Map(
                location=[bbox["center_lat"], bbox["center_lon"]],
                zoom_start=14,
                tiles="cartodbpositron"
            )
            
            # Set bounds box for overlays
            image_bounds = [[bbox["min_lat"], bbox["min_lon"]], [bbox["max_lat"], bbox["max_lon"]]]
            
            if index_layer == "Crop Health (NDVI)":
                overlay_file = "./data_run/ndvi_overlay.png"
                if os.path.exists(overlay_file):
                    folium.raster_layers.ImageOverlay(
                        image=overlay_file,
                        bounds=image_bounds,
                        opacity=0.6,
                        name="NDVI Crop Health"
                    ).add_to(m_after)
            elif index_layer == "Soil Moisture (NDWI)":
                overlay_file = "./data_run/ndwi_overlay.png"
                if os.path.exists(overlay_file):
                    folium.raster_layers.ImageOverlay(
                        image=overlay_file,
                        bounds=image_bounds,
                        opacity=0.6,
                        name="NDWI Soil Moisture"
                    ).add_to(m_after)
            elif index_layer == "Biomass Carbon Index":
                overlay_file = "./data_run/carbon_overlay.png"
                if os.path.exists(overlay_file):
                    folium.raster_layers.ImageOverlay(
                        image=overlay_file,
                        bounds=image_bounds,
                        opacity=0.6,
                        name="Biomass Carbon"
                    ).add_to(m_after)
            elif index_layer == "Soil Composition (SOCI)":
                overlay_file = "./data_run/soil_overlay.png"
                if os.path.exists(overlay_file):
                    folium.raster_layers.ImageOverlay(
                        image=overlay_file,
                        bounds=image_bounds,
                        opacity=0.6,
                        name="Soil Index SOCI"
                    ).add_to(m_after)
            elif index_layer == "Land Surface Temp (LST)":
                overlay_file = "./data_run/lst_overlay.png"
                if os.path.exists(overlay_file):
                    folium.raster_layers.ImageOverlay(
                        image=overlay_file,
                        bounds=image_bounds,
                        opacity=0.6,
                        name="Land Surface Temp"
                    ).add_to(m_after)
            elif index_layer == "Canopy Cover (CCF)":
                overlay_file = "./data_run/ccf_overlay.png"
                if os.path.exists(overlay_file):
                    folium.raster_layers.ImageOverlay(
                        image=overlay_file,
                        bounds=image_bounds,
                        opacity=0.6,
                        name="Canopy Cover Fraction"
                    ).add_to(m_after)
            elif index_layer == "Slope Gradient (DEM)":
                overlay_file = "./data_run/slope_overlay.png"
                if os.path.exists(overlay_file):
                    folium.raster_layers.ImageOverlay(
                        image=overlay_file,
                        bounds=image_bounds,
                        opacity=0.6,
                        name="Slope Gradient"
                    ).add_to(m_after)
            elif index_layer == "Elevation Contours":
                contours = extract_contours("./data_run/simulated_DEM.tif" if "simulated_DEM.tif" in paths.values() else paths["DEM"])
                folium.GeoJson(
                    contours,
                    name="Topographic Contours",
                    style_function=lambda x: {'color': '#b87333', 'weight': 1.5, 'opacity': 0.75}
                ).add_to(m_after)
            elif index_layer == "Drainage Stream channels":
                with open("./data_run/streams.geojson", "r") as f:
                    streams_geojson = json.load(f)
                folium.GeoJson(
                    streams_geojson,
                    name="Water Streams",
                    style_function=lambda x: {'color': '#3498db', 'weight': 2.5, 'opacity': 0.85}
                ).add_to(m_after)
                
            st_folium(m_after, height=450, use_container_width=True, key="rendered_map_after")
            
    with tab_gis:
        st.markdown("### 🌐 Professional GIS Integration & Spatial Reference System")
        st.markdown(
            "CeresFlow processes all spatial mathematics on projected local UTM coordinate grids to ensure "
            "accurate metric calculations. These layers are fully compatible with QGIS, ArcGIS, and standard remote sensing suites."
        )
        
        # Calculate UTM metric coordinates
        from ceresflow.utils.geo_helpers import reproject_bounds
        utm_crs = utm_info["epsg"]
        min_x, min_y, max_x, max_y = reproject_bounds(
            bbox["min_lon"], bbox["min_lat"],
            bbox["max_lon"], bbox["max_lat"],
            dst_crs=utm_crs
        )
        
        width_m = max_x - min_x
        height_m = max_y - min_y
        area_sqm = width_m * height_m
        area_ha = area_sqm / 10000.0
        area_acres = area_sqm / 4046.856
        
        col_m1, col_m2, col_m3 = st.columns(3)
        with col_m1:
            st.metric("Projected UTM Zone", f"{utm_info['zone_name']}")
        with col_m2:
            st.metric("Reference System (CRS)", f"{utm_crs}")
        with col_m3:
            st.metric("Calculated BBox Area", f"{area_ha:.1f} Ha ({area_acres:.1f} Acres)")
            
        st.markdown("---")
        
        # 1. UTM Coordinates Table
        st.markdown("#### 📐 Local Grid Extent (UTM Metric Projection)")
        coords_data = {
            "Coordinate Parameter": ["Minimum Easting (X)", "Maximum Easting (X)", "Minimum Northing (Y)", "Maximum Northing (Y)", "Grid Resolution", "BBox Dimensions"],
            "Value (Projected meters)": [f"{min_x:.2f} m", f"{max_x:.2f} m", f"{min_y:.2f} m", f"{max_y:.2f} m", "10.0 meters / pixel", f"{width_m:.1f} m (W) × {height_m:.1f} m (H)"]
        }
        st.table(coords_data)
        
        # 2. Local File Registry for Direct Import
        st.markdown("#### 📂 Local File Registry (Import directly to QGIS/ArcMap)")
        st.info("The calculated spatial layers are stored locally as projected float32 GeoTIFFs. Copy these absolute paths to load them into your GIS project:")
        
        abs_data_dir = os.path.abspath("./data_run")
        registry_data = [
            {"Layer Description": "Crop Health Index (NDVI)", "Format": "GeoTIFF (.tif)", "Absolute File Path": os.path.join(abs_data_dir, "ndvi.tif")},
            {"Layer Description": "Soil Moisture Index (NDWI)", "Format": "GeoTIFF (.tif)", "Absolute File Path": os.path.join(abs_data_dir, "ndwi.tif")},
            {"Layer Description": "Biomass Carbon Stock", "Format": "GeoTIFF (.tif)", "Absolute File Path": os.path.join(abs_data_dir, "carbon.tif")},
            {"Layer Description": "Soil Composition Index (SOCI)", "Format": "GeoTIFF (.tif)", "Absolute File Path": os.path.join(abs_data_dir, "soil.tif")},
            {"Layer Description": "Land Surface Temp (LST)", "Format": "GeoTIFF (.tif)", "Absolute File Path": os.path.join(abs_data_dir, "lst.tif")},
            {"Layer Description": "Canopy Cover Fraction (CCF)", "Format": "GeoTIFF (.tif)", "Absolute File Path": os.path.join(abs_data_dir, "ccf.tif")},
            {"Layer Description": "Digital Elevation Model (DEM)", "Format": "GeoTIFF (.tif)", "Absolute File Path": os.path.join(abs_data_dir, "DEM.tif" if "simulated_DEM.tif" not in paths.values() else "simulated_DEM.tif")},
            {"Layer Description": "Topographic Slope Gradient", "Format": "GeoTIFF (.tif)", "Absolute File Path": os.path.join(abs_data_dir, "slope.tif")},
            {"Layer Description": "Watershed Drainage Streams", "Format": "GeoJSON (.geojson)", "Absolute File Path": os.path.join(abs_data_dir, "streams.geojson")}
        ]
        
        # Filter registry to show only files that actually exist
        import pandas as pd
        filtered_registry = [item for item in registry_data if os.path.exists(item["Absolute File Path"])]
        st.dataframe(pd.DataFrame(filtered_registry), use_container_width=True)
        
        # 3. Direct Loader Snippet
        st.markdown("#### 💻 Direct Loader Console Snippet")
        st.markdown("Run this script in the QGIS Python Console to automatically load all computed layers with matching reference systems:")
        qgis_code = f"""import glob
import os

# Set target directory
data_dir = r"{abs_data_dir}"

# Add rasters
for f in glob.glob(os.path.join(data_dir, "*.tif")):
    if not f.endswith("_overlay.png"):
        name = os.path.basename(f)
        iface.addRasterLayer(f, name)

# Add drainage vector streams
streams_file = os.path.join(data_dir, "streams.geojson")
if os.path.exists(streams_file):
    iface.addVectorLayer(streams_file, "Drainage Streams", "ogr")
"""
        st.code(qgis_code, language="python")

    st.markdown("---")
    
    # Recommendations Cards Layout
    st.markdown("### 💡 Farm Recommendations & Interpretations")
    
    # Render active recommendation categories in dynamic grid
    active_keys = ["health"]
    if st.session_state.calc_moisture:
        active_keys.append("water")
    if st.session_state.calc_dem:
        active_keys.append("slope")
    if st.session_state.calc_soil:
        active_keys.append("soil")
    if st.session_state.calc_thermal:
        active_keys.append("thermal")
    if st.session_state.calc_canopy:
        active_keys.append("canopy")
        
    rows_of_keys = [active_keys[i:i+3] for i in range(0, len(active_keys), 3)]
    for row_keys in rows_of_keys:
        cols = st.columns(len(row_keys))
        for col, key in zip(cols, row_keys):
            rec = agronomy_data[key]
            title_map = {
                "health": "🌱 Crop Health Status",
                "water": "💧 Water / Soil Moisture",
                "slope": "🏔️ Terrain & Soil Erosion",
                "soil": "🪨 Soil Structure / Composition",
                "thermal": "🔥 Land Surface Temp (LST)",
                "canopy": "🌿 Canopy Cover & Spacing"
            }
            with col:
                st.markdown(f"""
                <div class="card">
                    <h4>{title_map[key]}</h4>
                    <p><b>Status:</b> {rec['status']}</p>
                    <p>{rec['desc']}</p>
                    <p><i>Recommendation:</i> {rec['action']}</p>
                </div>
                """, unsafe_allow_html=True)

    # PDF Report Download Card
    st.markdown("---")
    st.markdown("### 📥 Download Results Booklet")
    
    with open(st.session_state.pdf_path, "rb") as pdf_file:
        pdf_bytes = pdf_file.read()
        
    st.download_button(
        label="📥 Download Print-Ready PDF Report",
        data=pdf_bytes,
        file_name=os.path.basename(st.session_state.pdf_path),
        mime="application/pdf",
        use_container_width=True
    )

else:
    st.info("💡 Input coordinates or a location name in the sidebar, choose your desired analysis layers, and click **Run Automation Pipeline** to begin.")
