export interface Field {
  id: string;
  name: string;
  crop: string;
  cropVariety: string;
  area: number; // in hectares
  elevation: number; // in meters ASL
  ndvi: number; // current NDVI score
  status: 'OPTIMAL' | 'STRESSED' | 'CRITICAL';
  coordinates: { lat: number; lng: number };
  boundary?: { lat: number; lng: number }[]; // custom drawn vertices
  backgroundUrl: string;
  soilPh: number;
  soilNitrogen: number; // in kg/ha
  soilOrganicCarbon: number; // in %
  yieldProjection: number; // tons per hectare
  growthStage: 'early' | 'mid' | 'late';
  pestRiskScore: number; // 0 - 100
  owner?: string;
  surveyNumber?: string;
}

export interface SatelliteScene {
  id: string;
  date: string;
  cloudCover: number;
  thumbnail: string;
}

export interface WeatherForecast {
  day: string;
  temp: number;
  condition: string;
  rainProb: number;
  icon: 'sunny' | 'cloud' | 'rain' | 'sun';
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  answerIndex: number; // 0-based
  explanation: string;
}

export interface Lesson {
  id: number;
  module: string;
  title: string;
  description: string;
  formula?: {
    label: string;
    numerator: string;
    denominator: string;
  };
  highlightBoxes?: {
    title: string;
    content: string;
    borderColorClass: string;
  }[];
  image?: string;
  imageAlt?: string;
}
