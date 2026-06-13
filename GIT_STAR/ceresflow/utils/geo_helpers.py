import rasterio
import rasterio.warp
from rasterio.windows import from_bounds
import geopandas as gpd
from shapely.geometry import box

def reproject_bounds(min_lon, min_lat, max_lon, max_lat, dst_crs="EPSG:4326"):
    """
    Reprojects bounding box coordinates to a target Coordinate Reference System (CRS).
    """
    min_x, min_y, max_x, max_y = rasterio.warp.transform_bounds(
        "EPSG:4326", dst_crs, min_lon, min_lat, max_lon, max_lat
    )
    return min_x, min_y, max_x, max_y

def calculate_raster_window(raster_path, bbox_wgs84):
    """
    Calculates the pixel window coordinates (row/column offsets) 
    needed to crop a remote Cloud-Optimized GeoTIFF (COG) 
    to our target bounding box.
    """
    with rasterio.open(raster_path) as src:
        # Reproject WGS84 bounding box to the raster's native CRS
        min_x, min_y, max_x, max_y = reproject_bounds(
            bbox_wgs84["min_lon"], bbox_wgs84["min_lat"],
            bbox_wgs84["max_lon"], bbox_wgs84["max_lat"],
            dst_crs=src.crs
        )
        
        # Calculate pixel window
        window = from_bounds(min_x, min_y, max_x, max_y, transform=src.transform)
        
        # Clamp window to raster bounds to avoid reading out of bounds
        window = window.intersection(
            rasterio.windows.Window(0, 0, src.width, src.height)
        )
        
        return window, src.crs, src.transform
