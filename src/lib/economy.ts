/**
 * The economy engine.
 *
 * A project has a fixed compute *load* (workload-hours) and a fixed token
 * bill. Your rig decides how much wall-clock time — and how many of *your*
 * purchased compute hours — that load costs:
 *
 *     billedHours = workloadHours / speed(rig)
 *     wallClock   = baseSeconds   / speed(rig)
 *
 * Two rules keep the money honest, and they are the whole balance patch:
 *
 * 1. FIXED FEE. The client pays a flat fee for a deliverable, not a share of
 *    what you spent producing it. Your profit is `fee - your real cost`, so
 *    cheap iron keeps more per run and big iron ships more runs per minute.
 *    The fee itself is calibrated against `referenceCostOf` — the cheapest rig
 *    that legally meets the contract's tier — so the margin you can actually
 *    earn is the margin the catalog was designed around, at every tier.
 *
 * 2. SATURATING MARKET. A contract you have never shipped pays
 *    `MARKUP_BY_DIFFICULTY[d]` over its reference cost. Every subsequent
 *    shipment of that same contract cools the market geometrically toward
 *    `SPOT_MARKUP` (a spot job, ~1% over cost). So income per run is a
 *    *dollar amount tied to the work*, never a percentage of your bankroll:
 *    compounding is bounded by how many fresh contracts and how many parallel
 *    runs you can keep in flight, not by how much money you already have.
 */

import {
  COMPUTE_BY_ID,
  COMPUTE_PLANS,
  speedMultiplier,
} from "@/data/compute";
import { MODEL_BY_ID, MODELS, blendedPricePer1M } from "@/data/models";
import { PROJECT_BY_ID, PROJECTS } from "@/data/projects";
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

export const STATE_VERSION = 5;
export const STARTING_CASH = 20;
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

/**
 * What an hour of the stock laptop is *worth*, for costing purposes.
 *
 * Runs are always billed at the rig they ran on, so this only matters before
 * the first purchase. It is pinned to the cheapest tier-1 capacity so the
 * starting float buys exactly the margin the catalog promises, no more.
 */
export const STOCK_HOUR_RATE = 0.02;

/* ============================================================
   The balance patch: fee calibration and market heat
   ============================================================ */

/** Fee over reference cost on a contract nobody has shipped yet, by difficulty. */
export const MARKUP_BY_DIFFICULTY: Record<ProjectDef["difficulty"], number> = {
  1: 1.3,
  2: 1.45,
  3: 1.65,
  4: 1.9,
  5: 2.2,
};

/** What a fully saturated market still pays over reference cost — the spot rate. */
export const SPOT_MARKUP = 1.01;

/** How much of the unsold premium survives each prior shipment of a contract. */
export const MARKET_DECAY = 0.78;

/** Quality scales the *premium* only, so a weak token pool can never sink a run. */
export const QUALITY_PREMIUM_NEUTRAL = 76.5;
export const QUALITY_PREMIUM_SLOPE = 0.0085;
export const QUALITY_PREMIUM_FLOOR = 0.35;
export const QUALITY_PREMIUM_CEILING = 1.2;

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
  /** Gross payout: the client's cheque after market heat and quality. */
  payout: number;
  /** The contract's list fee — what a *fresh* market pays. */
  basePayout: number;
  /** Fraction of the fresh premium the market still pays for the next run. */
  marketHeat: number;
  /** Scales the unsold premium: 0.35 (weak pool) to 1.2 (excellent). */
  qualityPremium: number;
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

/* ============================================================
   Reference pricing — the basis every fee is calibrated against
   ============================================================ */

/**
 * Cheapest blended $/1M among the models that can serve a capability. This is
 * the token price a clear-eyed player can actually achieve, which is what makes
 * it a fair basis for a client's fee. Memoised: the catalog is static.
 */
const refTokenCache = new Map<Capability, number>();

export function referenceTokenPrice(capability: Capability): number {
  const cached = refTokenCache.get(capability);
  if (cached !== undefined) return cached;
  const eligible = MODELS.filter((m) => m.capabilities.includes(capability));
  const price = eligible.length
    ? Math.min(...eligible.map((m) => blendedPricePer1M(m)))
    : 0;
  refTokenCache.set(capability, price);
  return price;
}

/** Compute bill for a run delivered on the best-value rig its tier allows. */
export function referenceComputeOf(def: ProjectDef): number {
  const rig = bestPlanFor(def.minFleetTier);
  return (def.computeHours / speedMultiplier(rig)) * rig.pricePerHour;
}

/** The whole reference bill: best-value rig, cheapest eligible tokens. */
export function referenceCostOf(def: ProjectDef): number {
  return (
    referenceComputeOf(def) +
    (def.tokenCost / 1e6) * referenceTokenPrice(def.capability)
  );
}

/** Fraction of a contract's fresh premium still on the table after `shipped`. */
export function marketHeat(shipped: number): number {
  return Math.pow(MARKET_DECAY, Math.max(0, shipped));
}

/**
 * Quality scales the premium, never the floor. A weak pool shrinks your upside;
 * it can't turn a saturated contract into a loss.
 */
export function qualityPremium(avgQuality: number): number {
  if (avgQuality <= 0) return QUALITY_PREMIUM_FLOOR;
  const raw =
    1 + (clamp(avgQuality, 0, 100) - QUALITY_PREMIUM_NEUTRAL) * QUALITY_PREMIUM_SLOPE;
  return clamp(raw, QUALITY_PREMIUM_FLOOR, QUALITY_PREMIUM_CEILING);
}

/**
 * The client's cheque: a spot floor plus whatever premium the market still
 * supports. `shipped` is how many times this contract has already been
 * delivered; `avgQuality` is the mean quality of the pools that will pay for it.
 */
export function payoutOf(
  def: ProjectDef,
  shipped: number,
  avgQuality: number,
): number {
  const floor = referenceCostOf(def) * SPOT_MARKUP;
  const premium = Math.max(0, def.payment - floor);
  return round2(floor + premium * marketHeat(shipped) * qualityPremium(avgQuality));
}

/**
 * What `count` copies launched back-to-back pay in total. Each copy arrives
 * into a slightly colder market than the one before it, so this is a sum, not a
 * multiplication — which is exactly why a batch can't print money.
 */
export function batchPayoutOf(
  def: ProjectDef,
  shipped: number,
  count: number,
  avgQuality: number,
): number {
  const floor = referenceCostOf(def) * SPOT_MARKUP;
  const premium = Math.max(0, def.payment - floor) * qualityPremium(avgQuality);
  let total = count * floor;
  let heat = marketHeat(shipped);
  for (let i = 0; i < count; i += 1) {
    total += premium * heat;
    heat *= MARKET_DECAY;
  }
  return round2(total);
}

/**
 * What an hour costs on this fleet. Runs are always billed at the rig they ran
 * on, and `computeHours` is re-provisioned at the flagship's rate whenever the
 * flagship changes, so this is exactly what the hours in the pool cost.
 */
export function fleetHourRate(fleet: { planId?: string | null }): number {
  const plan = planById(fleet.planId ?? null);
  return plan ? plan.pricePerHour : STOCK_HOUR_RATE;
}

/**
 * Turn a reserved-hour refund back into pool hours at today's rate.
 *
 * Reservations are dollar amounts held at the rate the run launched on. If the
 * flagship has changed since, the pool is denominated differently, so a raw hour
 * count would refund the wrong value — aborting a cheap-iron run after switching
 * to a big rig would mint money. With no switch the two rates are equal and the
 * refund is unchanged.
 */
export function refundHoursOf(
  refundHours: number,
  rateAtLaunch: number,
  currentRate: number,
): number {
  if (refundHours <= 0) return 0;
  if (rateAtLaunch <= 0 || currentRate <= 0) return refundHours;
  return (refundHours * rateAtLaunch) / currentRate;
}

export function projectionOf(
  def: ProjectDef,
  fleet: { tflops: number; vcpus: number; tier: FleetTier; planId?: string | null },
  holdings: Record<string, { tokens: number }>,
  shipped = 0,
): BuildProjection {
  const speed = speedOf(fleet);
  const billedHours = def.computeHours / speed;
  const plan = tokenPlan(def, holdings);

  const seconds = def.baseSeconds / speed;

  const qualityPremiumValue = qualityPremium(plan.avgQuality);
  const basePayout = def.payment;
  const payout = payoutOf(def, shipped, plan.avgQuality);
  const computeCost = round2(billedHours * fleetHourRate(fleet));
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
    marketHeat: marketHeat(shipped),
    qualityPremium: qualityPremiumValue,
    netProfit,
    marginPct: payout > 0 ? netProfit / payout : 0,
    avgQuality: plan.avgQuality,
    sources: plan.sources,
    tokensOk: plan.total >= def.tokenCost,
  };
}

/** The headline number shown on a card when the player hasn't got the tokens yet. */
export function listedPayout(project: ProjectDef): number {
  return payoutOf(project, 0, QUALITY_PREMIUM_NEUTRAL);
}

/** What the run costs to deliver on the best-value rig for its tier. */
export function listedCost(project: ProjectDef): number {
  return round2(referenceCostOf(project));
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

/**
 * Hours in the pool are worth what they cost to replace on *your* rig, because
 * buying on a rig re-provisions the whole pool at that rig's rate. A rival rate
 * would make net worth a fiction.
 */
export function computeValueOf(hours: number, hourRate = STOCK_HOUR_RATE): number {
  return round2(Math.max(0, hours) * hourRate);
}

export function totalTokens(holdings: Record<string, { tokens: number }>): number {
  return Object.values(holdings).reduce((s, h) => s + h.tokens, 0);
}

export function netWorth(state: SimState): number {
  return round2(
    state.cash +
      computeValueOf(state.computeHours, fleetHourRate(state.fleet)) +
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
   Batching
   ============================================================ */

/**
 * Hard ceiling on one batch.
 *
 * A batch is N *independent* runs that happen to share a launch, a timer and a
 * label. Nothing about the economy changes — this only bounds how many run
 * records a single click can create.
 */
export const MAX_BATCH = 50;

/** Tokens the player holds that could pay this contract's capability bill. */
export function eligibleTokenPool(
  def: ProjectDef,
  holdings: Record<string, { tokens: number }>,
): number {
  return MODELS.filter((m) => m.capabilities.includes(def.capability)).reduce(
    (sum, m) => sum + Math.max(0, holdings[m.id]?.tokens ?? 0),
    0,
  );
}

/**
 * How many copies of this contract the player could launch right now — limited
 * by the fleet tier, the free hours, the eligible token pool, and `MAX_BATCH`.
 * `0` means not even one run fits.
 *
 * A run always costs exactly `tokenCost` tokens and reserves exactly
 * `billedHours` hours (the fleet does not change mid-batch), so the bound is a
 * plain floor division on each resource.
 */
export function maxBatchFor(
  def: ProjectDef,
  fleet: { tflops: number; vcpus: number; tier: FleetTier },
  holdings: Record<string, { tokens: number }>,
  computeHours: number,
): number {
  return maxBatchFromProjection(
    def,
    projectionOf(def, fleet, holdings),
    fleet.tier,
    holdings,
    computeHours,
  );
}

/**
 * The same bound, for callers that have *already* priced the job — the make
 * grid and the detail modal both hold a `BuildProjection` and would otherwise
 * run the token plan twice.
 */
export function maxBatchFromProjection(
  def: ProjectDef,
  projection: BuildProjection,
  fleetTier: FleetTier,
  holdings: Record<string, { tokens: number }>,
  computeHours: number,
): number {
  if (fleetTier < def.minFleetTier) return 0;
  if (projection.billedHours <= 0 || def.tokenCost <= 0) return 0;

  const byHours = Math.floor((computeHours + 1e-9) / projection.billedHours);
  const byTokens = Math.floor(
    (eligibleTokenPool(def, holdings) + 1e-9) / def.tokenCost,
  );

  return clamp(Math.min(byHours, byTokens, MAX_BATCH), 0, MAX_BATCH);
}

/**
 * A batch renders as one card, so the UI needs runs collapsed back into the
 * launches that created them. Order is preserved (newest first, as stored).
 */
export interface BuildGroup {
  /** React key: the batch id, or the lone run's id. */
  key: string;
  runs: BuildRun[];
  /** True when one click created every run in here. */
  batched: boolean;
  label: string;
  projectId: string;
}

export function groupRuns(runs: BuildRun[]): BuildGroup[] {
  const groups: BuildGroup[] = [];
  const seen = new Map<string, BuildGroup>();

  for (const run of runs) {
    const key = run.batchId ?? run.id;
    const existing = seen.get(key);
    if (existing) {
      existing.runs.push(run);
      continue;
    }
    const group: BuildGroup = {
      key,
      runs: [run],
      batched: Boolean(run.batchId),
      label: run.label,
      projectId: run.projectId,
    };
    seen.set(key, group);
    groups.push(group);
  }

  return groups;
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

export { speedMultiplier };
