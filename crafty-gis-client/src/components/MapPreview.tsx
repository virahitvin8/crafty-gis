"use client";

import { useEffect, useRef, useState } from "react";
import {
  Layers,
  Maximize2,
  Minimize2,
  Search,
  MapPin,
  Loader2,
} from "lucide-react";

export default function MapPreview() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showLayerPanel, setShowLayerPanel] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || mapInstance.current) return;

    let map: any = null;

    async function initMap() {
      try {
        const maplibregl = await import("maplibre-gl");
        await import("maplibre-gl/dist/maplibre-gl.css");

        if (!mapContainer.current) return;

        map = new maplibregl.default.Map({
          container: mapContainer.current,
          style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
          center: [78.9629, 20.5937], // India center
          zoom: 4,
          attributionControl: true,
        });

        map.addControl(new maplibregl.default.NavigationControl(), "top-right");
        map.addControl(new maplibregl.default.ScaleControl(), "bottom-left");

        map.on("load", () => {
          setMapLoaded(true);
          mapInstance.current = map;

          // Add a sample polygon
          map.addSource("sample-boundary", {
            type: "geojson",
            data: {
              type: "Feature",
              properties: { name: "Study Area" },
              geometry: {
                type: "Polygon",
                coordinates: [[[78, 20], [80, 20], [80, 22], [78, 22], [78, 20]]],
              },
            },
          });

          map.addLayer({
            id: "sample-boundary-layer",
            type: "fill",
            source: "sample-boundary",
            paint: {
              "fill-color": "#0c8ee7",
              "fill-opacity": 0.15,
              "fill-outline-color": "#0c8ee7",
            },
          });

          map.addLayer({
            id: "sample-boundary-outline",
            type: "line",
            source: "sample-boundary",
            paint: {
              "line-color": "#0c8ee7",
              "line-width": 2,
              "line-opacity": 0.8,
            },
          });
        });
      } catch (err) {
        console.warn("MapLibre failed to load:", err);
      }
    }

    initMap();

    return () => {
      if (map) map.remove();
      mapInstance.current = null;
    };
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`
      );
      const data = await response.json();
      if (data.length > 0 && mapInstance.current) {
        const { lat, lon } = data[0];
        mapInstance.current.flyTo({
          center: [parseFloat(lon), parseFloat(lat)],
          zoom: 10,
          duration: 2000,
        });
      }
    } catch {}
  };

  return (
    <div
      className={`relative ${
        isFullscreen
          ? "fixed inset-0 z-50 bg-zinc-950"
          : "h-full"
      }`}
    >
      {/* Map container */}
      <div ref={mapContainer} className="w-full h-full" />

      {/* Loading overlay */}
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/80 backdrop-blur-sm">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-crafty-400 mx-auto mb-2" />
            <p className="text-sm text-zinc-400">Loading map...</p>
          </div>
        </div>
      )}

      {/* Search bar */}
      <div className="absolute top-4 left-4 right-16 z-10 max-w-md">
        <form onSubmit={handleSearch} className="flex">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search location..."
              className="w-full bg-zinc-900/90 backdrop-blur-xl border border-zinc-700 
                       rounded-lg pl-10 pr-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500
                       focus:outline-none focus:ring-2 focus:ring-crafty-500/30 focus:border-crafty-500/50"
            />
          </div>
        </form>
      </div>

      {/* Controls */}
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
          onClick={() => setIsFullscreen(!isFullscreen)}
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
      </div>

      {/* Layer panel */}
      {showLayerPanel && (
        <div className="absolute top-16 right-4 z-10 w-56 bg-zinc-900/95 backdrop-blur-xl 
                       border border-zinc-700 rounded-xl p-4 shadow-xl animate-slide-in-right">
          <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-3">
            Map Layers
          </h3>
          <div className="space-y-2">
            {[
              { name: "Satellite Imagery", active: false },
              { name: "NDVI Overlay", active: false },
              { name: "Classification", active: false },
              { name: "Boundaries", active: true },
              { name: "Roads", active: false },
            ].map((layer) => (
              <label
                key={layer.name}
                className="flex items-center gap-2.5 cursor-pointer group"
              >
                <input
                  type="checkbox"
                  defaultChecked={layer.active}
                  className="w-3.5 h-3.5 rounded border-zinc-600 bg-zinc-800 
                           text-crafty-500 focus:ring-crafty-500/30 cursor-pointer"
                />
                <span className="text-xs text-zinc-400 group-hover:text-zinc-200 transition-colors">
                  {layer.name}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Map info overlay */}
      <div className="absolute bottom-4 left-4 z-10">
        <div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-700/50 rounded-lg px-3 py-2">
          <p className="text-[10px] text-zinc-500">
            <MapPin className="w-3 h-3 inline mr-1" />
            Zoom: Scroll · Pan: Click & Drag
          </p>
        </div>
      </div>
    </div>
  );
}
