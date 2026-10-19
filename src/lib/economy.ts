/**
 * The economy engine.
 *
 * One rule keeps every number in this app coherent:
 *
 *   A project has a fixed compute *load* (workload-hours) and a fixed token
 *   bill. Your rig decides how much wall-clock time — and how many of *your*
 *   purchased compute hours — that load costs:
 *
 *       billedHours = workloadHours / speed(rig)
 *       wallClock   = baseSeconds   / speed(rig)
 *
 * So a bigger rig costs more per hour but burns fewer of your hours and
 * finishes dramatically sooner, while still paying a small quality premium.
 * Cheap iron maximises margin per run; big iron maximises money per minute.
 */

import {
  COMPUTE_BY_ID,
  COMPUTE_PLANS,
  speedMultiplier,
} from "@/data/compute";
import { MODEL_BY_ID, MODELS, blendedPricePer1M } from "@/data/models";
import { PROJECT_BY_ID, PROJECTS, REFERENCE_TOKEN_PRICE } from "@/data/projects";
import type {
  BuildRun,
  Capability,
  ComputePlan,
  FleetTier,
  ModelDef,
  ProjectDef,
  SimState,
} from "./types";

/* ============================================================
   Boot constants
   ============================================================ */

export const STATE_VERSION = 3;
export const STARTING_CASH = 100;
export const STARTING_COMPUTE_HOURS = 10;
export const LOW_BALANCE_THRESHOLD = 5;
export const BAILOUT_CASH = 20;
export const BAILOUT_HOURS = 10;

/** Bare-metal baseline before anything is bought. */
export const STOCK_FLEET = {
  planId: null,
  name: "Stock Laptop",
  tier: 1 as FleetTier,
  tflops: 0.4,
  vcpus: 4,
  vram: 0,
  gpu: null,
};

/** Payout premium for shipping on serious hardware. */
export const PAYOUT_MULT_BY_TIER: Record<FleetTier, number> = {
  1: 1.0,
  2: 1.1,
  3: 1.22,
  4: 1.38,
  5: 1.55,
};

/** Payout premium for solving the job with higher-quality models. */
export const QUALITY_BONUS_FLOOR = 0.85;
export const QUALITY_BONUS_CEILING = 1.25;

/* ============================================================
   Small numeric helpers
   ============================================================ */

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Whole-dollar prices read better on a fake storefront. */
export function roundPrice(n: number): number {
  if (n >= 1000) return Math.round(n / 10) * 10;
  if (n >= 100) return Math.round(n / 5) * 5;
  if (n >= 20) return Math.round(n);
  return Math.round(n * 100) / 100;
}

/* ============================================================
   Compute
   ============================================================ */

/** Volume discount on purchased hours. */
export function bulkDiscount(hours: number): number {
  if (hours >= 250) return 0.8;
  if (hours >= 100) return 0.85;
  if (hours >= 25) return 0.9;
  if (hours >= 5) return 0.95;
  return 1;
}

export function planHourCost(plan: ComputePlan, hours: number): number {
  return round2(hours * plan.pricePerHour * bulkDiscount(hours));
}

/** Blend of "cheap per workload-hour" and "fast", for sorting recommendations. */
export function planEfficiency(plan: ComputePlan): number {
  return plan.pricePerHour / speedMultiplier(plan);
}

/** The best-value rig at or above a tier floor, for a given pool of cash. */
export function bestPlanFor(tier: FleetTier): ComputePlan {
  return COMPUTE_PLANS.filter((p) => p.tier >= tier).reduce((a, b) =>
    planEfficiency(a) <= planEfficiency(b) ? a : b,
  );
}

export function fleetSpeed(fleet: {
  tflops: number;
  vcpus: number;
}): number {
  return speedMultiplier(fleet);
}

export function planById(id: string | null): ComputePlan | null {
  if (!id) return null;
  return COMPUTE_BY_ID[id] ?? null;
}

/* ============================================================
   Build projections
   ============================================================ */

export interface BuildProjection {
  /** Pool hours this run will reserve. */
  billedHours: number;
  /** Wall-clock seconds. */
  seconds: number;
  /** Real minutes, for copy. */
  minutes: number;
  /** Speed multiplier in effect. */
  speed: number;
  computeCost: number;
  tokenCost: number;
  /** Gross payout after tier + quality bonuses. */
  payout: number;
  basePayout: number;
  fleetBonus: number;
  qualityBonus: number;
  /** payout - computeCost - tokenCost (computed at today's list prices). */
  netProfit: number;
  marginPct: number;
  /** Mean quality (0-100) of the token pools this run would drain. */
  avgQuality: number;
  /** Pools that will be tapped, cheapest first. */
  sources: { modelId: string; tokens: number; pricePer1M: number }[];
  /** False when the run needs more tokens than the player holds. */
  tokensOk: boolean;
}

function speedOf(fleet: { tflops: number; vcpus: number }): number {
  return speedMultiplier(fleet);
}

/**
 * Which token pools a run drains: eligible models for the capability, cheapest
 * per token first, so the player keeps their best tokens for jobs that need them.
 */
export function tokenPlan(
  project: ProjectDef,
  holdings: Record<string, { tokens: number }>,
): { sources: { modelId: string; tokens: number; pricePer1M: number }[]; total: number; avgQuality: number } {
  const eligible = MODELS.filter((m) =>
    m.capabilities.includes(project.capability),
  )
    .map((m) => ({
      model: m,
      held: Math.max(0, holdings[m.id]?.tokens ?? 0),
      pricePer1M: blendedPricePer1M(m),
    }))
    .filter((c) => c.held > 0)
    .sort((a, b) => a.pricePer1M - b.pricePer1M);

  let remaining = project.tokenCost;
  const sources: { modelId: string; tokens: number; pricePer1M: number }[] = [];
  let weightedQuality = 0;
  let used = 0;

  for (const c of eligible) {
    if (remaining <= 0) break;
    const take = Math.min(c.held, remaining);
    if (take <= 0) continue;
    sources.push({
      modelId: c.model.id,
      tokens: take,
      pricePer1M: c.pricePer1M,
    });
    weightedQuality += take * c.model.quality;
    used += take;
    remaining -= take;
  }

  return {
    sources,
    total: used,
    avgQuality: used > 0 ? weightedQuality / used : 0,
  };
}

export function projectTokens(
  project: ProjectDef,
  holdings: Record<string, { tokens: number }>,
): BuildProjection["sources"] {
  return tokenPlan(project, holdings).sources;
}

export function fleetPayoutMultiplier(tier: FleetTier): number {
  return PAYOUT_MULT_BY_TIER[tier] ?? 1;
}

export function qualityPayoutMultiplier(avgQuality: number): number {
  if (avgQuality <= 0) return QUALITY_BONUS_FLOOR;
  const t = clamp(avgQuality, 0, 100) / 100;
  return QUALITY_BONUS_FLOOR + t * (QUALITY_BONUS_CEILING - QUALITY_BONUS_FLOOR);
}

export function projectionOf(
  def: ProjectDef,
  fleet: { tflops: number; vcpus: number; tier: FleetTier },
  holdings: Record<string, { tokens: number }>,
): BuildProjection {
  const speed = speedOf(fleet);
  const billedHours = def.computeHours / speed;
  const plan = tokenPlan(def, holdings);

  const seconds = def.baseSeconds / speed;

  const fleetBonus = fleetPayoutMultiplier(fleet.tier);
  const qualityBonus = qualityPayoutMultiplier(plan.avgQuality);
  const basePayout = def.payment;
  const payout = round2(basePayout * fleetBonus * qualityBonus);

  const refRig = bestPlanFor(fleet.tier);
  const computeCost = round2(billedHours * refRig.pricePerHour);
  const tokenCost = round2(
    plan.sources.reduce((sum, s) => sum + (s.tokens / 1e6) * s.pricePer1M, 0),
  );

  const spend = computeCost + tokenCost;
  const netProfit = round2(payout - spend);

  return {
    billedHours,
    seconds,
    minutes: seconds / 60,
    speed,
    computeCost,
    tokenCost,
    payout,
    basePayout,
    fleetBonus,
    qualityBonus,
    netProfit,
    marginPct: payout > 0 ? netProfit / payout : 0,
    avgQuality: plan.avgQuality,
    sources: plan.sources,
    tokensOk: plan.total >= def.tokenCost,
  };
}

/** The headline number shown on a card when the player hasn't got the tokens yet. */
export function listedPayout(project: ProjectDef, tier: FleetTier): number {
  return round2(project.payment * fleetPayoutMultiplier(tier) * 1.1);
}

export function listedCost(project: ProjectDef): number {
  const ref = REFERENCE_TOKEN_PRICE[project.capability];
  return round2(project.computeHours * 0.6 + (project.tokenCost / 1e6) * ref);
}

/* ============================================================
   Capability helpers
   ============================================================ */

export function modelsFor(capability: Capability): ModelDef[] {
  return MODELS.filter((m) => m.capabilities.includes(capability));
}

export function cheapestModelFor(capability: Capability): ModelDef | null {
  const list = modelsFor(capability);
  if (!list.length) return null;
  return list.reduce((a, b) =>
    blendedPricePer1M(a) <= blendedPricePer1M(b) ? a : b,
  );
}

/* ============================================================
   Valuation
   ============================================================ */

export function tokenValueOf(modelId: string, tokens: number): number {
  const m = MODEL_BY_ID[modelId];
  if (!m) return 0;
  return round2((tokens / 1e6) * blendedPricePer1M(m));
}

export function holdingsValue(
  holdings: Record<string, { tokens: number }>,
): number {
  return round2(
    Object.entries(holdings).reduce(
      (sum, [id, h]) => sum + tokenValueOf(id, h.tokens),
      0,
    ),
  );
}

/** Compute hours are valued at a mid-tier replacement rate. */
export const COMPUTE_REPLACEMENT_RATE = 0.62;

export function computeValueOf(hours: number): number {
  return round2(Math.max(0, hours) * COMPUTE_REPLACEMENT_RATE);
}

export function totalTokens(holdings: Record<string, { tokens: number }>): number {
  return Object.values(holdings).reduce((s, h) => s + h.tokens, 0);
}

export function netWorth(state: SimState): number {
  return round2(
    state.cash +
      computeValueOf(state.computeHours) +
      holdingsValue(state.holdings),
  );
}

export function poolCount(holdings: Record<string, { tokens: number }>): number {
  return Object.values(holdings).filter((h) => h.tokens > 0).length;
}

/* ============================================================
   Running builds
   ============================================================ */

export function runProgress(run: BuildRun, now: number): number {
  const span = run.endsAt - run.startedAt;
  if (span <= 0) return 1;
  return clamp((now - run.startedAt) / span, 0, 1);
}

export function runRemaining(run: BuildRun, now: number): number {
  return Math.max(0, (run.endsAt - now) / 1000);
}

export function runElapsed(run: BuildRun, now: number): number {
  return Math.max(0, (now - run.startedAt) / 1000);
}

export function runHoursConsumed(run: BuildRun, now: number): number {
  return run.billedHours * runProgress(run, now);
}

/** Hours locked up in unfinished runs but not yet burned. */
export function hoursInUse(runs: BuildRun[], now: number): number {
  return runs
    .filter((r) => r.status === "running")
    .reduce((sum, r) => sum + Math.max(0, r.billedHours - runHoursConsumed(r, now)), 0);
}

export function isRunnable(
  def: ProjectDef,
  state: SimState,
): { ok: boolean; reason: "compute" | "tokens" | "fleet" | null } {
  if (state.fleet.tier < def.minFleetTier) {
    return { ok: false, reason: "fleet" };
  }
  const p = projectionOf(def, state.fleet, state.holdings);
  if (!p.tokensOk) return { ok: false, reason: "tokens" };
  return { ok: true, reason: null };
}

/* ============================================================
   Catalog lookups used across the UI
   ============================================================ */

export function projectById(id: string): ProjectDef | null {
  return PROJECT_BY_ID[id] ?? null;
}

export function allProjects(): ProjectDef[] {
  return PROJECTS;
}

export { REFERENCE_TOKEN_PRICE, speedMultiplier };
