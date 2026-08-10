"use client";

import { useMemo } from "react";
import {
  Thermometer,
  Droplets,
  CloudRain,
  Wind,
  Sun,
  Gauge,
  Sprout,
  AlertTriangle,
  CheckCircle2,
  Info,
  Calendar,
} from "lucide-react";
import { type WeatherData, type WeatherForecast } from "@/lib/types";
import { calculateCWSI } from "@/lib/utils";

interface WeatherPanelProps {
  weather: WeatherData | null;
  ndvi?: number;
  className?: string;
}

const FORECAST_ICON_MAP: Record<string, string> = {
  "01d": "☀️",
  "01n": "🌙",
  "02d": "⛅",
  "02n": "☁️",
  "03d": "☁️",
  "03n": "☁️",
  "04d": "☁️",
  "04n": "☁️",
  "09d": "🌧️",
  "09n": "🌧️",
  "10d": "🌦️",
  "10n": "🌦️",
  "11d": "⛈️",
  "11n": "⛈️",
  "13d": "🌨️",
  "13n": "🌨️",
  "50d": "🌫️",
  "50n": "🌫️",
};

function getForecastEmoji(icon: string): string {
  return FORECAST_ICON_MAP[icon] || "🌤️";
}

function formatDay(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";

    return date.toLocaleDateString("en-US", { weekday: "short" });
  } catch {
    return dateStr;
  }
}

function getCWSIIndicator(wsij: number): {
  label: string;
  color: string;
  bgColor: string;
  icon: React.ReactNode;
  description: string;
} {
  if (wsij < 0.2) {
    return {
      label: "No Stress",
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/10 border-emerald-500/20",
      icon: <CheckCircle2 className="w-4 h-4" />,
      description: "Crop water demand is well met. Continue current irrigation schedule.",
    };
  }
  if (wsij < 0.4) {
    return {
      label: "Mild Stress",
      color: "text-yellow-400",
      bgColor: "bg-yellow-500/10 border-yellow-500/20",
      icon: <Info className="w-4 h-4" />,
      description: "Slight water deficit detected. Consider light irrigation within 24 hours.",
    };
  }
  if (wsij < 0.6) {
    return {
      label: "Moderate Stress",
      color: "text-amber-400",
      bgColor: "bg-amber-500/10 border-amber-500/20",
      icon: <AlertTriangle className="w-4 h-4" />,
      description: "Significant water deficit. Schedule irrigation soon to prevent yield loss.",
    };
  }
  return {
    label: "Severe Stress",
    color: "text-red-400",
    bgColor: "bg-red-500/10 border-red-500/20",
    icon: <AlertTriangle className="w-4 h-4" />,
    description: "Critical water deficit. Immediate irrigation required to avoid crop damage.",
  };
}

function ForecastCard({ forecast }: { forecast: WeatherForecast }) {
  return (
    <div className="bg-zinc-800/30 border border-zinc-700/30 rounded-xl p-3 min-w-[110px] flex-shrink-0 hover:bg-zinc-800/50 transition-colors duration-150">
      <div className="text-center">
        {/* Day */}
        <p className="text-[10px] text-zinc-500 font-medium mb-1">
          {formatDay(forecast.date)}
        </p>

        {/* Emoji icon */}
        <p className="text-2xl mb-1">{getForecastEmoji(forecast.icon)}</p>

        {/* Temps */}
        <div className="flex items-center justify-center gap-1">
          <span className="text-sm font-bold text-zinc-200">
            {Math.round(forecast.tempMax)}°
          </span>
          <span className="text-[10px] text-zinc-500">/</span>
          <span className="text-xs text-zinc-500">
            {Math.round(forecast.tempMin)}°
          </span>
        </div>

        {/* Rain */}
        {forecast.rainfall > 0 && (
          <div className="flex items-center justify-center gap-1 mt-1">
            <CloudRain className="w-3 h-3 text-blue-400" />
            <span className="text-[10px] text-blue-400">
              {forecast.rainfall.toFixed(1)}mm
            </span>
          </div>
        )}

        {/* Description */}
        <p className="text-[9px] text-zinc-500 mt-1 capitalize line-clamp-1">
          {forecast.description}
        </p>
      </div>
    </div>
  );
}

export default function WeatherPanel({
  weather,
  ndvi = 0.5,
  className = "",
}: WeatherPanelProps) {
  const wsij = useMemo(() => {
    if (!weather) return 0;
    return calculateCWSI(ndvi, weather.et0, weather.rainfall);
  }, [weather, ndvi]);

  const wsijIndicator = getCWSIIndicator(wsij);

  if (!weather) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="w-16 h-16 rounded-2xl bg-zinc-800/50 border border-zinc-700/50 flex items-center justify-center mb-4">
          <Sun className="w-8 h-8 text-zinc-500" />
        </div>
        <h3 className="text-lg font-semibold text-zinc-300 mb-2">
          No Weather Data
        </h3>
        <p className="text-sm text-zinc-500 max-w-md">
          Weather data will appear here once a field analysis is initiated. This
          includes current conditions, 7-day forecast, and crop water stress
          indicators.
        </p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center">
            <Sun className="w-4 h-4 text-sky-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-zinc-200">
              Weather Conditions
            </h2>
            <p className="text-xs text-zinc-500">
              Current conditions and 7-day outlook
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Current conditions grid */}
        <div className="grid grid-cols-3 gap-3">
          {/* Temperature */}
          <div className="bg-zinc-800/30 border border-zinc-700/30 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Thermometer className="w-3.5 h-3.5 text-red-400" />
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
                Temp
              </span>
            </div>
            <p className="text-xl font-bold text-zinc-200">
              {Math.round(weather.temperature)}°C
            </p>
          </div>

          {/* Humidity */}
          <div className="bg-zinc-800/30 border border-zinc-700/30 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Droplets className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
                Humidity
              </span>
            </div>
            <p className="text-xl font-bold text-zinc-200">
              {Math.round(weather.humidity)}%
            </p>
          </div>

          {/* Rainfall */}
          <div className="bg-zinc-800/30 border border-zinc-700/30 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <CloudRain className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
                Rain
              </span>
            </div>
            <p className="text-xl font-bold text-zinc-200">
              {weather.rainfall.toFixed(1)}
              <span className="text-xs text-zinc-500 font-normal">mm</span>
            </p>
          </div>

          {/* Wind Speed */}
          <div className="bg-zinc-800/30 border border-zinc-700/30 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Wind className="w-3.5 h-3.5 text-zinc-400" />
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
                Wind
              </span>
            </div>
            <p className="text-xl font-bold text-zinc-200">
              {weather.windSpeed.toFixed(1)}
              <span className="text-xs text-zinc-500 font-normal">km/h</span>
            </p>
          </div>

          {/* ET0 */}
          <div className="bg-zinc-800/30 border border-zinc-700/30 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Sprout className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
                ET0
              </span>
            </div>
            <p className="text-xl font-bold text-zinc-200">
              {weather.et0.toFixed(1)}
              <span className="text-xs text-zinc-500 font-normal">mm/d</span>
            </p>
          </div>

          {/* UV Index */}
          <div className="bg-zinc-800/30 border border-zinc-700/30 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Sun className="w-3.5 h-3.5 text-yellow-400" />
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
                UV
              </span>
            </div>
            <p className="text-xl font-bold text-zinc-200">
              {weather.uvIndex}
            </p>
          </div>
        </div>

        {/* Crop Water Stress Index */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Droplets className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-xs font-medium text-zinc-300">
              Crop Water Stress Index
            </span>
          </div>

          <div
            className={`rounded-xl border p-3.5 ${wsijIndicator.bgColor}`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={wsijIndicator.color}>
                  {wsijIndicator.icon}
                </span>
                <span
                  className={`text-sm font-semibold ${wsijIndicator.color}`}
                >
                  {wsijIndicator.label}
                </span>
              </div>
              <span className={`text-lg font-bold ${wsijIndicator.color}`}>
                {(wsij * 100).toFixed(0)}%
              </span>
            </div>

            {/* Stress bar */}
            <div className="w-full h-2 bg-zinc-900/50 rounded-full overflow-hidden mb-2">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${wsij * 100}%`,
                  backgroundColor:
                    wsij < 0.2
                      ? "#22c55e"
                      : wsij < 0.4
                      ? "#eab308"
                      : wsij < 0.6
                      ? "#f59e0b"
                      : "#ef4444",
                }}
              />
            </div>

            <p className="text-[10px] text-zinc-400 leading-relaxed">
              {wsijIndicator.description}
            </p>
          </div>
        </div>

        {/* 7-Day Forecast */}
        {weather.forecast && weather.forecast.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-3.5 h-3.5 text-zinc-400" />
              <span className="text-xs font-medium text-zinc-300">
                7-Day Forecast
              </span>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin">
              {weather.forecast.slice(0, 7).map((day, idx) => (
                <ForecastCard key={day.date + idx} forecast={day} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
