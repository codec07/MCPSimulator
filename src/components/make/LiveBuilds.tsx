"use client";

import { BatchProgressCard } from "@/components/shared/BatchProgressCard";
import { BuildProgressCard } from "@/components/shared/BuildProgressCard";
import { Badge } from "@/components/ui/Badge";
import { Card, SectionTitle } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { groupRuns, hoursInUse, runRemaining } from "@/lib/economy";
import { duration, hours, money2 } from "@/lib/format";
import { useNow } from "@/lib/hooks";
import type { BuildRun } from "@/lib/types";

/**
 * The live half of the workshop: every in-flight run, plus the totals that say
 * how much money and compute is currently tied up in them.
 *
 * This component borrows the shared clock itself rather than taking `now` as a
 * prop, so the 34-card contract grid above it never re-renders on a tick.
 */
export function LiveBuilds({
  runs,
  onCancel,
  onCancelBatch,
}: {
  runs: BuildRun[];
  onCancel: (runId: string) => void;
  onCancelBatch: (runIds: string[]) => void;
}) {
  const now = useNow();
  const running = runs.filter((run) => run.status === "running");
  const groups = groupRuns(running);

  const locked = now === null ? null : hoursInUse(runs, now);
  const payout = running.reduce((sum, run) => sum + run.payout, 0);
  const earliest =
    now === null || running.length === 0
      ? null
      : running.reduce(
          (soonest, run) => Math.min(soonest, runRemaining(run, now)),
          Number.POSITIVE_INFINITY,
        );

  return (
    <section className="mb-6" aria-labelledby="live-builds-heading">
      <SectionTitle
        eyebrow="Live"
        title={<span id="live-builds-heading">Running builds</span>}
        subtitle="Tokens are already burned and compute is reserved — these land on their own, whether or not you are watching."
        action={
          <Badge tone={running.length > 0 ? "aqua" : "neutral"} size="md" dot>
            <span className="num">{groups.length}</span> live
          </Badge>
        }
        className="mb-3"
      />

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <SummaryTile
          icon="Loader2"
          label="running"
          value={`${groups.length}`}
          hint={
            running.length === groups.length
              ? running.length === 1
                ? "one build in flight"
                : "builds in flight"
              : `${running.length} runs in ${groups.length} jobs`
          }
          accent="#38bdf8"
        />
        <SummaryTile
          icon="Gauge"
          label="hours locked"
          value={locked === null ? "—" : hours(locked)}
          hint="reserved, not yet burned"
          accent="#2ee0a4"
        />
        <SummaryTile
          icon="TrendingUp"
          label="projected payout"
          value={money2(payout)}
          hint="once every run lands"
          accent="#fbbf24"
        />
        <SummaryTile
          icon="Timer"
          label="earliest eta"
          value={earliest === null ? "—" : duration(earliest)}
          hint={earliest === null ? "nothing counting down" : "first delivery"}
          accent="#7c5cff"
        />
      </div>

      {running.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 py-8 text-center">
          <span className="grid h-11 w-11 place-items-center rounded-xl border border-abyss-500/60 bg-abyss-800/60 text-fog-500">
            <Icon name="Rocket" size={18} />
          </span>
          <p className="text-sm font-medium text-fog-200">
            The workshop is idle
          </p>
          <p className="max-w-md text-xs leading-relaxed text-fog-500">
            Nothing is burning compute right now. Pick a contract below and put
            your rig to work — tokens spend and hours reserve the moment a run
            starts.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {groups.map((group) => (
            <div key={group.key} className="animate-rise">
              {group.batched ? (
                <BatchProgressCard
                  group={group}
                  now={now}
                  onAbort={onCancelBatch}
                />
              ) : (
                <BuildProgressCard
                  run={group.runs[0]}
                  now={now}
                  onCancel={onCancel}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function SummaryTile({
  icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: string;
  label: string;
  value: string;
  hint: string;
  accent: string;
}) {
  return (
    <div className="panel relative overflow-hidden p-3">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
        }}
      />
      <div className="flex items-center gap-1.5">
        <Icon name={icon} size={12} style={{ color: accent }} />
        <span className="text-[9px] uppercase tracking-[0.12em] text-fog-500">
          {label}
        </span>
      </div>
      <p className={cn("num mt-1.5 text-base font-semibold text-fog-100")}>
        {value}
      </p>
      <p className="mt-0.5 truncate text-[10px] text-fog-500">{hint}</p>
    </div>
  );
}
