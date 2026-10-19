/**
 * Make-page shared helpers.
 *
 * Everything here is pure and deterministic: readiness checks (the same
 * verdict the store enforces when a run launches), sorting, and the phase
 * shape the detail modal draws. No hooks, no clocks, no randomness.
 */

import { COMPUTE_TIER_META } from "@/data/compute";
import { CAPABILITY_META } from "@/data/models";
import { PROJECT_CATEGORY_META } from "@/data/projects";
import type { BuildProjection } from "@/lib/economy";
import { seeded, tokens } from "@/lib/format";
import type {
  Capability,
  FleetTier,
  ProjectCategory,
  ProjectDef,
} from "@/lib/types";

/* ============================================================
   Sorting
   ============================================================ */

export type SortKey = "pay" | "quick" | "perHour" | "easiest" | "az";

export const SORT_OPTIONS: { id: SortKey; label: string }[] = [
  { id: "pay", label: "Best pay" },
  { id: "quick", label: "Quickest" },
  { id: "perHour", label: "Best pay / hour" },
  { id: "easiest", label: "Easiest" },
  { id: "az", label: "A–Z" },
];

/* ============================================================
   Readiness
   ============================================================ */

export type BlockReason = "compute" | "tokens" | "fleet" | null;

export interface Runnability {
  /** True when a launch would actually succeed right now. */
  ok: boolean;
  reason: BlockReason;
  /** Fleet tier the contract demands. */
  requiredTier: FleetTier;
  /** Tokens the eligible pools are short by. */
  missingTokens: number;
  /** Pool hours the rig is short by. */
  missingHours: number;
  /** Full sentence, for badges and tooltips. */
  label: string;
  /** Terse variant, for a disabled button. */
  short: string;
  /** Which aisle of the shop fixes this. */
  tab: "models" | "compute";
}

export interface ProjectRow {
  def: ProjectDef;
  /** Personalised to the player's current fleet + holdings. */
  projection: BuildProjection;
  readiness: Runnability;
}

/* ============================================================
   Guarded catalog lookups
   ============================================================ */

export type CategoryMeta = (typeof PROJECT_CATEGORY_META)[ProjectCategory];
export type CapabilityInfo = (typeof CAPABILITY_META)[Capability];
export type TierMeta = (typeof COMPUTE_TIER_META)[FleetTier];

const CATEGORY_FALLBACK: CategoryMeta = {
  label: "Other",
  blurb: "An uncategorised contract.",
  icon: "Boxes",
  tone: "neutral",
};

const CAPABILITY_FALLBACK: CapabilityInfo = {
  label: "Text",
  icon: "MessageSquare",
  blurb: "Everyday chat, drafting and summarisation.",
};

export function categoryMetaOf(category: ProjectCategory): CategoryMeta {
  const found: CategoryMeta | undefined = PROJECT_CATEGORY_META[category];
  return found ?? CATEGORY_FALLBACK;
}

export function capabilityMetaOf(capability: Capability): CapabilityInfo {
  const found: CapabilityInfo | undefined = CAPABILITY_META[capability];
  return found ?? CAPABILITY_FALLBACK;
}

export function tierMetaOf(tier: FleetTier): TierMeta {
  const found: TierMeta | undefined = COMPUTE_TIER_META[tier];
  return found ?? COMPUTE_TIER_META[1];
}

/* ============================================================
   Runnability
   ============================================================ */

function heldForProject(projection: BuildProjection): number {
  return projection.sources.reduce((sum, source) => sum + source.tokens, 0);
}

/**
 * The same verdict the store returns from `startBuild` — fleet, then tokens,
 * then compute — plus the shortfall numbers a card needs to explain itself.
 */
export function runnabilityOf(
  def: ProjectDef,
  projection: BuildProjection,
  tier: FleetTier,
  computeHours: number,
): Runnability {
  const requiredTier = def.minFleetTier;
  const missingTokens = Math.max(0, def.tokenCost - heldForProject(projection));
  const missingHours = Math.max(0, projection.billedHours - computeHours);
  const capability = capabilityMetaOf(def.capability);

  if (tier < requiredTier) {
    const tierLabel = tierMetaOf(requiredTier).label;
    return {
      ok: false,
      reason: "fleet",
      requiredTier,
      missingTokens,
      missingHours,
      label: `Needs a tier-${requiredTier} ${tierLabel} rig`,
      short: `Needs a tier-${requiredTier} rig`,
      tab: "compute",
    };
  }

  if (!projection.tokensOk) {
    return {
      ok: false,
      reason: "tokens",
      requiredTier,
      missingTokens,
      missingHours,
      label: `Needs ${tokens(missingTokens)} more ${capability.label.toLowerCase()} tokens`,
      short: `Needs ${tokens(missingTokens)} more tokens`,
      tab: "models",
    };
  }

  if (missingHours > 0) {
    const shortfall = `${missingHours.toFixed(1)}h`;
    return {
      ok: false,
      reason: "compute",
      requiredTier,
      missingTokens,
      missingHours,
      label: `Needs ${shortfall} more compute`,
      short: `Needs ${shortfall} more compute`,
      tab: "compute",
    };
  }

  return {
    ok: true,
    reason: null,
    requiredTier,
    missingTokens: 0,
    missingHours: 0,
    label: "",
    short: "",
    tab: "compute",
  };
}

/* ============================================================
   Sorting / ranking
   ============================================================ */

/** Payout per pool-hour this rig would reserve. */
export function payoutPerHour(projection: BuildProjection): number {
  return projection.billedHours > 0
    ? projection.payout / projection.billedHours
    : 0;
}

export function sortRows(rows: ProjectRow[], key: SortKey): ProjectRow[] {
  const sorted = [...rows];

  switch (key) {
    case "pay":
      sorted.sort(
        (a, b) =>
          b.projection.payout - a.projection.payout ||
          a.def.title.localeCompare(b.def.title),
      );
      break;
    case "quick":
      sorted.sort(
        (a, b) =>
          a.projection.seconds - b.projection.seconds ||
          b.projection.payout - a.projection.payout,
      );
      break;
    case "perHour":
      sorted.sort(
        (a, b) =>
          payoutPerHour(b.projection) - payoutPerHour(a.projection) ||
          b.projection.payout - a.projection.payout,
      );
      break;
    case "easiest":
      sorted.sort(
        (a, b) =>
          a.def.difficulty - b.def.difficulty ||
          b.projection.payout - a.projection.payout,
      );
      break;
    case "az":
      sorted.sort((a, b) => a.def.title.localeCompare(b.def.title));
      break;
  }

  return sorted;
}

/* ============================================================
   Phase mix (deterministic flourish)
   ============================================================ */

export const PHASE_LABELS: string[] = [
  "Scope",
  "Draft",
  "Build",
  "Review",
  "Polish",
  "Ship",
];

/**
 * A stable, per-contract effort curve. Seeded off the project id so the bar
 * chart is identical on the server, on the client, and on every re-render.
 */
export function phaseShape(def: ProjectDef): number[] {
  const last = PHASE_LABELS.length - 1;
  return PHASE_LABELS.map((phase, index) => {
    const noise = seeded(`${def.id}:${phase}`);
    const ramp = 0.45 + (index / Math.max(1, last)) * 0.55;
    const weight = 0.7 + def.difficulty * 0.06;
    return Math.round((0.4 + noise * 0.6) * ramp * weight * 1000) / 1000;
  });
}
