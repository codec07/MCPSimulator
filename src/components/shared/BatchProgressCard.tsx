"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { Progress } from "@/components/ui/Progress";
import { MODEL_BY_ID } from "@/data/models";
import { PROJECT_BY_ID } from "@/data/projects";
import {
  PAYOUT_MULT_BY_TIER,
  runHoursConsumed,
  runProgress,
  type BuildGroup,
} from "@/lib/economy";
import { duration, hours, money2, multiplier, tokens } from "@/lib/format";
import { Ledger } from "./Ledger";

const ACCENT = "#38bdf8";

/**
 * One batch, live — the collapsed view of N parallel runs.
 *
 * Nothing about the economy changes here: the runs behind this card are still
 * fully independent and still settle one by one. The card only stops a batch of
 * ten from painting ten identical progress bars over the dashboard.
 */
export function BatchProgressCard({
  group,
  now,
  compact = false,
  onAbort,
}: {
  group: BuildGroup;
  now: number | null;
  compact?: boolean;
  onAbort?: (runIds: string[]) => void;
}) {
  const def = PROJECT_BY_ID[group.projectId];
  const runs = group.runs;
  const count = runs.length;

  const running = runs.filter((r) => r.status === "running");
  const delivered = runs.filter((r) => r.status === "done").length;
  const failed = runs.filter((r) => r.status === "failed").length;

  const head = running[0] ?? runs[0];
  const endsAt = Math.max(...runs.map((r) => r.endsAt));

  const progress =
    now === null
      ? 0
      : running.length > 0
        ? Math.max(...running.map((r) => runProgress(r, now)))
        : 1;
  const pctDone = Math.round(progress * 100);
  const remaining =
    now === null
      ? head.durationSeconds
      : Math.max(0, Math.round((endsAt - now) / 1000));

  const totalReserved = runs.reduce((sum, r) => sum + r.billedHours, 0);
  const totalTokens = runs.reduce((sum, r) => sum + r.tokensConsumed, 0);
  const totalPayout = runs.reduce((sum, r) => sum + r.payout, 0);
  const totalBurned =
    now === null ? 0 : runs.reduce((sum, r) => sum + runHoursConsumed(r, now), 0);
  const inUse = Math.max(0, totalReserved - totalBurned);

  // Every run draws on the same capability, so the pools are worth merging.
  const pools = new Map<string, number>();
  for (const run of runs) {
    for (const src of run.tokenSources) {
      pools.set(src.modelId, (pools.get(src.modelId) ?? 0) + src.tokens);
    }
  }

  return (
    <Card
      accent={ACCENT}
      hover={!compact}
      padded={!compact}
      className={compact ? "relative overflow-hidden p-4" : "relative overflow-hidden"}
    >
      <div className="relative flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-start gap-3">
          <span
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border"
            style={{
              borderColor: `${ACCENT}55`,
              background: `color-mix(in srgb, ${ACCENT} 14%, transparent)`,
            }}
          >
            <Icon name={def?.icon ?? "Boxes"} size={16} style={{ color: ACCENT }} />
          </span>

          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-[0.14em] text-aqua-400/80">
              Running batch
            </p>

            <div className="mt-0.5 flex flex-wrap items-center gap-2">
              <p
                className={
                  compact
                    ? "truncate text-sm font-semibold text-fog-100"
                    : "truncate text-[15px] font-semibold text-fog-100"
                }
              >
                {group.label}
              </p>
              <Badge tone="aqua" size="sm">
                ×{count}
              </Badge>
              <Badge
                tone="aqua"
                size="sm"
                icon={
                  <Icon
                    name="Loader2"
                    size={11}
                    className="animate-spin"
                  />
                }
              >
                {running.length} running
              </Badge>
              {delivered > 0 && (
                <Badge tone="mint" size="sm" icon={<Icon name="CheckCircle2" size={11} />}>
                  {delivered} shipped
                </Badge>
              )}
              {failed > 0 && (
                <Badge
                  tone="ember"
                  size="sm"
                  icon={<Icon name="AlertTriangle" size={11} />}
                >
                  {failed} partial
                </Badge>
              )}
            </div>

            <p className="mt-0.5 truncate text-xs text-fog-500">
              {def ? `${def.category} · difficulty ${def.difficulty}/5 · ` : ""}
              {count} parallel runs · {multiplier(head.speedMultiplier)} throughput ·
              tier {head.fleetTierAtLaunch}
            </p>
          </div>

          {running.length > 0 && onAbort && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAbort(running.map((r) => r.id))}
              leftIcon={<Icon name="X" size={13} />}
            >
              Abort batch
            </Button>
          )}
        </div>

        {/* Progress — every run shares one clock, so one bar tells the story */}
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
              <span className="text-fog-500">
                left · {count} runs in parallel
              </span>
            </span>
          }
        />

        {/* Ledger */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Ledger
            icon="Gauge"
            label="compute"
            value={`${totalBurned.toFixed(1)}/${totalReserved.toFixed(1)}h`}
            hint={`${hours(inUse)} still reserved`}
          />
          <Ledger
            icon="Coins"
            label="tokens"
            value={tokens(totalTokens)}
            hint={`${pools.size} pool${pools.size === 1 ? "" : "s"} across the batch`}
          />
          <Ledger
            icon="TrendingUp"
            label="batch payout"
            value={money2(totalPayout)}
            hint={`${money2(head.payout)} per run`}
            tone="text-mint-400"
          />
          <Ledger
            icon="Layers"
            label="multiplier"
            value={multiplier(head.payoutMultiplier)}
            hint={`tier bonus ${PAYOUT_MULT_BY_TIER[head.fleetTierAtLaunch].toFixed(2)}x`}
          />
        </div>

        {/* Token sources */}
        {!compact && pools.size > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {[...pools.entries()].map(([modelId, amount]) => {
              const model = MODEL_BY_ID[modelId];
              return (
                <span
                  key={modelId}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-abyss-500/50 bg-abyss-900/70 px-2 py-1 text-[11px] text-fog-300"
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: model?.accent ?? "#7c5cff" }}
                  />
                  <span className="max-w-[140px] truncate">
                    {model?.name ?? modelId}
                  </span>
                  <span className="num text-fog-500">{tokens(amount)}</span>
                </span>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}
