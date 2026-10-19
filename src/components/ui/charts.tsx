import type { ReactElement, ReactNode } from "react";
import type { Tone } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";

/**
 * Hand-rolled, dependency-free SVG/CSS charts.
 *
 * Everything here is deterministic and SSR-safe: no `Math.random()`, no
 * `Date.now()`, no `useId()` — gradient ids are derived from props instead.
 */

/** Accent tone → literal colour, for `stroke`/`fill`/`background` values. */
const TONE_HEX: Record<Tone, string> = {
  neutral: "#94a3b8",
  iris: "#7c5cff",
  mint: "#2ee0a4",
  solar: "#fbbf24",
  ember: "#fb7185",
  aqua: "#38bdf8",
  plasma: "#e879f9",
};

type Point = readonly [number, number];

/** Round to 3 decimals so server and client markup match byte-for-byte. */
function coord(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/** Min/max of a series, tolerating an empty array. */
function extent(values: readonly number[]): { min: number; max: number } {
  let min = 0;
  let max = 0;
  if (values.length > 0) {
    min = values[0];
    max = values[0];
    for (let i = 1; i < values.length; i += 1) {
      const value = values[i];
      if (value < min) min = value;
      if (value > max) max = value;
    }
  }
  return { min, max };
}

/**
 * Catmull-Rom smoothing expressed as cubic Béziers.
 * Series shorter than three points are joined with straight segments.
 */
function smoothPath(points: readonly Point[]): string {
  if (points.length === 0) return "";

  if (points.length < 3) {
    return points
      .map(([x, y], index) => `${index === 0 ? "M" : "L"}${coord(x)},${coord(y)}`)
      .join(" ");
  }

  const padded: Point[] = [points[0], ...points, points[points.length - 1]];
  let path = `M${coord(points[0][0])},${coord(points[0][1])}`;

  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = padded[i];
    const p1 = padded[i + 1];
    const p2 = padded[i + 2];
    const p3 = padded[i + 3];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    path += ` C${coord(c1x)},${coord(c1y)} ${coord(c2x)},${coord(c2y)} ${coord(
      p2[0],
    )},${coord(p2[1])}`;
  }

  return path;
}

/**
 * A single smoothed line over a stretched `100 × height` viewBox.
 * Returns `null` for series shorter than two points.
 */
export function Sparkline({
  data,
  tone = "iris",
  height = 32,
  className,
  fill = false,
  strokeWidth = 1.75,
}: {
  data: number[];
  tone?: Tone;
  height?: number;
  className?: string;
  fill?: boolean;
  strokeWidth?: number;
}): ReactElement | null {
  if (data.length < 2) return null;

  const hex = TONE_HEX[tone];
  const { min, max } = extent(data);
  const span = max - min;

  const inset = Math.min(
    Math.max(height * 0.12, strokeWidth),
    Math.max(height / 2 - 0.5, 0),
  );
  const top = inset;
  const bottom = height - inset;
  const usable = Math.max(bottom - top, 0.5);

  const points: Point[] = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100;
    // Flat series sits on the centreline instead of collapsing onto an edge.
    const ratio = span === 0 ? 0.5 : (value - min) / span;
    return [coord(x), coord(bottom - ratio * usable)] as const;
  });

  const line = smoothPath(points);
  const gradientId = `hf-spark-${tone}-${height}-${fill ? "area" : "line"}`;
  const baseline = coord(height);

  return (
    <svg
      className={cn("block w-full overflow-visible", className)}
      viewBox={`0 0 100 ${height}`}
      width="100%"
      height={height}
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      {fill ? (
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={hex} stopOpacity={0.34} />
            <stop offset="100%" stopColor={hex} stopOpacity={0} />
          </linearGradient>
        </defs>
      ) : null}

      {fill ? (
        <path
          d={`${line} L100,${baseline} L0,${baseline} Z`}
          fill={`url(#${gradientId})`}
          stroke="none"
        />
      ) : null}

      <path
        d={line}
        fill="none"
        stroke={hex}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/**
 * Equal-width bars normalised to the series peak. The newest bar is drawn at
 * full opacity, older ones at ~55%. Returns `null` for an empty series.
 */
export function MiniBars({
  data,
  tone = "iris",
  height = 32,
  className,
  labels,
  formatValue,
}: {
  data: number[];
  tone?: Tone;
  height?: number;
  className?: string;
  labels?: string[];
  formatValue?: (n: number) => string;
}): ReactElement | null {
  if (data.length === 0) return null;

  const hex = TONE_HEX[tone];
  const { max } = extent(data);
  const peak = max > 0 ? max : 1;
  const lastIndex = data.length - 1;

  return (
    <div className={cn("w-full", className)}>
      <div className="flex w-full items-end gap-[3px]" style={{ height }}>
        {data.map((value, index) => {
          const ratio = Math.min(Math.max(value / peak, 0), 1);
          return (
            <div
              key={index}
              className="min-w-0 flex-1 rounded-t-[3px]"
              style={{
                height: `${Math.max(ratio, 0.06) * 100}%`,
                backgroundColor: hex,
                opacity: index === lastIndex ? 1 : 0.55,
              }}
              title={formatValue ? formatValue(value) : String(value)}
            />
          );
        })}
      </div>

      {labels && labels.length > 0 ? (
        <div className="mt-1 flex w-full gap-[3px]">
          {labels.map((label, index) => (
            <div
              key={index}
              className="min-w-0 flex-1 truncate text-center text-[9px] text-fog-500"
            >
              {label}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Donut built from `strokeDasharray` offsets, rotated `-90deg` so the first
 * slice starts at twelve o'clock. Falls back to the track when the total is 0.
 */
export function Donut({
  segments,
  size = 120,
  thickness = 14,
  className,
  children,
  gap = 2,
}: {
  segments: { label: string; value: number; color: string }[];
  size?: number;
  thickness?: number;
  className?: string;
  children?: ReactNode;
  gap?: number;
}): ReactElement {
  const center = size / 2;
  const radius = Math.max((size - thickness) / 2, 0);
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce(
    (sum, segment) => sum + Math.max(segment.value, 0),
    0,
  );
  const visibleCount = segments.filter((segment) => segment.value > 0).length;
  // A lone slice must not show a notch "between" itself and nothing.
  const gapLength =
    visibleCount > 1 ? (Math.max(gap, 0) / 360) * circumference : 0;

  let cursor = 0;

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#1f2942"
          strokeWidth={thickness}
        />
        <g transform={`rotate(-90 ${center} ${center})`}>
          {total > 0
            ? segments.map((segment, index) => {
                const value = Math.max(segment.value, 0);
                if (value <= 0) return null;

                const arc = (value / total) * circumference;
                const dash = arc <= gapLength ? arc : arc - gapLength;
                const dashOffset = -cursor;
                cursor += arc;

                const percent = Math.round((value / total) * 100);

                return (
                  <circle
                    key={`${segment.label}-${index}`}
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="none"
                    stroke={segment.color}
                    strokeWidth={thickness}
                    strokeDasharray={`${coord(dash)} ${coord(
                      Math.max(circumference - dash, 0),
                    )}`}
                    strokeDashoffset={coord(dashOffset)}
                  >
                    <title>{`${segment.label}: ${value} (${percent}%)`}</title>
                  </circle>
                );
              })
            : null}
        </g>
      </svg>

      {children ? (
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      ) : null}
    </div>
  );
}

/**
 * A row of rounded cells whose opacity tracks each value's ratio to the peak.
 * Suited to a 7- or 24-bucket activity strip.
 */
export function HeatStrip({
  values,
  className,
  tone = "iris",
  label,
}: {
  values: number[];
  className?: string;
  tone?: Tone;
  label?: string;
}): ReactElement {
  const hex = TONE_HEX[tone];
  const { max } = extent(values);
  const peak = max > 0 ? max : 1;

  return (
    <div className={cn("w-full", className)}>
      {label ? (
        <div className="mb-1.5 text-[10px] uppercase tracking-wider text-fog-500">
          {label}
        </div>
      ) : null}

      <div className="flex w-full items-end gap-1">
        {values.map((value, index) => {
          const ratio = Math.min(Math.max(value, 0) / peak, 1);
          return (
            <div
              key={index}
              className="h-3 min-w-0 flex-1 rounded-[3px]"
              style={{
                backgroundColor: hex,
                opacity: 0.14 + 0.86 * ratio,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
