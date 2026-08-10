"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Search, Layers, ZoomIn, ZoomOut, Compass, Maximize2,
  MapPin, X, ChevronDown, Loader2, Map as MapIcon
} from "lucide-react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// ============================================================================
// LAYER CONFIGURATION
// ============================================================================

const MAP_LAYERS = [
  { id: "satellite", label: "Satellite", checked: true },
  { id: "ndvi", label: "NDVI Overlay", checked: false },
  { id: "soil", label: "Soil Data", checked: false },
  { id: "terrain", label: "Terrain", checked: false },
  { id: "boundaries", label: "Field Boundaries", checked: true },
];

// ============================================================================
// MOCK FIELD BOUNDARIES (GeoJSON-like)
// ============================================================================

const FIELD_BOUNDARIES = [
  {
    id: "f1",
    name: "North Wheat Block",
    crop: "Wheat",
    health: "healthy",
    coordinates: [
      [77.1025, 28.7041],
      [77.1125, 28.7041],
      [77.1125, 28.6941],
      [77.1025, 28.6941],
      [77.1025, 28.7041],
    ],
  },
  {
    id: "f2",
    name: "East Rice Paddy",
    crop: "Rice",
    health: "stressed",
    coordinates: [
      [77.12, 28.71],
      [77.13, 28.71],
      [77.13, 28.7],
      [77.12, 28.7],
      [77.12, 28.71],
    ],
  },
  {
    id: "f3",
    name: "South Cotton Zone",
    crop: "Cotton",
    health: "healthy",
    coordinates: [
      [77.105, 28.68],
      [77.115, 28.68],
      [77.115, 28.67],
      [77.105, 28.67],
      [77.105, 28.68],
    ],
  },
  {
    id: "f4",
    name: "Central Sugarcane",
    crop: "Sugarcane",
    health: "critical",
    coordinates: [
      [77.11, 28.695],
      [77.12, 28.695],
      [77.12, 28.685],
      [77.11, 28.685],
      [77.11, 28.695],
    ],
  },
];

// ============================================================================
// MAIN MAP COMPONENT
// ============================================================================

export default function MapView() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [layersOpen, setLayersOpen] = useState(true);
  const [layers, setLayers] = useState(MAP_LAYERS);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ lat: number; lon: number; name: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const m = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "OpenStreetMap contributors",
          },
        },
        layers: [{ id: "osm", type: "raster", source: "osm" }],
      },
      center: [78.9629, 20.5937], // Center of India
      zoom: 5,
      maxZoom: 18,
      minZoom: 2,
    });

    m.addControl(new maplibregl.NavigationControl(), "top-right");
    m.addControl(new maplibregl.ScaleControl(), "bottom-right");

    m.on("load", () => {
      setMapLoaded(true);

      // Add field boundary layer
      FIELD_BOUNDARIES.forEach((field) => {
        const colorMap: Record<string, string> = {
          healthy: "#22c55e",
          stressed: "#f59e0b",
          critical: "#ef4444",
        };

        m.addSource(`field-${field.id}`, {
          type: "geojson",
          data: {
            type: "Feature",
            properties: { name: field.name, crop: field.crop, health: field.health },
            geometry: {
              type: "Polygon",
              coordinates: [field.coordinates],
            },
          },
        });

        m.addLayer({
          id: `field-fill-${field.id}`,
          type: "fill",
          source: `field-${field.id}`,
          paint: {
            "fill-color": colorMap[field.health],
            "fill-opacity": 0.25,
          },
        });

        m.addLayer({
          id: `field-outline-${field.id}`,
          type: "line",
          source: `field-${field.id}`,
          paint: {
            "line-color": colorMap[field.health],
            "line-width": 2,
          },
        });

        // Click handler for field info
        m.on("click", `field-fill-${field.id}`, (e) => {
          const props = e.features?.[0]?.properties;
          if (props) {
            setSelectedFeature(props.name);
          }
        });

        // Hover effect
        m.on("mouseenter", `field-fill-${field.id}`, () => {
          m.getCanvas().style.cursor = "pointer";
        });
        m.on("mouseleave", `field-fill-${field.id}`, () => {
          m.getCanvas().style.cursor = "";
        });
      });
    });

    map.current = m;

    return () => {
      m.remove();
      map.current = null;
    };
  }, []);

  // Toggle layer
  const toggleLayer = useCallback((layerId: string) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === layerId ? { ...l, checked: !l.checked } : l))
    );

    // Toggle field boundaries visibility
    if (layerId === "boundaries" && map.current) {
      const checked = layers.find((l) => l.id === layerId)?.checked;
      FIELD_BOUNDARIES.forEach((field) => {
        const fillLayer = `field-fill-${field.id}`;
        const outlineLayer = `field-outline-${field.id}`;
        if (map.current?.getLayer(fillLayer)) {
          map.current.setLayoutProperty(fillLayer, "visibility", checked ? "none" : "visible");
        }
        if (map.current?.getLayer(outlineLayer)) {
          map.current.setLayoutProperty(outlineLayer, "visibility", checked ? "none" : "visible");
        }
      });
    }
  }, [layers]);

  // Search with Nominatim
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`,
        { headers: { "User-Agent": "CraftyGIS/1.0" } }
      );
      const data = await res.json();
      setSearchResults(
        data.map((r: { lat: string; lon: string; display_name: string }) => ({
          lat: parseFloat(r.lat),
          lon: parseFloat(r.lon),
          name: r.display_name.split(",").slice(0, 2).join(", "),
        }))
      );
    } catch {
      setSearchResults([]);
    }
    setSearching(false);
  }, [searchQuery]);

  // Fly to location
  const flyTo = useCallback((lat: number, lon: number) => {
    map.current?.flyTo({ center: [lon, lat], zoom: 12, duration: 1500 });
    setSearchResults([]);
    setSearchQuery("");
  }, []);

  // Zoom controls
  const zoomIn = useCallback(() => map.current?.zoomIn(), []);
  const zoomOut = useCallback(() => map.current?.zoomOut(), []);
  const resetView = useCallback(() => {
    map.current?.flyTo({ center: [78.9629, 20.5937], zoom: 5, duration: 1000 });
  }, []);

  return (
    <div className="relative h-full w-full bg-zinc-900">
      {/* Map Container */}
      <div ref={mapContainer} className="absolute inset-0" />

      {/* Loading indicator */}
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 z-20">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <span className="text-sm text-zinc-400">Loading map...</span>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="absolute top-4 left-4 z-10 w-80">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search location..."
            className="w-full bg-zinc-900/90 border border-zinc-700/50 backdrop-blur-sm rounded-lg pl-10 pr-10 py-2.5 text-sm text-zinc-200 placeholder-zinc-500 outline-none focus:ring-2 focus:ring-blue-500/30"
          />
          {searching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-zinc-500" />
          )}
          {searchQuery && !searching && (
            <button
              onClick={() => { setSearchQuery(""); setSearchResults([]); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {searchResults.length > 0 && (
          <div className="mt-1 bg-zinc-900/95 border border-zinc-700/50 rounded-lg backdrop-blur-sm shadow-xl overflow-hidden">
            {searchResults.map((r, i) => (
              <button
                key={i}
                onClick={() => flyTo(r.lat, r.lon)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-zinc-800 transition-colors"
              >
                <MapPin className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                <span className="text-xs text-zinc-300 truncate">{r.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Layer Controls */}
      <div className="absolute top-4 right-14 z-10">
        <button
          onClick={() => setLayersOpen(!layersOpen)}
          className="p-2.5 bg-zinc-900/90 border border-zinc-700/50 backdrop-blur-sm rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <Layers className="w-4 h-4" />
        </button>

        {layersOpen && (
          <div className="mt-2 bg-zinc-900/95 border border-zinc-700/50 rounded-lg backdrop-blur-sm shadow-xl p-3 w-52">
            <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Layers</span>
            <div className="space-y-1.5">
              {layers.map((layer) => (
                <label
                  key={layer.id}
                  className="flex items-center gap-2 cursor-pointer py-1 hover:bg-zinc-800/50 px-1.5 rounded"
                >
                  <input
                    type="checkbox"
                    checked={layer.checked}
                    onChange={() => toggleLayer(layer.id)}
                    className="w-3.5 h-3.5 rounded border-zinc-600 bg-zinc-800 text-blue-500 focus:ring-blue-500/30"
                  />
                  <span className="text-xs text-zinc-300">{layer.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Zoom Controls */}
      <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-1">
        <button
          onClick={zoomIn}
          className="p-2 bg-zinc-900/90 border border-zinc-700/50 backdrop-blur-sm rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={zoomOut}
          className="p-2 bg-zinc-900/90 border border-zinc-700/50 backdrop-blur-sm rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={resetView}
          className="p-2 bg-zinc-900/90 border border-zinc-700/50 backdrop-blur-sm rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <Compass className="w-4 h-4" />
        </button>
      </div>

      {/* Field Info Popup */}
      {selectedFeature && (
        <div className="absolute bottom-4 left-4 z-10 bg-zinc-900/95 border border-zinc-700/50 rounded-lg backdrop-blur-sm shadow-xl p-4 w-72">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-white">{selectedFeature}</span>
            <button
              onClick={() => setSelectedFeature(null)}
              className="p-1 rounded hover:bg-zinc-800 text-zinc-500"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <div className="text-xs text-zinc-500">
            Click on a field boundary for details
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-zinc-900/90 border border-zinc-700/50 backdrop-blur-sm rounded-lg px-4 py-2 flex items-center gap-4">
        <span className="text-[10px] text-zinc-500 font-medium">Legend:</span>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-emerald-500" />
          <span className="text-[10px] text-zinc-400">Healthy</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-amber-500" />
          <span className="text-[10px] text-zinc-400">Stressed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-red-500" />
          <span className="text-[10px] text-zinc-400">Critical</span>
        </div>
      </div>
    </div>
  );
}
