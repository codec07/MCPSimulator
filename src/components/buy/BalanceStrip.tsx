"use client";

import type { ReactElement } from "react";

import { Stat } from "@/components/buy/Spec";
import { Card } from "@/components/ui/Card";
import { Progress } from "@/components/ui/Progress";
import { COMPUTE_PLANS } from "@/data/compute";
import { MODELS } from "@/data/models";
import {
  LOW_BALANCE_THRESHOLD,
  computeValueOf,
  holdingsValue,
  poolCount,
  round2,
  totalTokens,
} from "@/lib/economy";
import { hours, money, money2, tokens } from "@/lib/format";

/**
 * The four-number vitals strip that sits under the page header, plus the two
 * collection meters. Values are composed with the same economy helpers as
 * `netWorth`, which keeps this component free of a whole-`SimState` prop.
 */
export function BalanceStrip({
  cash,
  computeHours,
  hourRate,
  holdings,
  modelsOwned,
  rigsOwned,
}: {
  cash: number;
  computeHours: number;
  /** What an hour costs on the current flagship — the pool's replacement rate. */
  hourRate: number;
  holdings: Record<string, { tokens: number }>;
  modelsOwned: number;
  rigsOwned: number;
}): ReactElement {
  const pool = totalTokens(holdings);
  const pools = poolCount(holdings);
  const hoursValue = computeValueOf(computeHours, hourRate);
  const tokenValue = holdingsValue(holdings);
  const worth = round2(cash + hoursValue + tokenValue);
  const low = cash < LOW_BALANCE_THRESHOLD;

  return (
    <Card className="mb-5 p-3 sm:p-4">
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        <Stat
          icon="CircleDollarSign"
          label="Cash available"
          value={money2(cash)}
          tone="text-mint-400"
          alert={low}
          hint={
            low
              ? "below the warning line"
              : `warning line ${money2(LOW_BALANCE_THRESHOLD)}`
          }
        />
        <Stat
          icon="Gauge"
          label="Compute hours"
          value={hours(computeHours)}
          tone="text-aqua-400"
          hint={`worth ${money2(hoursValue)}`}
        />
        <Stat
          icon="Coins"
          label="Tokens held"
          value={tokens(pool)}
          tone="text-iris-300"
          hint={pools === 1 ? "1 model pool" : `${pools} model pools`}
        />
        <Stat
          icon="PiggyBank"
          label="Net worth"
          value={money(worth)}
          tone="text-plasma-400"
          hint={`${money2(worth)} all in`}
        />
      </div>

      <div className="mt-3 grid gap-3 border-t border-abyss-600/40 pt-3 sm:grid-cols-2">
        <div>
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <span className="text-[11px] text-fog-400">Models owned</span>
            <span className="num text-[11px] text-fog-200">
              {modelsOwned}
              <span className="text-fog-500">/{MODELS.length}</span>
            </span>
          </div>
          <Progress
            value={modelsOwned}
            max={MODELS.length}
            tone="iris"
            size="xs"
          />
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <span className="text-[11px] text-fog-400">Rigs owned</span>
            <span className="num text-[11px] text-fog-200">
              {rigsOwned}
              <span className="text-fog-500">/{COMPUTE_PLANS.length}</span>
            </span>
          </div>
          <Progress
            value={rigsOwned}
            max={COMPUTE_PLANS.length}
            tone="aqua"
            size="xs"
          />
        </div>
      </div>
    </Card>
  );
}
