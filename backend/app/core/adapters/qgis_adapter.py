"""
QGIS Adapter for CRAFTY GIS
Interfaces with QGIS processing tools via command line and Python bindings
"""
import subprocess
import logging
import os
import tempfile
from pathlib import Path
from typing import Dict, Any, Optional, List
import json

logger = logging.getLogger(__name__)

class QGISAdapter:
    """
    Adapter for interfacing with QGIS processing tools.
    Uses QGIS processing algorithms via command line or Python bindings.
    """

    def __init__(self):
        # In production, these would come from config/settings
        self.qgis_path = os.environ.get("QGIS_PATH", "qgis_process")
        self.python_path = os.environ.get("PYTHON_PATH", "python")

    async def perform_classification(
        self,
        input_raster: str,
        training_samples: str,
        algorithm: str = "Random Forest",
        num_classes: int = 5,
        output_format: str = "GeoTIFF"
    ) -> Dict[str, Any]:
        """
        Perform supervised classification using QGIS processing algorithms.
        """
        try:
            # Create output file path
            output_dir = tempfile.mkdtemp()
            output_raster = os.path.join(output_dir, f"classification_{os.getpid()}.tif")

            # Prepare QGIS processing command
            # This is a simplified example - actual QGIS processing would use specific algorithms
            cmd = [
                self.qgis_path,
                "andygis:randomforestclassification",  # Example algorithm
                f"--INPUT={input_raster}",
                f"--TRAINING_VECTOR={training_samples}",
                f"--NUM_TREES=50",
                f"--MAX_DEPTH=10",
                f"--MIN_SAMPLE_LEAF=1",
                f"--OUTPUT={output_raster}"
            ]

            logger.info(f"Executing QGIS classification: {' '.join(cmd)}")

            # Execute the process
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=300  # 5 minute timeout
            )

            if result.returncode != 0:
                logger.error(f"QGIS classification failed: {result.stderr}")
                raise Exception(f"QGIS processing failed: {result.stderr}")

            # Verify output exists
            if not os.path.exists(output_raster):
                raise Exception("Classification output file was not created")

            return {
                "classified_raster": output_raster,
                "algorithm_used": algorithm,
                "num_classes": num_classes,
                "output_format": output_format,
                "processing_log": result.stdout
            }

        except subprocess.TimeoutExpired:
            logger.error("QGIS classification timed out")
            raise Exception("Classification process timed out")
        except Exception as e:
            logger.error(f"Error in QGIS classification: {str(e)}")
            raise

    async def run_vector_analysis(
        self,
        input_vector: str,
        analysis_type: str,
        parameters: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Run vector analysis using QGIS tools.
        """
        if parameters is None:
            parameters = {}

        try:
            output_dir = tempfile.mkdtemp()
            output_vector = os.path.join(output_dir, f"vector_analysis_{os.getpid()}.gpkg")

            # Example buffer analysis - would be customized based on analysis_type
            cmd = [
                self.qgis_path,
                "native:buffer",
                f"--INPUT={input_vector}",
                f"--DISTANCE={parameters.get('distance', 100)}",
                f"--SEGMENTS=5",
                f"--END_CAP_STYLE=0",
                f"--JOIN_STYLE=0",
                f"--MITER_LIMIT=2",
                f"--DISSOLVE=false",
                f"--OUTPUT={output_vector}"
            ]

            logger.info(f"Executing QGIS vector analysis: {' '.join(cmd)}")

            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=180
            )

            if result.returncode != 0:
                logger.error(f"QGIS vector analysis failed: {result.stderr}")
                raise Exception(f"QGIS processing failed: {result.stderr}")

            if not os.path.exists(output_vector):
                raise Exception("Vector analysis output file was not created")

            return {
                "output_vector": output_vector,
                "analysis_type": analysis_type,
                "parameters_used": parameters,
                "processing_log": result.stdout
            }

        except subprocess.TimeoutExpired:
            logger.error("QGIS vector analysis timed out")
            raise Exception("Vector analysis process timed out")
        except Exception as e:
            logger.error(f"Error in QGIS vector analysis: {str(e)}")
            raise

    async def convert_format(
        self,
        input_file: str,
        output_format: str,
        output_file: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Convert between different geospatial formats using GDAL/OGR via QGIS.
        """
        if output_file is None:
            output_dir = tempfile.mkdtemp()
            extension = {
                "GeoTIFF": ".tif",
                "Shapefile": ".shp",
                "GeoPackage": ".gpkg",
                "KML": ".kml"
            }.get(output_format, ".tif")
            output_file = os.path.join(output_dir, f"converted_{os.getpid()}{extension}")

        try:
            # Using GDAL tools via QGIS or direct GDAL calls
            # This is simplified - in practice would use appropriate GDAL/OGR tools
            cmd = [
                self.qgis_path,
                "gdal:convertformat",
                f"--INPUT={input_file}",
                f"--OUTPUT={output_file}",
                f"--FORMAT={output_format}"
            ]

            logger.info(f"Executing format conversion: {' '.join(cmd)}")

            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=120
            )

            if result.returncode != 0:
                logger.error(f"Format conversion failed: {result.stderr}")
                raise Exception(f"Conversion failed: {result.stderr}")

            if not os.path.exists(output_file):
                raise Exception("Converted output file was not created")

            return {
                "output_file": output_file,
                "input_file": input_file,
                "output_format": output_format,
                "processing_log": result.stdout
            }

        except subprocess.TimeoutExpired:
            logger.error("Format conversion timed out")
            raise Exception("Conversion process timed out")
        except Exception as e:
            logger.error(f"Error in format conversion: {str(e)}")
            raise

# Singleton instance
qgis_adapter = QGISAdapter()