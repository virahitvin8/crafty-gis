// Crafty GIS Type Definitions

export interface Field {
  id: string;
  name: string;
  area: number; // in hectares
  crop: string;
  location: {
    lat: number;
    lng: number;
  };
  polygon?: GeoJSON.Polygon;
  createdAt: string;
  updatedAt: string;
}

export interface VegetationIndex {
  name: string;
  fullName: string;
  value: number;
  min: number;
  max: number;
  mean: number;
  std: number;
  status: "healthy" | "stressed" | "critical";
  trend: "up" | "down" | "stable";
  description: string;
  formula: string;
}

export interface SoilProperties {
  ph: number;
  organicCarbon: number; // g/kg
  nitrogen: number; // g/kg
  clay: number; // %
  sand: number; // %
  silt: number; // %
  cec: number; // cmol/kg
  bulkDensity: number; // g/cm³
  moisture: number; // %
  healthScore: number; // 0-100
}

export interface WeatherData {
  temperature: number; // °C
  humidity: number; // %
  rainfall: number; // mm
  windSpeed: number; // km/h
  windDirection: number; // degrees
  pressure: number; // hPa
  cloudCover: number; // %
  uvIndex: number;
  et0: number; // mm/day (FAO-56)
  forecast: WeatherForecast[];
}

export interface WeatherForecast {
  date: string;
  tempMax: number;
  tempMin: number;
  rainfall: number;
  humidity: number;
  windSpeed: number;
  description: string;
  icon: string;
}

export interface TerrainData {
  elevation: number; // meters
  slope: number; // degrees
  aspect: number; // degrees
  hillshade: number;
  wetnessIndex: number;
  flowAccumulation: number;
}

export interface CropHealthData {
  overallScore: number; // 0-100
  ndviScore: number;
  moistureScore: number;
  nutrientScore: number;
  stressLevel: "none" | "mild" | "moderate" | "severe";
  stressType: string[];
  recommendations: string[];
  growthStage: string;
  daysToHarvest: number;
}

export interface YieldPrediction {
  predictedYield: number; // tons/hectare
  confidence: number; // 0-1
  factors: {
    vegetation: number;
    soil: number;
    weather: number;
    terrain: number;
  };
  historicalAverage: number;
  percentDifference: number;
}

export interface AnalysisResult {
  id: string;
  type: string;
  status: "pending" | "running" | "completed" | "failed";
  progress: number;
  result?: any;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

export interface Report {
  id: string;
  fieldId: string;
  fieldName: string;
  type: string;
  status: "generating" | "ready" | "failed";
  url?: string;
  createdAt: string;
}
