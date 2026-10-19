"use client";

import { Badge, type Tone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { Progress } from "@/components/ui/Progress";
import { MODEL_BY_ID } from "@/data/models";
import { cn } from "@/lib/cn";
import { PROJECT_BY_ID } from "@/data/projects";
import {
  runHoursConsumed,
  runProgress,
  runRemaining,
} from "@/lib/economy";
import { duration, hours, money2, multiplier, tokens } from "@/lib/format";
import type { BuildRun } from "@/lib/types";
import { Ledger } from "./Ledger";

const STATUS: Record<
  BuildRun["status"],
  { label: string; tone: Tone; icon: string; accent: string }
> = {
  running: { label: "Running", tone: "aqua", icon: "Loader2", accent: "#38bdf8" },
  done: { label: "Shipped", tone: "mint", icon: "CheckCircle2", accent: "#2ee0a4" },
  failed: { label: "Partial", tone: "ember", icon: "AlertTriangle", accent: "#fb7185" },
  cancelled: { label: "Aborted", tone: "neutral", icon: "XCircle", accent: "#94a3b8" },
};

/**
 * One build, live. This is the card the whole simulator revolves around, so it
 * shows exactly where the player's money and compute are going.
 */
export function BuildProgressCard({
  run,
  now,
  compact = false,
  onCancel,
}: {
  run: BuildRun;
  now: number | null;
  compact?: boolean;
  onCancel?: (runId: string) => void;
}) {
  const def = PROJECT_BY_ID[run.projectId];
  const view = STATUS[run.status];

  const running = run.status === "running";
  const progress = now === null ? (running ? 0 : 1) : runProgress(run, now);
  const pctDone = Math.round(progress * 100);
  const remaining = now === null ? run.durationSeconds : runRemaining(run, now);
  const burned = now === null ? 0 : runHoursConsumed(run, now);
  const inUse = Math.max(0, run.billedHours - burned);

  return (
    <Card
      accent={view.accent}
      hover={!compact}
      padded={!compact}
      className={cn("relative overflow-hidden", compact && "p-4")}
    >
      <div className="relative flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-start gap-3">
          <span
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border"
            style={{
              borderColor: `${view.accent}55`,
              background: `color-mix(in srgb, ${view.accent} 14%, transparent)`,
            }}
          >
            <Icon
              name={def?.icon ?? "Boxes"}
              size={16}
              style={{ color: view.accent }}
            />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p
                className={cn(
                  "truncate font-semibold text-fog-100",
                  compact ? "text-sm" : "text-[15px]",
                )}
              >
                {run.label}
              </p>
              <Badge
                tone={view.tone}
                size="sm"
                icon={
                  <Icon
                    name={view.icon}
                    size={11}
                    className={running ? "animate-spin" : undefined}
                  />
                }
              >
                {view.label}
              </Badge>
            </div>
            <p className="mt-0.5 truncate text-xs text-fog-500">
              {def ? `${def.category} · difficulty ${def.difficulty}/5 · ` : ""}
              {multiplier(run.speedMultiplier)} throughput · tier{" "}
              {run.fleetTierAtLaunch}
            </p>
          </div>

          {running && onCancel && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onCancel(run.id)}
              leftIcon={<Icon name="X" size={13} />}
            >
              Abort
            </Button>
          )}
        </div>

        {/* Progress */}
        {running ? (
          <div className="flex flex-col gap-1.5">
            <Progress
              value={pctDone}
              tone="aqua"
              size="sm"
              striped
              showValue
              label={
                <span className="flex items-center gap-2 text-xs text-fog-400">
                  <Icon name="Timer" size={12} />
                  <span className="num">{duration(remaining)}</span>
                  <span className="text-fog-500">left</span>
                </span>
              }
            />
          </div>
        ) : (
          <Progress
            value={100}
            tone={view.tone}
            size="xs"
            label={
              <span className="text-xs text-fog-500">
                {run.status === "done"
                  ? "Delivered and invoiced"
                  : run.status === "failed"
                    ? "Spot capacity lost mid-run — partial delivery paid"
                    : "Compute released back to the pool"}
              </span>
            }
          />
        )}

        {/* Ledger */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Ledger
            icon="Gauge"
            label="compute"
            value={`${burned.toFixed(1)}/${run.billedHours.toFixed(1)}h`}
            hint={running ? `${hours(inUse)} still reserved` : "released"}
          />
          <Ledger
            icon="Coins"
            label="tokens"
            value={tokens(run.tokensConsumed)}
            hint={`${run.tokenSources.length} pool${run.tokenSources.length === 1 ? "" : "s"}`}
          />
          <Ledger
            icon="TrendingUp"
            label={run.status === "done" ? "paid out" : "payout"}
            value={money2(run.status === "failed" ? run.payout * 0.3 : run.payout)}
            hint={`market ${multiplier(run.marketHeat)}`}
            tone={run.status === "failed" ? "text-ember-400" : "text-mint-400"}
          />
          <Ledger
            icon="Layers"
            label="quality"
            value={multiplier(run.payoutMultiplier)}
            hint="payout premium"
          />
        </div>

        {/* Token sources */}
        {!compact && run.tokenSources.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {run.tokenSources.map((src) => {
              const model = MODEL_BY_ID[src.modelId];
              return (
                <span
                  key={src.modelId}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-abyss-500/50 bg-abyss-900/70 px-2 py-1 text-[11px] text-fog-300"
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: model?.accent ?? "#7c5cff" }}
                  />
                  <span className="max-w-[140px] truncate">
                    {model?.name ?? src.modelId}
                  </span>
                  <span className="num text-fog-500">{tokens(src.tokens)}</span>
                </span>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}

