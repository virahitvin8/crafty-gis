"use client";

import { useMemo } from "react";
import {
  FlaskConical,
  Layers,
  Droplets,
  Atom,
  Gauge,
  TreeDeciduous,
  AlertCircle,
} from "lucide-react";
import { type SoilProperties } from "@/lib/types";
import HealthGauge from "./HealthGauge";

interface SoilPanelProps {
  soil: SoilProperties | null;
  className?: string;
}

interface GaugeConfig {
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  icon: React.ReactNode;
  optimalRange: string;
  color: string;
}

/** Maps a value in [min, max] to a 0-100 score for the gauge ring color */
function valueToScore(value: number, min: number, max: number): number {
  if (max === min) return 50;
  return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
}

/** Get ring color for a gauge value based on optimal range */
function getGaugeRingColor(
  value: number,
  optimalMin: number,
  optimalMax: number,
  hardMin: number,
  hardMax: number
): string {
  if (value >= optimalMin && value <= optimalMax) return "#22c55e"; // green
  const midMin = optimalMin - (optimalMin - hardMin) * 0.5;
  const midMax = optimalMax + (hardMax - optimalMax) * 0.5;
  if (value >= midMin && value <= midMax) return "#eab308"; // yellow/amber
  return "#ef4444"; // red
}

function CircularGauge({
  config,
  size = 80,
}: {
  config: GaugeConfig;
  size?: number;
}) {
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Determine color based on whether value is in healthy range
  const normalizedScore = valueToScore(config.value, config.min, config.max);
  const progress = (normalizedScore / 100) * circumference;

  const ringColor = getGaugeRingColor(
    config.value,
    config.min + (config.max - config.min) * 0.3,
    config.min + (config.max - config.min) * 0.7,
    config.min,
    config.max
  );

  const center = size / 2;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="transform -rotate-90"
        >
          {/* Background track */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-zinc-800"
          />
          {/* Progress arc */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={ringColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            style={{
              transition:
                "stroke-dashoffset 0.8s ease-in-out, stroke 0.3s ease",
            }}
          />
        </svg>

        {/* Center value */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-sm font-bold leading-none"
            style={{ color: ringColor }}
          >
            {typeof config.value === "number"
              ? config.value % 1 === 0
                ? config.value
                : config.value.toFixed(1)
              : config.value}
          </span>
          <span className="text-[9px] text-zinc-500 leading-none mt-0.5">
            {config.unit}
          </span>
        </div>
      </div>

      {/* Label below */}
      <div className="mt-1.5 text-center">
        <p className="text-[10px] font-medium text-zinc-300">{config.label}</p>
        <p className="text-[9px] text-zinc-600">{config.optimalRange}</p>
      </div>
    </div>
  );
}

function CompositionBar({
  clay,
  sand,
  silt,
}: {
  clay: number;
  sand: number;
  silt: number;
}) {
  const total = clay + sand + silt;
  const safeTotal = total || 1;

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-zinc-400" />
          <span className="text-xs font-medium text-zinc-300">
            Soil Composition
          </span>
        </div>
      </div>

      {/* Stacked bar */}
      <div className="w-full h-4 rounded-full overflow-hidden flex bg-zinc-900">
        <div
          className="h-full bg-amber-600 transition-all duration-500"
          style={{ width: `${(clay / safeTotal) * 100}%` }}
          title={`Clay: ${clay}%`}
        />
        <div
          className="h-full bg-yellow-500 transition-all duration-500"
          style={{ width: `${(silt / safeTotal) * 100}%` }}
          title={`Silt: ${silt}%`}
        />
        <div
          className="h-full bg-orange-300 transition-all duration-500"
          style={{ width: `${(sand / safeTotal) * 100}%` }}
          title={`Sand: ${sand}%`}
        />
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-2">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-amber-600" />
          <span className="text-[10px] text-zinc-400">
            Clay {clay.toFixed(0)}%
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-yellow-500" />
          <span className="text-[10px] text-zinc-400">
            Silt {silt.toFixed(0)}%
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-orange-300" />
          <span className="text-[10px] text-zinc-400">
            Sand {sand.toFixed(0)}%
          </span>
        </div>
      </div>
    </div>
  );
}

export default function SoilPanel({
  soil,
  className = "",
}: SoilPanelProps) {
  const gauges: GaugeConfig[] = useMemo(() => {
    if (!soil) return [];
    return [
      {
        label: "pH",
        value: soil.ph,
        unit: "pH",
        min: 0,
        max: 14,
        icon: <FlaskConical className="w-3.5 h-3.5" />,
        optimalRange: "Optimal: 6.0 - 7.5",
        color: "text-zinc-300",
      },
      {
        label: "Organic Carbon",
        value: soil.organicCarbon,
        unit: "g/kg",
        min: 0,
        max: 60,
        icon: <Atom className="w-3.5 h-3.5" />,
        optimalRange: "Optimal: 10 - 25",
        color: "text-zinc-300",
      },
      {
        label: "Nitrogen",
        value: soil.nitrogen,
        unit: "g/kg",
        min: 0,
        max: 5,
        icon: <TreeDeciduous className="w-3.5 h-3.5" />,
        optimalRange: "Optimal: 1.0 - 3.0",
        color: "text-zinc-300",
      },
      {
        label: "Moisture",
        value: soil.moisture,
        unit: "%",
        min: 0,
        max: 100,
        icon: <Droplets className="w-3.5 h-3.5" />,
        optimalRange: "Optimal: 20 - 40%",
        color: "text-zinc-300",
      },
    ];
  }, [soil]);

  if (!soil) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="w-16 h-16 rounded-2xl bg-zinc-800/50 border border-zinc-700/50 flex items-center justify-center mb-4">
          <FlaskConical className="w-8 h-8 text-zinc-500" />
        </div>
        <h3 className="text-lg font-semibold text-zinc-300 mb-2">
          No Soil Data
        </h3>
        <p className="text-sm text-zinc-500 max-w-md">
          Run a soil analysis on a field to see pH, organic carbon, nitrogen,
          moisture, and soil composition data.
        </p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <FlaskConical className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-zinc-200">
              Soil Properties
            </h2>
            <p className="text-xs text-zinc-500">
              Texture: {soil.clay.toFixed(0)}% clay, {soil.sand.toFixed(0)}% sand,{" "}
              {soil.silt.toFixed(0)}% silt
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Soil Health Score — large gauge */}
        <div className="flex justify-center">
          <HealthGauge
            value={soil.healthScore}
            label="Soil Health Score"
            size={140}
            subtitle="Overall quality assessment"
          />
        </div>

        {/* Property gauges row */}
        <div className="grid grid-cols-4 gap-3">
          {gauges.map((gauge) => (
            <CircularGauge key={gauge.label} config={gauge} size={80} />
          ))}
        </div>

        {/* Soil composition bar */}
        <CompositionBar
          clay={soil.clay}
          sand={soil.sand}
          silt={soil.silt}
        />

        {/* Additional metrics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-zinc-800/30 border border-zinc-700/30 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <Gauge className="w-3.5 h-3.5 text-zinc-400" />
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
                CEC
              </span>
            </div>
            <p className="text-lg font-bold text-zinc-200">
              {soil.cec.toFixed(1)}
            </p>
            <p className="text-[10px] text-zinc-500">cmol/kg</p>
          </div>
          <div className="bg-zinc-800/30 border border-zinc-700/30 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <Layers className="w-3.5 h-3.5 text-zinc-400" />
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
                Bulk Density
              </span>
            </div>
            <p className="text-lg font-bold text-zinc-200">
              {soil.bulkDensity.toFixed(2)}
            </p>
            <p className="text-[10px] text-zinc-500">g/cm3</p>
          </div>
        </div>
      </div>
    </div>
  );
}
