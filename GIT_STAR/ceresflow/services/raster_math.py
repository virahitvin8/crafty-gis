import numpy as np
import rasterio
import os

def calculate_ndvi(red_path, nir_path, output_path):
    """
    Calculates the Normalized Difference Vegetation Index (NDVI) from Red and NIR bands:
    NDVI = (NIR - Red) / (NIR + Red)
    Saves output as a projected float32 GeoTIFF.
    """
    with rasterio.open(red_path) as red_src, rasterio.open(nir_path) as nir_src:
        red = red_src.read(1).astype(np.float32)
        nir = nir_src.read(1).astype(np.float32)
        
        # Avoid division by zero
        with np.errstate(divide='ignore', invalid='ignore'):
            ndvi = (nir - red) / (nir + red)
            ndvi = np.nan_to_num(ndvi, nan=0.0, posinf=1.0, neginf=-1.0)
            
        # Constrain to valid NDVI range [-1, 1]
        ndvi = np.clip(ndvi, -1.0, 1.0)
        
        # Save output using the reference projection metadata
        save_output_raster(output_path, ndvi, red_src)
        return output_path

def calculate_ndwi(green_path, nir_path, output_path):
    """
    Calculates the Normalized Difference Water Index (NDWI) for soil moisture / open water:
    NDWI = (Green - NIR) / (Green + NIR)
    Saves output as a projected float32 GeoTIFF.
    """
    with rasterio.open(green_path) as green_src, rasterio.open(nir_path) as nir_src:
        green = green_src.read(1).astype(np.float32)
        nir = nir_src.read(1).astype(np.float32)
        
        with np.errstate(divide='ignore', invalid='ignore'):
            ndwi = (green - nir) / (green + nir)
            ndwi = np.nan_to_num(ndwi, nan=0.0, posinf=1.0, neginf=-1.0)
            
        ndwi = np.clip(ndwi, -1.0, 1.0)
        
        save_output_raster(output_path, ndwi, green_src)
        return output_path

def calculate_carbon_index(ndvi_path, output_path):
    """
    Calculates an empirical Biomass Carbon Index scaled from NDVI:
    Carbon Stock Index = 250.0 * (NDVI ^ 2) (Tons per Hectare approximation indicator)
    """
    with rasterio.open(ndvi_path) as ndvi_src:
        ndvi = ndvi_src.read(1)
        
        # Empirical conversion: High NDVI corresponds to dense forest biomass
        carbon = 180.0 * np.square(np.maximum(ndvi, 0.0))
        
        save_output_raster(output_path, carbon, ndvi_src)
        return output_path

def calculate_soil_composition(red_path, green_path, output_path):
    """
    Calculates an empirical Soil Organic Carbon/Clay Index proxy (SOCI)
    using Red and Green visible bands.
    """
    with rasterio.open(red_path) as red_src, rasterio.open(green_path) as green_src:
        red = red_src.read(1).astype(np.float32)
        green = green_src.read(1).astype(np.float32)
        
        with np.errstate(divide='ignore', invalid='ignore'):
            soci = (red - green) / (red + green)
            soci = np.nan_to_num(soci, nan=0.0, posinf=1.0, neginf=-1.0)
            
        soci = np.clip(soci, -1.0, 1.0)
        save_output_raster(output_path, soci, red_src)
        return output_path

def calculate_lst_proxy(ndvi_path, dem_path, output_path):
    """
    Calculates a Land Surface Temperature (LST) proxy anomaly (in Celsius)
    by combining NDVI cooling fraction and DEM lapse cooling:
    LST = 38.0 - 18.0 * NDVI - 0.0065 * Elevation (DEM)
    """
    with rasterio.open(ndvi_path) as ndvi_src, rasterio.open(dem_path) as dem_src:
        ndvi = ndvi_src.read(1).astype(np.float32)
        dem = dem_src.read(1).astype(np.float32)
        
        # Thermal proxy equation matching heat retention dynamics
        lst = 38.0 - (18.0 * ndvi) - (0.0065 * dem)
        lst = np.clip(lst, 0.0, 60.0) # limit to physical boundaries
        
        save_output_raster(output_path, lst, ndvi_src)
        return output_path

def calculate_canopy_cover(ndvi_path, output_path):
    """
    Calculates the Canopy Cover Fraction (CCF) from NDVI:
    CCF = (NDVI - NDVI_bare) / (NDVI_veg - NDVI_bare)
    """
    with rasterio.open(ndvi_path) as ndvi_src:
        ndvi = ndvi_src.read(1).astype(np.float32)
        
        ndvi_bare = 0.15
        ndvi_veg = 0.80
        
        with np.errstate(divide='ignore', invalid='ignore'):
            ccf = (ndvi - ndvi_bare) / (ndvi_veg - ndvi_bare)
            ccf = np.nan_to_num(ccf, nan=0.0)
            
        ccf = np.clip(ccf, 0.0, 1.0)
        save_output_raster(output_path, ccf, ndvi_src)
        return output_path

def save_output_raster(output_path, data, reference_src):
    """
    Utility helper to save a processed 2D numpy array as a single-band GeoTIFF
    inheriting coordinate system reference and grid transformations.
    """
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    meta = reference_src.meta.copy()
    meta.update({
        'dtype': 'float32',
        'count': 1,
        'driver': 'GTiff'
    })
    
    with rasterio.open(output_path, 'w', **meta) as dst:
        dst.write(data.astype(np.float32), 1)
