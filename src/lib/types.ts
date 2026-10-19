/**
 * MCP Simulator — shared type contracts.
 *
 * This file is the single source of truth for every data catalog, the
 * economy engine and the UI. Catalogs import from here; nothing here
 * imports from a catalog (no cycles).
 */

/* ============================================================
   Models
   ============================================================ */

export type Capability =
  | "text"
  | "reasoning"
  | "coding"
  | "vision"
  | "image"
  | "video"
  | "audio"
  | "embedding"
  | "math"
  | "long-context"
  | "agentic";

export type ModelTier = "budget" | "open" | "frontier" | "specialist";

export interface TokenPack {
  /** Stable id, unique across the whole catalog. */
  id: string;
  name: string;
  /** Tokens granted (input+output blended "credits"). */
  tokens: number;
  /** Price in USD. */
  price: number;
  /** Optional % bonus tokens on top. */
  bonusPct?: number;
  badge?: string;
}

export interface ModelDef {
  id: string;
  name: string;
  vendor: string;
  family: string;
  tier: ModelTier;
  tagline: string;
  description: string;
  capabilities: Capability[];
  /** Context window in tokens. */
  contextWindow: number;
  /** 0–100 quality index (drives payout multiplier). */
  quality: number;
  /** 0–100 throughput index. */
  speed: number;
  /** USD per 1M input tokens. */
  inputPricePer1M: number;
  /** USD per 1M output tokens. */
  outputPricePer1M: number;
  packs: TokenPack[];
  /** Hex accent used for card theming. */
  accent: string;
  releaseYear: number;
  license: string;
  isOpenSource: boolean;
  badge?: string;
}

/* ============================================================
   Compute
   ============================================================ */

export type ComputeKind = "gpu" | "cpu" | "serverless" | "cluster";

export type GPUClass =
  | "none"
  | "consumer"
  | "prosumer"
  | "datacenter"
  | "cluster";

/** Fleet tier: 1 = potato, 5 = hyperscale. */
export type FleetTier = 1 | 2 | 3 | 4 | 5;

export interface ComputePlan {
  id: string;
  name: string;
  provider: string;
  kind: ComputeKind;
  /** GPU name, or null for CPU-only plans. */
  gpu: string | null;
  gpuCount: number;
  /** Total VRAM in GB (0 for CPU-only). */
  vram: number;
  vcpus: number;
  /** System RAM in GB. */
  ram: number;
  /** Peak fp16 tensor throughput in TFLOPS. Drives build speed. */
  tflops: number;
  tier: FleetTier;
  gpuClass: GPUClass;
  tagline: string;
  description: string;
  /** USD per compute hour. */
  pricePerHour: number;
  regions: string[];
  billing: "hourly" | "per-second" | "spot" | "monthly";
  /** 0–100 uptime/consistency index. */
  reliability: number;
  /** Hour bundles purchasable. */
  hourOptions: number[];
  accent: string;
  badge?: string;
}

/* ============================================================
   Projects (the "Make" catalog)
   ============================================================ */

export type ProjectCategory =
  | "web"
  | "mobile"
  | "game"
  | "ai"
  | "data"
  | "infra"
  | "design"
  | "media"
  | "research"
  | "business";

export interface ProjectDef {
  id: string;
  title: string;
  category: ProjectCategory;
  /** Key into the icon registry in `components/ui/Icon.tsx`. */
  icon: string;
  tagline: string;
  description: string;
  /** Concrete deliverables, rendered as a checklist. */
  tasks: string[];
  /** Base payout in USD before multipliers. */
  payment: number;
  /** Compute hours consumed by the run. */
  computeHours: number;
  /** Tokens consumed by the run. */
  tokenCost: number;
  /** Model capability the run needs tokens from. */
  capability: Capability;
  /** Real-world seconds the run takes at 1.0x speed. */
  baseSeconds: number;
  difficulty: 1 | 2 | 3 | 4 | 5;
  /** Minimum fleet tier required to attempt. */
  minFleetTier: FleetTier;
  accent: string;
  badge?: string;
}

/* ============================================================
   Runtime / simulation state
   ============================================================ */

export type BuildStatus = "running" | "done" | "failed" | "cancelled";

export interface BuildRun {
  /** Unique run id. */
  id: string;
  projectId: string;
  status: BuildStatus;
  /** Epoch ms. */
  startedAt: number;
  /** Epoch ms when it lands. */
  endsAt: number;
  /** Total wall-clock seconds at the speed in effect when it launched. */
  durationSeconds: number;
  /** The project's compute *load* in workload-hours (speed-independent). */
  workloadHours: number;
  /** Compute hours actually reserved from the pool at launch (load / speed). */
  billedHours: number;
  /** Reserved hours burned so far; `billedHours - hoursConsumed` is still in use. */
  hoursConsumed: number;
  /** Tokens consumed up front at launch. */
  tokensConsumed: number;
  /** Model pools tapped, in consumption order. */
  tokenSources: { modelId: string; tokens: number }[];
  /** Frozen multipliers at launch. */
  speedMultiplier: number;
  payoutMultiplier: number;
  /** Final payout, credited on completion. */
  payout: number;
  fleetTierAtLaunch: FleetTier;
  label: string;
  /** Decided at launch, revealed at completion. Spot capacity is not forever. */
  willFail: boolean;
}

export type TxKind =
  | "grant"
  | "purchase-model"
  | "purchase-compute"
  | "build"
  | "project-payout"
  | "bailout"
  | "penalty";

export interface Tx {
  id: string;
  kind: TxKind;
  /** Signed USD delta. Negative = spent. */
  amount: number;
  label: string;
  detail?: string;
  at: number;
}

export interface TokenHolding {
  modelId: string;
  tokens: number;
  /** Cumulative USD spent acquiring this pool. */
  spent: number;
}

export type ModalKind =
  | "low-balance"
  | "insufficient-funds"
  | "insufficient-compute"
  | "insufficient-tokens"
  | "fleet-too-weak"
  | "redeem-success"
  | "welcome"
  | null;

export interface AlertState {
  kind: ModalKind;
  title?: string;
  message?: string;
  /** Project the user was trying to launch, if any. */
  projectId?: string;
  /** USD the action needed. */
  needed?: number;
  /** Hours the action needed. */
  neededHours?: number;
  /** Tokens the action needed. */
  neededTokens?: number;
}

export interface SimState {
  version: number;
  /** Simulated boot time, used for deterministic seeding. */
  bootedAt: number;

  cash: number;
  computeHours: number;

  holdings: Record<string, TokenHolding>;

  /** Best fleet the player has ever owned. Drives build speed. */
  fleet: {
    /** Compute plan id of the current flagship rig. */
    planId: string | null;
    name: string;
    tier: FleetTier;
    tflops: number;
    vcpus: number;
    vram: number;
    gpu: string | null;
  };

  runs: BuildRun[];
  history: Tx[];

  stats: {
    totalEarned: number;
    totalSpent: number;
    tokensBought: number;
    tokensBurned: number;
    hoursBought: number;
    hoursBurned: number;
    runsStarted: number;
    runsCompleted: number;
    runsFailed: number;
    bailouts: number;
    modelsOwned: number;
    plansOwned: number;
  };

  /** Project ids the player has already shipped at least once. */
  completed: Record<string, number>;
  /** Compute plan ids ever purchased. */
  ownedPlans: string[];
  /** Model ids ever purchased. */
  ownedModels: string[];

  alert: AlertState | null;
  /** Set true once the welcome overlay is dismissed. */
  welcomed: boolean;
}
