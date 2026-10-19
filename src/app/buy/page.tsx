"use client";

import { useEffect, useMemo, useState } from "react";

import { BalanceStrip } from "@/components/buy/BalanceStrip";
import { ModelCard } from "@/components/buy/ModelCard";
import { ModelDetailModal } from "@/components/buy/ModelDetailModal";
import { RigCard } from "@/components/buy/RigCard";
import { RigDetailModal } from "@/components/buy/RigDetailModal";
import { BuyToast, type Flash } from "@/components/buy/Toast";
import { capabilityIcon, capabilityLabel } from "@/components/buy/util";
import { PageHeader } from "@/components/layout/PageHeader";
import { Pill } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  SearchInput,
  SegmentedControl,
  Tabs,
  Toggle,
} from "@/components/ui/Controls";
import { Icon } from "@/components/ui/Icon";
import {
  COMPUTE_BY_ID,
  COMPUTE_PLANS,
  COMPUTE_TIER_META,
  speedMultiplier,
} from "@/data/compute";
import {
  CAPABILITY_META,
  MODEL_BY_ID,
  MODELS,
  MODEL_TIER_META,
  blendedPricePer1M,
} from "@/data/models";
import { cn } from "@/lib/cn";
import {
  LOW_BALANCE_THRESHOLD,
  planById,
  planEfficiency,
  planHourCost,
} from "@/lib/economy";
import { money2, titleCase } from "@/lib/format";
import { useClientValue, useHydrated } from "@/lib/hooks";
import { type FailReason, useSim } from "@/lib/store";
import type { Capability, FleetTier, GPUClass, ModelTier } from "@/lib/types";

/* ============================================================
   Filter / sort vocabulary
   ============================================================ */

const TAB_IDS = ["models", "compute"] as const;
type TabId = (typeof TAB_IDS)[number];

const MODEL_SORT_IDS = ["value", "cheap", "quality", "fast", "az"] as const;
type ModelSortId = (typeof MODEL_SORT_IDS)[number];

const RIG_SORT_IDS = ["value", "cheap", "fast", "reliable", "az"] as const;
type RigSortId = (typeof RIG_SORT_IDS)[number];

/** A "best value" model has to clear this quality index — otherwise it is just cheap. */
const QUALITY_FLOOR = 80;

const MODEL_SORTS: { id: ModelSortId; label: string }[] = [
  { id: "value", label: "Best value" },
  { id: "cheap", label: "Cheapest" },
  { id: "quality", label: "Highest quality" },
  { id: "fast", label: "Fastest" },
  { id: "az", label: "A–Z" },
];

const RIG_SORTS: { id: RigSortId; label: string }[] = [
  { id: "value", label: "Best value" },
  { id: "cheap", label: "Cheapest hourly" },
  { id: "fast", label: "Fastest" },
  { id: "reliable", label: "Most reliable" },
  { id: "az", label: "A–Z" },
];

/** Every capability key, in the order the metadata declares them. */
const CAPABILITIES = Object.keys(CAPABILITY_META) as Capability[];

const MODEL_TIERS: ModelTier[] = ["budget", "open", "frontier", "specialist"];
const FLEET_TIERS: FleetTier[] = [1, 2, 3, 4, 5];

/** Only the classes that actually appear in the catalog. */
const GPU_CLASSES: GPUClass[] = Array.from(
  new Set(COMPUTE_PLANS.map((plan) => plan.gpuClass)),
);

const MODEL_TIER_OPTIONS = [
  { id: "all", label: "All tiers" },
  ...MODEL_TIERS.map((tier) => ({
    id: tier as string,
    label: MODEL_TIER_META[tier]?.label ?? titleCase(tier),
  })),
];

const RIG_TIER_OPTIONS = [
  { id: "all", label: "All tiers" },
  ...FLEET_TIERS.map((tier) => ({
    id: String(tier),
    label: COMPUTE_TIER_META[tier]?.label ?? `Tier ${tier}`,
  })),
];

const GPU_CLASS_LABELS: Record<GPUClass, string> = {
  none: "CPU only",
  consumer: "Consumer",
  prosumer: "Prosumer",
  datacenter: "Datacenter",
  cluster: "Cluster",
};

/** Toast copy for a declined purchase — the store's own modal carries the detail. */
const REASON_TEXT: Record<FailReason, string> = {
  funds: "Your balance cannot cover that order.",
  compute: "That needs more compute hours than you hold.",
  tokens: "That needs more tokens than you hold.",
  fleet: "Your current rig is too weak for that.",
  "unknown-model": "That model is no longer in the catalog.",
  "unknown-plan": "That rig is no longer in the catalog.",
  "unknown-project": "That contract is no longer available.",
};

function isTabId(value: string): value is TabId {
  return (TAB_IDS as readonly string[]).includes(value);
}

/**
 * `?tab=compute` is deep-linked from the nav and the alert modals. Read it from
 * `location.search` on the client instead of `useSearchParams`, which would
 * force a Suspense boundary around this whole page.
 */
function requestedTabFromUrl(): TabId | null {
  if (typeof window === "undefined") return null;
  const requested = new URLSearchParams(window.location.search).get("tab");
  return requested && isTabId(requested) ? requested : null;
}

function isModelSort(value: string): value is ModelSortId {
  return (MODEL_SORT_IDS as readonly string[]).includes(value);
}

function isRigSort(value: string): value is RigSortId {
  return (RIG_SORT_IDS as readonly string[]).includes(value);
}

/* ============================================================
   Page
   ============================================================ */

export default function BuyPage() {
  const hydrated = useHydrated();

  const cash = useSim((s) => s.cash);
  const computeHours = useSim((s) => s.computeHours);
  const holdings = useSim((s) => s.holdings);
  const ownedModels = useSim((s) => s.ownedModels);
  const ownedPlans = useSim((s) => s.ownedPlans);
  const fleet = useSim((s) => s.fleet);
  const buyTokens = useSim((s) => s.buyTokens);
  const buyCompute = useSim((s) => s.buyCompute);
  const redeemBailout = useSim((s) => s.redeemBailout);

  const [manualTab, setManualTab] = useState<TabId | null>(null);
  const [flash, setFlash] = useState<Flash | null>(null);
  const [detailModelId, setDetailModelId] = useState<string | null>(null);
  const [detailPlanId, setDetailPlanId] = useState<string | null>(null);

  const [modelQuery, setModelQuery] = useState("");
  const [caps, setCaps] = useState<Capability[]>([]);
  const [modelTier, setModelTier] = useState("all");
  const [openOnly, setOpenOnly] = useState(false);
  const [modelSort, setModelSort] = useState<ModelSortId>("value");
  const [affordableOnly, setAffordableOnly] = useState(false);

  const [rigQuery, setRigQuery] = useState("");
  const [rigTier, setRigTier] = useState("all");
  const [gpuClasses, setGpuClasses] = useState<GPUClass[]>([]);
  const [rigSort, setRigSort] = useState<RigSortId>("value");

  /**
   * The URL seed is applied on the client only; a manual click wins from then
   * on. No effect, no cascading render.
   */
  const requestedTab = useClientValue(requestedTabFromUrl, null);
  const tab: TabId = manualTab ?? requestedTab ?? "models";
  const setTab = setManualTab;

  /** Auto-dismiss the purchase toast. */
  useEffect(() => {
    if (!flash) return;
    const id = window.setTimeout(() => setFlash(null), 2600);
    return () => window.clearTimeout(id);
  }, [flash]);

  const filteredModels = useMemo(() => {
    const needle = modelQuery.trim().toLowerCase();
    const list = MODELS.filter((model) => {
      if (needle) {
        const haystack =
          `${model.name} ${model.vendor} ${model.family}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      if (openOnly && !model.isOpenSource) return false;
      if (modelTier !== "all" && model.tier !== modelTier) return false;
      if (
        caps.length > 0 &&
        !model.capabilities.some((capability) => caps.includes(capability))
      ) {
        return false;
      }
      if (affordableOnly && !model.packs.some((pack) => pack.price <= cash)) {
        return false;
      }
      return true;
    });

    const sorted = [...list];
    switch (modelSort) {
      case "cheap":
        sorted.sort((a, b) => blendedPricePer1M(a) - blendedPricePer1M(b));
        break;
      case "quality":
        sorted.sort((a, b) => b.quality - a.quality || b.speed - a.speed);
        break;
      case "fast":
        sorted.sort((a, b) => b.speed - a.speed || b.quality - a.quality);
        break;
      case "az":
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "value":
      default:
        sorted.sort((a, b) => {
          const rankA = a.quality >= QUALITY_FLOOR ? 0 : 1;
          const rankB = b.quality >= QUALITY_FLOOR ? 0 : 1;
          return rankA - rankB || blendedPricePer1M(a) - blendedPricePer1M(b);
        });
        break;
    }
    return sorted;
  }, [modelQuery, openOnly, modelTier, caps, affordableOnly, cash, modelSort]);

  const filteredPlans = useMemo(() => {
    const needle = rigQuery.trim().toLowerCase();
    const list = COMPUTE_PLANS.filter((plan) => {
      if (needle) {
        const haystack =
          `${plan.name} ${plan.provider} ${plan.gpu ?? "cpu"} ${plan.gpuClass} ${plan.regions.join(" ")}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      if (rigTier !== "all" && String(plan.tier) !== rigTier) return false;
      if (gpuClasses.length > 0 && !gpuClasses.includes(plan.gpuClass)) {
        return false;
      }
      if (affordableOnly && planHourCost(plan, 1) > cash) return false;
      return true;
    });

    const sorted = [...list];
    switch (rigSort) {
      case "cheap":
        sorted.sort((a, b) => a.pricePerHour - b.pricePerHour);
        break;
      case "fast":
        sorted.sort((a, b) => speedMultiplier(b) - speedMultiplier(a));
        break;
      case "reliable":
        sorted.sort(
          (a, b) =>
            b.reliability - a.reliability ||
            speedMultiplier(b) - speedMultiplier(a),
        );
        break;
      case "az":
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "value":
      default:
        sorted.sort((a, b) => planEfficiency(a) - planEfficiency(b));
        break;
    }
    return sorted;
  }, [rigQuery, rigTier, gpuClasses, affordableOnly, cash, rigSort]);

  const detailModel = detailModelId ? MODEL_BY_ID[detailModelId] ?? null : null;
  const detailPlan = detailPlanId ? COMPUTE_BY_ID[detailPlanId] ?? null : null;
  const fleetPlan = planById(fleet.planId);
  const fleetSpeed = speedMultiplier(fleet);
  const low = cash < LOW_BALANCE_THRESHOLD;

  const handleBuyPack = (modelId: string, packId: string) => {
    const result = buyTokens(modelId, packId);
    setFlash(
      result.ok
        ? { kind: "ok", text: result.message ?? "Tokens added to your pool." }
        : { kind: "err", text: result.message ?? REASON_TEXT[result.reason] },
    );
  };

  const handleBuyCompute = (planId: string, hrs: number) => {
    const result = buyCompute(planId, hrs);
    setFlash(
      result.ok
        ? { kind: "ok", text: result.message ?? "Compute hours added." }
        : { kind: "err", text: result.message ?? REASON_TEXT[result.reason] },
    );
  };

  const toggleCapability = (capability: Capability) => {
    setCaps((prev) =>
      prev.includes(capability)
        ? prev.filter((item) => item !== capability)
        : [...prev, capability],
    );
  };

  const toggleGpuClass = (gpuClass: GPUClass) => {
    setGpuClasses((prev) =>
      prev.includes(gpuClass)
        ? prev.filter((item) => item !== gpuClass)
        : [...prev, gpuClass],
    );
  };

  const resetModelFilters = () => {
    setModelQuery("");
    setCaps([]);
    setModelTier("all");
    setOpenOnly(false);
    setAffordableOnly(false);
    setModelSort("value");
  };

  const resetRigFilters = () => {
    setRigQuery("");
    setRigTier("all");
    setGpuClasses([]);
    setAffordableOnly(false);
    setRigSort("value");
  };

  if (!hydrated) return <StorefrontSkeleton />;

  return (
    <div className="flex flex-col">
      <PageHeader
        eyebrow="Storefront"
        title="Buy credits"
        subtitle="Money buys exactly two things here: model tokens to burn on a build, and compute hours to run it on. Prices are fixed, delivery is instant, and none of it is real."
        icon="ShoppingCart"
        accent="#7c5cff"
        actions={
          <>
            <div
              className={cn(
                "flex flex-col items-end rounded-xl border px-3 py-1.5",
                low
                  ? "border-ember-400/50 bg-ember-500/10"
                  : "border-abyss-500/50 bg-abyss-800/60",
              )}
            >
              <span className="text-[9px] uppercase tracking-[0.14em] text-fog-500">
                Balance
              </span>
              <span
                className={cn(
                  "num text-sm font-semibold",
                  low ? "text-ember-400" : "text-mint-300",
                )}
              >
                {money2(cash)}
              </span>
            </div>
            <Button
              variant="success"
              leftIcon={<Icon name="Gift" size={15} />}
              onClick={redeemBailout}
            >
              Free Redeem
            </Button>
          </>
        }
      />

      <BalanceStrip
        cash={cash}
        computeHours={computeHours}
        holdings={holdings}
        modelsOwned={ownedModels.length}
        rigsOwned={ownedPlans.length}
      />

      <Tabs
        tabs={[
          {
            id: "models",
            label: "Model tokens",
            count: MODELS.length,
            icon: "Coins",
          },
          {
            id: "compute",
            label: "Compute hours",
            count: COMPUTE_PLANS.length,
            icon: "Cpu",
          },
        ]}
        value={tab}
        onChange={(id) => {
          if (isTabId(id)) setTab(id);
        }}
        className="mb-5 max-w-md"
      />

      {tab === "models" ? (
        <>
          <Card className="mb-5 p-3 sm:p-4">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
                <SearchInput
                  value={modelQuery}
                  onChange={setModelQuery}
                  placeholder="Search name, vendor or family"
                  className="lg:max-w-xs"
                />
                <SegmentedControl
                  options={MODEL_TIER_OPTIONS}
                  value={modelTier}
                  onChange={setModelTier}
                />
                <Toggle
                  checked={affordableOnly}
                  onChange={setAffordableOnly}
                  label="Only what I can afford"
                  className="lg:ml-auto"
                />
              </div>

              <div className="flex flex-wrap items-center gap-1.5 border-t border-abyss-600/40 pt-3">
                <span className="mr-1 text-[10px] uppercase tracking-wider text-fog-500">
                  Capability
                </span>
                <Pill active={caps.length === 0} onClick={() => setCaps([])}>
                  All
                </Pill>
                {CAPABILITIES.map((capability) => (
                  <Pill
                    key={capability}
                    active={caps.includes(capability)}
                    icon={<Icon name={capabilityIcon(capability)} size={12} />}
                    onClick={() => toggleCapability(capability)}
                  >
                    {capabilityLabel(capability)}
                  </Pill>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-abyss-600/40 pt-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wider text-fog-500">
                    Sort
                  </span>
                  <SegmentedControl
                    options={MODEL_SORTS}
                    value={modelSort}
                    onChange={(id) => {
                      if (isModelSort(id)) setModelSort(id);
                    }}
                  />
                </div>
                <Toggle
                  checked={openOnly}
                  onChange={setOpenOnly}
                  label="Open weights only"
                />
              </div>
            </div>
          </Card>

          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-fog-400">
            <span>
              Showing{" "}
              <span className="num text-fog-100">{filteredModels.length}</span>{" "}
              of <span className="num text-fog-100">{MODELS.length}</span> models
            </span>
            {caps.length > 0 || openOnly || modelQuery ? (
              <button
                type="button"
                onClick={resetModelFilters}
                className="text-[11px] text-iris-300 transition-colors hover:text-iris-200"
              >
                Clear filters
              </button>
            ) : null}
          </div>

          {filteredModels.length === 0 ? (
            <Card className="animate-rise">
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <span className="grid h-11 w-11 place-items-center rounded-xl border border-abyss-500/50 bg-abyss-800/60 text-fog-400">
                  <Icon name="Search" size={18} />
                </span>
                <div>
                  <p className="text-sm font-medium text-fog-100">
                    No models match those filters
                  </p>
                  <p className="mt-1 text-xs text-fog-400">
                    Loosen the capability or tier filters, or clear the search
                    box.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetModelFilters}
                  leftIcon={<Icon name="RotateCcw" size={14} />}
                >
                  Reset filters
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredModels.map((model, index) => (
                <ModelCard
                  key={model.id}
                  model={model}
                  cash={cash}
                  held={holdings[model.id]?.tokens ?? 0}
                  index={index}
                  onOpen={() => setDetailModelId(model.id)}
                  onBuyPack={(packId) => handleBuyPack(model.id, packId)}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <Card className="mb-5 p-3 sm:p-4">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
                <SearchInput
                  value={rigQuery}
                  onChange={setRigQuery}
                  placeholder="Search provider, GPU or region"
                  className="lg:max-w-xs"
                />
                <SegmentedControl
                  options={RIG_TIER_OPTIONS}
                  value={rigTier}
                  onChange={setRigTier}
                />
                <Toggle
                  checked={affordableOnly}
                  onChange={setAffordableOnly}
                  label="Only what I can afford"
                  className="lg:ml-auto"
                />
              </div>

              <div className="flex flex-wrap items-center gap-1.5 border-t border-abyss-600/40 pt-3">
                <span className="mr-1 text-[10px] uppercase tracking-wider text-fog-500">
                  GPU class
                </span>
                <Pill
                  active={gpuClasses.length === 0}
                  onClick={() => setGpuClasses([])}
                >
                  All
                </Pill>
                {GPU_CLASSES.map((gpuClass) => (
                  <Pill
                    key={gpuClass}
                    active={gpuClasses.includes(gpuClass)}
                    onClick={() => toggleGpuClass(gpuClass)}
                  >
                    {GPU_CLASS_LABELS[gpuClass]}
                  </Pill>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-abyss-600/40 pt-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wider text-fog-500">
                    Sort
                  </span>
                  <SegmentedControl
                    options={RIG_SORTS}
                    value={rigSort}
                    onChange={(id) => {
                      if (isRigSort(id)) setRigSort(id);
                    }}
                  />
                </div>
                <span className="text-[11px] text-fog-500">
                  Affordability is checked against a single hour.
                </span>
              </div>
            </div>
          </Card>

          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-fog-400">
            <span>
              Showing{" "}
              <span className="num text-fog-100">{filteredPlans.length}</span> of{" "}
              <span className="num text-fog-100">{COMPUTE_PLANS.length}</span> rigs
            </span>
            {gpuClasses.length > 0 || rigQuery || rigTier !== "all" ? (
              <button
                type="button"
                onClick={resetRigFilters}
                className="text-[11px] text-iris-300 transition-colors hover:text-iris-200"
              >
                Clear filters
              </button>
            ) : null}
          </div>

          {filteredPlans.length === 0 ? (
            <Card className="animate-rise">
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <span className="grid h-11 w-11 place-items-center rounded-xl border border-abyss-500/50 bg-abyss-800/60 text-fog-400">
                  <Icon name="Search" size={18} />
                </span>
                <div>
                  <p className="text-sm font-medium text-fog-100">
                    No rigs match those filters
                  </p>
                  <p className="mt-1 text-xs text-fog-400">
                    Try another tier or GPU class, or clear the search box.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetRigFilters}
                  leftIcon={<Icon name="RotateCcw" size={14} />}
                >
                  Reset filters
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredPlans.map((plan, index) => (
                <RigCard
                  key={plan.id}
                  plan={plan}
                  cash={cash}
                  fleetPlanId={fleet.planId}
                  fleetSpeed={fleetSpeed}
                  index={index}
                  onOpen={() => setDetailPlanId(plan.id)}
                  onBuy={(hrs) => handleBuyCompute(plan.id, hrs)}
                />
              ))}
            </div>
          )}
        </>
      )}

      <ModelDetailModal
        model={detailModel}
        cash={cash}
        held={detailModel ? holdings[detailModel.id]?.tokens ?? 0 : 0}
        onClose={() => setDetailModelId(null)}
        onBuyPack={handleBuyPack}
      />

      <RigDetailModal
        plan={detailPlan}
        fleetPlan={fleetPlan}
        fleetName={fleet.name}
        fleetSpeed={fleetSpeed}
        cash={cash}
        onClose={() => setDetailPlanId(null)}
        onBuy={(hrs) => {
          if (detailPlan) handleBuyCompute(detailPlan.id, hrs);
        }}
      />

      <BuyToast flash={flash} onDismiss={() => setFlash(null)} />
    </div>
  );
}

/* ============================================================
   Hydration skeleton
   ============================================================ */

function StorefrontSkeleton() {
  return (
    <div
      className="flex flex-col gap-5"
      aria-busy="true"
      aria-label="Loading the storefront"
    >
      <div className="panel h-36 overflow-hidden p-5">
        <div className="sheen h-full w-full rounded-xl opacity-25" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((key) => (
          <div key={key} className="panel h-24 overflow-hidden p-4">
            <div className="sheen h-full w-full rounded-lg opacity-20" />
          </div>
        ))}
      </div>
      <div className="panel h-14 overflow-hidden p-2">
        <div className="sheen h-full w-72 rounded-lg opacity-15" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((key) => (
          <div key={key} className="panel h-72 overflow-hidden p-4">
            <div className="sheen h-full w-full rounded-lg opacity-15" />
          </div>
        ))}
      </div>
    </div>
  );
}
