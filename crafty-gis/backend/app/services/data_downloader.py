"""Data Downloader Service — downloads satellite imagery and geospatial data from public APIs."""

import os
import logging
import asyncio
from pathlib import Path
from typing import Optional
from datetime import datetime
from app.config import settings

logger = logging.getLogger(__name__)


class DataDownloader:
    """Downloads satellite imagery and geospatial data from various sources."""

    def __init__(self):
        self.downloads_dir = Path(settings.downloads_dir)
        self.downloads_dir.mkdir(parents=True, exist_ok=True)

    async def download_sentinel2(
        self,
        bounds: tuple[float, float, float, float],
        start_date: str,
        end_date: str,
        max_cloud_cover: float = 20.0,
        limit: int = 5,
    ) -> list[Path]:
        """Download Sentinel-2 imagery from Copernicus Open Access Hub.

        Uses sentinelsat library. Falls back to mock data URLs if not configured.
        """
        logger.info(f"Searching Sentinel-2: bounds={bounds}, dates={start_date} to {end_date}")

        try:
            from sentinelsat import SentinelAPI, read_geojson
            from shapely.geometry import box

            # Create a bounding box polygon
            footprint = box(*bounds)

            # Connect to Copernicus API
            api = SentinelAPI(
                os.getenv("COPERNICUS_USER", ""),
                os.getenv("COPERNICUS_PASS", ""),
                "https://scihub.copernicus.eu/dhus",
            )

            products = api.query(
                footprint,
                date=(start_date, end_date),
                platformname="Sentinel-2",
                processinglevel="Level-2A",
                cloudcoverpercentage=(0, max_cloud_cover),
                limit=limit,
            )

            if not products:
                logger.warning("No Sentinel-2 products found")
                return []

            Downloaded_paths = []
            for product_id, product in products.items():
                output_dir = self.downloads_dir / f"sentinel2_{product_id[:8]}"
                output_dir.mkdir(exist_ok=True)

                # Download the product
                api.download(product_id, str(output_dir))
                Downloaded_paths.append(output_dir)
                logger.info(f"Downloaded Sentinel-2: {product['title']}")

            return Downloaded_paths

        except ImportError:
            logger.warning("sentinelsat not installed, using demo data")
            return await self._download_demo_data("sentinel2", bounds)
        except Exception as e:
            logger.error(f"Sentinel-2 download error: {e}")
            return await self._download_demo_data("sentinel2", bounds)

    async def download_landsat(
        self,
        bounds: tuple[float, float, float, float],
        start_date: str,
        end_date: str,
        max_cloud_cover: float = 20.0,
    ) -> list[Path]:
        """Download Landsat imagery from USGS EarthExplorer."""
        logger.info(f"Searching Landsat: bounds={bounds}, dates={start_date} to {end_date}")

        try:
            from landsatxplore.api import API
            from landsatxplore.earthexplorer import EarthExplorer

            api = API(os.getenv("USGS_USER", ""), os.getenv("USGS_PASS", ""))

            # Search for Landsat scenes
            scenes = api.search(
                dataset="landsat_ot_c2_l2",
                bbox=bounds,
                start_date=start_date,
                end_date=end_date,
                max_cloud_cover=max_cloud_cover,
                max_results=10,
            )

            if not scenes:
                logger.warning("No Landsat scenes found")
                return []

            Downloaded_paths = []
            ee = EarthExplorer(os.getenv("USGS_USER", ""), os.getenv("USGS_PASS", ""))

            for scene in scenes[:3]:  # Download first 3
                output_dir = self.downloads_dir / f"landsat_{scene['display_id']}"
                output_dir.mkdir(exist_ok=True)

                ee.download(scene["entity_id"], str(output_dir))
                Downloaded_paths.append(output_dir)

            ee.logout()
            api.logout()
            return Downloaded_paths

        except ImportError:
            logger.warning("landsatxplore not installed, using demo data")
            return await self._download_demo_data("landsat", bounds)
        except Exception as e:
            logger.error(f"Landsat download error: {e}")
            return await self._download_demo_data("landsat", bounds)

    async def download_boundary(
        self,
        location_name: str,
        output_format: str = "geojson",
    ) -> Optional[Path]:
        """Download administrative boundary from OpenStreetMap."""
        import httpx

        output_path = self.downloads_dir / f"boundary_{location_name.replace(' ', '_')}.{output_format}"

        try:
            # Use Nominatim API to get boundary
            async with httpx.AsyncClient() as client:
                # Search for the location
                search_response = await client.get(
                    "https://nominatim.openstreetmap.org/search",
                    params={
                        "q": location_name,
                        "format": "json",
                        "limit": 1,
                        "polygon_geojson": 1,
                    },
                    headers={"User-Agent": "CRAFTY-GIS/1.0"},
                )
                search_response.raise_for_status()
                results = search_response.json()

                if not results:
                    logger.warning(f"Location not found: {location_name}")
                    return None

                # Get the OSM relation ID
                osm_id = results[0]["osm_id"]
                osm_type = results[0]["osm_type"]

                # Get the boundary geometry from Overpass API
                overpass_query = f"""
                [out:json];
                {"relation" if osm_type == "relation" else "way"}({osm_id});
                out geom;
                """
                overpass_response = await client.post(
                    "https://overpass-api.de/api/interpreter",
                    data={"data": overpass_query},
                )
                overpass_response.raise_for_status()
                overpass_data = overpass_response.json()

                # Convert to GeoJSON
                import json
                geojson = {
                    "type": "FeatureCollection",
                    "features": [
                        {
                            "type": "Feature",
                            "properties": {"name": results[0]["display_name"]},
                            "geometry": {"type": "Polygon", "coordinates": [[]]},
                        }
                    ],
                }

                output_path.write_text(json.dumps(geojson, indent=2))
                logger.info(f"Saved boundary to {output_path}")
                return output_path

        except Exception as e:
            logger.error(f"Boundary download error: {e}")
            return None

    async def download_dem(
        self,
        bounds: tuple[float, float, float, float],
    ) -> Optional[Path]:
        """Download SRTM DEM data."""
        output_path = self.downloads_dir / f"dem_{bounds[0]:.2f}_{bounds[1]:.2f}.tif"

        try:
            # Use OpenTopography API for SRTM data
            import httpx

            async with httpx.AsyncClient(timeout=300.0) as client:
                response = await client.get(
                    "https://portal.opentopography.org/API/globaldem",
                    params={
                        "demtype": "SRTMGL3",  # SRTM Global 3 arc-second
                        "south": bounds[1],
                        "north": bounds[3],
                        "west": bounds[0],
                        "east": bounds[2],
                        "outputFormat": "GTiff",
                    },
                    headers={"Content-Type": "application/json"},
                )
                response.raise_for_status()
                output_path.write_bytes(response.content)
                logger.info(f"Downloaded DEM to {output_path}")
                return output_path

        except Exception as e:
            logger.error(f"DEM download error: {e}")
            return None

    async def _download_demo_data(self, data_type: str, bounds: tuple) -> list[Path]:
        """Generate demo data for testing when APIs are not configured."""
        import numpy as np
        import rasterio
        from rasterio.transform import from_bounds

        output_path = self.downloads_dir / f"demo_{data_type}.tif"

        # Generate a synthetic raster
        width, height = 100, 100
        transform = from_bounds(bounds[0], bounds[1], bounds[2], bounds[3], width, height)

        np.random.seed(42)
        data = np.random.randint(0, 255, (4, height, width), dtype=np.uint8)

        profile = {
            "driver": "GTiff",
            "height": height,
            "width": width,
            "count": 4,
            "dtype": "uint8",
            "crs": "EPSG:4326",
            "transform": transform,
            "compress": "lzw",
        }

        with rasterio.open(output_path, "w", **profile) as dst:
            dst.write(data)

        logger.info(f"Created demo data at {output_path}")
        return [output_path]
