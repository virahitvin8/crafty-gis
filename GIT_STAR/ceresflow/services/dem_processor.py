import numpy as np
import rasterio
from scipy.ndimage import convolve
import matplotlib.pyplot as plt
import os
import json
from shapely.geometry import LineString, mapping

def calculate_slope(dem_path, output_path):
    """
    Calculates terrain slope in degrees using Horn's 3x3 kernel method 
    (the same algorithm used by ArcMap/QGIS).
    """
    with rasterio.open(dem_path) as src:
        dem = src.read(1).astype(np.float32)
        
        # Get grid resolution in meters (cell size) from affine transform
        cell_size_x = abs(src.transform[0])
        cell_size_y = abs(src.transform[4])
        
        # Sobel/Horn kernels for directional derivatives
        kernel_x = np.array([
            [-1, 0, 1],
            [-2, 0, 2],
            [-1, 0, 1]
        ]) / (8.0 * cell_size_x)
        
        kernel_y = np.array([
            [-1, -2, -1],
            [ 0,  0,  0],
            [ 1,  2,  1]
        ]) / (8.0 * cell_size_y)
        
        # Convolve DEM
        dz_dx = convolve(dem, kernel_x, mode='reflect')
        dz_dy = convolve(dem, kernel_y, mode='reflect')
        
        # Calculate slope magnitude
        slope_rise = np.sqrt(dz_dx**2 + dz_dy**2)
        slope_deg = np.arctan(slope_rise) * (180.0 / np.pi)
        
        # Save output raster
        save_dem_output(output_path, slope_deg, src)
        return output_path

def extract_contours(dem_path, interval_meters=10.0):
    """
    Extracts topographic contour lines as a list of coordinates 
    in GeoJSON format.
    """
    with rasterio.open(dem_path) as src:
        dem = src.read(1).astype(np.float32)
        transform = src.transform
        
        # Determine elevations to extract
        min_elev = np.nanmin(dem)
        max_elev = np.nanmax(dem)
        levels = np.arange(
            np.ceil(min_elev / interval_meters) * interval_meters,
            max_elev,
            interval_meters
        )
        
        if len(levels) == 0:
            return {"type": "FeatureCollection", "features": []}
            
        # Create contour set using matplotlib in-memory
        fig, ax = plt.subplots()
        cs = ax.contour(dem, levels=levels)
        plt.close(fig)
        
        features = []
        for level, segments in zip(levels, cs.allsegs):
            for seg in segments:
                coords = []
                for pt in seg:
                    # pt is (col, row). Convert to map (x, y)
                    x, y = transform * (pt[0], pt[1])
                    # Reproject back to WGS84 for interactive Folium mapping
                    lon_lat = rasterio.warp.transform(src.crs, "EPSG:4326", [x], [y])
                    coords.append((lon_lat[0][0], lon_lat[1][0]))
                
                if len(coords) >= 2:
                    geom = LineString(coords)
                    features.append({
                        "type": "Feature",
                        "properties": {"elevation": float(level)},
                        "geometry": mapping(geom)
                    })
                        
        return {
            "type": "FeatureCollection",
            "features": features
        }

def map_drainage_pathways(dem_path, output_geojson_path, threshold_ratio=0.03):
    """
    Maps drainage pathways by finding local terrain depressions and flow convergence.
    Computes local elevation differentials to outline natural stream beds.
    """
    with rasterio.open(dem_path) as src:
        dem = src.read(1).astype(np.float32)
        transform = src.transform
        
        rows, cols = dem.shape
        
        # Simple flow convergence: Cells that have lower neighbors
        # We calculate the relative depression index compared to the local neighborhood
        local_min = convolve(dem, np.ones((5, 5)) / 25.0, mode='reflect')
        flow_risk = local_min - dem
        
        # Filter stream channels
        threshold = np.max(flow_risk) * threshold_ratio
        channels = flow_risk > threshold
        
        # Vectorize channels into stream segment lines
        features = []
        visited = np.zeros_like(channels)
        
        for r in range(1, rows - 1, 2):
            for c in range(1, cols - 1, 2):
                if channels[r, c] and not visited[r, c]:
                    # Trace a simple segment
                    segment_pts = []
                    curr_r, curr_c = r, c
                    
                    # Trace locally
                    for _ in range(20): # limit trace length to prevent loops
                        if curr_r <= 0 or curr_r >= rows - 1 or curr_c <= 0 or curr_c >= cols - 1:
                            break
                        if not channels[curr_r, curr_c]:
                            break
                        
                        visited[curr_r, curr_c] = True
                        x, y = transform * (curr_c, curr_r)
                        lon_lat = rasterio.warp.transform(src.crs, "EPSG:4326", [x], [y])
                        segment_pts.append((lon_lat[0][0], lon_lat[1][0]))
                        
                        # Move to neighbor with lowest elevation (D8 flow)
                        offsets = [(-1,-1), (-1,0), (-1,1), (0,-1), (0,1), (1,-1), (1,0), (1,1)]
                        elevs = [dem[curr_r+dr, curr_c+dc] for dr, dc in offsets]
                        min_idx = np.argmin(elevs)
                        dr, dc = offsets[min_idx]
                        curr_r, curr_c = curr_r + dr, curr_c + dc
                    
                    if len(segment_pts) >= 2:
                        geom = LineString(segment_pts)
                        features.append({
                            "type": "Feature",
                            "properties": {"type": "stream"},
                            "geometry": mapping(geom)
                        })
                        
        fc = {
            "type": "FeatureCollection",
            "features": features
        }
        
        os.makedirs(os.path.dirname(output_geojson_path), exist_ok=True)
        with open(output_geojson_path, 'w') as f:
            json.dump(fc, f)
            
        return output_geojson_path

def save_dem_output(output_path, data, reference_src):
    """
    Utility to save processed float data matching DEM reference structure.
    """
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    meta = reference_src.meta.copy()
    meta.update({
        'dtype': 'float32',
        'count': 1,
        'driver': 'GTiff'
    })
    with rasterio.open(output_path, 'w', **meta) as dst:
        dst.write(data, 1)
