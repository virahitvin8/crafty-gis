import os
import sys

# Ensure project path is resolved
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from test_geocoding import test_coordinate_parsing, test_bbox_calculation, test_utm_zone
from test_satellite import test_satellite_simulation
from test_processing import test_spatial_processors
from test_pdf import test_pdf_pipeline

if __name__ == "__main__":
    print("==============================================")
    print("      CeresFlow Global Validation Suite       ")
    print("==============================================\n")
    
    try:
        print("--- Suite 1: Geocoding & Coordinate Resolvers ---")
        test_coordinate_parsing()
        test_bbox_calculation()
        test_utm_zone()
        print("[OK] All Geocoding tests passed.\n")
        
        print("--- Suite 2: STAC Imagery Ingestion ---")
        test_satellite_simulation()
        print("[OK] All Ingestion/simulation tests passed.\n")
        
        print("--- Suite 3: Spatial Computation & Mappers ---")
        test_spatial_processors()
        print("[OK] All Spatial calculation tests passed.\n")
        
        print("--- Suite 4: PDF Report Generation & Advice ---")
        test_pdf_pipeline()
        print("[OK] All PDF generation tests passed.\n")
        
        print("==============================================")
        print("    All 4 validation suites completed!        ")
        print("==============================================")
        
    except AssertionError as ae:
        print(f"\n[FAIL] Validation Failure: Assert failed: {ae}")
        sys.exit(1)
    except Exception as e:
        print(f"\n[FAIL] Validation Failure: Uncaught exception: {e}")
        sys.exit(1)
