/* ═══════════════════════════════════════════════════════════
   Crafty GIS — Professional Geospatial Utilities
   ═══════════════════════════════════════════════════════════ */

const FH_GIS = (function() {
  'use strict';

  // ─── Constants ───
  const EARTH_RADIUS_KM = 6371.0;
  const EARTH_RADIUS_M = 6371000.0;

  // ─── CRS Definitions ───
  const CRS = {
    WGS84: {
      name: 'WGS 84',
      epsg: 'EPSG:4326',
      units: 'degrees'
    }
  };

  // ─── Coordinate Conversion ───
  function decimalToDMS(decimal, isLongitude = false) {
    const absolute = Math.abs(decimal);
    const degrees = Math.floor(absolute);
    const minutesNotTruncated = (absolute - degrees) * 60;
    const minutes = Math.floor(minutesNotTruncated);
    const seconds = (minutesNotTruncated - minutes) * 60;
    const direction = isLongitude ? (decimal >= 0 ? 'E' : 'W') : (decimal >= 0 ? 'N' : 'S');
    return { degrees, minutes, seconds: seconds.toFixed(2), direction, formatted: `${degrees}°${minutes}'${seconds.toFixed(2)}"${direction}` };
  }

  function detectUTMZone(lng, lat) {
    const zone = Math.floor((lng + 180) / 6) + 1;
    const isNorth = lat >= 0;
    return { zone, isNorth, epsg: isNorth ? `EPSG:326${String(zone).padStart(2, '0')}` : `EPSG:327${String(zone).padStart(2, '0')}`, name: `UTM Zone ${zone}${isNorth ? 'N' : 'S'}` };
  }

  function formatCoord(lat, lng, format = 'dms') {
    const latDMS = decimalToDMS(lat, false);
    const lngDMS = decimalToDMS(lng, true);
    if (format === 'dms') return `${latDMS.formatted}, ${lngDMS.formatted}`;
    if (format === 'decimal') return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    return `${lat.toFixed(6)} (${latDMS.formatted}), ${lng.toFixed(6)} (${lngDMS.formatted})`;
  }

  // ─── Geodesic Calculations ───
  function toRad(deg) { return deg * Math.PI / 180; }
  function toDeg(rad) { return rad * 180 / Math.PI; }

  function haversineDistance(lat1, lng1, lat2, lng2, unit = 'km') {
    const R = unit === 'miles' ? 3958.8 : (unit === 'm' ? EARTH_RADIUS_M : EARTH_RADIUS_KM);
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return { distance: parseFloat(distance.toFixed(3)), unit, bearing: calculateBearing(lat1, lng1, lat2, lng2) };
  }

  function calculateBearing(lat1, lng1, lat2, lng2) {
    const dLng = toRad(lng2 - lng1);
    const y = Math.sin(dLng) * Math.cos(toRad(lat2));
    const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) - Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);
    const bearing = toDeg(Math.atan2(y, x));
    return (bearing + 360) % 360;
  }

  function destinationPoint(lat, lng, bearingDeg, distanceKm) {
    const R = EARTH_RADIUS_KM;
    const d = distanceKm / R;
    const bearing = toRad(bearingDeg);
    const lat1 = toRad(lat);
    const lng1 = toRad(lng);
    const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(bearing));
    const lng2 = lng1 + Math.atan2(Math.sin(bearing) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));
    return { lat: toDeg(lat2), lng: toDeg(lng2) };
  }

  // ─── Area & Perimeter ───
  function polygonArea(coords, unit = 'm²') {
    if (!coords || coords.length < 3) return 0;
    let area = 0;
    const n = coords.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += coords[i][0] * coords[j][1];
      area -= coords[j][0] * coords[i][1];
    }
    area = Math.abs(area) / 2;
    const conversions = { 'deg²': 1, 'm²': area * (111320 ** 2), 'km²': area * (111.32 ** 2), 'ha': area * (111.32 ** 2) * 100, 'acres': area * (111.32 ** 2) * 247.105 };
    return parseFloat((conversions[unit] || area).toFixed(2));
  }

  function polygonPerimeter(coords, unit = 'km') {
    if (!coords || coords.length < 2) return 0;
    let perimeter = 0;
    const n = coords.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      perimeter += haversineDistance(coords[i][0], coords[i][1], coords[j][0], coords[j][1], unit).distance;
    }
    return parseFloat(perimeter.toFixed(3));
  }

  // ─── Bounding Box Operations ───
  function boundingBox(coords) {
    if (!coords || coords.length === 0) return null;
    let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
    for (const [lat, lng] of coords) {
      minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat);
      minLng = Math.min(minLng, lng); maxLng = Math.max(maxLng, lng);
    }
    return { south: minLat, north: maxLat, west: minLng, east: maxLng, center: [(minLat + maxLat) / 2, (minLng + maxLng) / 2], width: maxLng - minLng, height: maxLat - minLat };
  }

  function expandBoundingBox(bbox, bufferKm) {
    if (!bbox) return null;
    const ne = destinationPoint(bbox.north, bbox.east, 45, bufferKm * 1.414);
    const sw = destinationPoint(bbox.south, bbox.west, 225, bufferKm * 1.414);
    return { south: sw.lat, north: ne.lat, west: sw.lng, east: ne.lng, center: [(sw.lat + ne.lat) / 2, (sw.lng + ne.lng) / 2] };
  }

  // ─── Geometry Validation ───
  function validateCoordinates(coords, strict = false) {
    const errors = [];
    const cleaned = [];
    if (!Array.isArray(coords) || coords.length === 0) return { valid: false, errors: ['Empty coordinate array'], cleaned: [] };
    for (let i = 0; i < coords.length; i++) {
      const coord = coords[i];
      if (!Array.isArray(coord) || coord.length < 2) { errors.push(`Invalid coordinate at index ${i}`); continue; }
      let [lat, lng] = coord;
      if (isNaN(lat) || isNaN(lng)) { errors.push(`NaN coordinate at index ${i}`); continue; }
      if (lat < -90 || lat > 90) { errors.push(`Latitude out of range at index ${i}: ${lat}`); if (strict) continue; }
      if (lng < -180 || lng > 180) { errors.push(`Longitude out of range at index ${i}: ${lng}`); if (strict) continue; }
      cleaned.push([parseFloat(lat.toFixed(6)), parseFloat(lng.toFixed(6))]);
    }
    return { valid: errors.length === 0, errors, cleaned, count: cleaned.length };
  }

  function polygonWindingOrder(coords) {
    if (!coords || coords.length < 3) return null;
    let sum = 0;
    for (let i = 0; i < coords.length; i++) {
      const j = (i + 1) % coords.length;
      sum += (coords[j][1] - coords[i][1]) * (coords[j][0] + coords[i][0]);
    }
    return sum > 0 ? 'counter-clockwise' : 'clockwise';
  }

  function reverseWinding(coords) {
    if (!coords || coords.length < 3) return coords;
    return [coords[0], ...coords.slice(1).reverse()];
  }

  // ─── Spatial Queries ───
  function pointInPolygon(point, polygon) {
    if (!point || !polygon || polygon.length < 3) return false;
    const [lat, lng] = point;
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [latI, lngI] = polygon[i];
      const [latJ, lngJ] = polygon[j];
      if (((lngI > lng) !== (lngJ > lng)) && (lat < (latJ - latI) * (lng - lngI) / (lngJ - lngI) + latI)) inside = !inside;
    }
    return inside;
  }

  // ─── Centroid & Statistics ───
  function polygonCentroid(coords) {
    if (!coords || coords.length === 0) return null;
    let areaSum = 0, cx = 0, cy = 0;
    for (let i = 0; i < coords.length; i++) {
      const j = (i + 1) % coords.length;
      const cross = coords[i][0] * coords[j][1] - coords[j][0] * coords[i][1];
      areaSum += cross;
      cx += (coords[i][0] + coords[j][0]) * cross;
      cy += (coords[i][1] + coords[j][1]) * cross;
    }
    areaSum /= 2;
    if (Math.abs(areaSum) < 1e-10) {
      const avgLat = coords.reduce((sum, c) => sum + c[0], 0) / coords.length;
      const avgLng = coords.reduce((sum, c) => sum + c[1], 0) / coords.length;
      return [avgLat, avgLng];
    }
    cx /= (6 * areaSum);
    cy /= (6 * areaSum);
    return [cx, cy];
  }

  function meanCenter(points) {
    if (!points || points.length === 0) return null;
    const sumLat = points.reduce((sum, p) => sum + p[0], 0);
    const sumLng = points.reduce((sum, p) => sum + p[1], 0);
    return [sumLat / points.length, sumLng / points.length];
  }

  function rasterStatistics(values) {
    if (!values || values.length === 0) return null;
    const valid = values.filter(v => v !== null && v !== undefined && !isNaN(v));
    if (valid.length === 0) return null;
    const sorted = [...valid].sort((a, b) => a - b);
    const sum = valid.reduce((a, b) => a + b, 0);
    const mean = sum / valid.length;
    const variance = valid.reduce((s, val) => s + (val - mean) ** 2, 0) / valid.length;
    return { min: sorted[0], max: sorted[sorted.length - 1], mean: parseFloat(mean.toFixed(4)), median: sorted[Math.floor(sorted.length / 2)], std: parseFloat(Math.sqrt(variance).toFixed(4)), count: valid.length, p5: sorted[Math.floor(sorted.length * 0.05)], p25: sorted[Math.floor(sorted.length * 0.25)], p75: sorted[Math.floor(sorted.length * 0.75)], p95: sorted[Math.floor(sorted.length * 0.95)] };
  }

  // ─── Grid Utilities ───
  function createGrid(bbox, gridSizeKm = 1) {
    if (!bbox) return [];
    const grid = [];
    const latStep = gridSizeKm / 111.32;
    const lngStep = gridSizeKm / (111.32 * Math.cos(toRad(bbox.center[0])));
    for (let lat = bbox.south; lat <= bbox.north; lat += latStep) {
      for (let lng = bbox.west; lng <= bbox.east; lng += lngStep) {
        grid.push({ lat: parseFloat(lat.toFixed(6)), lng: parseFloat(lng.toFixed(6)), id: `${lat.toFixed(4)}_${lng.toFixed(4)}` });
      }
    }
    return grid;
  }

  function gridId(lat, lng, precision = 4) {
    return `${lat.toFixed(precision)}_${lng.toFixed(precision)}`;
  }

  // ─── Utility Functions ───
  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  // ─── Public API ───
  return {
    CRS,
    decimalToDMS,
    detectUTMZone,
    formatCoord,
    haversineDistance,
    calculateBearing,
    destinationPoint,
    polygonArea,
    polygonPerimeter,
    boundingBox,
    expandBoundingBox,
    validateCoordinates,
    polygonWindingOrder,
    reverseWinding,
    pointInPolygon,
    polygonCentroid,
    meanCenter,
    rasterStatistics,
    createGrid,
    gridId,
    toRad,
    toDeg,
    clamp,
    lerp,
    EARTH_RADIUS_KM,
    EARTH_RADIUS_M
  };
})();

if (typeof window !== 'undefined') {
  window.FH_GIS = FH_GIS;
}
