"use client";

import type { ReactElement } from "react";

import { Card, CardHeader } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { count, hours, money2, moneySigned, pct, tokens as fmtTokens } from "@/lib/format";
import { useSim } from "@/lib/store";
import { cn } from "@/lib/cn";

interface Stat {
  key: string;
  label: string;
  value: string;
  icon: string;
  tone: string;
}

/** The career totals — everything the account has ever done, in eleven cells. */
export function StatsGrid(): ReactElement {
  const stats = useSim((s) => s.stats);
  const ownedModels = useSim((s) => s.ownedModels);
  const ownedPlans = useSim((s) => s.ownedPlans);

  const settled = stats.runsCompleted + stats.runsFailed;
  const successRate = settled > 0 ? stats.runsCompleted / settled : 0;
  const netPnl = stats.totalEarned - stats.totalSpent;

  const cells: Stat[] = [
    {
      key: "shipped",
      label: "Contracts shipped",
      value: count(stats.runsCompleted),
      icon: "CheckCircle2",
      tone: "text-mint-300",
    },
    {
      key: "failed",
      label: "Failed / partial",
      value: count(stats.runsFailed),
      icon: "AlertTriangle",
      tone: "text-ember-400",
    },
    {
      key: "rate",
      label: "Success rate",
      value: settled > 0 ? pct(successRate) : "—",
      icon: "Target",
      tone: "text-iris-300",
    },
    {
      key: "started",
      label: "Builds started",
      value: count(stats.runsStarted),
      icon: "Rocket",
      tone: "text-aqua-400",
    },
    {
      key: "tokens-burned",
      label: "Tokens burned",
      value: fmtTokens(stats.tokensBurned),
      icon: "Flame",
      tone: "text-solar-300",
    },
    {
      key: "hours-burned",
      label: "Hours burned",
      value: hours(stats.hoursBurned),
      icon: "Hourglass",
      tone: "text-aqua-400",
    },
    {
      key: "earned",
      label: "Total earned",
      value: money2(stats.totalEarned),
      icon: "TrendingUp",
      tone: "text-mint-300",
    },
    {
      key: "spent",
      label: "Total spent",
      value: money2(stats.totalSpent),
      icon: "TrendingDown",
      tone: "text-ember-400",
    },
    {
      key: "pnl",
      label: "Net P&L",
      value: moneySigned(netPnl),
      icon: netPnl >= 0 ? "ArrowUpRight" : "ArrowDownRight",
      tone: netPnl >= 0 ? "text-mint-300" : "text-ember-400",
    },
    {
      key: "models",
      label: "Models owned",
      value: count(ownedModels.length),
      icon: "Boxes",
      tone: "text-iris-300",
    },
    {
      key: "rigs",
      label: "Rigs owned",
      value: count(ownedPlans.length),
      icon: "Server",
      tone: "text-aqua-400",
    },
    {
      key: "bailouts",
      label: "Bailouts claimed",
      value: count(stats.bailouts),
      icon: "PiggyBank",
      tone: "text-solar-300",
    },
  ];

  return (
    <Card accent="#2ee0a4">
      <CardHeader
        accent="#2ee0a4"
        icon={<Icon name="BarChart3" size={16} />}
        title="Career totals"
        subtitle="every number is play money, none of it is real"
      />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {cells.map((cell) => (
          <div
            key={cell.key}
            className="rounded-xl border border-abyss-600/50 bg-abyss-900/60 px-2.5 py-2"
          >
            <div className="flex items-center gap-1.5">
              <Icon name={cell.icon} size={11} className={cell.tone} />
              <span className="truncate text-[9px] uppercase tracking-[0.1em] text-fog-500">
                {cell.label}
              </span>
            </div>
            <p className={cn("num mt-1 truncate text-sm font-semibold", cell.tone)}>
              {cell.value}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}
