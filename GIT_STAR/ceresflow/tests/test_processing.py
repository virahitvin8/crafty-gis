import os
import sys
import shutil

# Append project root to sys.path so we can import modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from ceresflow.core.geocoding import get_bbox_from_point
from ceresflow.services.satellite_source import generate_simulated_bands
from ceresflow.services.raster_math import calculate_ndvi, calculate_ndwi, calculate_carbon_index
from ceresflow.services.dem_processor import calculate_slope, extract_contours, map_drainage_pathways
import rasterio

def test_spatial_processors():
    print("Initializing simulated spatial bands...")
    bbox = get_bbox_from_point(30.0444, 31.2357, 5.0)
    data_dir = "./data_test_proc"
    
    if os.path.exists(data_dir):
        shutil.rmtree(data_dir)
        
    try:
        # 1. Ingestion
        paths = generate_simulated_bands(bbox, data_dir=data_dir)
        
        # 2. Test NDVI
        print("Testing NDVI calculation...")
        ndvi_path = os.path.join(data_dir, "ndvi.tif")
        calculate_ndvi(paths["B04"], paths["B08"], ndvi_path)
        assert os.path.exists(ndvi_path)
        with rasterio.open(ndvi_path) as src:
            ndvi_arr = src.read(1)
            assert ndvi_arr.max() <= 1.0
            assert ndvi_arr.min() >= -1.0
        print("[OK] NDVI index calculated and bounds checked.")
        
        # 3. Test NDWI
        print("Testing NDWI calculation...")
        ndwi_path = os.path.join(data_dir, "ndwi.tif")
        calculate_ndwi(paths["B03"], paths["B08"], ndwi_path)
        assert os.path.exists(ndwi_path)
        print("[OK] NDWI moisture index verified.")
        
        # 4. Test Carbon Index
        print("Testing Carbon stock estimation...")
        carbon_path = os.path.join(data_dir, "carbon.tif")
        calculate_carbon_index(ndvi_path, carbon_path)
        assert os.path.exists(carbon_path)
        print("[OK] Carbon index verified.")
        
        # 5. Test DEM Slope
        print("Testing Horn's slope convolution...")
        slope_path = os.path.join(data_dir, "slope.tif")
        calculate_slope(paths["DEM"], slope_path)
        assert os.path.exists(slope_path)
        with rasterio.open(slope_path) as src:
            slope_arr = src.read(1)
            assert slope_arr.min() >= 0.0, "Slopes cannot be negative"
        print("[OK] Topographic slope calculations verified.")
        
        # 6. Test DEM Contours
        print("Testing topographic contour generation...")
        contours_fc = extract_contours(paths["DEM"], interval_meters=10.0)
        assert "features" in contours_fc
        # Matplotlib can generate contours for synthetic terrain
        print(f"[OK] Contours extracted. Found {len(contours_fc['features'])} contour vectors.")
        
        # 7. Test Drainage mapping
        print("Testing stream network routing...")
        drainage_path = os.path.join(data_dir, "streams.geojson")
        map_drainage_pathways(paths["DEM"], drainage_path)
        assert os.path.exists(drainage_path)
        print("[OK] Hydrology drainage segments saved.")
        
    finally:
        # Clean up
        if os.path.exists(data_dir):
            shutil.rmtree(data_dir)

if __name__ == "__main__":
    print("--- Running Processing Engines Unit Tests ---")
    test_spatial_processors()
    print("All processing engine tests passed successfully.")
