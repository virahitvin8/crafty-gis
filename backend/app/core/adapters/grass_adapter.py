"""
GRASS GIS Adapter for CRAFTY GIS
Interfaces with GRASS GIS processing tools via command line and Python bindings
"""
import subprocess
import logging
import os
import tempfile
from pathlib import Path
from typing import Dict, Any, Optional, List
import json
import xml.etree.ElementTree as ET

logger = logging.getLogger(__name__)

class GRASSAdapter:
    """
    Adapter for interfacing with GRASS GIS processing tools.
    Uses GRASS GIS command line tools for geoprocessing and analysis.
    """

    def __init__(self):
        # In production, these would come from config/settings
        self.grass_path = os.environ.get("GRASS_PATH", "grass")
        self.grassdb_path = os.environ.get("GRASSDB_PATH", "./grassdata")

    async def perform_change_detection(
        self,
        before_raster: str,
        after_raster: str,
        method: str = "post_classification_comparison",
        parameters: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Perform change detection analysis using GRASS GIS tools.
        """
        if parameters is None:
            parameters = {}

        try:
            # Create a temporary GRASS location and mapset
            location_name = f"location_{os.getpid()}"
            mapset_name = "PERMANENT"
            location_path = os.path.join(self.grassdb_path, location_name)

            # Create location from the raster files
            cmd_create_location = [
                self.grass_path,
                "-c", before_raster,
                location_path,
                "--exec", "g.proj", "-p"
            ]

            logger.info(f"Creating GRASS location: {' '.join(cmd_create_location)}")
            result = subprocess.run(cmd_create_location, capture_output=True, text=True, timeout=60)

            if result.returncode != 0:
                logger.error(f"Failed to create GRASS location: {result.stderr}")
                raise Exception(f"GRASS location creation failed: {result.stderr}")

            # Import raster files into GRASS
            before_map_name = "before_raster"
            after_map_name = "after_raster"

            cmd_import_before = [
                self.grass_path,
                location_name,
                mapset_name,
                "--exec", "r.import",
                f"input={before_raster}",
                f"output={before_map_name}",
                "--overwrite"
            ]

            logger.info(f"Importing before raster: {' '.join(cmd_import_before)}")
            result = subprocess.run(cmd_import_before, capture_output=True, text=True, timeout=120)

            if result.returncode != 0:
                logger.error(f"Failed to import before raster: {result.stderr}")
                raise Exception(f"GRASS r.import failed: {result.stderr}")

            cmd_import_after = [
                self.grass_path,
                location_name,
                mapset_name,
                "--exec", "r.import",
                f"input={after_raster}",
                f"output={after_map_name}",
                "--overwrite"
            ]

            logger.info(f"Importing after raster: {' '.join(cmd_import_after)}")
            result = subprocess.run(cmd_import_after, capture_output=True, text=True, timeout=120)

            if result.returncode != 0:
                logger.error(f"Failed to import after raster: {result.stderr}")
                raise Exception(f"GRASS r.import failed: {result.stderr}")

            # Perform change detection based on method
            output_map_name = "change_detected"

            if method == "post_classification_comparison":
                # Post-classification comparison
                cmd_change = [
                    self.grass_path,
                    location_name,
                    mapset_name,
                    "--exec", "r.mapcalc",
                    f"expression=\"{output_map_name} = if({before_map_name} != {after_map_name}, 1, 0)\"",
                    "--overwrite"
                ]
            elif method == "image_differencing":
                # Simple image differencing
                cmd_change = [
                    self.grass_path,
                    location_name,
                    mapset_name,
                    "--exec", "r.mapcalc",
                    f"expression=\"{output_map_name} = float({after_map_name}) - float({before_map_name})\"",
                    "--overwrite"
                ]
            elif method == "ndvi_differencing":
                # Assuming inputs are NDVI or similar indices
                cmd_change = [
                    self.grass_path,
                    location_name,
                    mapset_name,
                    "--exec", "r.mapcalc",
                    f"expression=\"{output_map_name} = {after_map_name} - {before_map_name}\"",
                    "--overwrite"
                ]
            else:
                # Default to post-classification comparison
                cmd_change = [
                    self.grass_path,
                    location_name,
                    mapset_name,
                    "--exec", "r.mapcalc",
                    f"expression=\"{output_map_name} = if({before_map_name} != {after_map_name}, 1, 0)\"",
                    "--overwrite"
                ]

            logger.info(f"Performing change detection: {' '.join(cmd_change)}")
            result = subprocess.run(cmd_change, capture_output=True, text=True, timeout=120)

            if result.returncode != 0:
                logger.error(f"Change detection failed: {result.stderr}")
                raise Exception(f"GRASS r.mapcalc failed: {result.stderr}")

            # Export result back to GeoTIFF
            output_dir = tempfile.mkdtemp()
            output_raster = os.path.join(output_dir, f"change_detection_{os.getpid()}.tif")

            cmd_export = [
                self.grass_path,
                location_name,
                mapset_name,
                "--exec", "r.out.gdal",
                f"input={output_map_name}",
                f"output={output_raster}",
                f"format=GTiff",
                "--overwrite"
            ]

            logger.info(f"Exporting change detection result: {' '.join(cmd_export)}")
            result = subprocess.run(cmd_export, capture_output=True, text=True, timeout=120)

            if result.returncode != 0:
                logger.error(f"Failed to export result: {result.stderr}")
                raise Exception(f"GRASS r.out.gdal failed: {result.stderr}")

            if not os.path.exists(output_raster):
                raise Exception("Change detection output file was not created")

            # Clean up GRASS location (optional - could keep for debugging)
            # shutil.rmtree(location_path, ignore_errors=True)

            return {
                "change_raster": output_raster,
                "method_used": method,
                "before_raster": before_raster,
                "after_raster": after_raster,
                "processing_log": result.stdout
            }

        except subprocess.TimeoutExpired:
            logger.error("GRASS change detection timed out")
            raise Exception("GRASS change detection process timed out")
        except Exception as e:
            logger.error(f"Error in GRASS change detection: {str(e)}")
            raise

    async def perform_watershed_analysis(
        self,
        dem_file: str,
        parameters: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Perform watershed analysis using GRASS GIS hydrology tools.
        """
        if parameters is None:
            parameters = {}

        try:
            # Create a temporary GRASS location and mapset
            location_name = f"watershed_location_{os.getpid()}"
            mapset_name = "PERMANENT"
            location_path = os.path.join(self.grassdb_path, location_name)

            # Create location from the DEM file
            cmd_create_location = [
                self.grass_path,
                "-c", dem_file,
                location_path,
                "--exec", "g.proj", "-p"
            ]

            logger.info(f"Creating GRASS location for watershed: {' '.join(cmd_create_location)}")
            result = subprocess.run(cmd_create_location, capture_output=True, text=True, timeout=60)

            if result.returncode != 0:
                logger.error(f"Failed to create GRASS location: {result.stderr}")
                raise Exception(f"GRASS location creation failed: {result.stderr}")

            # Import DEM into GRASS
            dem_map_name = "dem"

            cmd_import_dem = [
                self.grass_path,
                location_name,
                mapset_name,
                "--exec", "r.import",
                f"input={dem_file}",
                f"output={dem_map_name}",
                "--overwrite"
            ]

            logger.info(f"Importing DEM: {' '.join(cmd_import_dem)}")
            result = subprocess.run(cmd_import_dem, capture_output=True, text=True, timeout=120)

            if result.returncode != 0:
                logger.error(f"Failed to import DEM: {result.stderr}")
                raise Exception(f"GRASS r.import failed: {result.stderr}")

            # Set computational region to match DEM
            cmd_gregion = [
                self.grass_path,
                location_name,
                mapset_name,
                "--exec", "g.region",
                f"raster={dem_map_name}",
                "--align",
                "--exec", "g.region", "-p"
            ]

            logger.info(f"Setting computational region: {' '.join(cmd_gregion)}")
            result = subprocess.run(cmd_gregion, capture_output=True, text=True, timeout=60)

            if result.returncode != 0:
                logger.error(f"Failed to set computational region: {result.stderr}")
                raise Exception(f"GRASS g.region failed: {result.stderr}")

            # Fill sinks in DEM (optional but recommended)
            dem_filled = "dem_filled"
            cmd_fill_sink = [
                self.grass_path,
                location_name,
                mapset_name,
                "--exec", "r.fill.dir",
                f"input={dem_map_name}",
                f"direction={dem_filled}_dir",
                f"elevation={dem_filled}",
                f"reaspect={dem_filled}_asp",
                "--overwrite"
            ]

            logger.info(f"Filling sinks in DEM: {' '.join(cmd_fill_sink)}")
            result = subprocess.run(cmd_fill_sink, capture_output=True, text=True, timeout=120)

            if result.returncode != 0:
                logger.warning(f"Sink filling failed (continuing anyway): {result.stderr}")
                # Continue with original DEM if filling fails
                dem_filled = dem_map_name

            # Flow accumulation
            flow_accum = "flow_accumulation"
            cmd_flow_acc = [
                self.grass_path,
                location_name,
                mapset_name,
                "--exec", "r.watershed",
                f"elevation={dem_filled}",
                f"accumulation={flow_accum}",
                f"drainage={flow_accum}_drain",
                f"stream={flow_accum}_stream",
                f"basin={flow_accum}_basin",
                f"threshold={parameters.get('threshold', 100)}",
                "--overwrite"
            ]

            logger.info(f"Running watershed analysis: {' '.join(cmd_flow_acc)}")
            result = subprocess.run(cmd_flow_acc, capture_output=True, text=True, timeout=300)

            if result.returncode != 0:
                logger.error(f"Watershed analysis failed: {result.stderr}")
                raise Exception(f"GRASS r.watershed failed: {result.stderr}")

            # Export results
            output_dir = tempfile.mkdtemp()
            outputs = {}

            # Export flow accumulation
            flow_acc_file = os.path.join(output_dir, f"flow_accum_{os.getpid()}.tif")
            cmd_export_acc = [
                self.grass_path,
                location_name,
                mapset_name,
                "--exec", "r.out.gdal",
                f"input={flow_accum}",
                f"output={flow_acc_file}",
                f"format=GTiff",
                "--overwrite"
            ]

            result = subprocess.run(cmd_export_acc, capture_output=True, text=True, timeout=120)
            if result.returncode == 0 and os.path.exists(flow_acc_file):
                outputs["flow_accumulation"] = flow_acc_file

            # Export stream network
            stream_file = os.path.join(output_dir, f"streams_{os.getpid()}.tif")
            cmd_export_stream = [
                self.grass_path,
                location_name,
                mapset_name,
                "--exec", "r.out.gdal",
                f"input={flow_accum}_stream",
                f"output={stream_file}",
                f"format=GTiff",
                "--overwrite"
            ]

            result = subprocess.run(cmd_export_stream, capture_output=True, text=True, timeout=120)
            if result.returncode == 0 and os.path.exists(stream_file):
                outputs["streams"] = stream_file

            # Export basins
            basin_file = os.path.join(output_dir, f"basins_{os.getpid()}.tif")
            cmd_export_basin = [
                self.grass_path,
                location_name,
                mapset_name,
                "--exec", "r.out.gdal",
                f"input={flow_accum}_basin",
                f"output={basin_file}",
                f"format=GTiff",
                "--overwrite"
            ]

            result = subprocess.run(cmd_export_basin, capture_output=True, text=True, timeout=120)
            if result.returncode == 0 and os.path.exists(basin_file):
                outputs["basins"] = basin_file

            # Clean up GRASS location (optional)
            # shutil.rmtree(location_path, ignore_errors=True)

            return {
                "watershed_outputs": outputs,
                "dem_used": dem_file,
                "threshold_used": parameters.get('threshold', 100),
                "processing_log": result.stdout
            }

        except subprocess.TimeoutExpired:
            logger.error("GRASS watershed analysis timed out")
            raise Exception("GRASS watershed analysis process timed out")
        except Exception as e:
            logger.error(f"Error in GRASS watershed analysis: {str(e)}")
            raise

    async def calculate_vegetation_indices(
        self,
        input_raster: str,
        indices: List[str] = None,
        parameters: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Calculate vegetation indices using GRASS GIS mapcalc.
        """
        if indices is None:
            indices = ["NDVI", "EVI", "SAVI"]
        if parameters is None:
            parameters = {}

        try:
            # Create a temporary GRASS location and mapset
            location_name = f"vi_location_{os.getpid()}"
            mapset_name = "PERMANENT"
            location_path = os.path.join(self.grassdb_path, location_name)

            # Create location from the input raster
            cmd_create_location = [
                self.grass_path,
                "-c", input_raster,
                location_path,
                "--exec", "g.proj", "-p"
            ]

            logger.info(f"Creating GRASS location for VI calculation: {' '.join(cmd_create_location)}")
            result = subprocess.run(cmd_create_location, capture_output=True, text=True, timeout=60)

            if result.returncode != 0:
                logger.error(f"Failed to create GRASS location: {result.stderr}")
                raise Exception(f"GRASS location creation failed: {result.stderr}")

            # Import raster into GRASS
            # Assuming multi-band raster - we'd need to separate bands first
            # For simplicity, assuming we have the necessary bands as separate files
            # In practice, we'd use r.colors, r.mapcalc, etc. to calculate indices

            output_dir = tempfile.mkdtemp()
            vi_outputs = {}

            # This is a simplified implementation
            # In reality, we would need to:
            # 1. Extract appropriate bands (e.g., red, nir for NDVI)
            # 2. Apply the specific formulas for each index
            # For demo purposes, we'll just note what would be calculated

            for index in indices:
                vi_map_name = f"{index.lower()}_index"
                vi_file = os.path.join(output_dir, f"{index}_{os.getpid()}.tif")

                # Example formula for NDVI (would need NIR and Red bands)
                if index == "NDVI":
                    # Assuming we have band 4 (NIR) and band 3 (Red) - would need to extract these
                    expr = "float(nir_band - red_band) / float(nir_band + red_band)"
                elif index == "EVI":
                    expr = "2.5 * float(nir_band - red_band) / float(nir_band + 6 * red_band - 7.5 * blue_band + 1)"
                elif index == "SAVI":
                    expr = "(1.5) * float(nir_band - red_band) / float(nir_band + red_band + 0.5)"
                else:
                    expr = f"0  # Placeholder for {index}"

                # This would be the actual r.mapcalc command
                cmd_calc_vi = [
                    self.grass_path,
                    location_name,
                    mapset_name,
                    "--exec", "r.mapcalc",
                    f"expression=\"{vi_map_name} = {expr}\"",
                    "--overwrite"
                ]

                # Export the result
                cmd_export_vi = [
                    self.grass_path,
                    location_name,
                    mapset_name,
                    "--exec", "r.out.gdal",
                    f"input={vi_map_name}",
                    f"output={vi_file}",
                    f"format=GTiff",
                    "--overwrite"
                ]

                # In a real implementation, we would extract bands first
                # For now, we'll simulate the process
                logger.info(f"Would calculate {index} with expression: {expr}")

                vi_outputs[index] = {
                    "formula_used": expr,
                    "output_file": vi_file,  # Would be real file in implementation
                    "bands_required": self._get_bands_for_index(index)
                }

            # Clean up GRASS location (optional)
            # shutil.rmtree(location_path, ignore_errors=True)

            return {
                "vegetation_indices": vi_outputs,
                "input_raster": input_raster,
                "processing_log": "VI calculation simulated - would extract bands and apply formulas"
            }

        except subprocess.TimeoutExpired:
            logger.error("GRASS vegetation indices calculation timed out")
            raise Exception("GRASS VI calculation process timed out")
        except Exception as e:
            logger.error(f"Error in GRASS vegetation indices calculation: {str(e)}")
            raise

    def _get_bands_for_index(self, index: str) -> List[str]:
        """Helper method to determine which bands are needed for each vegetation index."""
        band_requirements = {
            "NDVI": ["NIR", "Red"],
            "EVI": ["NIR", "Red", "Blue"],
            "SAVI": ["NIR", "Red"],
            "MSAVI": ["NIR", "Red"],
            "EPSI": ["NIR", "Red", "Blue"],
            "GCI": ["NIR", "Green"]
        }
        return band_requirements.get(index, ["Unknown"])

# Singleton instance
grass_adapter = GRASSAdapter()