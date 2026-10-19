"use client";

import { useState } from "react";
import type { ReactElement } from "react";

import { Badge, type Tone } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { Icon, hasIcon } from "@/components/ui/Icon";
import { Progress } from "@/components/ui/Progress";
import { Donut } from "@/components/ui/charts";
import { CAPABILITY_META, MODEL_BY_ID, modelQualityTier } from "@/data/models";
import { tokenValueOf, totalTokens } from "@/lib/economy";
import { money2, pct, tokens as fmtTokens, titleCase, tokensLong } from "@/lib/format";
import { useSim } from "@/lib/store";
import type { Capability, TokenHolding } from "@/lib/types";
import { DashboardLink } from "./DashboardLink";
import { paletteColor, qualityTone, ratio, riseDelay } from "./utils";

const COLLAPSED_POOLS = 6;

interface PoolRow {
  holding: TokenHolding;
  name: string;
  vendor: string;
  accent: string;
  quality: number;
  grade: string;
  tone: Tone;
  capabilities: Capability[];
  value: number;
}

/** Every token pool the player still owns, plus how it is allocated by vendor. */
export function TokenPortfolio(): ReactElement {
  const holdings = useSim((s) => s.holdings);
  const [expanded, setExpanded] = useState(false);

  const rows: PoolRow[] = Object.values(holdings)
    .filter((holding) => holding.tokens > 0)
    .sort((a, b) => b.tokens - a.tokens)
    .map((holding) => {
      const model = MODEL_BY_ID[holding.modelId];
      return {
        holding,
        name: model?.name ?? holding.modelId,
        vendor: model?.vendor ?? "Unknown vendor",
        accent: model?.accent ?? "#7c5cff",
        quality: model?.quality ?? 0,
        grade: model ? modelQualityTier(model) : "D",
        tone: model ? qualityTone(model) : "neutral",
        capabilities: model ? [...model.capabilities] : [],
        value: tokenValueOf(holding.modelId, holding.tokens),
      };
    });

  const pool = totalTokens(holdings);
  const spent = rows.reduce((sum, row) => sum + row.holding.spent, 0);
  const worth = rows.reduce((sum, row) => sum + row.value, 0);

  // Allocation by vendor, biggest first — stable order, stable colours.
  const vendorTotals = new Map<string, number>();
  for (const row of rows) {
    vendorTotals.set(row.vendor, (vendorTotals.get(row.vendor) ?? 0) + row.holding.tokens);
  }
  const vendorSlices = [...vendorTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([vendor, value], index) => ({
      label: vendor,
      value,
      color: paletteColor(index),
    }));

  const visible = expanded ? rows : rows.slice(0, COLLAPSED_POOLS);

  return (
    <Card accent="#7c5cff">
      <CardHeader
        accent="#7c5cff"
        icon={<Icon name="Coins" size={16} />}
        title="Token portfolio"
        subtitle={
          rows.length > 0 ? (
            <>
              <span className="num text-fog-300">{fmtTokens(pool)}</span> tokens
              in <span className="num text-fog-300">{rows.length}</span> pool
              {rows.length === 1 ? "" : "s"} · book value{" "}
              <span className="num text-fog-300">{money2(worth)}</span>
            </>
          ) : (
            "no tokens in the vault yet"
          )
        }
        action={
          rows.length > 0 ? (
            <Badge tone="iris" size="md">
              {money2(worth)}
            </Badge>
          ) : undefined
        }
      />

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-abyss-500/60 bg-abyss-900/40 px-6 py-10 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl border border-iris-400/30 bg-iris-500/10 text-iris-300 animate-float">
            <Icon name="Coins" size={22} />
          </span>
          <p className="text-sm font-semibold text-fog-100">The vault is empty</p>
          <p className="max-w-sm text-xs leading-relaxed text-fog-400">
            Contracts burn tokens, so every payout needs a pool behind it. Buy a
            pack for a model that matches the capability you want to build with.
          </p>
          <DashboardLink href="/buy" variant="primary" icon="ShoppingCart" arrow>
            Buy token packs
          </DashboardLink>
        </div>
      ) : (
        <div className="flex flex-col gap-5 lg:flex-row">
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div className="flex flex-col gap-2">
              {visible.map((row, index) => (
                <div key={row.holding.modelId} className="animate-rise" style={riseDelay(index)}>
                  <PoolRowView row={row} total={pool} />
                </div>
              ))}
            </div>

            {rows.length > COLLAPSED_POOLS ? (
              <button
                type="button"
                onClick={() => setExpanded((value) => !value)}
                aria-expanded={expanded}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-abyss-500/50 bg-abyss-800/60 px-3 py-2 text-xs font-medium text-fog-300 transition-colors hover:border-iris-400/40 hover:text-fog-100"
              >
                <Icon name={expanded ? "ChevronUp" : "ChevronDown"} size={13} />
                {expanded
                  ? "Show fewer pools"
                  : `Show all ${rows.length} pools`}
              </button>
            ) : null}

            <div className="grid grid-cols-3 gap-2 border-t border-abyss-600/50 pt-3">
              <Figure label="Tokens held" value={fmtTokens(pool)} />
              <Figure label="Spent" value={money2(spent)} />
              <Figure label="Book value" value={money2(worth)} />
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-center gap-3 lg:w-56">
            <Donut segments={vendorSlices} size={148} thickness={16}>
              <div className="flex flex-col items-center">
                <span className="num text-lg font-semibold text-fog-50">
                  {fmtTokens(pool)}
                </span>
                <span className="text-[9px] uppercase tracking-[0.14em] text-fog-500">
                  tokens
                </span>
              </div>
            </Donut>
            <ul className="flex w-full flex-col gap-1.5">
              {vendorSlices.map((slice) => (
                <li
                  key={slice.label}
                  className="flex items-center gap-2 text-[11px] text-fog-300"
                >
                  <span
                    aria-hidden="true"
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: slice.color }}
                  />
                  <span className="min-w-0 flex-1 truncate">{slice.label}</span>
                  <span className="num text-fog-400">{fmtTokens(slice.value)}</span>
                  <span className="num w-9 text-right text-fog-500">
                    {pct(ratio(slice.value, pool))}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-center text-[11px] leading-snug text-fog-500">
              allocation by vendor
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}

function PoolRowView({ row, total }: { row: PoolRow; total: number }): ReactElement {
  return (
    <div className="flex gap-3 rounded-xl border border-abyss-600/50 bg-abyss-900/60 p-3">
      <span
        aria-hidden="true"
        className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ background: row.accent }}
      />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="truncate text-sm font-semibold text-fog-100">
            {row.name}
          </span>
          <span className="truncate text-[11px] text-fog-500">
            {row.vendor}
          </span>
          <Badge tone={row.tone}>{row.grade}</Badge>
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {row.capabilities.slice(0, 3).map((capability) => {
            const meta: { label: string; icon: string } | undefined =
              CAPABILITY_META[capability];
            const iconName = meta && hasIcon(meta.icon) ? meta.icon : "Sparkles";
            return (
              <span
                key={capability}
                className="inline-flex items-center gap-1 rounded-md border border-abyss-500/50 bg-abyss-800/70 px-1.5 py-0.5 text-[10px] text-fog-400"
              >
                <Icon name={iconName} size={10} />
                {meta?.label ?? titleCase(capability)}
              </span>
            );
          })}
          {row.capabilities.length > 3 ? (
            <span className="text-[10px] text-fog-500">
              +{row.capabilities.length - 3}
            </span>
          ) : null}
        </div>

        <div className="mt-2">
          <Progress
            value={row.quality}
            tone={row.tone}
            size="xs"
            label={
              <span className="text-[10px] text-fog-500">
                quality index{" "}
                <span className="num text-fog-400">{row.quality}</span>
              </span>
            }
          />
        </div>
      </div>

      <div className="shrink-0 text-right">
        <p className="num text-sm font-semibold text-fog-100">
          {fmtTokens(row.holding.tokens)}
        </p>
        <p className="num text-[11px] text-mint-300">{money2(row.value)}</p>
        <p className="num mt-0.5 text-[10px] text-fog-500">
          {pct(ratio(row.holding.tokens, total))} of pool
        </p>
        <p
          className="num mt-0.5 text-[10px] text-fog-500"
          title={`${tokensLong(row.holding.tokens)} tokens bought for ${money2(row.holding.spent)}`}
        >
          paid {money2(row.holding.spent)}
        </p>
      </div>
    </div>
  );
}

function Figure({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <div className="rounded-xl border border-abyss-600/50 bg-abyss-900/60 px-2.5 py-2">
      <p className="text-[9px] uppercase tracking-[0.12em] text-fog-500">
        {label}
      </p>
      <p className="num mt-1 text-[13px] font-semibold text-fog-100">{value}</p>
    </div>
  );
}
