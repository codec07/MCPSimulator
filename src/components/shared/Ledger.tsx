"use client";

import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

/**
 * The small labelled figure tile used along the bottom of a build card.
 *
 * Shared between the single-run card and the batch card so a batch reports its
 * numbers in exactly the same shape as one build.
 */
export function Ledger({
  icon,
  label,
  value,
  hint,
  tone = "text-fog-100",
}: {
  icon: string;
  label: string;
  value: string;
  hint?: string;
  tone?: string;
}) {
  return (
    <div className="rounded-xl border border-abyss-600/50 bg-abyss-900/60 px-2.5 py-2">
      <div className="flex items-center gap-1.5">
        <Icon name={icon} size={11} className="text-fog-500" />
        <span className="text-[9px] uppercase tracking-[0.12em] text-fog-500">
          {label}
        </span>
      </div>
      <p className={cn("num mt-1 text-[13px] font-semibold", tone)}>{value}</p>
      {hint && <p className="mt-0.5 truncate text-[10px] text-fog-500">{hint}</p>}
    </div>
  );
}
