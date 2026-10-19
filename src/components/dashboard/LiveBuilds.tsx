"use client";

import type { ReactElement } from "react";

import { BuildProgressCard } from "@/components/shared/BuildProgressCard";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { hoursInUse } from "@/lib/economy";
import { hours, money2 } from "@/lib/format";
import { useNow } from "@/lib/hooks";
import { useSim } from "@/lib/store";
import { DashboardLink } from "./DashboardLink";
import { riseDelay } from "./utils";

/** Every build that is still on the clock, plus what it is costing right now. */
export function LiveBuilds(): ReactElement {
  const now = useNow();
  const runs = useSim((s) => s.runs);
  const cancelBuild = useSim((s) => s.cancelBuild);

  const running = runs.filter((r) => r.status === "running");
  const locked = running.reduce((sum, run) => sum + run.billedHours, 0);
  const inUse = now === null ? 0 : hoursInUse(running, now);
  const atStake = running.reduce((sum, run) => sum + run.payout, 0);

  return (
    <Card accent="#38bdf8">
      <CardHeader
        accent="#38bdf8"
        icon={<Icon name="Activity" size={16} />}
        title="Live builds"
        subtitle={
          running.length > 0 ? (
            <>
              <span className="num text-fog-300">{hours(locked)}</span> of
              compute locked up ·{" "}
              <span className="num text-fog-300">{hours(inUse)}</span> still
              burning
            </>
          ) : (
            "nothing on the clock right now"
          )
        }
        action={
          running.length > 0 ? (
            <Badge tone="aqua" size="md" dot>
              {running.length} running
            </Badge>
          ) : undefined
        }
      />

      {running.length > 0 ? (
        <div className="flex flex-col gap-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <Figure label="Locked up" value={hours(locked)} tone="text-aqua-400" />
            <Figure label="Still in use" value={hours(inUse)} tone="text-iris-300" />
            <Figure label="Payout at stake" value={money2(atStake)} tone="text-mint-300" />
          </div>

          <div className="flex flex-col gap-4">
            {running.map((run, index) => (
              <div key={run.id} className="animate-rise" style={riseDelay(index)}>
                <BuildProgressCard run={run} now={now} onCancel={cancelBuild} />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-abyss-500/60 bg-abyss-900/40 px-6 py-10 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl border border-iris-400/30 bg-iris-500/10 text-iris-300 animate-float">
            <Icon name="Rocket" size={22} />
          </span>
          <p className="text-sm font-semibold text-fog-100">
            No builds running
          </p>
          <p className="max-w-sm text-xs leading-relaxed text-fog-400">
            Your fleet is idle and your tokens are sitting still. Pick a contract
            from the Make catalog and watch the payout land here in real time.
          </p>
          <DashboardLink href="/make" variant="primary" icon="Rocket" arrow>
            Start a build
          </DashboardLink>
        </div>
      )}
    </Card>
  );
}

function Figure({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: string;
}): ReactElement {
  return (
    <div className="rounded-xl border border-abyss-600/50 bg-abyss-900/60 px-3 py-2.5">
      <p className="text-[9px] uppercase tracking-[0.12em] text-fog-500">
        {label}
      </p>
      <p className={`num mt-1 text-sm font-semibold ${tone}`}>{value}</p>
    </div>
  );
}
