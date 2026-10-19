/**
 * Shared, non-visual helpers for the dashboard.
 *
 * Everything here is deterministic and SSR-safe: the only inputs are the
 * persisted transaction log, the current state and the static catalogs. No
 * clocks, no randomness — the sparklines in particular are reconstructed from
 * real history so the server and client always agree.
 */

import type { Tone } from "@/components/ui/Badge";
import { modelQualityTier } from "@/data/models";
import { BAILOUT_HOURS } from "@/lib/economy";
import type { BuildRun, ModelDef, TokenHolding, Tx } from "@/lib/types";

/* ============================================================
   Tones & colours
   ============================================================ */

/** Literal hex per tone — SVG charts take colours, not utility classes. */
export const TONE_HEX: Record<Tone, string> = {
  neutral: "#94a3b8",
  iris: "#7c5cff",
  mint: "#2ee0a4",
  solar: "#fbbf24",
  ember: "#fb7185",
  aqua: "#38bdf8",
  plasma: "#e879f9",
};

const TONES: readonly string[] = [
  "neutral",
  "iris",
  "mint",
  "solar",
  "ember",
  "aqua",
  "plasma",
];

/**
 * Catalog metadata stores tones as plain strings. This narrows them back to the
 * `Tone` union so `Badge` / `Progress` stay fully typed.
 */
export function asTone(value: string): Tone {
  return TONES.includes(value) ? (value as Tone) : "neutral";
}

/** Stable slice palette for multi-series legends and donuts. */
export const PALETTE: readonly string[] = [
  "#7c5cff",
  "#38bdf8",
  "#2ee0a4",
  "#fbbf24",
  "#e879f9",
  "#fb7185",
  "#a3e635",
  "#94a3b8",
  "#c084fc",
  "#60a5fa",
];

/** Deterministic palette lookup so a legend keeps its colours between renders. */
export function paletteColor(index: number): string {
  const safe = index >= 0 ? index : 0;
  return PALETTE[safe % PALETTE.length];
}

const GRADE_TONE: Record<"S" | "A" | "B" | "C" | "D", Tone> = {
  S: "mint",
  A: "aqua",
  B: "iris",
  C: "solar",
  D: "ember",
};

/** Progress-bar tone for a model's quality grade. */
export function qualityTone(model: ModelDef): Tone {
  return GRADE_TONE[modelQualityTier(model)];
}

/* ============================================================
   History-derived sparkline series
   ============================================================ */

export type SeriesMetric = "cash" | "net" | "compute" | "tokens";

/** Keep each sparkline legible by only walking the newest slice of the log. */
const MAX_POINTS = 24;

/**
 * How one transaction moves one metric.
 *
 * Cash is exact — every balance change in the store is written as a signed
 * `Tx.amount`. Net worth adds nothing on a purchase, because the cash simply
 * becomes an asset. Compute hours and token counts are not stored
 * per-transaction, so their series convert the dollars that moved into units at
 * the account's own hour rate and token rate; the reconstruction is then
 * anchored to today's true value, which keeps the shape honest and the endpoint
 * correct.
 */
function deltaOf(
  tx: Tx,
  metric: SeriesMetric,
  tokensPerDollar: number,
  hourRate: number,
): number {
  switch (metric) {
    case "cash":
      return tx.amount;
    case "net":
      switch (tx.kind) {
        case "purchase-model":
        case "purchase-compute":
        case "build":
          return 0;
        default:
          return tx.amount;
      }
    case "compute":
      if (tx.kind === "purchase-compute") {
        return hourRate > 0 ? Math.abs(tx.amount) / hourRate : 0;
      }
      if (tx.kind === "bailout") return BAILOUT_HOURS;
      return 0;
    case "tokens":
      if (tx.kind === "purchase-model") {
        return Math.abs(tx.amount) * tokensPerDollar;
      }
      return 0;
  }
}

interface MetricEvent {
  at: number;
  delta: number;
}

/**
 * Every dated change to a metric, oldest first: the ledger for purchases, and
 * the run log for the burn — builds drain hours and tokens at launch, which the
 * transaction log records only as prose.
 */
function eventsFor(
  history: Tx[],
  metric: SeriesMetric,
  tokensPerDollar: number,
  runs: BuildRun[],
  hourRate: number,
): MetricEvent[] {
  const events: MetricEvent[] = history.map((tx) => ({
    at: tx.at,
    delta: deltaOf(tx, metric, tokensPerDollar, hourRate),
  }));

  if (metric === "compute" || metric === "tokens") {
    for (const run of runs) {
      const consumed = metric === "compute" ? run.billedHours : run.tokensConsumed;
      if (consumed > 0) events.push({ at: run.startedAt, delta: -consumed });
    }
  }

  return events.sort((a, b) => a.at - b.at).slice(-MAX_POINTS);
}

/**
 * Reconstruct a metric's trajectory from the ledger and the run log, and pin the
 * final point to `anchor`. Fewer than two points collapses to a short flat
 * series so a fresh account shows a calm line rather than invented noise.
 *
 * `hourRate` is what an hour costs on the player's current rig — purchases are
 * logged in dollars only, so it is the best available conversion.
 */
export function historySeries(
  history: Tx[],
  metric: SeriesMetric,
  anchor: number,
  tokensPerDollar: number,
  hourRate: number,
  runs: BuildRun[] = [],
): number[] {
  const events = eventsFor(history, metric, tokensPerDollar, runs, hourRate);
  if (events.length === 0) return [anchor, anchor];

  let running = anchor - events.reduce((sum, event) => sum + event.delta, 0);

  const series = events.map((event) => {
    running += event.delta;
    return Number.isFinite(running) ? running : anchor;
  });

  return series.length < 2 ? [anchor, anchor] : series;
}

/** Live blended tokens-per-dollar across every pool the player has bought. */
export function blendedTokensPerDollar(
  holdings: Record<string, TokenHolding>,
): number {
  let spent = 0;
  let held = 0;
  for (const pool of Object.values(holdings)) {
    spent += pool.spent;
    held += pool.tokens;
  }
  return spent > 0.01 ? held / spent : 0;
}

/* ============================================================
   Small display helpers
   ============================================================ */

/** Staggered entrance delay, capped so late rows never feel sluggish. */
export function riseDelay(index: number): { animationDelay: string } {
  return { animationDelay: `${Math.min(index, 12) * 55}ms` };
}

/** A safe division that never returns NaN, for rate readouts. */
export function ratio(part: number, whole: number): number {
  if (!Number.isFinite(part) || !Number.isFinite(whole) || whole <= 0) return 0;
  return Math.min(Math.max(part / whole, 0), 1);
}
