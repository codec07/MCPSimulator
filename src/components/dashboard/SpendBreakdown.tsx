"use client";

import type { ReactElement } from "react";

import { Card, CardHeader } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { Donut } from "@/components/ui/charts";
import { count, money2, pct } from "@/lib/format";
import { useSim } from "@/lib/store";
import { ratio, riseDelay } from "./utils";

const CATEGORIES = [
  {
    kind: "purchase-model",
    label: "Token packs",
    blurb: "model credits bought",
    color: "#7c5cff",
    icon: "Coins",
  },
  {
    kind: "purchase-compute",
    label: "Compute hours",
    blurb: "GPU time rented",
    color: "#38bdf8",
    icon: "Server",
  },
  {
    kind: "penalty",
    label: "Failures & partials",
    blurb: "settled after lost capacity",
    color: "#fb7185",
    icon: "AlertTriangle",
  },
] as const;

/** Where the money actually went, grouped by transaction kind. */
export function SpendBreakdown(): ReactElement {
  const history = useSim((s) => s.history);

  const totals = new Map<string, number>();
  const counts = new Map<string, number>();
  let grand = 0;

  for (const entry of history) {
    const category = CATEGORIES.find((item) => item.kind === entry.kind);
    if (!category) continue;
    const magnitude = Math.abs(entry.amount);
    totals.set(category.kind, (totals.get(category.kind) ?? 0) + magnitude);
    counts.set(category.kind, (counts.get(category.kind) ?? 0) + 1);
    grand += magnitude;
  }

  const segments = CATEGORIES.map((category) => ({
    label: category.label,
    value: totals.get(category.kind) ?? 0,
    color: category.color,
  }));

  return (
    <Card accent="#fbbf24">
      <CardHeader
        accent="#fbbf24"
        icon={<Icon name="Receipt" size={16} />}
        title="Spend breakdown"
        subtitle="gross dollars moved, by category"
        action={
          grand > 0 ? (
            <span className="num text-sm font-semibold text-solar-300">
              {money2(grand)}
            </span>
          ) : undefined
        }
      />

      {grand > 0 ? (
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
          <Donut segments={segments} size={132} thickness={15}>
            <div className="flex flex-col items-center">
              <span className="num text-base font-semibold text-fog-50">
                {money2(grand)}
              </span>
              <span className="text-[9px] uppercase tracking-[0.14em] text-fog-500">
                total
              </span>
            </div>
          </Donut>

          <ul className="flex w-full flex-1 flex-col gap-2">
            {CATEGORIES.map((category, index) => {
              const value = totals.get(category.kind) ?? 0;
              return (
                <li
                  key={category.kind}
                  className="animate-rise flex items-center gap-3 rounded-xl border border-abyss-600/50 bg-abyss-900/60 px-3 py-2"
                  style={riseDelay(index)}
                >
                  <span
                    aria-hidden="true"
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: category.color }}
                  />
                  <Icon name={category.icon} size={13} className="shrink-0 text-fog-500" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium text-fog-200">
                      {category.label}
                    </span>
                    <span className="block truncate text-[10px] text-fog-500">
                      {count(counts.get(category.kind) ?? 0)} × {category.blurb}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="num block text-xs font-semibold text-fog-100">
                      {money2(value)}
                    </span>
                    <span className="num block text-[10px] text-fog-500">
                      {pct(ratio(value, grand))}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-abyss-500/60 bg-abyss-900/40 px-6 py-9 text-center">
          <Icon name="Receipt" size={20} className="text-fog-500" />
          <p className="text-sm font-semibold text-fog-100">Nothing spent yet</p>
          <p className="max-w-sm text-xs leading-relaxed text-fog-400">
            Token packs, rented GPU hours and failed runs will all show up here
            once you start building.
          </p>
        </div>
      )}
    </Card>
  );
}
