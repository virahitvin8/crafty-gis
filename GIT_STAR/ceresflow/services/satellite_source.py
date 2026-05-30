import os
import requests
import numpy as np
import rasterio
from rasterio.transform import from_origin
from ceresflow.utils.geo_helpers import reproject_bounds, calculate_raster_window

STAC_API_URL = "https://earth-search.aws.element84.com/v1/search"

def search_sentinel_scenes(bbox_wgs84):
    """
    Queries the public AWS Element 84 STAC API for Sentinel-2 scenes 
    intersecting the bounding box with low cloud cover.
    """
    payload = {
        "collections": ["sentinel-2-l2a"],
        "bbox": [
            bbox_wgs84["min_lon"], bbox_wgs84["min_lat"],
            bbox_wgs84["max_lon"], bbox_wgs84["max_lat"]
        ],
        "datetime": "2025-01-01T00:00:00Z/2026-05-19T23:59:59Z",
        "query": {
            "eo:cloud_cover": {"lt": 15}
        },
        "limit": 5,
        "sortby": [{"field": "properties.datetime", "direction": "desc"}]
    }
    
    try:
        response = requests.post(STAC_API_URL, json=payload, timeout=8)
        if response.status_code == 200:
            data = response.json()
            if data.get("features"):
                # Return the assets dictionary of the most recent cloud-free scene
                return data["features"][0]
    except Exception as e:
        print(f"STAC search connection error: {e}")
        
    return None

def download_cropped_band(raster_url, bbox_wgs84, output_path):
    """
    Downloads only the bounding-box cropped area of a remote COG band
    using rasterio windowed reads, keeping bandwidth usage tiny (<1MB).
    """
    try:
        # Configure GDAL for faster remote HTTP COG reads
        with rasterio.Env(GDAL_HTTP_UNSUPPORTED_PROTOCOL='YES', GDAL_DISABLE_READDIR_ON_OPEN='YES'):
            window, crs, transform = calculate_raster_window(raster_url, bbox_wgs84)
            
            with rasterio.open(raster_url) as src:
                # Read the windowed subset
                data = src.read(1, window=window)
                
                # Compute updated window affine transform
                win_transform = rasterio.windows.transform(window, src.transform)
                
                # Write cropped band locally
                os.makedirs(os.path.dirname(output_path), exist_ok=True)
                with rasterio.open(
                    output_path, 'w',
                    driver='GTiff',
                    height=data.shape[0],
                    width=data.shape[1],
                    count=1,
                    dtype=data.dtype,
                    crs=crs,
                    transform=win_transform
                ) as dst:
                    dst.write(data, 1)
                
                return output_path
    except Exception as e:
        print(f"Error downloading remote band: {e}")
        return None

def generate_simulated_bands(bbox_wgs84, data_dir="./data"):
    """
    Generates high-resolution simulated bands locally if internet is offline or
    STAC query fails. Creates naturalized patterns for NDVI/DEM testing.
    """
    os.makedirs(data_dir, exist_ok=True)
    
    # Grid dimensions (e.g. 500x500 pixels for ~10m resolution in 5km box)
    rows, cols = 500, 500
    
    # Compute affine transform for UTM projection centered on bounding box
    from ceresflow.core.geocoding import get_utm_zone
    utm_info = get_utm_zone(bbox_wgs84["center_lat"], bbox_wgs84["center_lon"])
    utm_epsg = utm_info["epsg"]
    
    # Project center coordinates
    min_x, min_y, max_x, max_y = reproject_bounds(
        bbox_wgs84["min_lon"], bbox_wgs84["min_lat"],
        bbox_wgs84["max_lon"], bbox_wgs84["max_lat"],
        dst_crs=utm_epsg
    )
    
    # Step resolution
    res_x = (max_x - min_x) / cols
    res_y = (max_y - min_y) / rows
    transform = from_origin(min_x, max_y, res_x, res_y)
    
    # Simulate elevation (DEM) - create a valley slope and hills
    x = np.linspace(-3, 3, cols)
    y = np.linspace(-3, 3, rows)
    X, Y = np.meshgrid(x, y)
    
    # Synthetic terrain: a diagonal river valley with hills
    dem_data = 150 + 80 * np.sin(X/2) * np.cos(Y/2) + 30 * np.sin(X*2)
    dem_data = dem_data.astype(np.float32)
    
    # Simulate multi-spectral bands
    # NDVI should be high in valleys (watered vegetation) and low on peaks or roads
    ndvi_noise = np.random.normal(0, 0.05, (rows, cols))
    sim_ndvi = 0.5 + 0.3 * np.cos(X/1.5) * np.sin(Y/1.5) + ndvi_noise
    sim_ndvi = np.clip(sim_ndvi, 0.01, 0.95)
    
    # Generate NIR and Red bands from the synthetic NDVI
    # NDVI = (NIR - Red) / (NIR + Red). Let Red be base, calculate NIR.
    red_data = (300 + 100 * np.sin(X*Y)).astype(np.uint16)
    nir_data = (red_data * (1 + sim_ndvi) / (1 - sim_ndvi)).astype(np.uint16)
    
    # Green band (for NDWI/Water Indexing)
    green_data = (red_data * 1.2).astype(np.uint16)
    
    bands = {
        "B04": red_data,    # Red
        "B08": nir_data,    # NIR
        "B03": green_data,  # Green
        "DEM": dem_data     # Elevation
    }
    
    paths = {}
    for name, array in bands.items():
        band_path = os.path.join(data_dir, f"simulated_{name}.tif")
        dtype = 'uint16' if name != "DEM" else 'float32'
        
        with rasterio.open(
            band_path, 'w',
            driver='GTiff',
            height=rows,
            width=cols,
            count=1,
            dtype=dtype,
            crs=utm_epsg,
            transform=transform
        ) as dst:
            dst.write(array, 1)
        paths[name] = band_path
        
    return paths
