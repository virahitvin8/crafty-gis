import os
import sys
import shutil

# Append project root to sys.path so we can import modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from ceresflow.core.geocoding import get_bbox_from_point, get_utm_zone
from ceresflow.services.satellite_source import generate_simulated_bands
from ceresflow.services.raster_math import calculate_ndvi, calculate_ndwi
from ceresflow.services.dem_processor import calculate_slope
from ceresflow.core.agronomist import generate_agronomy_advice
from ceresflow.services.pdf_builder import build_pdf_report

def test_pdf_pipeline():
    print("Initializing test pipeline...")
    bbox = get_bbox_from_point(30.0444, 31.2357, 5.0)
    utm_info = get_utm_zone(30.0444, 31.2357)
    
    data_dir = "./data_test_pdf"
    if os.path.exists(data_dir):
        shutil.rmtree(data_dir)
        
    try:
        # 1. Ingest simulated raster bands
        paths = generate_simulated_bands(bbox, data_dir=data_dir)
        
        # 2. Compute indexes
        ndvi_path = os.path.join(data_dir, "ndvi.tif")
        ndwi_path = os.path.join(data_dir, "ndwi.tif")
        slope_path = os.path.join(data_dir, "slope.tif")
        
        calculate_ndvi(paths["B04"], paths["B08"], ndvi_path)
        calculate_ndwi(paths["B03"], paths["B08"], ndwi_path)
        calculate_slope(paths["DEM"], slope_path)
        
        # 3. Generate agronomy summary
        print("Generating agronomy advice indices...")
        advice = generate_agronomy_advice(ndvi_path, ndwi_path, slope_path)
        
        # 4. Generate PDF Report
        print("Compiling PDF report...")
        report_pdf_path = os.path.join(data_dir, "ceresflow_report.pdf")
        build_pdf_report(
            location_name="Test Location (Cairo Valley)",
            bbox_info=bbox,
            utm_info=utm_info,
            agronomy_data=advice,
            output_path=report_pdf_path
        )
        
        # 5. Verify PDF file size and existence
        assert os.path.exists(report_pdf_path), "PDF report was not compiled"
        assert os.path.getsize(report_pdf_path) > 1024, "PDF report is empty or corrupted"
        print("[OK] PDF report compilation verified successfully.")
        
    finally:
        # Clean up
        if os.path.exists(data_dir):
            shutil.rmtree(data_dir)

if __name__ == "__main__":
    print("--- Running PDF Generation Unit Tests ---")
    test_pdf_pipeline()
    print("All PDF engine tests passed successfully.")
