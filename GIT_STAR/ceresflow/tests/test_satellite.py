import os
import sys
import shutil

# Append project root to sys.path so we can import modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from ceresflow.core.geocoding import get_bbox_from_point
from ceresflow.services.satellite_source import search_sentinel_scenes, generate_simulated_bands
import rasterio

def test_satellite_simulation():
    print("Testing satellite simulation fallback...")
    
    # 5km bbox around Cairo center
    bbox = get_bbox_from_point(30.0444, 31.2357, 5.0)
    
    test_dir = "./data_test"
    if os.path.exists(test_dir):
        shutil.rmtree(test_dir)
        
    try:
        # Generate simulated bands
        paths = generate_simulated_bands(bbox, data_dir=test_dir)
        
        assert "B04" in paths
        assert "B08" in paths
        assert "DEM" in paths
        
        # Verify the generated GeoTIFF files open and have correct CRS metadata
        for name, path in paths.items():
            assert os.path.exists(path), f"File {path} was not created"
            with rasterio.open(path) as src:
                assert src.crs is not None, f"CRS missing in {name}"
                assert src.width == 500, f"Expected 500 width, got {src.width}"
                assert src.height == 500, f"Expected 500 height, got {src.height}"
                
        print("[OK] Satellite simulation verified successfully.")
    finally:
        # Clean up test outputs
        if os.path.exists(test_dir):
            shutil.rmtree(test_dir)

if __name__ == "__main__":
    print("--- Running Ingestion Unit Tests ---")
    test_satellite_simulation()
    print("All ingestion tests passed.")
