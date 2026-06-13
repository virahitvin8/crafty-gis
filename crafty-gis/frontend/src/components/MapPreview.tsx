import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { Map, Layers, Loader2 } from 'lucide-react';

export default function MapPreview() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current || mapInstance.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '&copy; OpenStreetMap contributors',
          },
        },
        layers: [
          {
            id: 'osm',
            type: 'raster',
            source: 'osm',
            minzoom: 0,
            maxzoom: 19,
          },
        ],
      },
      center: [78.9629, 20.5937], // Center of India
      zoom: 4,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');

    map.on('load', () => {
      map.addSource('analysis-boundary', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        },
      });
      map.addLayer({
        id: 'analysis-boundary-fill',
        type: 'fill',
        source: 'analysis-boundary',
        paint: {
          'fill-color': '#0c8ee6',
          'fill-opacity': 0.15,
        },
      });
      map.addLayer({
        id: 'analysis-boundary-outline',
        type: 'line',
        source: 'analysis-boundary',
        paint: {
          'line-color': '#0c8ee6',
          'line-width': 2,
          'line-opacity': 0.8,
        },
      });
    });

    mapInstance.current = map;

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  return (
    <div className="h-full w-full relative group">
      <div ref={mapContainer} className="h-full w-full rounded-none" />

      {/* Map overlay header */}
      <div className="absolute top-3 left-3 pointer-events-none">
        <div className="flex items-center gap-2 glass rounded-xl px-3 py-1.5 border border-surface-700/50">
          <Map size={14} className="text-crafty-400" />
          <span className="text-xs font-medium text-surface-200">Study Area Preview</span>
        </div>
      </div>

      {/* Quick action buttons */}
      <div className="absolute bottom-3 right-3 flex gap-2 pointer-events-none">
        <button
          className="pointer-events-auto glass rounded-lg px-3 py-1.5 text-xs text-surface-300 hover:text-white border border-surface-700/50 hover:bg-surface-700 transition-colors"
          onClick={() => mapInstance.current?.flyTo({ center: [78.9629, 20.5937], zoom: 4 })}
        >
          Reset View
        </button>
      </div>

      {/* Empty state when no data loaded */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="glass rounded-xl px-4 py-2 border border-surface-700/50">
          <p className="text-xs text-surface-400">Draw boundary or select area in chat</p>
        </div>
      </div>
    </div>
  );
}
