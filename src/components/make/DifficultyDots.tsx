"use client";

import { cn } from "@/lib/cn";

/**
 * Five pips, `value` of them lit in the contract's accent. Decorative — the
 * adjacent readout carries the number for assistive tech.
 */
export function DifficultyDots({
  value,
  accent,
  className,
}: {
  value: number;
  accent: string;
  className?: string;
}) {
  const lit = Math.max(0, Math.min(5, Math.round(value)));

  return (
    <span
      aria-hidden="true"
      className={cn("inline-flex items-center gap-[3px]", className)}
    >
      {[1, 2, 3, 4, 5].map((pip) => (
        <span
          key={pip}
          className="h-1.5 w-1.5 rounded-full"
          style={{
            background: pip <= lit ? accent : "rgba(148, 163, 184, 0.22)",
          }}
        />
      ))}
    </span>
  );
}
