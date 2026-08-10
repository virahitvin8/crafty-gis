"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Layers,
  Maximize2,
  Minimize2,
  Search,
  MapPin,
  Loader2,
  Compass,
  Trash2,
  Pencil,
  Circle,
  Square,
  Ruler,
  X,
  Info,
  LocateFixed,
  MousePointer2,
  Move,
  Eye,
  EyeOff,
  GripVertical,
} from "lucide-react";

// ── Types ───────────────────────────────────────────────────────────────────

interface AdvancedMapProps {
  initialCenter?: [number, number];
  initialZoom?: number;
  onLocationSelect?: (location: { lat: number; lng: number; address?: string }) => void;
  className?: string;
}

interface MapLayer {
  id: string;
  name: string;
  type: "raster" | "vector" | "geojson";
  source: any;
  paint?: any;
  layout?: any;
  visible: boolean;
  opacity: number;
  order: number;
  legend?: { label: string; color: string }[];
}

interface SearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
}

interface ClickInfo {
  lng: number;
  lat: number;
  address?: string;
  nearbyFields?: { name: string; distance: number }[];
}

interface DrawnFeature {
  id: string;
  type: "polygon" | "point" | "line";
  coordinates: any;
  properties: Record<string, any>;
}

type DrawMode = "none" | "polygon" | "point" | "line";

// ── Helper: Generate unique ID ──────────────────────────────────────────────

const generateId = () => Math.random().toString(36).substring(2, 9);

// ── NDVI Color Ramp ─────────────────────────────────────────────────────────

const NDVI_LEGEND = [
  { label: "Bare Soil (-0.2 - 0)", color: "#d73027" },
  { label: "Sparse (0 - 0.2)", color: "#fdae61" },
  { label: "Moderate (0.2 - 0.4)", color: "#d9ef8b" },
  { label: "Dense (0.4 - 0.6)", color: "#66bd63" },
  { label: "Very Dense (0.6 - 1.0)", color: "#006837" },
];

const SOIL_LEGEND = [
  { label: "Clay", color: "#8B4513" },
  { label: "Loam", color: "#A0522D" },
  { label: "Sandy Loam", color: "#D2B48C" },
  { label: "Silt", color: "#DEB887" },
  { label: "Peat", color: "#3E2723" },
];

// ── Sample Field Boundaries (GeoJSON) ───────────────────────────────────────

const SAMPLE_FIELDS: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        name: "North Field",
        crop: "Wheat",
        area_ha: 12.5,
        health: 78,
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [77.58, 12.98],
            [77.62, 12.98],
            [77.62, 13.02],
            [77.58, 13.02],
            [77.58, 12.98],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        name: "South Field",
        crop: "Rice",
        area_ha: 8.3,
        health: 65,
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [77.55, 12.92],
            [77.59, 12.92],
            [77.59, 12.96],
            [77.55, 12.96],
            [77.55, 12.92],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        name: "East Orchard",
        crop: "Mango",
        area_ha: 5.1,
        health: 82,
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [77.62, 12.94],
            [77.65, 12.94],
            [77.65, 12.97],
            [77.62, 12.97],
            [77.62, 12.94],
          ],
        ],
      },
    },
  ],
};

// ── Sample Soil Type Data ───────────────────────────────────────────────────

const SOIL_DATA: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { type: "Clay", ph: 7.2, organic: 2.1 },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [77.56, 12.97],
            [77.59, 12.97],
            [77.59, 13.0],
            [77.56, 13.0],
            [77.56, 12.97],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: { type: "Loam", ph: 6.8, organic: 3.4 },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [77.59, 12.95],
            [77.63, 12.95],
            [77.63, 12.99],
            [77.59, 12.99],
            [77.59, 12.95],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: { type: "Sandy Loam", ph: 6.5, organic: 1.8 },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [77.54, 12.93],
            [77.58, 12.93],
            [77.58, 12.96],
            [77.54, 12.96],
            [77.54, 12.93],
          ],
        ],
      },
    },
  ],
};

// ── AdvancedMap Component ────────────────────────────────────────────────────

export default function AdvancedMap({
  initialCenter = [78.9629, 20.5937],
  initialZoom = 5,
  onLocationSelect,
  className = "",
}: AdvancedMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);

  // Map state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  // Layer panel
  const [showLayerPanel, setShowLayerPanel] = useState(false);
  const [layers, setLayers] = useState<MapLayer[]>([
    {
      id: "satellite",
      name: "Satellite Imagery",
      type: "raster",
      source: {
        type: "raster",
        tiles: [
          "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        ],
        tileSize: 256,
        attribution: "Esri",
      },
      visible: false,
      opacity: 1,
      order: 0,
    },
    {
      id: "ndvi",
      name: "NDVI Overlay",
      type: "raster",
      source: {
        type: "raster",
        tiles: [
          "https://services.sentinel-hub.com/ogc/wms/bd86bcc0-f318-402b-a145-015f85b9427e?SERVICE=WMS&REQUEST=GetMap&LAYERS=NDVI&FORMAT=image/png&TRANSPARENT=true&CRS=EPSG:4326&WIDTH=256&HEIGHT=256&BBOX={bbox-epsg-3857}",
        ],
        tileSize: 256,
      },
      visible: false,
      opacity: 0.7,
      order: 1,
      legend: NDVI_LEGEND,
    },
    {
      id: "terrain",
      name: "Terrain",
      type: "raster",
      source: {
        type: "raster",
        tiles: [
          "https://cyberjapandata.gsi.go.jp/xyz/relief/{z}/{x}/{y}.png",
        ],
        tileSize: 256,
        attribution: "GSI Japan",
      },
      visible: false,
      opacity: 0.5,
      order: 2,
    },
    {
      id: "boundaries",
      name: "Field Boundaries",
      type: "geojson",
      source: SAMPLE_FIELDS,
      visible: true,
      opacity: 0.8,
      order: 3,
      legend: [
        { label: "Wheat", color: "#0c8ee7" },
        { label: "Rice", color: "#22c55e" },
        { label: "Mango", color: "#f59e0b" },
      ],
    },
    {
      id: "soil",
      name: "Soil Types",
      type: "geojson",
      source: SOIL_DATA,
      visible: false,
      opacity: 0.4,
      order: 4,
      legend: SOIL_LEGEND,
    },
    {
      id: "weather",
      name: "Weather Radar",
      type: "raster",
      source: {
        type: "raster",
        tiles: [
          "https://tilecache.rainviewer.com/v2/radar/nowcast/0/256/{z}/{x}/{y}/6/1_1.png",
        ],
        tileSize: 256,
      },
      visible: false,
      opacity: 0.6,
      order: 5,
    },
  ]);

  // Drawing tools
  const [drawMode, setDrawMode] = useState<DrawMode>("none");
  const [drawnFeatures, setDrawnFeatures] = useState<DrawnFeature[]>([]);
  const [currentDrawCoords, setCurrentDrawCoords] = useState<[number, number][]>(
    []
  );

  // Location info
  const [showLocationInfo, setShowLocationInfo] = useState(false);
  const [clickInfo, setClickInfo] = useState<ClickInfo | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  // Measure mode
  const [measureMode, setMeasureMode] = useState<"none" | "distance" | "area">(
    "none"
  );
  const [measureResult, setMeasureResult] = useState<string | null>(null);

  // Hovered feature
  const [hoveredFeature, setHoveredFeature] = useState<any>(null);

  // ── Click Outside Handler ──────────────────────────────────────────────

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        !target.closest('[data-search-container]') &&
        !target.closest('[data-layer-panel]')
      ) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Initialize Map ──────────────────────────────────────────────────────

  useEffect(() => {
    if (typeof window === "undefined" || mapInstance.current) return;

    let map: any = null;
    let cancelled = false;

    async function initMap() {
      try {
        const maplibregl = await import("maplibre-gl");
        await import("maplibre-gl/dist/maplibre-gl.css");

        if (!mapContainer.current || cancelled) return;

        map = new maplibregl.default.Map({
          container: mapContainer.current,
          style: {
            version: 8,
            name: "Dark Basemap",
            sources: {
              "carto-dark": {
                type: "raster",
                tiles: [
                  "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
                  "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
                  "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
                ],
                tileSize: 256,
                attribution: "CartoDB",
              },
            },
            layers: [
              {
                id: "carto-dark-layer",
                type: "raster",
                source: "carto-dark",
                paint: { "raster-saturation": -0.6 },
              },
            ],
          },
          center: initialCenter,
          zoom: initialZoom,
          attributionControl: { compact: true } as any,
        });

        // Add navigation controls
        map.addControl(
          new maplibregl.default.NavigationControl({
            visualizePitch: true,
          }),
          "top-right"
        );

        // Add scale control
        map.addControl(new maplibregl.default.ScaleControl(), "bottom-left");

        map.on("load", () => {
          if (cancelled) {
            map.remove();
            return;
          }

          setMapLoaded(true);
          mapInstance.current = map;

          // Add satellite layer (hidden by default)
          map.addSource("satellite-source", {
            type: "raster",
            tiles: [
              "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            ],
            tileSize: 256,
          });

          map.addLayer({
            id: "satellite-layer",
            type: "raster",
            source: "satellite-source",
            layout: { visibility: "none" },
          });

          // Add terrain layer
          map.addSource("terrain-source", {
            type: "raster",
            tiles: [
              "https://cyberjapandata.gsi.go.jp/xyz/relief/{z}/{x}/{y}.png",
            ],
            tileSize: 256,
          });

          map.addLayer({
            id: "terrain-layer",
            type: "raster",
            source: "terrain-source",
            layout: { visibility: "none" },
            paint: { "raster-opacity": 0.5 },
          });

          // Add weather radar layer
          map.addSource("weather-source", {
            type: "raster",
            tiles: [
              "https://tilecache.rainviewer.com/v2/radar/nowcast/0/256/{z}/{x}/{y}/6/1_1.png",
            ],
            tileSize: 256,
          });

          map.addLayer({
            id: "weather-layer",
            type: "raster",
            source: "weather-source",
            layout: { visibility: "none" },
            paint: { "raster-opacity": 0.6 },
          });

          // Add field boundaries
          map.addSource("fields-source", {
            type: "geojson",
            data: SAMPLE_FIELDS,
          });

          map.addLayer({
            id: "fields-fill",
            type: "fill",
            source: "fields-source",
            paint: {
              "fill-color": [
                "match",
                ["get", "crop"],
                "Wheat",
                "#0c8ee7",
                "Rice",
                "#22c55e",
                "Mango",
                "#f59e0b",
                "#71717a",
              ],
              "fill-opacity": 0.2,
            },
          });

          map.addLayer({
            id: "fields-outline",
            type: "line",
            source: "fields-source",
            paint: {
              "line-color": [
                "match",
                ["get", "crop"],
                "Wheat",
                "#0c8ee7",
                "Rice",
                "#22c55e",
                "Mango",
                "#f59e0b",
                "#71717a",
              ],
              "line-width": 2,
              "line-opacity": 0.8,
            },
          });

          // Add soil type layer
          map.addSource("soil-source", {
            type: "geojson",
            data: SOIL_DATA,
          });

          map.addLayer({
            id: "soil-fill",
            type: "fill",
            source: "soil-source",
            layout: { visibility: "none" },
            paint: {
              "fill-color": [
                "match",
                ["get", "type"],
                "Clay",
                "#8B4513",
                "Loam",
                "#A0522D",
                "Sandy Loam",
                "#D2B48C",
                "Silt",
                "#DEB887",
                "Peat",
                "#3E2723",
                "#71717a",
              ],
              "fill-opacity": 0.4,
            },
          });

          map.addLayer({
            id: "soil-outline",
            type: "line",
            source: "soil-source",
            layout: { visibility: "none" },
            paint: {
              "line-color": "#ffffff",
              "line-width": 1,
              "line-opacity": 0.3,
            },
          });

          // Add draw layer (empty initially)
          map.addSource("draw-source", {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
          });

          map.addLayer({
            id: "draw-fill",
            type: "fill",
            source: "draw-source",
            paint: {
              "fill-color": "#36a9f5",
              "fill-opacity": 0.2,
            },
          });

          map.addLayer({
            id: "draw-outline",
            type: "line",
            source: "draw-source",
            paint: {
              "line-color": "#36a9f5",
              "line-width": 2,
              "line-dasharray": [3, 2],
            },
          });

          map.addLayer({
            id: "draw-points",
            type: "circle",
            source: "draw-source",
            filter: ["==", "$type", "Point"],
            paint: {
              "circle-radius": 6,
              "circle-color": "#36a9f5",
              "circle-stroke-width": 2,
              "circle-stroke-color": "#ffffff",
            },
          });

          // Click handler for location info
          map.on("click", handleMapClick);

          // Hover handlers for tooltips
          map.on("mouseenter", "fields-fill", () => {
            map.getCanvas().style.cursor = "pointer";
          });

          map.on("mouseleave", "fields-fill", () => {
            map.getCanvas().style.cursor = "";
          });

          map.on("mousemove", "fields-fill", (e: any) => {
            if (e.features && e.features.length > 0) {
              const feature = e.features[0];
              setHoveredFeature(feature.properties);
            }
          });

          map.on("mouseleave", "fields-fill", () => {
            setHoveredFeature(null);
          });
        });
      } catch (err) {
        console.error("Map initialization failed:", err);
        setMapError("Failed to initialize map");
      }
    }

    initMap();

    return () => {
      cancelled = true;
      if (map) {
        map.remove();
        mapInstance.current = null;
      }
    };
  }, [initialCenter, initialZoom]);

  // ── Map Click Handler ─────────────────────────────────────────────────

  const handleMapClick = useCallback(
    async (e: any) => {
      if (!mapInstance.current) return;

      const { lng, lat } = e.lngLat;

      // If in draw mode, add point to current draw
      if (drawMode === "polygon" || drawMode === "line") {
        setCurrentDrawCoords((prev) => [...prev, [lng, lat]]);
        updateDrawSource();
        return;
      }

      if (drawMode === "point") {
        const newFeature: DrawnFeature = {
          id: generateId(),
          type: "point",
          coordinates: [lng, lat],
          properties: { label: "Sample Point" },
        };
        setDrawnFeatures((prev) => [...prev, newFeature]);
        updateDrawSource();
        return;
      }

      // If in measure mode, add point
      if (measureMode !== "none") {
        setCurrentDrawCoords((prev) => [...prev, [lng, lat]]);
        updateMeasureResult();
        return;
      }

      // Otherwise, show location info
      setLocationLoading(true);
      setShowLocationInfo(true);
      setClickInfo({ lng, lat });

      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18`
        );
        const data = await response.json();

        setClickInfo((prev) => ({
          ...prev,
          address: data.display_name || "Unknown location",
        }));
      } catch {
        setClickInfo((prev) => ({
          ...prev,
          address: "Unable to fetch address",
        }));
      }

      setLocationLoading(false);

      if (onLocationSelect) {
        onLocationSelect({ lat, lng });
      }
    },
    [drawMode, measureMode, onLocationSelect]
  );

  // ── Update Draw Source ─────────────────────────────────────────────────

  const updateDrawSource = useCallback(() => {
    if (!mapInstance.current) return;

    const map = mapInstance.current;
    const features: any[] = [];

    // Add completed features
    drawnFeatures.forEach((f) => {
      if (f.type === "point") {
        features.push({
          type: "Feature",
          geometry: { type: "Point", coordinates: f.coordinates },
          properties: f.properties,
        });
      } else if (f.type === "polygon") {
        features.push({
          type: "Feature",
          geometry: {
            type: "Polygon",
            coordinates: [f.coordinates],
          },
          properties: f.properties,
        });
      } else if (f.type === "line") {
        features.push({
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: f.coordinates,
          },
          properties: f.properties,
        });
      }
    });

    // Add current draw in progress
    if (currentDrawCoords.length > 0) {
      if (drawMode === "polygon" && currentDrawCoords.length >= 2) {
        features.push({
          type: "Feature",
          geometry: {
            type: "Polygon",
            coordinates: [[...currentDrawCoords, currentDrawCoords[0]]],
          },
          properties: { inProgress: true },
        });
      } else if (drawMode === "line" && currentDrawCoords.length >= 2) {
        features.push({
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: currentDrawCoords,
          },
          properties: { inProgress: true },
        });
      } else if (drawMode === "point" && currentDrawCoords.length > 0) {
        const lastCoord = currentDrawCoords[currentDrawCoords.length - 1];
        features.push({
          type: "Feature",
          geometry: { type: "Point", coordinates: lastCoord },
          properties: { inProgress: true },
        });
      }
    }

    const source = map.getSource("draw-source");
    if (source) {
      source.setData({
        type: "FeatureCollection",
        features,
      });
    }
  }, [drawnFeatures, currentDrawCoords, drawMode]);

  useEffect(() => {
    updateDrawSource();
  }, [drawnFeatures, currentDrawCoords, updateDrawSource]);

  // ── Update Measure Result ──────────────────────────────────────────────

  const updateMeasureResult = useCallback(() => {
    if (currentDrawCoords.length < 2) {
      setMeasureResult(null);
      return;
    }

    // Simple haversine distance calculation
    const haversineDistance = (coord1: [number, number], coord2: [number, number]): number => {
      const R = 6371000; // Earth's radius in meters
      const dLat = ((coord2[1] - coord1[1]) * Math.PI) / 180;
      const dLon = ((coord2[0] - coord1[0]) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((coord1[1] * Math.PI) / 180) *
          Math.cos((coord2[1] * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    if (measureMode === "distance") {
      let totalDistance = 0;
      for (let i = 1; i < currentDrawCoords.length; i++) {
        totalDistance += haversineDistance(
          currentDrawCoords[i - 1],
          currentDrawCoords[i]
        );
      }

      if (totalDistance >= 1000) {
        setMeasureResult(`${(totalDistance / 1000).toFixed(2)} km`);
      } else {
        setMeasureResult(`${totalDistance.toFixed(1)} m`);
      }
    } else if (measureMode === "area" && currentDrawCoords.length >= 3) {
      // Calculate area using Shoelace formula with haversine distances
      const coords = [...currentDrawCoords, currentDrawCoords[0]];

      // Convert to radians for calculation
      const toRadians = (deg: number) => (deg * Math.PI) / 180;

      // Project coordinates to approximate planar (good for small areas)
      let area = 0;
      const R = 6371000; // Earth's radius

      for (let i = 0; i < coords.length - 1; i++) {
        const lon1 = toRadians(coords[i][0]);
        const lat1 = toRadians(coords[i][1]);
        const lon2 = toRadians(coords[i + 1][0]);
        const lat2 = toRadians(coords[i + 1][1]);

        // Cross product of position vectors
        area += (lon2 - lon1) * (2 + Math.sin(lat1) + Math.sin(lat2));
      }

      area = Math.abs((area * R * R) / 2);

      if (area >= 10000) {
        setMeasureResult(`${(area / 10000).toFixed(2)} ha`);
      } else {
        setMeasureResult(`${area.toFixed(0)} m²`);
      }
    }
  }, [currentDrawCoords, measureMode]);

  // ── Search Handler ─────────────────────────────────────────────────────

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 3) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setSearchLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query
        )}&limit=5`
      );
      const data = await response.json();
      setSearchResults(data);
      setShowSearchResults(true);
    } catch {
      setSearchResults([]);
    }
    setSearchLoading(false);
  };

  const flyToLocation = (result: SearchResult) => {
    if (!mapInstance.current) return;

    mapInstance.current.flyTo({
      center: [parseFloat(result.lon), parseFloat(result.lat)],
      zoom: 14,
      duration: 2000,
    });

    setShowSearchResults(false);
    setSearchQuery(result.display_name.split(",")[0]);
  };

  // ── Layer Toggle ───────────────────────────────────────────────────────

  const toggleLayer = useCallback(
    (layerId: string) => {
      if (!mapInstance.current) return;

      const map = mapInstance.current;

      setLayers((prev) =>
        prev.map((l) => {
          if (l.id === layerId) {
            const newVisible = !l.visible;
            const visibility = newVisible ? "visible" : "none";

            // Update map layer visibility
            if (layerId === "satellite") {
              map.setLayoutProperty("satellite-layer", "visibility", visibility);
            } else if (layerId === "terrain") {
              map.setLayoutProperty("terrain-layer", "visibility", visibility);
            } else if (layerId === "weather") {
              map.setLayoutProperty("weather-layer", "visibility", visibility);
            } else if (layerId === "boundaries") {
              map.setLayoutProperty("fields-fill", "visibility", visibility);
              map.setLayoutProperty("fields-outline", "visibility", visibility);
            } else if (layerId === "soil") {
              map.setLayoutProperty("soil-fill", "visibility", visibility);
              map.setLayoutProperty("soil-outline", "visibility", visibility);
            }

            return { ...l, visible: newVisible };
          }
          return l;
        })
      );
    },
    []
  );

  // ── Layer Opacity ──────────────────────────────────────────────────────

  const setLayerOpacity = useCallback(
    (layerId: string, opacity: number) => {
      if (!mapInstance.current) return;

      const map = mapInstance.current;

      setLayers((prev) =>
        prev.map((l) => {
          if (l.id === layerId) {
            if (layerId === "satellite") {
              map.setPaintProperty(
                "satellite-layer",
                "raster-opacity",
                opacity
              );
            } else if (layerId === "terrain") {
              map.setPaintProperty("terrain-layer", "raster-opacity", opacity);
            } else if (layerId === "weather") {
              map.setPaintProperty("weather-layer", "raster-opacity", opacity);
            } else if (layerId === "boundaries") {
              map.setPaintProperty("fields-fill", "fill-opacity", opacity * 0.4);
            } else if (layerId === "soil") {
              map.setPaintProperty("soil-fill", "fill-opacity", opacity);
            }

            return { ...l, opacity };
          }
          return l;
        })
      );
    },
    []
  );

  // ── Finish Draw ────────────────────────────────────────────────────────

  const finishDraw = useCallback(() => {
    if (currentDrawCoords.length < 3 && drawMode === "polygon") {
      alert("Polygon needs at least 3 points");
      return;
    }

    if (currentDrawCoords.length < 2 && drawMode === "line") {
      alert("Line needs at least 2 points");
      return;
    }

    const newFeature: DrawnFeature = {
      id: generateId(),
      type: drawMode as "polygon" | "line",
      coordinates: drawMode === "polygon" ? currentDrawCoords : currentDrawCoords,
      properties: { label: `${drawMode} ${drawnFeatures.length + 1}` },
    };

    setDrawnFeatures((prev) => [...prev, newFeature]);
    setCurrentDrawCoords([]);
    setDrawMode("none");
  }, [currentDrawCoords, drawMode, drawnFeatures.length]);

  // ── Delete Last Drawn Feature ──────────────────────────────────────────

  const deleteLastFeature = useCallback(() => {
    setDrawnFeatures((prev) => prev.slice(0, -1));
    setCurrentDrawCoords([]);
  }, []);

  // ── Clear All Draws ────────────────────────────────────────────────────

  const clearAllDraws = useCallback(() => {
    setDrawnFeatures([]);
    setCurrentDrawCoords([]);
    setMeasureResult(null);
  }, []);

  // ── Compass Reset ──────────────────────────────────────────────────────

  const resetBearing = useCallback(() => {
    if (!mapInstance.current) return;
    mapInstance.current.resetNorth();
  }, []);

  // ── Fly to Current Location ────────────────────────────────────────────

  const flyToCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      alert("Geolocation not supported");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (mapInstance.current) {
          mapInstance.current.flyTo({
            center: [position.coords.longitude, position.coords.latitude],
            zoom: 14,
            duration: 2000,
          });
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        alert("Unable to get your location");
      }
    );
  }, []);

  // ── Fullscreen Toggle ──────────────────────────────────────────────────

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // ── Quick Analysis ─────────────────────────────────────────────────────

  const triggerQuickAnalysis = useCallback(() => {
    if (!clickInfo) return;
    // This would integrate with the analysis system
    alert(
      `Running analysis for:\nLat: ${clickInfo.lat.toFixed(4)}\nLng: ${
        clickInfo.lng.toFixed(4)
      }`
    );
  }, [clickInfo]);

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div
      className={`relative ${
        isFullscreen ? "fixed inset-0 z-50 bg-zinc-950" : "h-full"
      } ${className}`}
    >
      {/* Map Container */}
      <div ref={mapContainer} className="w-full h-full" />

      {/* Loading Overlay */}
      {!mapLoaded && !mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/80 backdrop-blur-sm z-20">
          <div className="text-center">
            <Loader2 className="w-10 h-10 animate-spin text-crafty-400 mx-auto mb-3" />
            <p className="text-sm text-zinc-400">Loading map...</p>
          </div>
        </div>
      )}

      {/* Error Overlay */}
      {mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/90 z-20">
          <div className="text-center p-6 bg-zinc-800 rounded-xl border border-zinc-700">
            <p className="text-red-400 mb-3">{mapError}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-crafty-600 text-white rounded-lg hover:bg-crafty-700"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="absolute top-4 left-4 right-16 z-10 max-w-md" data-search-container>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => searchResults.length > 0 && setShowSearchResults(true)}
            placeholder="Search location..."
            className="w-full bg-zinc-900/90 backdrop-blur-xl border border-zinc-700
                     rounded-lg pl-10 pr-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500
                     focus:outline-none focus:ring-2 focus:ring-crafty-500/30 focus:border-crafty-500/50"
          />
          {searchLoading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-zinc-400" />
          )}
        </div>

        {/* Search Results Dropdown */}
        {showSearchResults && searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900/95 backdrop-blur-xl
                        border border-zinc-700 rounded-xl overflow-hidden shadow-xl z-30">
            {searchResults.map((result, idx) => (
              <button
                key={result.place_id || idx}
                onClick={() => flyToLocation(result)}
                className="w-full text-left px-4 py-3 hover:bg-zinc-800 transition-colors
                         border-b border-zinc-800 last:border-b-0"
              >
                <p className="text-sm text-zinc-200 truncate">
                  {result.display_name}
                </p>
                <p className="text-xs text-zinc-500 mt-0.5">{result.type}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Control Buttons - Top Right */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <button
          onClick={() => setShowLayerPanel(!showLayerPanel)}
          className="w-10 h-10 rounded-lg bg-zinc-900/90 backdrop-blur-xl border border-zinc-700
                   flex items-center justify-center text-zinc-400 hover:text-zinc-200
                   transition-all duration-150"
          title="Layers"
        >
          <Layers className="w-4 h-4" />
        </button>
        <button
          onClick={toggleFullscreen}
          className="w-10 h-10 rounded-lg bg-zinc-900/90 backdrop-blur-xl border border-zinc-700
                   flex items-center justify-center text-zinc-400 hover:text-zinc-200
                   transition-all duration-150"
          title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
        >
          {isFullscreen ? (
            <Minimize2 className="w-4 h-4" />
          ) : (
            <Maximize2 className="w-4 h-4" />
          )}
        </button>
        <button
          onClick={resetBearing}
          className="w-10 h-10 rounded-lg bg-zinc-900/90 backdrop-blur-xl border border-zinc-700
                   flex items-center justify-center text-zinc-400 hover:text-zinc-200
                   transition-all duration-150"
          title="Reset bearing"
        >
          <Compass className="w-4 h-4" />
        </button>
        <button
          onClick={flyToCurrentLocation}
          className="w-10 h-10 rounded-lg bg-zinc-900/90 backdrop-blur-xl border border-zinc-700
                   flex items-center justify-center text-zinc-400 hover:text-zinc-200
                   transition-all duration-150"
          title="Go to current location"
        >
          <LocateFixed className="w-4 h-4" />
        </button>
      </div>

      {/* Drawing Tools Panel - Left Side */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
        <div className="bg-zinc-900/90 backdrop-blur-xl border border-zinc-700 rounded-xl p-2 shadow-xl">
          <div className="flex flex-col gap-1">
            <button
              onClick={() => {
                setDrawMode(drawMode === "polygon" ? "none" : "polygon");
                setCurrentDrawCoords([]);
                setMeasureMode("none");
              }}
              className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all
                ${
                  drawMode === "polygon"
                    ? "bg-crafty-600 text-white"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                }`}
              title="Draw polygon"
            >
              <Square className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setDrawMode(drawMode === "point" ? "none" : "point");
                setCurrentDrawCoords([]);
                setMeasureMode("none");
              }}
              className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all
                ${
                  drawMode === "point"
                    ? "bg-crafty-600 text-white"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                }`}
              title="Draw point"
            >
              <Circle className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setDrawMode(drawMode === "line" ? "none" : "line");
                setCurrentDrawCoords([]);
                setMeasureMode("none");
              }}
              className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all
                ${
                  drawMode === "line"
                    ? "bg-crafty-600 text-white"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                }`}
              title="Draw line"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <div className="w-full h-px bg-zinc-700 my-1" />
            <button
              onClick={() => {
                setMeasureMode(measureMode === "distance" ? "none" : "distance");
                setCurrentDrawCoords([]);
                setDrawMode("none");
              }}
              className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all
                ${
                  measureMode === "distance"
                    ? "bg-crafty-600 text-white"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                }`}
              title="Measure distance"
            >
              <Ruler className="w-4 h-4" />
            </button>
            <div className="w-full h-px bg-zinc-700 my-1" />
            <button
              onClick={finishDraw}
              disabled={
                drawMode === "none" || currentDrawCoords.length === 0
              }
              className="w-9 h-9 rounded-lg flex items-center justify-center text-zinc-400
                       hover:text-success hover:bg-zinc-800 transition-all
                       disabled:opacity-30 disabled:cursor-not-allowed"
              title="Finish draw"
            >
              <MousePointer2 className="w-4 h-4" />
            </button>
            <button
              onClick={deleteLastFeature}
              disabled={drawnFeatures.length === 0}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-zinc-400
                       hover:text-warning hover:bg-zinc-800 transition-all
                       disabled:opacity-30 disabled:cursor-not-allowed"
              title="Undo last"
            >
              <Move className="w-4 h-4" />
            </button>
            <button
              onClick={clearAllDraws}
              disabled={drawnFeatures.length === 0 && currentDrawCoords.length === 0}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-zinc-400
                       hover:text-error hover:bg-zinc-800 transition-all
                       disabled:opacity-30 disabled:cursor-not-allowed"
              title="Clear all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Measurement Result */}
      {measureResult && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10">
          <div className="bg-zinc-900/95 backdrop-blur-xl border border-crafty-500/50 rounded-lg px-4 py-2 shadow-xl">
            <p className="text-sm font-medium text-crafty-400">
              {measureResult}
            </p>
          </div>
        </div>
      )}

      {/* Draw Mode Indicator */}
      {drawMode !== "none" && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-10">
          <div className="bg-zinc-900/95 backdrop-blur-xl border border-crafty-500/50 rounded-lg px-4 py-2 shadow-xl">
            <p className="text-xs text-zinc-400">
              Click on map to add points •{" "}
              <span className="text-crafty-400">Double-click</span> or press{" "}
              <span className="text-crafty-400">Finish</span> to complete
            </p>
          </div>
        </div>
      )}

      {/* Layer Panel */}
      {showLayerPanel && (
        <div data-layer-panel className="absolute top-4 right-16 z-10 w-72 bg-zinc-900/95 backdrop-blur-xl
                       border border-zinc-700 rounded-xl shadow-xl animate-slide-in-right">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                Map Layers
              </h3>
              <button
                onClick={() => setShowLayerPanel(false)}
                className="text-zinc-500 hover:text-zinc-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 panel-scroll max-h-96 overflow-y-auto pr-1">
              {layers
                .sort((a, b) => b.order - a.order)
                .map((layer) => (
                  <div
                    key={layer.id}
                    className={`p-3 rounded-lg border transition-all ${
                      layer.visible
                        ? "bg-crafty-500/10 border-crafty-500/30"
                        : "bg-zinc-800/50 border-zinc-700/50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <GripVertical className="w-3 h-3 text-zinc-500" />
                        <span
                          className={`text-sm ${
                            layer.visible ? "text-zinc-200" : "text-zinc-400"
                          }`}
                        >
                          {layer.name}
                        </span>
                      </div>
                      <button
                        onClick={() => toggleLayer(layer.id)}
                        className={`p-1 rounded transition-colors ${
                          layer.visible
                            ? "text-crafty-400 hover:text-crafty-300"
                            : "text-zinc-500 hover:text-zinc-300"
                        }`}
                      >
                        {layer.visible ? (
                          <Eye className="w-4 h-4" />
                        ) : (
                          <EyeOff className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    {layer.visible && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-xs text-zinc-500 mb-1">
                          <span>Opacity</span>
                          <span>{Math.round(layer.opacity * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={layer.opacity}
                          onChange={(e) =>
                            setLayerOpacity(layer.id, parseFloat(e.target.value))
                          }
                          className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer
                                   [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3
                                   [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full
                                   [&::-webkit-slider-thumb]:bg-crafty-500"
                        />
                      </div>
                    )}

                    {/* Legend */}
                    {layer.visible && layer.legend && (
                      <div className="mt-3 pt-3 border-t border-zinc-700/50">
                        <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">
                          Legend
                        </p>
                        <div className="space-y-1">
                          {layer.legend.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-sm flex-shrink-0"
                                style={{ backgroundColor: item.color }}
                              />
                              <span className="text-xs text-zinc-400 truncate">
                                {item.label}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Location Info Panel */}
      {showLocationInfo && clickInfo && (
        <div className="absolute bottom-4 right-4 z-10 w-80 bg-zinc-900/95 backdrop-blur-xl
                       border border-zinc-700 rounded-xl shadow-xl animate-slide-up">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                Location Info
              </h3>
              <button
                onClick={() => setShowLocationInfo(false)}
                className="text-zinc-500 hover:text-zinc-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-crafty-400" />
                <span className="text-zinc-400">Coordinates:</span>
                <span className="text-zinc-200 font-mono">
                  {clickInfo.lat.toFixed(6)}, {clickInfo.lng.toFixed(6)}
                </span>
              </div>

              {locationLoading ? (
                <div className="flex items-center gap-2 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
                  <span className="text-zinc-400">Fetching address...</span>
                </div>
              ) : clickInfo.address ? (
                <div className="text-sm">
                  <span className="text-zinc-400">Address:</span>
                  <p className="text-zinc-200 mt-1 text-xs leading-relaxed">
                    {clickInfo.address}
                  </p>
                </div>
              ) : null}

              <div className="pt-3 border-t border-zinc-700/50">
                <button
                  onClick={triggerQuickAnalysis}
                  className="w-full py-2 bg-crafty-600 hover:bg-crafty-700 text-white
                           text-sm font-medium rounded-lg transition-colors flex items-center
                           justify-center gap-2"
                >
                  <Info className="w-4 h-4" />
                  Quick Analysis
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hover Tooltip */}
      {hoveredFeature && (
        <div className="absolute bottom-4 left-4 z-10">
          <div className="bg-zinc-900/95 backdrop-blur-xl border border-zinc-700 rounded-lg px-3 py-2 shadow-xl">
            <p className="text-sm font-medium text-zinc-200">
              {hoveredFeature.name}
            </p>
            <p className="text-xs text-zinc-400">
              {hoveredFeature.crop} • {hoveredFeature.area_ha} ha • Health:{" "}
              {hoveredFeature.health}%
            </p>
          </div>
        </div>
      )}

      {/* Zoom Controls - Bottom Right */}
      <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-2">
        {!showLocationInfo && (
          <div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-700/50 rounded-lg px-3 py-2">
            <p className="text-[10px] text-zinc-500">
              <MapPin className="w-3 h-3 inline mr-1" />
              Scroll: Zoom • Drag: Pan • Click: Info
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
