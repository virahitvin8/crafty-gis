import sys
import os

# Append project root to sys.path so we can import modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from ceresflow.core.geocoding import geocode_address, get_bbox_from_point, get_utm_zone

def test_coordinate_parsing():
    print("Testing coordinate string parsing...")
    coords = geocode_address("30.0444, 31.2357")
    assert coords is not None, "Failed to parse coordinate string"
    assert math_close(coords[0], 30.0444), f"Latitude incorrect: {coords[0]}"
    assert math_close(coords[1], 31.2357), f"Longitude incorrect: {coords[1]}"
    print("[OK] Coordinate parsing verified.")

def test_bbox_calculation():
    print("Testing bounding box calculation...")
    bbox = get_bbox_from_point(30.0444, 31.2357, 5.0) # 5km
    assert "min_lat" in bbox
    assert "max_lat" in bbox
    assert bbox["min_lat"] < 30.0444 < bbox["max_lat"]
    assert bbox["min_lon"] < 31.2357 < bbox["max_lon"]
    print("[OK] Bounding box verified.")

def test_utm_zone():
    print("Testing UTM zone resolution...")
    utm = get_utm_zone(30.0444, 31.2357)
    assert utm["zone_name"] == "36N", f"Expected 36N, got {utm['zone_name']}"
    assert utm["epsg"] == "EPSG:32636", f"Expected EPSG:32636, got {utm['epsg']}"
    print("[OK] UTM zone resolution verified.")

def math_close(a, b, tolerance=1e-4):
    return abs(a - b) < tolerance

if __name__ == "__main__":
    print("--- Running Geocoding Unit Tests ---")
    test_coordinate_parsing()
    test_bbox_calculation()
    test_utm_zone()
    print("All tests passed successfully.")
