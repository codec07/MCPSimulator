import type { CSSProperties, ReactElement, ReactNode } from "react";

import type { Tone } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";

/* Full literal class strings only — Tailwind v4 scans source text. */
const FILL_TONE_CLASSES: Record<Tone, string> = {
  neutral: "bg-gradient-to-r from-fog-400 to-fog-200",
  iris: "bg-gradient-to-r from-iris-500 to-iris-300",
  mint: "bg-gradient-to-r from-mint-500 to-mint-300",
  solar: "bg-gradient-to-r from-solar-500 to-solar-300",
  ember: "bg-gradient-to-r from-ember-500 to-ember-400",
  aqua: "bg-gradient-to-r from-aqua-500 to-aqua-400",
  plasma: "bg-gradient-to-r from-plasma-500 to-plasma-400",
};

const STROKE_TONE_CLASSES: Record<Tone, string> = {
  neutral: "stroke-fog-300",
  iris: "stroke-iris-400",
  mint: "stroke-mint-400",
  solar: "stroke-solar-400",
  ember: "stroke-ember-400",
  aqua: "stroke-aqua-400",
  plasma: "stroke-plasma-400",
};

const SIZE_CLASSES: Record<"xs" | "sm" | "md", string> = {
  xs: "h-1.5",
  sm: "h-2.5",
  md: "h-3.5",
};

export function Progress({
  value,
  max = 100,
  tone = "iris",
  size = "sm",
  striped,
  className,
  showValue,
  label,
}: {
  value: number;
  max?: number;
  tone?: Tone;
  size?: "xs" | "sm" | "md";
  striped?: boolean;
  className?: string;
  showValue?: boolean;
  label?: ReactNode;
}): ReactElement {
  const safeMax = max > 0 ? max : 100;
  const clamped = Math.min(Math.max(value, 0), safeMax);
  const pct = (clamped / safeMax) * 100;
  const hasHeader = Boolean(label) || Boolean(showValue);

  return (
    <div className={cn("w-full", className)}>
      {hasHeader ? (
        <div className="mb-1.5 flex items-center justify-between gap-3">
          {label ? (
            <span className="min-w-0 truncate text-xs text-fog-300">
              {label}
            </span>
          ) : (
            <span />
          )}
          {showValue ? (
            <span className="num shrink-0 text-xs text-fog-200">
              {Math.round(pct)}%
            </span>
          ) : null}
        </div>
      ) : null}
      <div
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        className={cn(
          "relative w-full overflow-hidden rounded-full border border-abyss-500/50 bg-abyss-700/80",
          SIZE_CLASSES[size],
        )}
      >
        <div
          className={cn(
            "relative h-full rounded-full transition-[width] duration-500 ease-out",
            FILL_TONE_CLASSES[tone],
          )}
          style={{ width: `${pct}%` }}
        >
          {striped ? (
            <span
              aria-hidden="true"
              className="sheen pointer-events-none absolute inset-0 rounded-full bg-[length:200%_100%]"
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function Ring({
  value,
  size = 72,
  thickness = 7,
  tone = "iris",
  className,
  children,
  trackClassName,
}: {
  value: number;
  size?: number;
  thickness?: number;
  tone?: Tone;
  className?: string;
  children?: ReactNode;
  trackClassName?: string;
}): ReactElement {
  const clamped = Math.min(Math.max(value, 0), 100);
  const radius = Math.max((size - thickness) / 2, 0);
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;
  const center = size / 2;

  const wrapStyle: CSSProperties = { width: size, height: size };

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center",
        className,
      )}
      style={wrapStyle}
    >
      <svg
        aria-hidden="true"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
      >
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          strokeWidth={thickness}
          className={cn("stroke-abyss-600/70", trackClassName)}
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn(
            "transition-[stroke-dashoffset] duration-500 ease-out",
            STROKE_TONE_CLASSES[tone],
          )}
        />
      </svg>
      {children ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {children}
        </div>
      ) : null}
    </div>
  );
}
