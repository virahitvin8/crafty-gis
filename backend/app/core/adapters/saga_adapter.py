"""
SAGA GIS Adapter for CRAFTY GIS
Interfaces with SAGA GIS processing tools via command line
"""
import subprocess
import logging
import os
import tempfile
from pathlib import Path
from typing import Dict, Any, Optional, List
import json

logger = logging.getLogger(__name__)

class SAGAAdapter:
    """
    Adapter for interfacing with SAGA GIS processing tools.
    Uses SAGA GIS command line interface (saga_cmd) for geoprocessing.
    """

    def __init__(self):
        # In production, these would come from config/settings
        self.saga_cmd_path = os.environ.get("SAGA_CMD_PATH", "saga_cmd")

    async def perform_terrain_analysis(
        self,
        dem_file: str,
        analysis_type: str = "slope_aspect_curvature",
        parameters: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Perform terrain analysis using SAGA GIS modules.
        """
        if parameters is None:
            parameters = {}

        try:
            output_dir = tempfile.mkdtemp()

            # Different analysis types map to different SAGA modules
            if analysis_type == "slope_aspect_curvature":
                # Slope, aspect, curvature
                slope_file = os.path.join(output_dir, f"slope_{os.getpid()}.sgrd")
                aspect_file = os.path.join(output_dir, f"aspect_{os.getpid()}.sgrd")
                curv_file = os.path.join(output_dir, f"curvature_{os.getpid()}.sgrd")

                # Slope
                cmd_slope = [
                    self.saga_cmd_path,
                    "ta_morphometry", "0",  # Slope, Aspect, Curvature
                    f"-ELEVATION={dem_file}",
                    f"-SLOPE={slope_file}",
                    f"-ASPECT={aspect_file}",
                    f"-CURV={curv_file}",
                    f"-METHOD={parameters.get('method', 6)}"  # 6 = ZevenbergenThorpe
                ]

                logger.info(f"Executing SAGA terrain analysis: {' '.join(cmd_slope)}")
                result = subprocess.run(cmd_slope, capture_output=True, text=True, timeout=300)

                if result.returncode != 0:
                    logger.error(f"SAGA terrain analysis failed: {result.stderr}")
                    raise Exception(f"SAGA processing failed: {result.stderr}")

                return {
                    "slope_file": slope_file,
                    "aspect_file": aspect_file,
                    "curvature_file": curv_file,
                    "analysis_type": analysis_type,
                    "processing_log": result.stdout
                }

            elif analysis_type == "hydrology":
                # Watershed delineation
                watershed_file = os.path.join(output_dir, f"watershed_{os.getpid()}.sgrd")
                streams_file = os.path.join(output_dir, f"streams_{os.getpid()}.sgrd")

                cmd_hydro = [
                    self.saga_cmd_path,
                    "ta_hydrology", "14",  # Catchment Area (Deterministic 8)
                    f"-ELEVATION={dem_file}",
                    f"-AREA={watershed_file}",
                    f"-CONVERGENCE={parameters.get('convergence', 1.1)}"
                ]

                logger.info(f"Executing SAGA hydrology analysis: {' '.join(cmd_hydro)}")
                result = subprocess.run(cmd_hydro, capture_output=True, text=True, timeout=300)

                if result.returncode != 0:
                    logger.error(f"SAGA hydrology analysis failed: {result.stderr}")
                    raise Exception(f"SAGA processing failed: {result.stderr}")

                # Stream extraction
                streams_cmd = [
                    self.saga_cmd_path,
                    "ta_hydrology", "6",  # Channel Network and Drainage Basins
                    f"-ELEVATION={dem_file}",
                    f"-INIT_GRID={watershed_file}",
                    f"-STREAM={streams_file}",
                    f"-THRESHOLD={parameters.get('stream_threshold', 100)}"
                ]

                result2 = subprocess.run(streams_cmd, capture_output=True, text=True, timeout=300)
                if result2.returncode != 0:
                    logger.error(f"SAGA stream extraction failed: {result2.stderr}")
                    raise Exception(f"SAGA stream processing failed: {result2.stderr}")

                return {
                    "watershed_file": watershed_file,
                    "streams_file": streams_file,
                    "analysis_type": analysis_type,
                    "processing_log": result.stdout + "\n" + result2.stdout
                }

            else:
                raise ValueError(f"Unsupported SAGA analysis type: {analysis_type}")

        except subprocess.TimeoutExpired:
            logger.error("SAGA processing timed out")
            raise Exception("SAGA process timed out")
        except Exception as e:
            logger.error(f"Error in SAGA processing: {str(e)}")
            raise

    async def perform_image_segmentation(
        self,
        input_raster: str,
        segmentation_type: str = "region_growing",
        parameters: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Perform image segmentation using SAGA GIS.
        """
        if parameters is None:
            parameters = {}

        try:
            output_dir = tempfile.mkdtemp()
            segments_file = os.path.join(output_dir, f"segments_{os.getpid()}.sgrd")

            if segmentation_type == "region_growing":
                # Region growing segmentation
                cmd = [
                    self.saga_cmd_path,
                    "imagesegmentation", "0",  # Region Growing
                    f"-GRID={input_raster}",
                    f"-SEGMENTS={segments_file}",
                    f"-THRESHOLD={parameters.get('threshold', 10)}",
                    f"-MINSIZE={parameters.get('minsize', 5)}"
                ]
            elif segmentation_type == "watershed":
                # Watershed segmentation
                cmd = [
                    self.saga_cmd_path,
                    "imagesegmentation", "1",  # Watershed
                    f"-GRID={input_raster}",
                    f"-SEGMENTS={segments_file}",
                    f"-THRESHOLD={parameters.get('threshold', 0.5)}"
                ]
            else:
                raise ValueError(f"Unsupported segmentation type: {segmentation_type}")

            logger.info(f"Executing SAGA image segmentation: {' '.join(cmd)}")
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)

            if result.returncode != 0:
                logger.error(f"SAGA image segmentation failed: {result.stderr}")
                raise Exception(f"SAGA processing failed: {result.stderr}")

            if not os.path.exists(segments_file):
                raise Exception("Segmentation output file was not created")

            return {
                "segments_file": segments_file,
                "segmentation_type": segmentation_type,
                "parameters_used": parameters,
                "processing_log": result.stdout
            }

        except subprocess.TimeoutExpired:
            logger.error("SAGA image segmentation timed out")
            raise Exception("SAGA segmentation process timed out")
        except Exception as e:
            logger.error(f"Error in SAGA image segmentation: {str(e)}")
            raise

    async def convert_grid_format(
        self,
        input_grid: str,
        output_format: str,
        output_file: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Convert SAGA grid format to other formats (GeoTIFF, etc.).
        """
        if output_file is None:
            output_dir = tempfile.mkdtemp()
            extension = {
                "GeoTIFF": ".tif",
                "ESRI Grid": ".asc",
                "NetCDF": ".nc"
            }.get(output_format, ".tif")
            output_file = os.path.join(output_dir, f"converted_{os.getpid()}{extension}")

        try:
            # Using SAGA for grid conversion
            cmd = [
                self.saga_cmd_path,
                "io_gdal", "1",  # Export GDAL
                f"-GRIDS={input_grid}",
                f"-FILE={output_file}",
                f"-FORMAT={parameters.get('gdal_format', 'GTiff')}" if 'parameters' in locals() else "-FORMAT=GTiff"
            ]

            # Actually, let's simplify this - SAGA grid export
            cmd = [
                self.saga_cmd_path,
                "io_gdal", "1",
                f"-GRIDS={input_grid}",
                f"-FILE={output_file}"
            ]

            logger.info(f"Executing SAGA grid conversion: {' '.join(cmd)}")
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=180)

            if result.returncode != 0:
                logger.error(f"SAGA grid conversion failed: {result.stderr}")
                raise Exception(f"SAGA processing failed: {result.stderr}")

            if not os.path.exists(output_file):
                raise Exception("Converted output file was not created")

            return {
                "output_file": output_file,
                "input_file": input_grid,
                "output_format": output_format,
                "processing_log": result.stdout
            }

        except subprocess.TimeoutExpired:
            logger.error("SAGA grid conversion timed out")
            raise Exception("SAGA conversion process timed out")
        except Exception as e:
            logger.error(f"Error in SAGA grid conversion: {str(e)}")
            raise

# Singleton instance
saga_adapter = SAGAAdapter()