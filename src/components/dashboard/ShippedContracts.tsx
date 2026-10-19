"use client";

import type { ReactElement } from "react";

import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { Icon, hasIcon } from "@/components/ui/Icon";
import { Progress } from "@/components/ui/Progress";
import { PROJECT_CATEGORY_META, PROJECT_BY_ID, PROJECTS } from "@/data/projects";
import { money2, pct } from "@/lib/format";
import { useSim } from "@/lib/store";
import type { ProjectDef } from "@/lib/types";
import { asTone, ratio, riseDelay } from "./utils";
import { DashboardLink } from "./DashboardLink";

interface ShippedRow {
  def: ProjectDef;
  times: number;
}

/** Which contracts have been delivered, and how far the catalog still reaches. */
export function ShippedContracts(): ReactElement {
  const completed = useSim((s) => s.completed);

  const rows: ShippedRow[] = Object.entries(completed)
    .map(([id, times]) => {
      const def = PROJECT_BY_ID[id];
      return def ? { def, times } : null;
    })
    .filter(
      (row): row is ShippedRow => row !== null && row.times > 0,
    )
    .sort((a, b) => b.times - a.times || a.def.title.localeCompare(b.def.title));

  const total = PROJECTS.length;
  const done = rows.length;
  const gross = rows.reduce((sum, row) => sum + row.def.payment * row.times, 0);

  return (
    <Card accent="#38bdf8">
      <CardHeader
        accent="#38bdf8"
        icon={<Icon name="Package" size={16} />}
        title="Shipped contracts"
        subtitle={
          <span>
            <span className="num text-fog-300">{done}</span> of{" "}
            <span className="num text-fog-300">{total}</span> contracts delivered
            {done > 0 ? " at least once" : ""}
          </span>
        }
        action={
          done > 0 ? (
            <span className="num text-sm font-semibold text-aqua-400">
              {money2(gross)}
            </span>
          ) : undefined
        }
      />

      <Progress
        value={done}
        max={total}
        tone="aqua"
        size="xs"
        showValue
        label={
          <span className="text-[11px] text-fog-500">
            catalog coverage ·{" "}
            <span className="num text-fog-300">
              {done}/{total}
            </span>
          </span>
        }
        className="mb-4"
      />

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-abyss-500/60 bg-abyss-900/40 px-6 py-9 text-center">
          <Icon name="Package" size={20} className="text-fog-500" />
          <p className="text-sm font-semibold text-fog-100">
            No contracts shipped yet
          </p>
          <p className="max-w-sm text-xs leading-relaxed text-fog-400">
            Ship your first contract to start filling this board. Repeat jobs pay
            the same but burn new tokens and hours, so pick the margin you want.
          </p>
          <DashboardLink href="/make" variant="outline" icon="Rocket" arrow>
            Browse the catalog
          </DashboardLink>
        </div>
      ) : (
        <ul className="scroll-thin flex max-h-[360px] flex-col gap-2 overflow-y-auto pr-1">
          {rows.map((row, index) => {
            const meta = PROJECT_CATEGORY_META[row.def.category];
            const iconName = meta && hasIcon(meta.icon) ? meta.icon : "Boxes";
            return (
              <li
                key={row.def.id}
                className="animate-rise flex items-center gap-3 rounded-xl border border-abyss-600/50 bg-abyss-900/60 px-3 py-2.5"
                style={riseDelay(index)}
              >
                <span
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border"
                  style={{
                    borderColor: `${row.def.accent}55`,
                    background: `color-mix(in srgb, ${row.def.accent} 14%, transparent)`,
                  }}
                >
                  <Icon name={iconName} size={14} style={{ color: row.def.accent }} />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold text-fog-100">
                    {row.def.title}
                  </span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
                    <Badge tone={asTone(meta?.tone ?? "neutral")} size="sm">
                      {meta?.label ?? row.def.category}
                    </Badge>
                    <span className="text-[10px] text-fog-500">
                      difficulty{" "}
                      <span className="num">{row.def.difficulty}/5</span> ·{" "}
                      <span className="num">{pct(ratio(row.times, 10))}</span> of
                      a perfect ten
                    </span>
                  </span>
                </span>

                <span className="shrink-0 text-right">
                  <span className="num block text-xs font-semibold text-fog-100">
                    {money2(row.def.payment)}
                  </span>
                  <span className="block text-[10px] text-fog-500">
                    shipped{" "}
                    <span className="num text-iris-300">
                      ×{row.times}
                    </span>
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
