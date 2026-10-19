"use client";

import type { ReactElement, ReactNode } from "react";

import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { Ring } from "@/components/ui/Progress";
import {
  COMPUTE_TIER_META,
  speedMultiplier,
} from "@/data/compute";
import {
  bestPlanFor,
  hoursInUse,
  planById,
} from "@/lib/economy";
import { hours, money2, multiplier, pct } from "@/lib/format";
import { useNow } from "@/lib/hooks";
import { useSim } from "@/lib/store";
import type { FleetTier } from "@/lib/types";
import { cn } from "@/lib/cn";
import { asTone, ratio } from "./utils";

const TIERS: readonly FleetTier[] = [1, 2, 3, 4, 5];

/** The rig, its throughput, and the ladder to the next upgrade. */
export function FleetCard(): ReactElement {
  const now = useNow();
  const fleet = useSim((s) => s.fleet);
  const computeHours = useSim((s) => s.computeHours);
  const runs = useSim((s) => s.runs);

  const meta = COMPUTE_TIER_META[fleet.tier] ?? COMPUTE_TIER_META[1];
  const plan = planById(fleet.planId);
  const accent = plan?.accent ?? "#7c5cff";
  const speed = speedMultiplier(fleet);
  // The client pays a flat fee, so the only thing your rig changes about a job's
  // economics is what an hour of it costs you. Compare against the cheapest rig
  // that could have done the work instead.
  const refPlan = bestPlanFor(fleet.tier);
  const myRate = plan ? plan.pricePerHour : refPlan.pricePerHour;
  const rateRatio = myRate > 0 ? refPlan.pricePerHour / myRate : 1;

  const inUse = now === null ? 0 : hoursInUse(runs, now);
  const ringPct = ratio(inUse, computeHours + inUse) * 100;

  const nextTier: FleetTier | null = fleet.tier < 5 ? ((fleet.tier + 1) as FleetTier) : null;
  const nextPlan = nextTier === null ? null : bestPlanFor(nextTier);
  const nextSpeed = nextPlan ? speedMultiplier(nextPlan) : null;
  const gain = nextSpeed === null ? 0 : Math.max(0, nextSpeed / speed - 1);

  return (
    <Card accent={accent}>
      <CardHeader
        accent={accent}
        icon={<Icon name="Server" size={16} />}
        title={fleet.name}
        subtitle={
          <>
            {meta.label} · tier{" "}
            <span className="num text-fog-300">{fleet.tier}</span> of{" "}
            <span className="num text-fog-300">5</span>
          </>
        }
        action={
          <Badge tone={asTone(meta.tone)} size="md">
            {plan?.provider ?? "Local"}
          </Badge>
        }
      />

      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="grid flex-1 grid-cols-2 gap-2">
          <Metric
            icon="Microchip"
            label="GPU"
            value={fleet.gpu ?? "No GPU"}
            hint={fleet.gpu ? "accelerated" : "CPU only — slow by design"}
          />
          <Metric
            icon="MemoryStick"
            label="VRAM"
            value={fleet.vram > 0 ? `${fleet.vram} GB` : "—"}
            hint={fleet.vram > 0 ? "usable device memory" : "shared system RAM"}
          />
          <Metric
            icon="Cpu"
            label="vCPU"
            value={`${fleet.vcpus}`}
            hint={
              <>
                <span className="num">{fleet.tflops}</span> TFLOPS fp16
              </>
            }
          />
          <Metric
            icon="Gauge"
            label="Throughput"
            value={multiplier(speed)}
            hint={`jobs run ${speed.toFixed(2)}× faster than stock`}
          />
          <Metric
            icon="Coins"
            label="Rate vs best"
            value={pct(rateRatio)}
            hint={`best tier-${fleet.tier} rig bills ${money2(refPlan.pricePerHour)}/h`}
            tone={rateRatio >= 0.999 ? "text-mint-400" : "text-ember-400"}
          />
          <Metric
            icon="Receipt"
            label="Hourly cost"
            value={plan ? `${money2(plan.pricePerHour)}` : "owned"}
            hint={plan ? plan.billing : "paid up front"}
          />
        </div>

        <div className="flex shrink-0 flex-col items-center gap-2 sm:w-32">
          <Ring value={ringPct} size={104} thickness={9} tone="aqua">
            <span className="num text-lg font-semibold text-fog-50">
              {pct(ringPct / 100)}
            </span>
            <span className="text-[9px] uppercase tracking-[0.14em] text-fog-500">
              in use
            </span>
          </Ring>
          <p className="text-center text-[11px] leading-snug text-fog-500">
            <span className="num text-fog-300">{hours(inUse)}</span> of{" "}
            <span className="num text-fog-300">{hours(computeHours + inUse)}</span>{" "}
            pool committed
          </p>
        </div>
      </div>

      {/* Tier ladder */}
      <div className="mt-5 border-t border-abyss-600/50 pt-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-fog-500">
            Fleet ladder
          </span>
          {nextPlan && nextTier !== null ? (
            <span className="text-[11px] text-fog-400">
              next:{" "}
              <span className="text-iris-200">
                {COMPUTE_TIER_META[nextTier]?.label ?? "Next class"}
              </span>
            </span>
          ) : (
            <span className="text-[11px] text-plasma-400">
              maxed out — hyperscale class
            </span>
          )}
        </div>

        <div className="flex items-start gap-1.5">
          {TIERS.map((tier) => {
            const unlocked = tier <= fleet.tier;
            const isNext = nextTier === tier;
            return (
              <div key={tier} className="flex min-w-0 flex-1 flex-col gap-1.5">
                <span
                  aria-hidden="true"
                  className={cn(
                    "h-2 rounded-full",
                    unlocked && "bg-current",
                    !unlocked && !isNext && "border border-abyss-500/60 bg-abyss-700/70",
                    isNext && "border border-dashed border-iris-400/70 bg-iris-500/10",
                  )}
                  style={
                    unlocked
                      ? { color: accent, opacity: 1 - (fleet.tier - tier) * 0.14 }
                      : undefined
                  }
                />
                <span
                  className={cn(
                    "truncate text-[9px] uppercase tracking-wider",
                    unlocked ? "text-fog-300" : "text-fog-500",
                    isNext && "text-iris-200",
                  )}
                  title={COMPUTE_TIER_META[tier].label}
                >
                  {COMPUTE_TIER_META[tier].label}
                </span>
              </div>
            );
          })}
        </div>

        {nextPlan && nextTier !== null ? (
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-xl border border-iris-400/25 bg-iris-500/8 px-3 py-2.5 text-[11px] text-fog-300">
            <span className="inline-flex items-center gap-1.5">
              <Icon name="ArrowUpRight" size={12} className="text-iris-300" />
              <span className="text-fog-200">{nextPlan.name}</span>
            </span>
            <span>
              throughput{" "}
              <span className="num text-mint-300">{multiplier(nextSpeed ?? speed)}</span>{" "}
              <span className="num text-mint-300">+{pct(gain)}</span>
            </span>
            <span>
              <span className="num text-fog-200">{money2(nextPlan.pricePerHour)}</span>
              /h
            </span>
            <span className="hidden sm:inline">
              reserves{" "}
              <span className="num text-fog-200">
                {speed > 0 ? ((nextSpeed ?? speed) / speed).toFixed(1) : "1.0"}
              </span>
              × fewer of your hours
            </span>
          </div>
        ) : null}
      </div>
    </Card>
  );
}

function Metric({
  icon,
  label,
  value,
  hint,
  tone = "text-fog-100",
}: {
  icon: string;
  label: string;
  value: string;
  hint?: ReactNode;
  tone?: string;
}): ReactElement {
  return (
    <div className="rounded-xl border border-abyss-600/50 bg-abyss-900/60 px-2.5 py-2">
      <div className="flex items-center gap-1.5">
        <Icon name={icon} size={11} className="text-fog-500" />
        <span className="text-[9px] uppercase tracking-[0.12em] text-fog-500">
          {label}
        </span>
      </div>
      <p className={cn("num mt-1 truncate text-[13px] font-semibold", tone)}>
        {value}
      </p>
      {hint ? (
        <p className="mt-0.5 truncate text-[10px] text-fog-500">{hint}</p>
      ) : null}
    </div>
  );
}
