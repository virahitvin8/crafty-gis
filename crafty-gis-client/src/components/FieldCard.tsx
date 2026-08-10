"use client";

import {
  MapPin,
  Wheat,
  Calendar,
  BarChart3,
  FileText,
  Settings,
  Layers,
  ChevronRight,
  Sprout,
} from "lucide-react";
import { type Field } from "@/lib/types";
import { formatArea } from "@/lib/utils";
import HealthGauge from "./HealthGauge";

interface FieldCardProps {
  field: Field;
  healthScore: number;
  lastAnalysisDate?: string;
  cropType?: string;
  onSelect?: (field: Field) => void;
  onAnalyze?: (field: Field) => void;
  onExport?: (field: Field) => void;
  className?: string;
}

function formatRelativeDate(dateStr?: string): string {
  if (!dateStr) return "Never analyzed";
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays === 0) return "Analyzed today";
    if (diffDays === 1) return "Analyzed yesterday";
    if (diffDays < 7) return `Analyzed ${diffDays} days ago`;
    if (diffDays < 30) return `Analyzed ${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

/** Crop emoji mapping */
function getCropEmoji(crop: string): string {
  const lower = crop.toLowerCase();
  if (lower.includes("wheat")) return "🌾";
  if (lower.includes("rice") || lower.includes("paddy")) return "🍚";
  if (lower.includes("maize") || lower.includes("corn")) return "🌽";
  if (lower.includes("cotton")) return "🏵️";
  if (lower.includes("soybean") || lower.includes("soy")) return "🫘";
  if (lower.includes("sugarcane")) return "🪴";
  if (lower.includes("potato")) return "🥔";
  if (lower.includes("tomato")) return "🍅";
  return "🌱";
}

export default function FieldCard({
  field,
  healthScore,
  lastAnalysisDate,
  cropType,
  onSelect,
  onAnalyze,
  onExport,
  className = "",
}: FieldCardProps) {
  const cropLabel = cropType || field.crop;
  const cropEmoji = getCropEmoji(cropLabel);

  return (
    <div
      className={`bg-zinc-800/30 border border-zinc-700/30 rounded-xl p-4 hover:bg-zinc-800/50 hover:border-zinc-700/50 transition-all duration-150 cursor-pointer group ${className}`}
      onClick={() => onSelect?.(field)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect?.(field);
        }
      }}
      aria-label={`Field: ${field.name}`}
    >
      {/* Top section: Name + Health gauge */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          {/* Field name */}
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="w-3.5 h-3.5 text-crafty-400 flex-shrink-0" />
            <h3 className="text-sm font-semibold text-zinc-200 truncate">
              {field.name}
            </h3>
          </div>

          {/* Crop + Area */}
          <div className="flex items-center gap-2 ml-5">
            <span className="text-[10px] text-zinc-500 flex items-center gap-1">
              <span>{cropEmoji}</span>
              {cropLabel}
            </span>
            <span className="text-[10px] text-zinc-600">|</span>
            <span className="text-[10px] text-zinc-500">
              {formatArea(field.area)}
            </span>
          </div>
        </div>

        {/* Health gauge */}
        <div className="flex-shrink-0 ml-3">
          <HealthGauge
            value={healthScore}
            label=""
            size={64}
            showValue={true}
          />
        </div>
      </div>

      {/* Last analysis */}
      <div className="flex items-center gap-1.5 mb-3 ml-5">
        <Calendar className="w-3 h-3 text-zinc-600" />
        <span className="text-[10px] text-zinc-500">
          {formatRelativeDate(lastAnalysisDate)}
        </span>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 ml-5">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAnalyze?.(field);
          }}
          className="flex items-center gap-1.5 text-[10px] bg-crafty-500/10 text-crafty-400
                   hover:bg-crafty-500/20 border border-crafty-500/20 px-2.5 py-1.5 rounded-lg
                   transition-all duration-150 font-medium"
          title="Run analysis"
        >
          <BarChart3 className="w-3 h-3" />
          Analyze
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onExport?.(field);
          }}
          className="flex items-center gap-1.5 text-[10px] bg-zinc-800 text-zinc-400
                   hover:text-zinc-200 hover:bg-zinc-700 border border-zinc-700/50 px-2.5 py-1.5 rounded-lg
                   transition-all duration-150"
          title="Export report"
        >
          <FileText className="w-3 h-3" />
          Export
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
          }}
          className="flex items-center gap-1.5 text-[10px] bg-zinc-800 text-zinc-400
                   hover:text-zinc-200 hover:bg-zinc-700 border border-zinc-700/50 px-2.5 py-1.5 rounded-lg
                   transition-all duration-150 ml-auto"
          title="Field settings"
        >
          <Settings className="w-3 h-3" />
        </button>
      </div>

      {/* Click hint */}
      <div className="flex items-center justify-end mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        <span className="text-[10px] text-zinc-600 flex items-center gap-0.5">
          View details
          <ChevronRight className="w-3 h-3" />
        </span>
      </div>
    </div>
  );
}
