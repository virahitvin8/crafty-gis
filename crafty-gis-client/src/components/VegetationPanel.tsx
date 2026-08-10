"use client";

import {
  Leaf,
  TreePine,
  Droplets,
  Sprout,
  Sun,
  Waves,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
} from "lucide-react";
import { type VegetationIndex } from "@/lib/types";
import TrendBadge from "./TrendBadge";

interface VegetationPanelProps {
  indices: VegetationIndex[];
  className?: string;
}

/** Configuration for each vegetation index — icons, colors, and display info */
const INDEX_CONFIG: Record<
  string,
  {
    icon: React.ReactNode;
    color: string;
    bgColor: string;
    barColor: string;
    shortName: string;
  }
> = {
  NDVI: {
    icon: <Leaf className="w-4 h-4" />,
    color: "text-green-400",
    bgColor: "bg-green-500/10",
    barColor: "bg-green-500",
    shortName: "NDVI",
  },
  EVI: {
    icon: <TreePine className="w-4 h-4" />,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    barColor: "bg-emerald-500",
    shortName: "EVI",
  },
  GNDVI: {
    icon: <Sprout className="w-4 h-4" />,
    color: "text-lime-400",
    bgColor: "bg-lime-500/10",
    barColor: "bg-lime-500",
    shortName: "GNDVI",
  },
  NDRE: {
    icon: <Sun className="w-4 h-4" />,
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    barColor: "bg-amber-500",
    shortName: "NDRE",
  },
  NDMI: {
    icon: <Droplets className="w-4 h-4" />,
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10",
    barColor: "bg-cyan-500",
    shortName: "NDMI",
  },
  NDWI: {
    icon: <Waves className="w-4 h-4" />,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    barColor: "bg-blue-500",
    shortName: "NDWI",
  },
};

const STATUS_CONFIG: Record<
  VegetationIndex["status"],
  {
    icon: React.ReactNode;
    color: string;
    label: string;
  }
> = {
  healthy: {
    icon: <CheckCircle2 className="w-3 h-3" />,
    color: "text-emerald-400",
    label: "Healthy",
  },
  stressed: {
    icon: <AlertTriangle className="w-3 h-3" />,
    color: "text-amber-400",
    label: "Stressed",
  },
  critical: {
    icon: <XCircle className="w-3 h-3" />,
    color: "text-red-400",
    label: "Critical",
  },
};

function getIndexConfig(name: string) {
  return (
    INDEX_CONFIG[name] || {
      icon: <Leaf className="w-4 h-4" />,
      color: "text-zinc-400",
      bgColor: "bg-zinc-800/50",
      barColor: "bg-zinc-500",
      shortName: name,
    }
  );
}

function IndexCard({ index }: { index: VegetationIndex }) {
  const config = getIndexConfig(index.name);
  const status = STATUS_CONFIG[index.status];
  const normalizedValue = Math.max(
    -1,
    Math.min(1, (index.value - index.min) / (index.max - index.min))
  );
  const barPercent = Math.max(0, Math.min(100, normalizedValue * 100));

  return (
    <div className="bg-zinc-800/30 border border-zinc-700/30 rounded-xl p-3.5 hover:bg-zinc-800/50 transition-colors duration-150">
      {/* Header row */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-lg ${config.bgColor} flex items-center justify-center ${config.color}`}
          >
            {config.icon}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-200">
              {index.name}
            </h3>
            <p className="text-[10px] text-zinc-500">{index.fullName}</p>
          </div>
        </div>

        {/* Status + Trend */}
        <div className="flex items-center gap-1.5">
          <TrendBadge
            direction={index.trend}
            sentiment="positive"
            size="sm"
          />
          <span
            className={`inline-flex items-center gap-1 text-[10px] font-medium ${status.color}`}
          >
            {status.icon}
            {status.label}
          </span>
        </div>
      </div>

      {/* Large value */}
      <div className="flex items-baseline gap-2 mb-2">
        <span className={`text-2xl font-bold ${config.color}`}>
          {index.value.toFixed(3)}
        </span>
        <span className="text-[10px] text-zinc-500">
          range: {index.min.toFixed(2)} to {index.max.toFixed(2)}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden mb-2">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${config.barColor}`}
          style={{ width: `${barPercent}%` }}
        />
      </div>

      {/* Description */}
      <p className="text-[10px] text-zinc-500 leading-relaxed line-clamp-2">
        {index.description}
      </p>

      {/* Formula */}
      <div className="mt-2 px-2 py-1 bg-zinc-900/50 rounded-md">
        <code className="text-[10px] text-zinc-400 font-mono">
          {index.formula}
        </code>
      </div>
    </div>
  );
}

export default function VegetationPanel({
  indices,
  className = "",
}: VegetationPanelProps) {
  if (!indices || indices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="w-16 h-16 rounded-2xl bg-zinc-800/50 border border-zinc-700/50 flex items-center justify-center mb-4">
          <Leaf className="w-8 h-8 text-zinc-500" />
        </div>
        <h3 className="text-lg font-semibold text-zinc-300 mb-2">
          No Vegetation Data
        </h3>
        <p className="text-sm text-zinc-500 max-w-md">
          Run a vegetation analysis on a field to see NDVI, EVI, GNDVI, NDRE,
          NDMI, and NDWI indices with their health status and trends.
        </p>
      </div>
    );
  }

  // Compute summary stats
  const healthyCount = indices.filter((i) => i.status === "healthy").length;
  const stressedCount = indices.filter((i) => i.status === "stressed").length;
  const criticalCount = indices.filter((i) => i.status === "critical").length;
  const avgValue =
    indices.reduce((sum, i) => sum + i.value, 0) / indices.length;

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Leaf className="w-4 h-4 text-green-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-200">
                Vegetation Indices
              </h2>
              <p className="text-xs text-zinc-500">
                {indices.length} index{indices.length !== 1 ? "es" : ""} analyzed
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Info className="w-3 h-3 text-zinc-500" />
          </div>
        </div>

        {/* Summary strip */}
        <div className="flex items-center gap-4 mt-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[10px] text-zinc-400">
              {healthyCount} Healthy
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-[10px] text-zinc-400">
              {stressedCount} Stressed
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-[10px] text-zinc-400">
              {criticalCount} Critical
            </span>
          </div>
          <div className="ml-auto text-[10px] text-zinc-500">
            Avg: {avgValue.toFixed(3)}
          </div>
        </div>
      </div>

      {/* Index cards grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {indices.map((index) => (
            <IndexCard key={index.name} index={index} />
          ))}
        </div>
      </div>
    </div>
  );
}
