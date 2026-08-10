"use client";

import { useMemo } from "react";

interface HealthGaugeProps {
  /** Score value between 0 and 100 */
  value: number;
  /** Label displayed below the gauge */
  label: string;
  /** Size of the gauge in pixels (default: 120) */
  size?: number;
  /** Optional subtitle shown below the label */
  subtitle?: string;
  /** Show numeric value inside the gauge (default: true) */
  showValue?: boolean;
  /** Additional CSS classes for the container */
  className?: string;
}

/**
 * Returns a color string for a given 0-100 score.
 * Red (0-39) -> Amber (40-69) -> Green (70-100)
 */
function getScoreColor(score: number): string {
  const clamped = Math.max(0, Math.min(100, score));
  if (clamped < 40) return "#ef4444"; // red-500
  if (clamped < 55) return "#f97316"; // orange-500
  if (clamped < 70) return "#eab308"; // yellow-500
  if (clamped < 85) return "#22c55e"; // green-500
  return "#15803d"; // green-700
}

/**
 * Returns a Tailwind text color class for a given 0-100 score.
 */
function getScoreTextColor(score: number): string {
  const clamped = Math.max(0, Math.min(100, score));
  if (clamped < 40) return "text-red-400";
  if (clamped < 55) return "text-orange-400";
  if (clamped < 70) return "text-yellow-400";
  if (clamped < 85) return "text-green-400";
  return "text-green-300";
}

/**
 * Returns a status label for a given 0-100 score.
 */
function getScoreLabel(score: number): string {
  const clamped = Math.max(0, Math.min(100, score));
  if (clamped < 30) return "Critical";
  if (clamped < 50) return "Poor";
  if (clamped < 70) return "Fair";
  if (clamped < 85) return "Good";
  return "Excellent";
}

export default function HealthGauge({
  value,
  label,
  size = 120,
  subtitle,
  showValue = true,
  className = "",
}: HealthGaugeProps) {
  const clampedValue = Math.max(0, Math.min(100, value));
  const scoreColor = getScoreColor(clampedValue);
  const textColor = getScoreTextColor(clampedValue);
  const statusLabel = getScoreLabel(clampedValue);

  const { strokeWidth, radius, circumference, strokeDashoffset } = useMemo(() => {
    const sw = Math.max(6, size * 0.08);
    const r = (size - sw) / 2;
    const c = 2 * Math.PI * r;
    const progress = (clampedValue / 100) * c;
    return {
      strokeWidth: sw,
      radius: r,
      circumference: c,
      strokeDashoffset: c - progress,
    };
  }, [size, clampedValue]);

  const center = size / 2;

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="transform -rotate-90"
        >
          {/* Background ring */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-zinc-800"
          />
          {/* Progress ring */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={scoreColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{
              transition: "stroke-dashoffset 0.8s ease-in-out, stroke 0.3s ease",
            }}
          />
        </svg>

        {/* Center content */}
        {showValue && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className="font-bold leading-none"
              style={{ fontSize: size * 0.22, color: scoreColor }}
            >
              {Math.round(clampedValue)}
            </span>
            <span
              className="text-zinc-500 leading-none mt-0.5"
              style={{ fontSize: Math.max(9, size * 0.085) }}
            >
              {statusLabel}
            </span>
          </div>
        )}
      </div>

      {/* Label */}
      <div className="mt-2 text-center">
        <p className="text-xs font-medium text-zinc-300">{label}</p>
        {subtitle && (
          <p className="text-[10px] text-zinc-500 mt-0.5">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

export { getScoreColor, getScoreTextColor, getScoreLabel };
