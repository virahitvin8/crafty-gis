# 👁️ Remote Sensing & NDVI Mapping Module
# Generated based on GIS/RS genome matching

import os
import numpy as np

def calculate_ndvi(red_band_path, nir_band_path, output_path):
    """
    Calculate Normalized Difference Vegetation Index (NDVI) from Red and NIR bands.
    Formula: (NIR - Red) / (NIR + Red)
    """
    print(f"[*] Loading Red band: {red_band_path}")
    print(f"[*] Loading NIR band: {nir_band_path}")
    
    # Simulating band loads for demonstration
    # In a real environment, use: 
    # import rasterio
    # with rasterio.open(red_band_path) as r: red = r.read(1).astype(float)
    # with rasterio.open(nir_band_path) as n: nir = n.read(1).astype(float)
    
    # Generating dummy multispectral grid array (100x100 pixels) representing a field
    np.random.seed(42)
    red = np.random.uniform(0.05, 0.2, (100, 100))
    nir = np.random.uniform(0.3, 0.8, (100, 100))
    
    print("[*] Computing NDVI array...")
    # Avoid division by zero
    numerator = nir - red
    denominator = nir + red
    ndvi = np.divide(numerator, denominator, out=np.zeros_like(numerator), where=denominator!=0)
    
    mean_ndvi = np.mean(ndvi)
    max_ndvi = np.max(ndvi)
    min_ndvi = np.min(ndvi)
    
    print(f"[+] NDVI calculation complete!")
    print(f"    - Mean NDVI: {mean_ndvi:.4f} (Healthy vegetation index)")
    print(f"    - Min NDVI:  {min_ndvi:.4f}")
    print(f"    - Max NDVI:  {max_ndvi:.4f}")
    
    # Save simulated result
    np.savetxt(output_path, ndvi, fmt='%.4f')
    print(f"[+] Output index successfully written to: {output_path}")
    return mean_ndvi

if __name__ == '__main__':
    print("=== NDVI Vegetation Index Calculator ===")
    calculate_ndvi("red_band.tif", "nir_band.tif", "ndvi_output.csv")
