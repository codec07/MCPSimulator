"use client";

import { memo } from "react";

import { DifficultyDots } from "@/components/make/DifficultyDots";
import {
  capabilityMetaOf,
  categoryMetaOf,
  type ProjectRow,
} from "@/components/make/shared";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { duration, money2, moneySigned, multiplier, pct, tokens } from "@/lib/format";
import type { ProjectDef } from "@/lib/types";

const BLOCK_STYLE: Record<
  "fleet" | "tokens" | "compute",
  { icon: string; className: string }
> = {
  fleet: {
    icon: "Lock",
    className: "border-plasma-400/30 bg-plasma-500/10 text-plasma-400",
  },
  tokens: {
    icon: "Coins",
    className: "border-iris-400/30 bg-iris-500/10 text-iris-200",
  },
  compute: {
    icon: "Gauge",
    className: "border-aqua-400/30 bg-aqua-500/10 text-aqua-400",
  },
};

/**
 * One contract, priced for the rig the player actually owns: the hours it will
 * reserve, the tokens it drains and the payout that lands on delivery.
 */
function ProjectCardBase({
  row,
  index,
  shipped,
  onOpen,
}: {
  row: ProjectRow;
  index: number;
  shipped: number;
  onOpen: (def: ProjectDef) => void;
}) {
  const { def, projection, readiness } = row;
  const category = categoryMetaOf(def.category);
  const capability = capabilityMetaOf(def.capability);
  const rigLocked = readiness.reason === "fleet";
  const blocked = readiness.reason;

  return (
    <button
      type="button"
      onClick={() => onOpen(def)}
      style={{ animationDelay: `${Math.min(index, 14) * 38}ms` }}
      className="animate-rise block h-full w-full rounded-2xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-abyss-950"
    >
      <Card
        accent={def.accent}
        hover
        className="flex h-full flex-col"
      >
        <div className="flex h-full flex-col gap-3">
          {/* Header */}
          <div className="flex items-start gap-3">
            <span
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border"
              style={{
                borderColor: `${def.accent}55`,
                background: `color-mix(in srgb, ${def.accent} 14%, transparent)`,
              }}
            >
              <Icon name={def.icon} size={18} style={{ color: def.accent }} />
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 flex-1 text-[15px] font-semibold leading-snug text-fog-100">
                  {def.title}
                </p>
                {def.badge ? (
                  <Badge tone="iris" size="sm">
                    {def.badge}
                  </Badge>
                ) : null}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge
                  tone={category.tone}
                  size="sm"
                  icon={<Icon name={category.icon} size={11} />}
                >
                  {category.label}
                </Badge>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-abyss-500/60 bg-abyss-800/70 px-2 py-0.5 text-[10px] text-fog-400">
                  <DifficultyDots value={def.difficulty} accent={def.accent} />
                  <span className="num">{def.difficulty}/5</span>
                </span>
              </div>
            </div>
          </div>

          <p className="line-clamp-2 text-xs leading-relaxed text-fog-400">
            {def.tagline}
          </p>

          {/* Blocked strip */}
          {blocked ? (
            <div
              className={cn(
                "flex items-center gap-2 rounded-xl border px-2.5 py-2 text-[11px]",
                BLOCK_STYLE[blocked].className,
              )}
            >
              <Icon name={BLOCK_STYLE[blocked].icon} size={12} />
              <span className="font-medium leading-tight">{readiness.label}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-xl border border-mint-400/25 bg-mint-500/10 px-2.5 py-2 text-[11px] text-mint-300">
              <Icon name="CheckCircle2" size={12} />
              <span className="font-medium">Ready to launch on your rig</span>
            </div>
          )}

          {/* Economics, personalised */}
          <div
            className={cn(
              "grid grid-cols-2 gap-2 transition-opacity",
              rigLocked && "opacity-45 saturate-50",
            )}
          >
            <Stat
              icon="TrendingUp"
              label="payout"
              value={money2(projection.payout)}
              hint={`×${multiplier(
                projection.payout / Math.max(0.01, projection.basePayout),
              )} after bonuses`}
              tone="text-mint-400"
            />
            <Stat
              icon="Timer"
              label="eta"
              value={duration(projection.seconds)}
              hint={`${multiplier(projection.speed)} throughput`}
              tone="text-aqua-400"
            />
            <Stat
              icon="Gauge"
              label="hours reserved"
              value={`${projection.billedHours.toFixed(1)}h`}
              hint={`of ${def.computeHours.toFixed(0)}h load`}
            />
            <Stat
              icon="Coins"
              label="tokens"
              value={tokens(def.tokenCost)}
              hint={`${capability.label} pools`}
              tone="text-iris-300"
            />
          </div>

          {/* Footer */}
          <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-abyss-600/40 pt-2.5">
            <span
              className={cn(
                "num text-xs font-semibold",
                projection.netProfit >= 0 ? "text-mint-400" : "text-ember-400",
              )}
            >
              {moneySigned(projection.netProfit)} net
            </span>
            <span className="num text-[11px] text-fog-500">
              {pct(projection.marginPct)} margin
            </span>
            {shipped > 0 ? (
              <span className="text-[11px] text-fog-500">
                shipped <span className="num text-mint-400">{shipped}</span>×
              </span>
            ) : null}
          </div>
        </div>
      </Card>
    </button>
  );
}

/**
 * Memoised. The workshop renders 34 of these, so without it every toast, modal
 * open and filter keystroke re-rendered all 34 cards and their SVGs. `row` is
 * memoised by the page and `onOpen` is a stable `useCallback`, so the default
 * shallow prop comparison does its job.
 */
export const ProjectCard = memo(ProjectCardBase);

function Stat({
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
      {hint ? (
        <p className="mt-0.5 truncate text-[10px] text-fog-500">{hint}</p>
      ) : null}
    </div>
  );
}
