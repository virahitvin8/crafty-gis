"""
GIS Processing Engine — handles all geospatial operations using GDAL, GeoPandas, Rasterio, and subprocess calls to GIS tools.

This is the workhorse that executes the actual spatial analysis.
"""

import os
import logging
import asyncio
import subprocess
from pathlib import Path
from typing import Optional
import geopandas as gpd
import rasterio
from rasterio import mask as rio_mask
from rasterio.warp import calculate_default_transform, reproject, Resampling
import numpy as np
from app.config import settings

logger = logging.getLogger(__name__)


class GISProcessor:
    """Executes GIS processing operations using GDAL and Python geospatial stack."""

    def __init__(self):
        self.data_dir = Path(settings.data_dir)
        self.downloads_dir = Path(settings.downloads_dir)
        self.outputs_dir = Path(settings.outputs_dir)
        self.downloads_dir.mkdir(parents=True, exist_ok=True)
        self.outputs_dir.mkdir(parents=True, exist_ok=True)

    async def clip_raster(
        self, input_path: Path, output_path: Path, bounds: tuple[float, float, float, float]
    ) -> Path:
        """Clip a raster to given bounding box using GDAL."""
        cmd = [
            "gdalwarp",
            "-te", str(bounds[0]), str(bounds[1]), str(bounds[2]), str(bounds[3]),
            "-te_srs", "EPSG:4326",
            "-co", "COMPRESS=LZW",
            str(input_path),
            str(output_path),
        ]
        await self._run_command(cmd)
        return output_path

    async def mosaic_rasters(self, input_paths: list[Path], output_path: Path) -> Path:
        """Mosaic multiple raster tiles into one using GDAL."""
        cmd = [
            "gdal_merge.py",
            "-o", str(output_path),
            "-co", "COMPRESS=LZW",
            *[str(p) for p in input_paths],
        ]
        await self._run_command(cmd)
        return output_path

    async def calculate_ndvi(
        self, red_band_path: Path, nir_band_path: Path, output_path: Path
    ) -> Path:
        """Calculate NDVI (Normalized Difference Vegetation Index)."""
        with rasterio.open(red_band_path) as red_src:
            red = red_src.read(1).astype(np.float32)
            profile = red_src.profile

        with rasterio.open(nir_band_path) as nir_src:
            nir = nir_src.read(1).astype(np.float32)

        # NDVI = (NIR - Red) / (NIR + Red)
        ndvi = np.where((nir + red) == 0, 0, (nir - red) / (nir + red))
        ndvi = np.clip(ndvi, -1, 1)

        profile.update(dtype=rasterio.float32, count=1, compress="lzw")
        with rasterio.open(output_path, "w", **profile) as dst:
            dst.write(ndvi, 1)

        return output_path

    async def reclassify_raster(
        self, input_path: Path, output_path: Path,
        classifications: list[dict], nodata: int = 0
    ) -> Path:
        """Reclassify raster values into new categories (e.g., LULC classes)."""
        with rasterio.open(input_path) as src:
            data = src.read(1)
            profile = src.profile

        classified = np.zeros_like(data, dtype=np.uint8)
        for cls in classifications:
            min_val = cls["min"]
            max_val = cls["max"]
            new_val = cls["value"]
            mask = (data >= min_val) & (data <= max_val)
            classified[mask] = new_val

        profile.update(dtype=rasterio.uint8, count=1, compress="lzw", nodata=nodata)
        with rasterio.open(output_path, "w", **profile) as dst:
            dst.write(classified, 1)

        return output_path

    async def vectorize_raster(
        self, input_path: Path, output_path: Path, band: int = 1
    ) -> Path:
        """Convert classified raster to vector polygons using GDAL."""
        cmd = [
            "gdal_polygonize.py",
            str(input_path),
            "-b", str(band),
            "-f", "GPKG",
            str(output_path),
        ]
        await self._run_command(cmd)
        return output_path

    async def calculate_zonal_stats(
        self, raster_path: Path, vector_path: Path, output_path: Path
    ) -> Path:
        """Calculate zonal statistics for vector polygons over a raster."""
        cmd = [
            "gdal_zonal_statistics.py",
            str(raster_path),
            str(vector_path),
            "-f", "GPKG",
            str(output_path),
        ]
        await self._run_command(cmd)
        return output_path

    async def clip_vector(
        self, input_path: Path, clip_path: Path, output_path: Path
    ) -> Path:
        """Clip vector data using a polygon boundary."""
        gdf = gpd.read_file(input_path)
        clip_gdf = gpd.read_file(clip_path)

        if gdf.crs != clip_gdf.crs:
            clip_gdf = clip_gdf.to_crs(gdf.crs)

        clipped = gpd.clip(gdf, clip_gdf)
        clipped.to_file(output_path, driver="GPKG")
        return output_path

    async def _run_command(self, cmd: list[str]) -> str:
        """Run a shell command asynchronously without blocking the event loop."""
        logger.info(f"Running command: {' '.join(cmd)}")
        try:
            result = await asyncio.to_thread(
                subprocess.run,
                cmd, capture_output=True, text=True, check=True, timeout=3600
            )
            logger.info(f"Command succeeded: {result.stdout[:200]}")
            return result.stdout
        except subprocess.CalledProcessError as e:
            logger.error(f"Command failed: {e.stderr}")
            raise RuntimeError(f"GIS command failed: {e.stderr}")

    async def get_raster_info(self, path: Path) -> dict:
        """Get metadata about a raster file."""
        with rasterio.open(path) as src:
            return {
                "width": src.width,
                "height": src.height,
                "count": src.count,
                "crs": str(src.crs),
                "bounds": src.bounds._asdict(),
                "resolution": src.res,
                "dtype": str(src.dtypes[0]),
                "nodata": src.nodata,
            }

    async def get_vector_info(self, path: Path) -> dict:
        """Get metadata about a vector file."""
        gdf = gpd.read_file(path)
        return {
            "features": len(gdf),
            "columns": list(gdf.columns),
            "crs": str(gdf.crs),
            "geometry_types": list(gdf.geometry.type.unique()),
            "bounds": gdf.total_bounds.tolist() if not gdf.empty else None,
            "area_km2": float(gdf.to_crs("EPSG:3857").area.sum() / 1_000_000) if not gdf.empty else 0,
        }
