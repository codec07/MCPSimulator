import type { ReactElement, ReactNode } from "react";

import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

/**
 * Compact icon + label + value tile. `tone` is a literal Tailwind text-colour
 * class so Tailwind's scanner can see it (same convention as `NavBar`).
 */
export function Stat({
  icon,
  label,
  value,
  hint,
  tone,
  alert,
  className,
}: {
  icon: string;
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: string;
  alert?: boolean;
  className?: string;
}): ReactElement {
  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-2.5",
        alert
          ? "border-ember-400/40 bg-ember-500/8"
          : "border-abyss-600/50 bg-abyss-900/50",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <Icon
          name={icon}
          size={13}
          className={cn(
            "shrink-0",
            alert ? "text-ember-400" : tone ?? "text-fog-400",
          )}
        />
        <span className="truncate text-[10px] font-medium uppercase tracking-[0.12em] text-fog-500">
          {label}
        </span>
      </div>
      <div
        className={cn(
          "num mt-1.5 truncate text-lg font-semibold",
          alert ? "text-ember-400" : "text-fog-50",
        )}
      >
        {value}
      </div>
      {hint ? (
        <div className="mt-0.5 truncate text-[10px] text-fog-500">{hint}</div>
      ) : null}
    </div>
  );
}

/** Tiny caption-over-value pair used inside card spec grids. */
export function Fact({
  label,
  value,
  mono = true,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  mono?: boolean;
  className?: string;
}): ReactElement {
  return (
    <div className={cn("min-w-0", className)}>
      <div className="truncate text-[10px] uppercase tracking-wider text-fog-500">
        {label}
      </div>
      <div
        className={cn(
          "mt-0.5 truncate text-xs font-semibold text-fog-100",
          mono && "num",
        )}
      >
        {value}
      </div>
    </div>
  );
}

/** Label on the left, value on the right, hairline separated. */
export function SpecRow({
  label,
  value,
  mono = true,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  mono?: boolean;
  className?: string;
}): ReactElement {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 border-b border-abyss-600/40 py-2 last:border-b-0",
        className,
      )}
    >
      <span className="min-w-0 truncate text-xs text-fog-400">{label}</span>
      <span
        className={cn(
          "shrink-0 text-xs font-medium text-fog-100",
          mono && "num",
        )}
      >
        {value}
      </span>
    </div>
  );
}
