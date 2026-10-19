"use client";

import type { ReactElement, ReactNode } from "react";

import { Card, CardHeader } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { netWorth } from "@/lib/economy";
import { money2 } from "@/lib/format";
import { useSim } from "@/lib/store";
import { cn } from "@/lib/cn";
import { riseDelay } from "./utils";

interface Milestone {
  key: string;
  label: string;
  hint: ReactNode;
  icon: string;
  tint: keyof typeof TINT;
  unlocked: boolean;
}

/* Full literal class strings only — Tailwind v4 scans source text. */
const TINT = {
  mint: { chip: "border-mint-400/40 bg-mint-500/10", icon: "text-mint-300" },
  solar: { chip: "border-solar-400/40 bg-solar-500/10", icon: "text-solar-300" },
  iris: { chip: "border-iris-400/40 bg-iris-500/12", icon: "text-iris-200" },
  plasma: { chip: "border-plasma-400/40 bg-plasma-500/12", icon: "text-plasma-400" },
  aqua: { chip: "border-aqua-400/40 bg-aqua-500/12", icon: "text-aqua-400" },
  ember: { chip: "border-ember-400/40 bg-ember-500/10", icon: "text-ember-400" },
} as const;

/** Six achievements, unlocked purely from state — no timers, no luck. */
export function Milestones(): ReactElement {
  const stats = useSim((s) => s.stats);
  const completed = useSim((s) => s.completed);
  const fleetTier = useSim((s) => s.fleet.tier);
  const worth = useSim((s) => netWorth(s));
  const ownedModels = useSim((s) => s.ownedModels);

  const delivered = Object.keys(completed).length;

  const milestones: Milestone[] = [
    {
      key: "first",
      label: "First payout",
      hint: stats.totalEarned > 0 ? "earned, and it showed up here" : "earn your first dollar",
      icon: "CircleDollarSign",
      tint: "mint",
      unlocked: stats.totalEarned > 0,
    },
    {
      key: "ten",
      label: "Ten shipped",
      hint: (
        <>
          <span className="num">{Math.min(stats.runsCompleted, 10)}</span>/10
          contracts delivered
        </>
      ),
      icon: "Trophy",
      tint: "solar",
      unlocked: stats.runsCompleted >= 10,
    },
    {
      key: "dollar",
      label: "Dollar club",
      hint: worth >= 1000 ? "four figures and climbing" : "reach $1,000 net worth",
      icon: "Gem",
      tint: "iris",
      unlocked: worth >= 1000,
    },
    {
      key: "datacenter",
      label: "Datacenter class",
      hint: fleetTier >= 4 ? "H100-class iron online" : "own a tier 4 rig",
      icon: "Crown",
      tint: "plasma",
      unlocked: fleetTier >= 4,
    },
    {
      key: "collector",
      label: "Model collector",
      hint: (
        <>
          <span className="num">{Math.min(ownedModels.length, 10)}</span>/10
          distinct pools
        </>
      ),
      icon: "Boxes",
      tint: "aqua",
      unlocked: ownedModels.length >= 10,
    },
    {
      key: "survivor",
      label: "Survivor",
      hint: stats.bailouts > 0 ? "you bent, you didn't break" : "redeem a free top-up",
      icon: "ShieldCheck",
      tint: "ember",
      unlocked: stats.bailouts > 0,
    },
  ];

  const unlocked = milestones.filter((milestone) => milestone.unlocked).length;
  const lifetime = stats.totalEarned + worth;

  return (
    <Card accent="#e879f9">
      <CardHeader
        accent="#e879f9"
        icon={<Icon name="Award" size={16} />}
        title="Milestones"
        subtitle={
          <>
            <span className="num text-fog-300">{unlocked}</span> of{" "}
            <span className="num text-fog-300">{milestones.length}</span>{" "}
            unlocked · <span className="num text-fog-300">{delivered}</span>{" "}
            contracts in the trophy case
          </>
        }
        action={
          <span className="num text-sm font-semibold text-plasma-400">
            {money2(lifetime)}
          </span>
        }
      />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {milestones.map((milestone, index) => {
          const tint = TINT[milestone.tint];
          return (
            <div
              key={milestone.key}
              className={cn(
                "animate-rise flex flex-col gap-1.5 rounded-xl border px-3 py-2.5 transition-colors",
                milestone.unlocked
                  ? tint.chip
                  : "border-abyss-500/45 bg-abyss-800/50",
              )}
              style={riseDelay(index)}
            >
              <span className="flex items-center justify-between gap-2">
                <Icon
                  name={milestone.icon}
                  size={15}
                  className={milestone.unlocked ? tint.icon : "text-fog-500"}
                />
                <Icon
                  name={milestone.unlocked ? "Check" : "Lock"}
                  size={12}
                  className={milestone.unlocked ? "text-mint-300" : "text-fog-500"}
                  title={milestone.unlocked ? "Unlocked" : "Locked"}
                />
              </span>
              <span
                className={cn(
                  "truncate text-[11px] font-semibold",
                  milestone.unlocked ? "text-fog-100" : "text-fog-400",
                )}
              >
                {milestone.label}
              </span>
              <span className="truncate text-[10px] text-fog-500">
                {milestone.hint}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
