"use client";

import { TrendingUp, TrendingDown, Minus, AlertCircle } from "lucide-react";

interface TrendBadgeProps {
  /** Trend direction */
  direction: "up" | "down" | "stable";
  /** Optional label text shown next to the arrow */
  label?: string;
  /** Whether "up" is good or bad — affects color semantics.
   *  "positive" = up is green (e.g., yield improving)
   *  "negative" = up is red (e.g., pest pressure rising)
   *  "neutral"  = up/down are amber (default) */
  sentiment?: "positive" | "negative" | "neutral";
  /** Size variant */
  size?: "sm" | "md";
  /** Additional CSS classes */
  className?: string;
}

const SIZE_CONFIG = {
  sm: {
    container: "px-1.5 py-0.5 gap-1",
    icon: "w-3 h-3",
    text: "text-[10px]",
  },
  md: {
    container: "px-2 py-1 gap-1.5",
    icon: "w-3.5 h-3.5",
    text: "text-xs",
  },
} as const;

function getTrendStyles(
  direction: "up" | "down" | "stable",
  sentiment: "positive" | "negative" | "neutral"
): { icon: React.ReactNode; color: string; bg: string; border: string } {
  const size = SIZE_CONFIG.md;

  if (direction === "stable") {
    return {
      icon: <Minus className={size.icon} />,
      color: "text-zinc-400",
      bg: "bg-zinc-800/50",
      border: "border-zinc-700/50",
    };
  }

  if (direction === "up") {
    if (sentiment === "positive") {
      return {
        icon: <TrendingUp className={size.icon} />,
        color: "text-emerald-400",
        bg: "bg-emerald-500/10",
        border: "border-emerald-500/20",
      };
    }
    if (sentiment === "negative") {
      return {
        icon: <TrendingUp className={size.icon} />,
        color: "text-red-400",
        bg: "bg-red-500/10",
        border: "border-red-500/20",
      };
    }
    return {
      icon: <TrendingUp className={size.icon} />,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
    };
  }

  // direction === "down"
  if (sentiment === "positive") {
    return {
      icon: <TrendingDown className={size.icon} />,
      color: "text-red-400",
      bg: "bg-red-500/10",
      border: "border-red-500/20",
    };
  }
  if (sentiment === "negative") {
    return {
      icon: <TrendingDown className={size.icon} />,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
    };
  }
  return {
    icon: <TrendingDown className={size.icon} />,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
  };
}

export default function TrendBadge({
  direction,
  label,
  sentiment = "neutral",
  size = "sm",
  className = "",
}: TrendBadgeProps) {
  const config = SIZE_CONFIG[size];
  const styles = getTrendStyles(direction, sentiment);

  const directionLabel =
    direction === "up" ? "Increasing" : direction === "down" ? "Decreasing" : "Stable";

  return (
    <span
      className={`inline-flex items-center ${config.container} rounded-full border font-medium ${styles.color} ${styles.bg} ${styles.border} ${className}`}
      title={`${directionLabel}${label ? `: ${label}` : ""}`}
      role="status"
      aria-label={`Trend: ${directionLabel}`}
    >
      {styles.icon}
      {label && (
        <span className={`${config.text} leading-none`}>{label}</span>
      )}
    </span>
  );
}

export { getTrendStyles };
