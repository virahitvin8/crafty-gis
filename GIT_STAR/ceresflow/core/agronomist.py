import numpy as np
import rasterio

def generate_agronomy_advice(ndvi_path, ndwi_path, slope_path, soil_path=None, lst_path=None, ccf_path=None):
    """
    Reads computed rasters, extracts summary statistics (min, max, mean),
    and translates them into structured, plain-English recommendations.
    """
    stats = {}
    
    # 1. Analyze Crop Health (NDVI)
    try:
        with rasterio.open(ndvi_path) as src:
            ndvi = src.read(1)
            # Filter zero/nodata values
            ndvi_valid = ndvi[ndvi != 0]
            if len(ndvi_valid) > 0:
                stats["ndvi_mean"] = float(np.mean(ndvi_valid))
                stats["ndvi_max"] = float(np.max(ndvi_valid))
                stats["ndvi_min"] = float(np.min(ndvi_valid))
            else:
                stats["ndvi_mean"] = 0.0
    except Exception:
        stats["ndvi_mean"] = 0.0

    # 2. Analyze Moisture (NDWI)
    try:
        with rasterio.open(ndwi_path) as src:
            ndwi = src.read(1)
            ndwi_valid = ndwi[ndwi != 0]
            if len(ndwi_valid) > 0:
                stats["ndwi_mean"] = float(np.mean(ndwi_valid))
            else:
                stats["ndwi_mean"] = 0.0
    except Exception:
        stats["ndwi_mean"] = 0.0

    # 3. Analyze Slope
    try:
        with rasterio.open(slope_path) as src:
            slope = src.read(1)
            stats["slope_max"] = float(np.max(slope))
            stats["slope_mean"] = float(np.mean(slope))
    except Exception:
        stats["slope_max"] = 0.0
        stats["slope_mean"] = 0.0

    # 4. Optional Soil index
    if soil_path:
        try:
            with rasterio.open(soil_path) as src:
                soil = src.read(1)
                stats["soil_mean"] = float(np.mean(soil))
        except Exception:
            stats["soil_mean"] = 0.0
    else:
        stats["soil_mean"] = 0.0

    # 5. Optional LST proxy
    if lst_path:
        try:
            with rasterio.open(lst_path) as src:
                lst = src.read(1)
                stats["lst_mean"] = float(np.mean(lst))
                stats["lst_max"] = float(np.max(lst))
        except Exception:
            stats["lst_mean"] = 28.0
            stats["lst_max"] = 32.0
    else:
        stats["lst_mean"] = 28.0
        stats["lst_max"] = 32.0

    # 6. Optional Canopy Cover fraction
    if ccf_path:
        try:
            with rasterio.open(ccf_path) as src:
                ccf = src.read(1)
                stats["ccf_mean"] = float(np.mean(ccf))
        except Exception:
            stats["ccf_mean"] = 0.0
    else:
        stats["ccf_mean"] = 0.0

    # Translate stats to advice
    
    # Crop Health Advice
    if stats["ndvi_mean"] > 0.6:
        health_status = "Excellent"
        health_desc = "Your crops show strong photosynthetic activity and high leaf area index. The canopy is dense and healthy."
        health_action = "Maintain standard nutrient applications. Monitor crop progress."
    elif 0.3 <= stats["ndvi_mean"] <= 0.6:
        health_status = "Moderate / Fair"
        health_desc = "Moderate vegetative growth. Some fields show sparse patches or sub-optimal plant density."
        health_action = "Conduct a ground walk to check for localized nitrogen deficiency, early weed growth, or pests."
    else:
        health_status = "Poor / Low Vegetation"
        health_desc = "Very low leaf activity or bare earth detected. Indicates unplanted soil, fallow land, or severely stunted growth."
        health_action = "Inspect the field for severe stress, soil salinity, germinating seed failures, or storm damage."

    # Water stress advice
    if stats["ndwi_mean"] < -0.2:
        water_status = "Water Deficit (Dry)"
        water_desc = "High spectral dryness index. Soil is parched and foliage is exhibiting moisture stress."
        water_action = "Irrigate affected sections immediately. Consider mulching to conserve moisture."
    elif -0.2 <= stats["ndwi_mean"] <= 0.1:
        water_status = "Optimal"
        water_desc = "Balanced water saturation. Ideal moisture content in crop tissue and upper soil layers."
        water_action = "No immediate irrigation change required. Continue regular scheduling."
    else:
        water_status = "Water Saturated (Wet)"
        water_desc = "Excessive surface water or soil saturation. Risk of waterlogging."
        water_action = "Check drainage channels and clean ditches to prevent root rot and anaerobic soil conditions."

    # Erosion and slope advice
    if stats["slope_max"] > 15.0:
        slope_status = "Steep Slope Risk"
        slope_desc = f"Maximum slope reaches {stats['slope_max']:.1f}° (Mean: {stats['slope_mean']:.1f}°). High water-flow runoff speeds."
        slope_action = "Avoid direct vertical planting. Use contour farming, terracing, or vegetative buffer strips to mitigate soil erosion."
    else:
        slope_status = "Gentle / Safe Terrain"
        slope_desc = f"Flat to gently rolling terrain (Max slope: {stats['slope_max']:.1f}°). Safe runoff speeds."
        slope_action = "Safe for standard row cultivation, mechanized seeders, and standard tractors."

    # Soil Composition Advice
    if stats["soil_mean"] > 0.1:
        soil_status = "Clay / Heavy Mineral Soil"
        soil_desc = f"Soil Clay Index indicates high mineral density (Index: {stats['soil_mean']:.2f}). High nutrient retention, poor drainage."
        soil_action = "Avoid working soil when wet to prevent compaction. Mix in compost or organic loam to improve soil aeration."
    elif -0.1 <= stats["soil_mean"] <= 0.1:
        soil_status = "Loam / Balanced Soil"
        soil_desc = f"Balanced Soil Index (Index: {stats['soil_mean']:.2f}). Excellent water-holding capacity and fertility structure."
        soil_action = "Standard farming practices. Maintain organic matter inputs via crop rotation."
    else:
        soil_status = "Sandy / Coarse Soil"
        soil_desc = f"Soil Organic index indicates low clay content (Index: {stats['soil_mean']:.2f}). Drains quickly, high nutrient leaching risk."
        soil_action = "Apply organic mulch. Perform split-fertilizer applications to prevent leaching."

    # Thermal Advice
    if stats["lst_mean"] > 32.0:
        lst_status = "High Thermal Stress"
        lst_desc = f"Foliar Land Surface Temperature proxy is high (Mean: {stats['lst_mean']:.1f}°C, Max: {stats['lst_max']:.1f}°C)."
        lst_action = "Increase irrigation cycle frequency. Use shadow netting or cover cropping if possible."
    elif 18.0 <= stats["lst_mean"] <= 32.0:
        lst_status = "Optimal Thermal Zone"
        lst_desc = f"Temperatures are within healthy crop growing parameters (Mean: {stats['lst_mean']:.1f}°C)."
        lst_action = "Ideal transpiration rates. No immediate temperature mitigation required."
    else:
        lst_status = "Cool / Cryospheric Zone"
        lst_desc = f"Cold soil/air microclimate detected (Mean: {stats['lst_mean']:.1f}°C). Low evapotranspiration rate."
        lst_action = "Verify winter crop suitability. Protect seedlings against frost anomalies."

    # Canopy Row Spacing Advice
    cc_pct = stats["ccf_mean"] * 100.0
    if cc_pct > 70.0:
        ccf_status = "Dense Canopy Cover"
        ccf_desc = f"Vegetation covers {cc_pct:.1f}% of the field. Closed canopy."
        ccf_action = "Optimal crop spacing layout. Ensure good air circulation to prevent fungal disease."
    elif 25.0 <= cc_pct <= 70.0:
        ccf_status = "Moderate Canopy Cover"
        ccf_desc = f"Vegetation covers {cc_pct:.1f}% of the field. Normal row-crop spacing pattern."
        ccf_action = "Maintain 0.75m crop row interval spacing. Monitor weeds in unshaded row gaps."
    else:
        ccf_status = "Sparse / Emergent Cover"
        ccf_desc = f"Vegetation covers {cc_pct:.1f}% of the field. Early growth stage or sparse spacing."
        ccf_action = "Verify seed germination rates. Check for seed spacing uniformity."

    return {
        "metrics": stats,
        "health": {"status": health_status, "desc": health_desc, "action": health_action},
        "water": {"status": water_status, "desc": water_desc, "action": water_action},
        "slope": {"status": slope_status, "desc": slope_desc, "action": slope_action},
        "soil": {"status": soil_status, "desc": soil_desc, "action": soil_action},
        "thermal": {"status": lst_status, "desc": lst_desc, "action": lst_action},
        "canopy": {"status": ccf_status, "desc": ccf_desc, "action": ccf_action}
    }
