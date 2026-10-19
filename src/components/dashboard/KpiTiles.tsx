"use client";

import type { ReactElement, ReactNode } from "react";

import { Badge, type Tone } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { Sparkline } from "@/components/ui/charts";
import {
  LOW_BALANCE_THRESHOLD,
  fleetHourRate,
  hoursInUse,
  netWorth,
  poolCount,
  totalTokens,
} from "@/lib/economy";
import { count, hours, money2, tokens as fmtTokens } from "@/lib/format";
import { useNow } from "@/lib/hooks";
import { useSim } from "@/lib/store";
import type { BuildRun, Tx } from "@/lib/types";
import { cn } from "@/lib/cn";
import {
  blendedTokensPerDollar,
  historySeries,
  riseDelay,
  type SeriesMetric,
} from "./utils";

interface Kpi {
  key: string;
  label: string;
  value: string;
  caption: ReactNode;
  icon: string;
  accent: string;
  tone: Tone;
  metric: SeriesMetric;
  anchor: number;
  warning?: boolean;
}

/**
 * The four numbers that decide whether the player is winning: cash on hand, the
 * compute pool, the token books and overall net worth. Each sparkline is
 * reconstructed from the transaction log, never from noise.
 */
export function KpiTiles(): ReactElement {
  const now = useNow();
  const cash = useSim((s) => s.cash);
  const computeHours = useSim((s) => s.computeHours);
  const holdings = useSim((s) => s.holdings);
  const runs = useSim((s) => s.runs);
  const history = useSim((s) => s.history);
  const fleet = useSim((s) => s.fleet);
  const worth = useSim((s) => netWorth(s));

  const inUse = now === null ? 0 : hoursInUse(runs, now);
  const pool = totalTokens(holdings);
  const pools = poolCount(holdings);
  const rate = blendedTokensPerDollar(holdings);
  const hourRate = fleetHourRate(fleet);
  const live = runs.filter((r) => r.status === "running").length;
  const low = cash < LOW_BALANCE_THRESHOLD;

  const kpis: Kpi[] = [
    {
      key: "cash",
      label: "Cash balance",
      value: money2(cash),
      icon: "CircleDollarSign",
      accent: "#2ee0a4",
      tone: "mint",
      metric: "cash",
      anchor: cash,
      warning: low,
      caption: low ? (
        <>
          below the <span className="num text-fog-300">{money2(LOW_BALANCE_THRESHOLD)}</span>{" "}
          safety line — redeem a free top-up
        </>
      ) : (
        "play-money float, spendable anywhere"
      ),
    },
    {
      key: "compute",
      label: "Compute pool",
      value: hours(computeHours),
      icon: "Gauge",
      accent: "#38bdf8",
      tone: "aqua",
      metric: "compute",
      anchor: computeHours,
      caption: (
        <>
          <span className="num text-aqua-400">{hours(inUse)}</span> in use by{" "}
          <span className="num text-fog-300">{live}</span> live build
          {live === 1 ? "" : "s"}
        </>
      ),
    },
    {
      key: "tokens",
      label: "Total tokens",
      value: fmtTokens(pool),
      icon: "Coins",
      accent: "#7c5cff",
      tone: "iris",
      metric: "tokens",
      anchor: pool,
      caption: (
        <>
          across <span className="num text-fog-300">{count(pools)}</span> model
          pool{pools === 1 ? "" : "s"}
        </>
      ),
    },
    {
      key: "net",
      label: "Net worth",
      value: money2(worth),
      icon: "Landmark",
      accent: "#fbbf24",
      tone: "solar",
      metric: "net",
      anchor: worth,
      caption: "cash + compute + token book value",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {kpis.map((kpi, index) => (
        <div key={kpi.key} className="animate-rise" style={riseDelay(index)}>
          <KpiTile
            kpi={kpi}
            history={history}
            runs={runs}
            rate={rate}
            hourRate={hourRate}
          />
        </div>
      ))}
    </div>
  );
}

function KpiTile({
  kpi,
  history,
  runs,
  rate,
  hourRate,
}: {
  kpi: Kpi;
  history: Tx[];
  runs: BuildRun[];
  rate: number;
  hourRate: number;
}): ReactElement {
  const series = historySeries(history, kpi.metric, kpi.anchor, rate, hourRate, runs);

  return (
    <Card
      hover
      accent={kpi.accent}
      className="h-full [&>div]:flex [&>div]:h-full [&>div]:flex-col [&>div]:gap-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-fog-500">
            {kpi.label}
          </p>
          <p
            className={cn(
              "num mt-1.5 text-[26px] font-semibold leading-none",
              kpi.warning ? "text-ember-400" : "text-fog-50",
            )}
          >
            {kpi.value}
          </p>
        </div>
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border"
          style={{
            borderColor: `${kpi.accent}55`,
            background: `color-mix(in srgb, ${kpi.accent} 14%, transparent)`,
          }}
        >
          <Icon name={kpi.icon} size={16} style={{ color: kpi.accent }} />
        </span>
      </div>

      {kpi.warning ? (
        <Badge
          tone="ember"
          className="self-start"
          icon={<Icon name="AlertTriangle" size={11} />}
        >
          Running low
        </Badge>
      ) : null}

      <div className="mt-auto flex flex-col gap-2">
        <Sparkline data={series} tone={kpi.tone} height={38} fill />
        <p className="text-[11px] leading-snug text-fog-500">{kpi.caption}</p>
      </div>
    </Card>
  );
}
