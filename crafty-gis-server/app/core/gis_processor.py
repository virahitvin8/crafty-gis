"""
CRAFTY GIS — GIS Processor
Async geospatial processing engine that dispatches to GDAL, GeoPandas, Rasterio,
QGIS, SAGA GIS, GRASS GIS, and Fragstats backends.
"""

import asyncio
import json
import logging
import os
import tempfile
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from enum import Enum

from app.config import settings

logger = logging.getLogger(__name__)


class ProcessingTool(str, Enum):
    GDAL = "gdal"
    GEOPANDAS = "geopandas"
    RASTERIO = "rasterio"
    PYTHON = "python"
    QGIS = "qgis"
    SAGA = "saga_gis"
    GRASS = "grass_gis"
    FRAGSTATS = "fragstats"


class GISProcessor:
    """
    Core geospatial processing engine.
    Routes tasks to the appropriate tool backend based on analysis type.
    Supports all major open-source GIS tools as processing backends.
    """

    def __init__(self, data_dir: str = None):
        self.data_dir = data_dir or settings.DATA_DIR
        self.temp_dir = os.path.join(self.data_dir, "temp")
        os.makedirs(self.temp_dir, exist_ok=True)

    async def execute(self, task_type: str, params: Dict[str, Any], tool: str = "python") -> Dict[str, Any]:
        """Execute a geospatial processing task using the specified tool."""
        tool_enum = ProcessingTool(tool)

        dispatch_map = {
            ProcessingTool.GDAL: self._execute_gdal,
            ProcessingTool.GEOPANDAS: self._execute_geopandas,
            ProcessingTool.RASTERIO: self._execute_rasterio,
            ProcessingTool.PYTHON: self._execute_python,
            ProcessingTool.QGIS: self._execute_qgis,
            ProcessingTool.SAGA: self._execute_saga,
            ProcessingTool.GRASS: self._execute_grass,
            ProcessingTool.FRAGSTATS: self._execute_fragstats,
        }

        handler = dispatch_map.get(tool_enum, self._execute_python)
        result = await handler(task_type, params)

        logger.info(f"GIS processing completed: {task_type} via {tool}")
        return result

    async def _execute_gdal(self, task_type: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Execute processing using GDAL command-line tools."""
        operations = params.get("operations", [])
        input_path = params.get("input_path", "")
        output_path = params.get("output_path", os.path.join(self.temp_dir, f"gdal_output_{task_type}.tif"))

        results = []
        for op in operations:
            if op == "atmospheric_correction":
                cmd = f'gdal_calc.py -A "{input_path}" --outfile="{output_path}" --calc="A*0.0001" --type=Float32'
                output = await self._run_command(cmd)
                results.append({"operation": op, "output": output, "path": output_path})

            elif op == "cloud_mask":
                cmd = f'gdal_calc.py -A "{input_path}" --outfile="{output_path}" --calc="A<2000" --type=Byte'
                output = await self._run_command(cmd)
                results.append({"operation": op, "output": output, "path": output_path})

            elif op == "resample":
                resolution = params.get("resolution", 10)
                cmd = f'gdalwarp -tr {resolution} {resolution} -r bilinear "{input_path}" "{output_path}"'
                output = await self._run_command(cmd)
                results.append({"operation": op, "output": output, "path": output_path})

            elif op == "reproject":
                crs = params.get("crs", "EPSG:4326")
                cmd = f'gdalwarp -t_srs "{crs}" "{input_path}" "{output_path}"'
                output = await self._run_command(cmd)
                results.append({"operation": op, "output": output, "path": output_path})

            elif op == "mosaic":
                files = params.get("files", [])
                if len(files) > 1:
                    vrt_path = output_path.replace(".tif", ".vrt")
                    cmd1 = f'gdalbuildvrt "{vrt_path}" {" ".join(files)}'
                    cmd2 = f'gdal_translate "{vrt_path}" "{output_path}"'
                    await self._run_command(cmd1)
                    output = await self._run_command(cmd2)
                    results.append({"operation": op, "output": output, "path": output_path})

            elif op == "clip":
                bounds = params.get("bounds", [])
                if bounds:
                    cmd = f'gdal_translate -projwin {bounds[0]} {bounds[3]} {bounds[2]} {bounds[1]} "{input_path}" "{output_path}"'
                    output = await self._run_command(cmd)
                    results.append({"operation": op, "output": output, "path": output_path})

            elif op == "slope":
                cmd = f'gdaldem slope "{input_path}" "{output_path}" -p -of GTiff'
                output = await self._run_command(cmd)
                results.append({"operation": op, "output": output, "path": output_path})

            elif op == "aspect":
                cmd = f'gdaldem aspect "{input_path}" "{output_path}" -of GTiff'
                output = await self._run_command(cmd)
                results.append({"operation": op, "output": output, "path": output_path})

            elif op == "hillshade":
                cmd = f'gdaldem hillshade "{input_path}" "{output_path}" -of GTiff'
                output = await self._run_command(cmd)
                results.append({"operation": op, "output": output, "path": output_path})

        return {
            "tool": "gdal",
            "task_type": task_type,
            "results": results,
            "success": all(r.get("output", "") is not None for r in results),
        }

    async def _execute_geopandas(self, task_type: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Execute vector processing using GeoPandas."""
        input_path = params.get("input_path", "")
        output_path = params.get("output_path", os.path.join(self.temp_dir, f"geopandas_output.gpkg"))
        operations = params.get("operations", [])

        results = []
        for op in operations:
            if op == "buffer":
                distance = params.get("buffer_distance", 100)
                code = f"""
import geopandas as gpd
import json
gdf = gpd.read_file(r"{input_path}")
gdf_buffered = gdf.buffer({distance})
gdf_buffered.to_file(r"{output_path}", driver="GPKG")
print(json.dumps({{"features": len(gdf_buffered), "crs": str(gdf_buffered.crs)}}))
"""
                output = await self._run_python_code(code)
                results.append({"operation": op, "output": output, "path": output_path})

            elif op == "clip_vectors":
                clip_path = params.get("clip_path", "")
                code = f"""
import geopandas as gpd
import json
gdf = gpd.read_file(r"{input_path}")
clip = gpd.read_file(r"{clip_path}")
clipped = gpd.clip(gdf, clip)
clipped.to_file(r"{output_path}", driver="GPKG")
print(json.dumps({{"features": len(clipped), "crs": str(clipped.crs)}}))
"""
                output = await self._run_python_code(code)
                results.append({"operation": op, "output": output, "path": output_path})

            elif op == "intersection":
                overlay_path = params.get("overlay_path", "")
                code = f"""
import geopandas as gpd
import json
gdf1 = gpd.read_file(r"{input_path}")
gdf2 = gpd.read_file(r"{overlay_path}")
intersection = gpd.overlay(gdf1, gdf2, how="intersection")
intersection.to_file(r"{output_path}", driver="GPKG")
print(json.dumps({{"features": len(intersection), "crs": str(intersection.crs)}}))
"""
                output = await self._run_python_code(code)
                results.append({"operation": op, "output": output, "path": output_path})

            elif op == "dissolve":
                column = params.get("dissolve_column", None)
                code = f"""
import geopandas as gpd
import json
gdf = gpd.read_file(r"{input_path}")
dissolved = gdf.dissolve{'(by="' + column + '")' if column else '()'}
dissolved.to_file(r"{output_path}", driver="GPKG")
print(json.dumps({{"features": len(dissolved), "crs": str(dissolved.crs)}}))
"""
                output = await self._run_python_code(code)
                results.append({"operation": op, "output": output, "path": output_path})

            elif op == "spatial_join":
                join_path = params.get("join_path", "")
                how = params.get("join_type", "inner")
                code = f"""
import geopandas as gpd
import json
gdf1 = gpd.read_file(r"{input_path}")
gdf2 = gpd.read_file(r"{join_path}")
joined = gpd.sjoin(gdf1, gdf2, how="{how}")
joined.to_file(r"{output_path}", driver="GPKG")
print(json.dumps({{"features": len(joined), "crs": str(joined.crs)}}))
"""
                output = await self._run_python_code(code)
                results.append({"operation": op, "output": output, "path": output_path})

        return {
            "tool": "geopandas",
            "task_type": task_type,
            "results": results,
            "success": True,
        }

    async def _execute_rasterio(self, task_type: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Execute raster processing using Rasterio."""
        input_path = params.get("input_path", "")
        output_path = params.get("output_path", os.path.join(self.temp_dir, f"rasterio_output.tif"))
        operations = params.get("operations", [])

        results = []
        for op in operations:
            if op == "ndvi":
                nir_band = params.get("nir_band", 8)
                red_band = params.get("red_band", 4)
                code = f"""
import rasterio
import numpy as np
import json
with rasterio.open(r"{input_path}") as src:
    nir = src.read({nir_band}).astype(float)
    red = src.read({red_band}).astype(float)
    ndvi = (nir - red) / (nir + red + 1e-10)
    ndvi = np.clip(ndvi, -1, 1)
    profile = src.profile
    profile.update(dtype=rasterio.float32, count=1, compress="lzw")
    with rasterio.open(r"{output_path}", "w", **profile) as dst:
        dst.write(ndvi.astype(rasterio.float32), 1)
    print(json.dumps({{"min": float(ndvi.min()), "max": float(ndvi.max()), "mean": float(ndvi.mean())}}))
"""
                output = await self._run_python_code(code)
                results.append({"operation": op, "output": output, "path": output_path})

            elif op == "evi":
                code = f"""
import rasterio
import numpy as np
import json
with rasterio.open(r"{input_path}") as src:
    nir = src.read(8).astype(float)
    red = src.read(4).astype(float)
    blue = src.read(2).astype(float)
    evi = 2.5 * ((nir - red) / (nir + 6 * red - 7.5 * blue + 1))
    evi = np.clip(evi, -1, 1)
    profile = src.profile
    profile.update(dtype=rasterio.float32, count=1, compress="lzw")
    with rasterio.open(r"{output_path}", "w", **profile) as dst:
        dst.write(evi.astype(rasterio.float32), 1)
    print(json.dumps({{"min": float(evi.min()), "max": float(evi.max()), "mean": float(evi.mean())}}))
"""
                output = await self._run_python_code(code)
                results.append({"operation": op, "output": output, "path": output_path})

            elif op == "ndwi":
                code = f"""
import rasterio
import numpy as np
import json
with rasterio.open(r"{input_path}") as src:
    green = src.read(3).astype(float)
    nir = src.read(8).astype(float)
    ndwi = (green - nir) / (green + nir + 1e-10)
    ndwi = np.clip(ndwi, -1, 1)
    profile = src.profile
    profile.update(dtype=rasterio.float32, count=1, compress="lzw")
    with rasterio.open(r"{output_path}", "w", **profile) as dst:
        dst.write(ndwi.astype(rasterio.float32), 1)
    print(json.dumps({{"min": float(ndwi.min()), "max": float(ndwi.max()), "mean": float(ndwi.mean())}}))
"""
                output = await self._run_python_code(code)
                results.append({"operation": op, "output": output, "path": output_path})

            elif op == "classify":
                n_classes = params.get("n_classes", 5)
                code = f"""
import rasterio
import numpy as np
from sklearn.cluster import KMeans
import json
with rasterio.open(r"{input_path}") as src:
    data = src.read()
    n_bands, height, width = data.shape
    pixels = data.reshape(n_bands, -1).T
    pixels = pixels[~np.any(np.isnan(pixels), axis=1)]
    kmeans = KMeans(n_clusters={n_classes}, random_state=42, n_init=10)
    labels = kmeans.fit_predict(pixels)
    classified = np.zeros((height * width), dtype=np.uint8)
    mask = ~np.any(data.reshape(n_bands, -1).T == np.nan, axis=1)
    classified[mask] = labels
    classified = classified.reshape(height, width).astype(np.uint8)
    profile = src.profile
    profile.update(dtype=rasterio.uint8, count=1, compress="lzw")
    with rasterio.open(r"{output_path}", "w", **profile) as dst:
        dst.write(classified, 1)
    print(json.dumps({{"classes": int({n_classes}), "pixels_classified": int(np.sum(mask))}}))
"""
                output = await self._run_python_code(code)
                results.append({"operation": op, "output": output, "path": output_path})

        return {
            "tool": "rasterio",
            "task_type": task_type,
            "results": results,
            "success": True,
        }

    async def _execute_python(self, task_type: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Execute generic Python-based geospatial analysis."""
        code = params.get("code", "")
        if code:
            output = await self._run_python_code(code)
        else:
            output = await self._run_python_code(f"print('Executed {task_type} with params: {json.dumps(params)}')")

        return {
            "tool": "python",
            "task_type": task_type,
            "results": [{"operation": "python_execution", "output": output}],
            "success": True,
        }

    async def _execute_qgis(self, task_type: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Execute processing using QGIS processing framework (qgis_process)."""
        algorithm = params.get("algorithm", "native:buffer")
        input_path = params.get("input_path", "")
        output_path = params.get("output_path", os.path.join(self.temp_dir, f"qgis_output.gpkg"))

        cmd = f'qgis_process run "{algorithm}" --INPUT="{input_path}" --OUTPUT="{output_path}"'
        output = await self._run_command(cmd)

        return {
            "tool": "qgis",
            "task_type": task_type,
            "results": [{"algorithm": algorithm, "output": output, "path": output_path}],
            "success": True,
        }

    async def _execute_saga(self, task_type: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Execute processing using SAGA GIS command-line tools."""
        module = params.get("module", "ta_lighting")
        input_path = params.get("input_path", "")
        output_path = params.get("output_path", os.path.join(self.temp_dir, "saga_output.sdat"))

        cmd = f'saga_cmd "{module}" -DEM="{input_path}" -SHADE="{output_path}"'
        output = await self._run_command(cmd)

        return {
            "tool": "saga_gis",
            "task_type": task_type,
            "results": [{"module": module, "output": output, "path": output_path}],
            "success": True,
        }

    async def _execute_grass(self, task_type: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Execute processing using GRASS GIS."""
        module = params.get("module", "r.slope.aspect")
        input_path = params.get("input_path", "")
        output_path = params.get("output_path", os.path.join(self.temp_dir, "grass_output.tif"))

        cmd = f'{module} elevation="{input_path}" slope="{output_path}" --overwrite'
        output = await self._run_command(cmd)

        return {
            "tool": "grass_gis",
            "task_type": task_type,
            "results": [{"module": module, "output": output, "path": output_path}],
            "success": True,
        }

    async def _execute_fragstats(self, task_type: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Execute landscape metrics using Fragstats."""
        input_path = params.get("input_path", "")
        output_path = params.get("output_path", os.path.join(self.temp_dir, "fragstats_output.txt"))
        metrics = params.get("metrics", ["patch_area", "edge_density", "shape_index"])

        # Generate Fragstats batch file
        batch_content = f"""
Grid: {input_path}
Output: {output_path}
Class Metrics: {','.join(metrics)}
Landscape Metrics: {','.join(metrics)}
"""
        batch_path = os.path.join(self.temp_dir, "fragstats_batch.fbt")
        with open(batch_path, "w") as f:
            f.write(batch_content)

        cmd = f'fragstats -m "{batch_path}"'
        output = await self._run_command(cmd)

        return {
            "tool": "fragstats",
            "task_type": task_type,
            "results": [{"metrics": metrics, "output": output, "path": output_path}],
            "success": True,
        }

    async def _run_command(self, cmd: str) -> str:
        """Run a shell command asynchronously."""
        try:
            proc = await asyncio.create_subprocess_shell(
                cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=300)
            if proc.returncode != 0:
                logger.warning(f"Command failed (code {proc.returncode}): {cmd[:100]}...")
                return f"Warning: {stderr.decode(errors='replace')[:500]}"
            return stdout.decode(errors="replace")[:1000]
        except asyncio.TimeoutError:
            proc.terminate()
            return "Error: Command timed out after 300s"
        except FileNotFoundError:
            return f"Warning: Tool not installed. Command: {cmd.split()[0]}"
        except Exception as e:
            logger.error(f"Command error: {e}")
            return f"Error: {str(e)}"

    async def _run_python_code(self, code: str) -> str:
        """Run Python code asynchronously."""
        try:
            proc = await asyncio.create_subprocess_exec(
                "python", "-c", code,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=120)
            if proc.returncode != 0:
                return f"Error: {stderr.decode(errors='replace')[:500]}"
            return stdout.decode(errors="replace")[:1000]
        except asyncio.TimeoutError:
            return "Error: Python code timed out"
        except Exception as e:
            return f"Error: {str(e)}"

    async def compute_ndvi(self, input_path: str, output_path: str = None, nir_band: int = 8, red_band: int = 4) -> Dict[str, Any]:
        """Convenience method: Compute NDVI."""
        return await self._execute_rasterio("ndvi", {
            "input_path": input_path,
            "output_path": output_path,
            "operations": ["ndvi"],
            "nir_band": nir_band,
            "red_band": red_band,
        })

    async def compute_terrain(self, dem_path: str, output_dir: str = None) -> Dict[str, Any]:
        """Convenience method: Compute terrain attributes from DEM."""
        return await self._execute_gdal("terrain_analysis", {
            "input_path": dem_path,
            "output_path": os.path.join(output_dir or self.temp_dir, "terrain_output.tif"),
            "operations": ["slope", "aspect", "hillshade"],
        })

    async def classify_lulc(self, input_path: str, n_classes: int = 5, output_path: str = None) -> Dict[str, Any]:
        """Convenience method: Run LULC classification."""
        return await self._execute_rasterio("classification", {
            "input_path": input_path,
            "output_path": output_path,
            "operations": ["classify"],
            "n_classes": n_classes,
        })

    def cleanup_temp(self):
        """Clean up temporary files."""
        import shutil
        if os.path.exists(self.temp_dir):
            shutil.rmtree(self.temp_dir)
        os.makedirs(self.temp_dir, exist_ok=True)
