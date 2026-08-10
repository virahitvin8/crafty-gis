// Crafty GIS Utility Functions

import { type ClassValue, clsx } from "clsx";

// Format numbers with appropriate precision
export function formatNumber(value: number, decimals: number = 2): string {
  return value.toFixed(decimals);
}

// Format area in hectares
export function formatArea(hectares: number): string {
  if (hectares < 1) {
    return `${(hectares * 10000).toFixed(0)} m²`;
  }
  return `${hectares.toFixed(2)} ha`;
}

// Get NDVI status color
export function getNDVIStatus(value: number): { color: string; label: string; status: "healthy" | "stressed" | "critical" } {
  if (value > 0.6) return { color: "text-emerald-400", label: "Healthy", status: "healthy" };
  if (value > 0.3) return { color: "text-amber-400", label: "Moderate", status: "stressed" };
  return { color: "text-red-400", label: "Stressed", status: "critical" };
}

// Get soil health status
export function getSoilHealthStatus(score: number): { color: string; label: string } {
  if (score >= 80) return { color: "text-emerald-400", label: "Excellent" };
  if (score >= 60) return { color: "text-blue-400", label: "Good" };
  if (score >= 40) return { color: "text-amber-400", label: "Fair" };
  return { color: "text-red-400", label: "Poor" };
}

// Get weather condition icon
export function getWeatherIcon(code: number): string {
  if (code === 0) return "☀️";
  if (code <= 3) return "⛅";
  if (code <= 49) return "🌫️";
  if (code <= 59) return "🌧️";
  if (code <= 69) return "🌨️";
  if (code <= 79) return "❄️";
  if (code <= 82) return "🌦️";
  if (code <= 86) return "🌨️";
  return "⛈️";
}

// Calculate crop water stress index
export function calculateCWSI(ndvi: number, et0: number, rainfall: number): number {
  // Simplified CWSI calculation
  const potentialET = et0 * 1.2;
  const actualET = rainfall + (ndvi * 2);
  return Math.max(0, Math.min(1, 1 - (actualET / potentialET)));
}

// Format date for API calls
export function formatDateForAPI(date: Date): string {
  return date.toISOString().split("T")[0];
}

// Debounce function
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Generate color gradient for vegetation indices
export function getVegetationColor(value: number): string {
  // Returns a color from red (0) to yellow (0.5) to green (1)
  if (value < 0.2) return "#dc2626"; // red-600
  if (value < 0.4) return "#f59e0b"; // amber-500
  if (value < 0.6) return "#eab308"; // yellow-500
  if (value < 0.8) return "#22c55e"; // green-500
  return "#15803d"; // green-700
}

// Format timestamp
export function formatTimestamp(ts: string): string {
  const date = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return date.toLocaleDateString();
}

// Crop growth stages
export const CROP_GROWTH_STAGES = {
  wheat: ["Germination", "Tillering", "Stem Extension", "Heading", "Flowering", "Grain Fill", "Maturity"],
  rice: ["Germination", "Vegetative", "Tillering", "Panicle Initiation", "Flowering", "Grain Fill", "Maturity"],
  maize: ["Germination", "Vegetative", "Tasseling", "Silking", "Grain Fill", "Maturity"],
  cotton: ["Germination", "Vegetative", "Squaring", "Flowering", "Boll Development", "Maturity"],
  soybean: ["Germination", "Vegetative", "Flowering", "Pod Fill", "Maturity"],
};

// Get growth stage from NDVI
export function estimateGrowthStage(ndvi: number, cropType: string): string {
  const stages = CROP_GROWTH_STAGES[cropType as keyof typeof CROP_GROWTH_STAGES] || CROP_GROWTH_STAGES.wheat;

  if (ndvi < 0.2) return stages[0];
  if (ndvi < 0.3) return stages[1];
  if (ndvi < 0.4) return stages[2];
  if (ndvi < 0.5) return stages[3];
  if (ndvi < 0.6) return stages[4];
  if (ndvi < 0.7) return stages[5];
  return stages[6];
}
