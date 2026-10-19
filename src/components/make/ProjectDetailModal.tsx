"use client";

import { useState, type ReactNode } from "react";

import { BuyLink } from "@/components/make/BuyLink";
import { DifficultyDots } from "@/components/make/DifficultyDots";
import {
  PHASE_LABELS,
  capabilityMetaOf,
  categoryMetaOf,
  payoutPerHour,
  phaseShape,
  tierMetaOf,
  type Runnability,
} from "@/components/make/shared";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Stepper } from "@/components/ui/Controls";
import { Icon, hasIcon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { Progress } from "@/components/ui/Progress";
import { MiniBars } from "@/components/ui/charts";
import { MODEL_BY_ID, blendedPricePer1M } from "@/data/models";
import { cn } from "@/lib/cn";
import {
  MAX_BATCH,
  batchPayoutOf,
  cheapestModelFor,
  maxBatchFromProjection,
  modelsFor,
  totalTokens,
} from "@/lib/economy";
import type { BuildProjection } from "@/lib/economy";
import {
  duration,
  hours,
  money2,
  moneySigned,
  multiplier,
  pct,
  tokens,
} from "@/lib/format";
import type { ProjectDef, SimState, TokenHolding } from "@/lib/types";

interface EconRow {
  label: string;
  base: string;
  rig: string;
  strong?: boolean;
}

const BUY_CTA: Record<"fleet" | "tokens" | "compute" | "ready", string> = {
  fleet: "Upgrade my rig",
  tokens: "Buy tokens",
  compute: "Buy compute",
  ready: "Buy tokens & compute",
};

/**
 * The "everything" view of one contract: what it asks for, what your rig turns
 * that into, and exactly which of your token pools pays for it.
 */
export function ProjectDetailModal({
  def,
  projection,
  readiness,
  fleet,
  cash,
  computeHours,
  holdings,
  shipped,
  failReason,
  onClose,
  onBuild,
}: {
  def: ProjectDef;
  projection: BuildProjection;
  readiness: Runnability;
  fleet: SimState["fleet"];
  cash: number;
  computeHours: number;
  holdings: Record<string, TokenHolding>;
  shipped: number;
  failReason: string | null;
  onClose: () => void;
  onBuild: (def: ProjectDef, count: number) => void;
}) {
  const category = categoryMetaOf(def.category);
  const capability = capabilityMetaOf(def.capability);
  const tier = tierMetaOf(fleet.tier);
  const capabilityIcon = hasIcon(capability.icon) ? capability.icon : "Sparkles";

  const held = totalTokens(holdings);
  const pools = modelsFor(def.capability)
    .map((model) => ({ model, amount: holdings[model.id]?.tokens ?? 0 }))
    .filter((entry) => entry.amount > 0)
    .sort((a, b) => b.amount - a.amount);
  const cheapest = pools.length === 0 ? cheapestModelFor(def.capability) : null;

  const [count, setCount] = useState(1);

  const maxBatch = maxBatchFromProjection(
    def,
    projection,
    fleet.tier,
    holdings,
    computeHours,
  );
  const batchCap = Math.max(1, maxBatch);
  const runs = Math.min(Math.max(1, count), batchCap);

  const batchHours = projection.billedHours * runs;
  const batchTokens = def.tokenCost * runs;
  // Each copy lands into a colder market than the one before it.
  const batchPayout = batchPayoutOf(def, shipped, runs, projection.avgQuality);

  const cashAfter = cash + batchPayout;
  const hoursAfter = Math.max(0, computeHours - batchHours);
  const tokensAfter = Math.max(0, held - batchTokens);
  const marginPct = Math.max(0, Math.min(100, projection.marginPct * 100));
  const phases = phaseShape(def);

  const cta = !readiness.ok
    ? BUY_CTA[readiness.reason ?? "ready"]
    : BUY_CTA.ready;

  const econRows: EconRow[] = [
    {
      label: "List fee",
      base: money2(projection.basePayout),
      rig: money2(projection.basePayout),
    },
    {
      label: "Market heat",
      base: "—",
      rig: `${multiplier(projection.marketHeat)} · ${shipped} shipped`,
    },
    {
      label: "Model quality",
      base: "—",
      rig: `${multiplier(projection.qualityPremium)} · avg q${Math.round(
        projection.avgQuality,
      )}`,
    },
    {
      label: "Final payout",
      base: money2(projection.payout),
      rig: money2(projection.payout),
      strong: true,
    },
    {
      label: "Compute load",
      base: `${def.computeHours.toFixed(0)}h workload`,
      rig: `${def.computeHours.toFixed(0)}h workload`,
    },
    {
      label: "Throughput",
      base: multiplier(1),
      rig: multiplier(projection.speed),
    },
    {
      label: "Hours reserved",
      base: `${def.computeHours.toFixed(1)}h`,
      rig: `${projection.billedHours.toFixed(1)}h`,
      strong: true,
    },
    {
      label: "Wall clock",
      base: duration(def.baseSeconds),
      rig: duration(projection.seconds),
      strong: true,
    },
    {
      label: "Token bill",
      base: tokens(def.tokenCost),
      rig: tokens(def.tokenCost),
    },
    {
      label: "Pools tapped",
      base: "—",
      rig: `${projection.sources.length}`,
    },
    {
      label: "Tokens burned",
      base: tokens(def.tokenCost),
      rig: tokens(def.tokenCost),
    },
  ];

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      tone={category.tone}
      icon={<Icon name={def.icon} size={16} />}
      title={def.title}
      subtitle={def.tagline}
      footer={
        <>
          <BuyLink
            href={`/buy?tab=${readiness.tab}`}
            variant="ghost"
            label={cta}
          />
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button
            variant={readiness.ok ? "success" : "secondary"}
            disabled={!readiness.ok}
            onClick={() => onBuild(def, runs)}
            leftIcon={
              <Icon name={readiness.ok ? "Rocket" : "Lock"} size={14} />
            }
          >
            {readiness.ok
              ? runs > 1
                ? `Build ${runs} × — ETA ${duration(projection.seconds)}`
                : `Build this — ETA ${duration(projection.seconds)}`
              : readiness.short}
          </Button>
        </>
      }
    >
      {failReason ? (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-ember-400/40 bg-ember-500/10 px-3 py-2.5 text-xs leading-relaxed text-ember-400">
          <Icon name="AlertTriangle" size={13} className="mt-0.5 shrink-0" />
          <span>{failReason}</span>
        </div>
      ) : null}

      {/* Meta strip */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          tone={category.tone}
          size="md"
          icon={<Icon name={category.icon} size={12} />}
        >
          {category.label}
        </Badge>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-abyss-500/60 bg-abyss-800/70 px-2.5 py-1 text-xs text-fog-300">
          <DifficultyDots value={def.difficulty} accent={def.accent} />
          <span className="num">{def.difficulty}/5</span>
        </span>
        <Badge
          tone="iris"
          size="md"
          icon={<Icon name={capabilityIcon} size={12} />}
        >
          {capability.label} tokens
        </Badge>
        {def.badge ? (
          <Badge tone="mint" size="md">
            {def.badge}
          </Badge>
        ) : null}
        {shipped > 0 ? (
          <Badge
            tone="aqua"
            size="md"
            icon={<Icon name="CheckCircle2" size={12} />}
          >
            Shipped <span className="num">{shipped}</span>×
          </Badge>
        ) : null}
      </div>

      <p className="mt-4 text-sm leading-relaxed text-fog-300">
        {def.description}
      </p>

      {/* Deliverables */}
      <Section icon="ListChecks" title="Deliverables">
        <ul className="grid gap-2 sm:grid-cols-2">
          {def.tasks.map((task) => (
            <li
              key={task}
              className="flex items-start gap-2 rounded-xl border border-abyss-600/40 bg-abyss-900/40 px-3 py-2 text-xs leading-relaxed text-fog-300"
            >
              <Icon
                name="CheckCircle2"
                size={13}
                className="mt-0.5 shrink-0 text-mint-400"
              />
              <span>{task}</span>
            </li>
          ))}
        </ul>
      </Section>

      {/* Required capability */}
      <Section icon={capabilityIcon} title="Required capability">
        <div className="rounded-xl border border-abyss-600/50 bg-abyss-900/50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-fog-100">
                {capability.label}
              </span>
              <Badge tone="neutral" size="sm">
                <span className="num">{tokens(def.tokenCost)}</span> needed
              </Badge>
            </div>
            <span className="text-[11px] text-fog-500">
              drained cheapest pool first
            </span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-fog-400">
            {capability.blurb}
          </p>

          {pools.length > 0 ? (
            <ul className="mt-3 flex flex-col gap-1.5">
              {pools.map(({ model, amount }) => {
                const tapped = projection.sources.find(
                  (source) => source.modelId === model.id,
                );

                return (
                  <li
                    key={model.id}
                    className={cn(
                      "flex flex-wrap items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-[11px]",
                      tapped
                        ? "border-mint-400/30 bg-mint-500/8"
                        : "border-abyss-600/50 bg-abyss-900/60",
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ background: model.accent }}
                      />
                      <span className="truncate text-fog-200">{model.name}</span>
                      <span className="num shrink-0 text-fog-500">
                        {tokens(amount)}
                      </span>
                      <span className="num shrink-0 text-fog-500">
                        ${blendedPricePer1M(model).toFixed(2)}/1M
                      </span>
                    </span>
                    {tapped ? (
                      <span className="num inline-flex shrink-0 items-center gap-1.5 text-mint-300">
                        <Icon name="Check" size={11} />
                        {tokens(tapped.tokens)} tapped
                      </span>
                    ) : (
                      <span className="shrink-0 text-fog-500">
                        kept in reserve
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-solar-400/30 bg-solar-500/8 px-2.5 py-2 text-[11px] text-solar-300">
              <span>
                You hold no {capability.label.toLowerCase()} tokens
                {cheapest
                  ? ` — ${cheapest.name} is the cheapest way in`
                  : " yet"}
                .
              </span>
              <BuyLink
                href="/buy?tab=models"
                size="sm"
                variant="subtle"
                label="Buy tokens"
              />
            </div>
          )}
        </div>
      </Section>

      {/* Batch */}
      <Section icon="Copy" title="Batch size">
        <div className="rounded-xl border border-abyss-600/50 bg-abyss-900/50 p-3">
          {maxBatch > 1 ? (
            <>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Stepper
                    value={runs}
                    min={1}
                    max={batchCap}
                    onChange={setCount}
                    label={
                      maxBatch >= MAX_BATCH
                        ? `runs at once (capped at ${MAX_BATCH})`
                        : "runs at once"
                    }
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={runs >= batchCap}
                    onClick={() => setCount(batchCap)}
                    leftIcon={<Icon name="Zap" size={13} />}
                  >
                    Max batch · {batchCap}
                  </Button>
                  {runs > 1 ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCount(1)}
                      leftIcon={<Icon name="RotateCcw" size={13} />}
                    >
                      Single
                    </Button>
                  ) : null}
                </div>

                <span className="text-[11px] text-fog-500">
                  <span className="num">
                    {projection.billedHours.toFixed(1)}
                  </span>
                  h and <span className="num">{tokens(def.tokenCost)}</span> tokens
                  per run
                </span>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <Stat
                  icon="Gauge"
                  label="hours reserved"
                  value={`${batchHours.toFixed(1)}h`}
                  tone="text-aqua-400"
                />
                <Stat
                  icon="Coins"
                  label="tokens burned"
                  value={tokens(batchTokens)}
                  tone="text-iris-300"
                />
                <Stat
                  icon="TrendingUp"
                  label={runs > 1 ? `payout if all ${runs} land` : "payout"}
                  value={money2(batchPayout)}
                  tone="text-mint-400"
                />
              </div>

              <p className="mt-3 text-[11px] leading-relaxed text-fog-500">
                {runs > 1 ? (
                  <>
                    A batch is just <span className="num">{runs}</span> ordinary
                    runs launched together. Each one burns its own tokens,
                    reserves its own hours and rolls its own odds of failing —
                    they simply share one timer, one card, and one line in the
                    ledger. All <span className="num">{runs}</span> finish in{" "}
                    <span className="num">{duration(projection.seconds)}</span>,
                    side by side.
                  </>
                ) : (
                  <>
                    You are set to launch a single run. Pick a batch size above to
                    fire several copies of this contract at once — they burn
                    tokens and reserve hours exactly as separate launches would,
                    but they report as one card and one ledger line.
                  </>
                )}
              </p>
            </>
          ) : (
            <p className="text-xs leading-relaxed text-fog-400">
              {readiness.ok
                ? "There is only room for a single run right now. Buy more eligible tokens or more compute hours and this panel unlocks a batch."
                : "This contract can't launch at all yet, so there is nothing to batch. Clear the shortfall above and the batch controls unlock."}
            </p>
          )}
        </div>
      </Section>

      {/* Economics */}
      <Section icon="Calculator" title="Project versus your rig">
        <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-abyss-600/50 bg-abyss-900/50 px-3 py-2 text-xs">
          <Icon name="Cpu" size={13} className="text-iris-300" />
          <span className="font-medium text-fog-100">{fleet.name}</span>
          <span className="text-fog-500">
            tier <span className="num">{fleet.tier}</span> · {tier.label}
          </span>
          <span className="num text-aqua-400">
            {multiplier(projection.speed)} throughput
          </span>
          <span className="num text-fog-500">{fleet.tflops} TFLOPS</span>
          <span className="num text-fog-500">
            {money2(payoutPerHour(projection))}/h revenue
          </span>
        </div>

        <div className="scroll-thin overflow-x-auto rounded-xl border border-abyss-600/50">
          <table className="w-full min-w-[22rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-abyss-600/50 bg-abyss-900/70 text-[10px] uppercase tracking-[0.12em] text-fog-500">
                <th className="px-3 py-2 text-left font-medium">Metric</th>
                <th className="px-3 py-2 text-right font-medium">Project</th>
                <th className="px-3 py-2 text-right font-medium">
                  On your rig
                </th>
              </tr>
            </thead>
            <tbody>
              {econRows.map((row) => (
                <tr
                  key={row.label}
                  className="border-b border-abyss-700/40 last:border-b-0 odd:bg-abyss-900/25"
                >
                  <td className="px-3 py-1.5 text-left text-xs text-fog-400">
                    {row.label}
                  </td>
                  <td className="num px-3 py-1.5 text-right text-xs text-fog-400">
                    {row.base}
                  </td>
                  <td
                    className={cn(
                      "num px-3 py-1.5 text-right text-xs",
                      row.strong
                        ? "font-semibold text-fog-100"
                        : "text-fog-200",
                    )}
                  >
                    {row.rig}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-abyss-600/50 bg-abyss-900/50 p-3">
            <p className="text-[10px] uppercase tracking-[0.12em] text-fog-500">
              Net profit at list prices
            </p>
            <p
              className={cn(
                "num mt-1 text-xl font-semibold",
                projection.netProfit >= 0 ? "text-mint-400" : "text-ember-400",
              )}
            >
              {moneySigned(projection.netProfit)}
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-fog-500">
              payout − compute <span className="num">{money2(projection.computeCost)}</span> −
              tokens <span className="num">{money2(projection.tokenCost)}</span>
            </p>
          </div>

          <div className="rounded-xl border border-abyss-600/50 bg-abyss-900/50 p-3">
            <p className="text-[10px] uppercase tracking-[0.12em] text-fog-500">
              Margin
            </p>
            <div className="mt-2">
              <Progress
                value={marginPct}
                tone={projection.marginPct >= 0 ? "mint" : "ember"}
                size="md"
                showValue
                label={
                  <span className="num text-xs text-fog-300">
                    {pct(projection.marginPct, 1)} of the payout is profit
                  </span>
                }
              />
            </div>
          </div>
        </div>

        <div className="mt-3">
          <p className="mb-2 text-[10px] uppercase tracking-[0.12em] text-fog-500">
            Before → after launching{runs > 1 ? ` ×${runs}` : ""}
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            <Delta
              icon="CircleDollarSign"
              label="cash"
              before={money2(cash)}
              after={money2(cashAfter)}
              tone="text-mint-400"
            />
            <Delta
              icon="Gauge"
              label="compute left"
              before={hours(computeHours)}
              after={hours(hoursAfter)}
              tone="text-aqua-400"
              warn={computeHours < batchHours}
            />
            <Delta
              icon="Coins"
              label="tokens left"
              before={tokens(held)}
              after={tokens(tokensAfter)}
              tone="text-iris-300"
              warn={held < batchTokens}
            />
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-fog-500">
            Launching reserves the pool hours and burns the tokens up front; the
            payout credits the moment the run lands. The cash figure assumes every
            run in the batch delivers.
          </p>
        </div>
      </Section>

      {/* Phase mix */}
      <Section icon="Activity" title="Phase effort mix">
        <div className="rounded-xl border border-abyss-600/50 bg-abyss-900/50 p-3">
          <MiniBars
            data={phases}
            tone={category.tone}
            height={56}
            labels={PHASE_LABELS}
            formatValue={(value) => `${Math.round(value * 100)} effort`}
          />
          <p className="mt-2 text-[11px] text-fog-500">
            A stable per-contract shape seeded from its id —{" "}
            <span className="num">{def.tasks.length}</span> deliverables across{" "}
            <span className="num">{PHASE_LABELS.length}</span> phases.
          </p>
        </div>
      </Section>

      {/* Tapped pools summary */}
      {projection.sources.length > 0 ? (
        <Section icon="Layers" title="Pools this run will drain">
          <div className="flex flex-wrap gap-1.5">
            {projection.sources.map((source) => {
              const model = MODEL_BY_ID[source.modelId];
              return (
                <span
                  key={source.modelId}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-abyss-500/50 bg-abyss-900/70 px-2 py-1 text-[11px] text-fog-300"
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: model?.accent ?? "#7c5cff" }}
                  />
                  <span className="max-w-[160px] truncate">
                    {model?.name ?? source.modelId}
                  </span>
                  <span className="num text-mint-300">
                    {tokens(source.tokens)}
                  </span>
                  <span className="num text-fog-500">
                    ${source.pricePer1M.toFixed(2)}/1M
                  </span>
                </span>
              );
            })}
            {!projection.tokensOk ? (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-ember-400/40 bg-ember-500/10 px-2 py-1 text-[11px] text-ember-400">
                <Icon name="AlertTriangle" size={11} />
                <span className="num">{tokens(readiness.missingTokens)}</span>
                short of the bill
              </span>
            ) : null}
          </div>
        </Section>
      ) : null}
    </Modal>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: string;
  title: string;
  children: ReactNode;
}) {
  const safeIcon = hasIcon(icon) ? icon : "Sparkles";

  return (
    <section className="mt-5 first:mt-0">
      <h3 className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-fog-500">
        <Icon name={safeIcon} size={12} />
        {title}
      </h3>
      {children}
    </section>
  );
}

function Stat({
  icon,
  label,
  value,
  tone,
}: {
  icon: string;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="rounded-xl border border-abyss-600/50 bg-abyss-900/60 px-3 py-2">
      <div className="flex items-center gap-1.5">
        <Icon name={icon} size={11} className="text-fog-500" />
        <span className="text-[10px] uppercase tracking-[0.12em] text-fog-500">
          {label}
        </span>
      </div>
      <p className={cn("num mt-1 text-sm font-semibold", tone)}>{value}</p>
    </div>
  );
}

function Delta({
  icon,
  label,
  before,
  after,
  tone,
  warn,
}: {
  icon: string;
  label: string;
  before: string;
  after: string;
  tone: string;
  warn?: boolean;
}) {
  return (
    <div className="rounded-xl border border-abyss-600/50 bg-abyss-900/50 px-3 py-2">
      <div className="flex items-center gap-1.5">
        <Icon name={icon} size={11} className="text-fog-500" />
        <span className="text-[10px] uppercase tracking-[0.12em] text-fog-500">
          {label}
        </span>
      </div>
      <p className="mt-1 flex items-center gap-1.5 text-xs">
        <span className="num text-fog-300">{before}</span>
        <Icon name="ArrowRight" size={11} className="text-fog-500" />
        <span className={cn("num font-semibold", warn ? "text-ember-400" : tone)}>
          {after}
        </span>
      </p>
    </div>
  );
}
