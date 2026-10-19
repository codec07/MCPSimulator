"use client";

/**
 * The single source of truth for the simulation.
 *
 * Nothing here talks to a server: the whole simulation is client-side and
 * persisted to localStorage, which is why the app needs no account.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import { COMPUTE_BY_ID, speedMultiplier } from "@/data/compute";
import { MODEL_BY_ID, blendedPricePer1M } from "@/data/models";
import { PROJECT_BY_ID } from "@/data/projects";
import {
  BAILOUT_CASH,
  BAILOUT_HOURS,
  LOW_BALANCE_THRESHOLD,
  STARTING_CASH,
  STARTING_COMPUTE_HOURS,
  STOCK_FLEET,
  STATE_VERSION,
  clamp,
  planHourCost,
  projectionOf,
  round2,
} from "./economy";
import type {
  AlertState,
  BuildRun,
  FleetTier,
  SimState,
  Tx,
  TxKind,
} from "./types";

/* ============================================================
   Result types
   ============================================================ */

export type FailReason =
  | "funds"
  | "compute"
  | "tokens"
  | "fleet"
  | "unknown-model"
  | "unknown-plan"
  | "unknown-project";

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; reason: FailReason; message?: string };

/* ============================================================
   Helpers
   ============================================================ */

let idCounter = 0;
function newId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}${idCounter.toString(36)}`;
}

/** Failure risk from a rig's uptime record. Spot iron is cheap for a reason. */
function failureRisk(reliability: number): number {
  return clamp(((100 - reliability) / 100) * 0.28, 0.004, 0.22);
}

function initialState(): SimState {
  return {
    version: STATE_VERSION,
    bootedAt: Date.now(),
    cash: STARTING_CASH,
    computeHours: STARTING_COMPUTE_HOURS,
    holdings: {},
    fleet: { ...STOCK_FLEET },
    runs: [],
    history: [
      {
        id: newId("tx"),
        kind: "grant",
        amount: STARTING_CASH,
        label: "Starting grant",
        detail: "$100 play-money float and 10 free compute hours",
        at: Date.now(),
      },
    ],
    stats: {
      totalEarned: 0,
      totalSpent: 0,
      tokensBought: 0,
      tokensBurned: 0,
      hoursBought: 0,
      hoursBurned: 0,
      runsStarted: 0,
      runsCompleted: 0,
      runsFailed: 0,
      bailouts: 0,
      modelsOwned: 0,
      plansOwned: 0,
    },
    completed: {},
    ownedPlans: [],
    ownedModels: [],
    alert: null,
    welcomed: false,
  };
}

/* ============================================================
   Store
   ============================================================ */

export interface SimStore extends SimState {
  /** True once localStorage has been read. Guards SSR mismatches. */
  hydrated: boolean;

  /** Settles finished runs and advances the clock. Safe to call often. */
  tick: () => void;
  buyTokens: (modelId: string, packId: string) => ActionResult;
  buyCompute: (planId: string, hours: number) => ActionResult;
  startBuild: (projectId: string) => ActionResult;
  cancelBuild: (runId: string) => ActionResult;
  redeemBailout: () => void;
  setAlert: (alert: AlertState) => void;
  clearAlert: () => void;
  dismissWelcome: () => void;
  resetSim: () => void;
}

function tx(
  kind: TxKind,
  amount: number,
  label: string,
  detail?: string,
): Tx {
  return { id: newId("tx"), kind, amount: round2(amount), label, detail, at: Date.now() };
}

const MAX_HISTORY = 140;

/** Non-serialisable keys and the hydration flag never go to localStorage. */
const PERSIST_SKIP: readonly string[] = [
  "hydrated",
  "tick",
  "buyTokens",
  "buyCompute",
  "startBuild",
  "cancelBuild",
  "redeemBailout",
  "setAlert",
  "clearAlert",
  "dismissWelcome",
  "resetSim",
];

function pushHistory(history: Tx[], entry: Tx): Tx[] {
  return [entry, ...history].slice(0, MAX_HISTORY);
}

export const useSim = create<SimStore>()(
  persist(
    (set, get) => ({
      ...initialState(),
      hydrated: false,

      /* ---------------------------------------------------- */
      /* Clock: settle any run whose time is up               */
      /* ---------------------------------------------------- */
      tick: () => {
        const state = get();
        const now = Date.now();
        const finished = state.runs.filter(
          (r) => r.status === "running" && now >= r.endsAt,
        );
        if (!finished.length) return;

        let cash = state.cash;
        let history = state.history;
        const stats = { ...state.stats };
        const completed = { ...state.completed };
        const ownedPlans = [...state.ownedPlans];
        const ownedModels = [...state.ownedModels];

        const runs = state.runs.map((run) => {
          if (!finished.some((f) => f.id === run.id)) return run;

          if (run.willFail) {
            // Spot capacity evaporated. Partial delivery, compute released.
            const partial = round2(run.payout * 0.3);
            cash = round2(cash + partial);
            stats.runsFailed += 1;
            stats.totalEarned = round2(stats.totalEarned + partial);
            history = pushHistory(
              history,
              tx(
                "penalty",
                partial,
                `${run.label} — partial delivery`,
                `Run failed on ${run.fleetTierAtLaunch >= 4 ? "high-tier" : "spot"} capacity. 30% of payout credited, compute released.`,
              ),
            );
            return {
              ...run,
              status: "failed" as const,
              hoursConsumed: run.billedHours,
            };
          }

          cash = round2(cash + run.payout);
          stats.runsCompleted += 1;
          stats.totalEarned = round2(stats.totalEarned + run.payout);
          completed[run.projectId] = (completed[run.projectId] ?? 0) + 1;
          history = pushHistory(
            history,
            tx(
              "project-payout",
              run.payout,
              `Shipped: ${run.label}`,
              `${run.tokenSources.length} token pool${run.tokenSources.length === 1 ? "" : "s"} · ${run.billedHours.toFixed(1)}h compute`,
            ),
          );
          return {
            ...run,
            status: "done" as const,
            hoursConsumed: run.billedHours,
          };
        });

        // Keep only the most recent resolved runs so storage stays small.
        const resolved = runs.filter((r) => r.status !== "running").length;
        const trimmed =
          resolved > 40
            ? runs.filter((r) => r.status === "running").concat(
                runs.filter((r) => r.status !== "running").slice(0, 40),
              )
            : runs;

        set({
          cash,
          runs: trimmed,
          history,
          stats,
          completed,
          ownedPlans,
          ownedModels,
        });
      },

      /* ---------------------------------------------------- */
      /* Buying model tokens                                  */
      /* ---------------------------------------------------- */
      buyTokens: (modelId, packId) => {
        const state = get();
        const model = MODEL_BY_ID[modelId];
        if (!model) return { ok: false, reason: "unknown-model" };
        const pack = model.packs.find((p) => p.id === packId);
        if (!pack) return { ok: false, reason: "unknown-model" };

        if (state.cash < pack.price) {
          set({
            alert: {
              kind: "insufficient-funds",
              title: "Balance too low",
              message: `That ${pack.name} pack for ${model.name} costs $${pack.price.toFixed(
                2,
              )}, but you only have $${state.cash.toFixed(2)} available.`,
              needed: pack.price,
            },
          });
          return { ok: false, reason: "funds" };
        }

        const bonus = pack.bonusPct ?? 0;
        const granted = Math.round(pack.tokens * (1 + bonus / 100));

        const prev = state.holdings[modelId] ?? { modelId, tokens: 0, spent: 0 };
        const cash = round2(state.cash - pack.price);

        const history = pushHistory(
          state.history,
          tx(
            "purchase-model",
            -pack.price,
            `${model.name} — ${pack.name}`,
            `${granted.toLocaleString("en-US")} tokens${bonus ? ` (+${bonus}% bonus)` : ""}`,
          ),
        );

        set({
          cash,
          holdings: {
            ...state.holdings,
            [modelId]: {
              modelId,
              tokens: prev.tokens + granted,
              spent: round2(prev.spent + pack.price),
            },
          },
          ownedModels: state.ownedModels.includes(modelId)
            ? state.ownedModels
            : [...state.ownedModels, modelId],
          history,
          stats: {
            ...state.stats,
            totalSpent: round2(state.stats.totalSpent + pack.price),
            tokensBought: state.stats.tokensBought + granted,
            modelsOwned: state.ownedModels.includes(modelId)
              ? state.ownedModels.length
              : state.ownedModels.length + 1,
          },
          alert:
            cash < LOW_BALANCE_THRESHOLD
              ? {
                  kind: "low-balance",
                  title: "Running on fumes",
                  message: `You have $${cash.toFixed(
                    2,
                  )} left. Ship something, or redeem a free top-up to keep building.`,
                  needed: LOW_BALANCE_THRESHOLD,
                }
              : null,
        });
        return { ok: true, message: `+${granted.toLocaleString("en-US")} tokens` };
      },

      /* ---------------------------------------------------- */
      /* Buying compute hours                                 */
      /* ---------------------------------------------------- */
      buyCompute: (planId, hours) => {
        const state = get();
        const plan = COMPUTE_BY_ID[planId];
        if (!plan) return { ok: false, reason: "unknown-plan" };
        if (hours <= 0) return { ok: false, reason: "unknown-plan" };

        const cost = planHourCost(plan, hours);
        if (state.cash < cost) {
          set({
            alert: {
              kind: "insufficient-funds",
              title: "Balance too low",
              message: `${hours}h on ${plan.name} costs $${cost.toFixed(
                2,
              )}, but you only have $${state.cash.toFixed(2)} available.`,
              needed: cost,
            },
          });
          return { ok: false, reason: "funds" };
        }

        const cash = round2(state.cash - cost);
        const currentSpeed = speedMultiplier(state.fleet);
        const candidateSpeed = speedMultiplier(plan);
        const upgrade = candidateSpeed > currentSpeed;

        const fleet = upgrade
          ? {
              planId: plan.id,
              name: plan.name,
              tier: plan.tier as FleetTier,
              tflops: plan.tflops,
              vcpus: plan.vcpus,
              vram: plan.vram,
              gpu: plan.gpu,
            }
          : state.fleet;

        const history = pushHistory(
          state.history,
          tx(
            "purchase-compute",
            -cost,
            `${hours}h on ${plan.name}`,
            upgrade
              ? `New flagship rig — ${candidateSpeed.toFixed(2)}x throughput (was ${currentSpeed.toFixed(2)}x)`
              : `${plan.provider} · ${speedMultiplier(plan).toFixed(2)}x throughput`,
          ),
        );

        set({
          cash,
          computeHours: round2(state.computeHours + hours),
          fleet,
          ownedPlans: state.ownedPlans.includes(planId)
            ? state.ownedPlans
            : [...state.ownedPlans, planId],
          history,
          stats: {
            ...state.stats,
            totalSpent: round2(state.stats.totalSpent + cost),
            hoursBought: round2(state.stats.hoursBought + hours),
            plansOwned: state.ownedPlans.includes(planId)
              ? state.ownedPlans.length
              : state.ownedPlans.length + 1,
          },
          alert:
            cash < LOW_BALANCE_THRESHOLD
              ? {
                  kind: "low-balance",
                  title: "Running on fumes",
                  message: `You have $${cash.toFixed(
                    2,
                  )} left. Ship something, or redeem a free top-up to keep building.`,
                  needed: LOW_BALANCE_THRESHOLD,
                }
              : null,
        });
        return { ok: true, message: `+${hours}h compute` };
      },

      /* ---------------------------------------------------- */
      /* Launching a build                                    */
      /* ---------------------------------------------------- */
      startBuild: (projectId) => {
        const state = get();
        const def = PROJECT_BY_ID[projectId];
        if (!def) return { ok: false, reason: "unknown-project" };

        if (state.fleet.tier < def.minFleetTier) {
          set({
            alert: {
              kind: "fleet-too-weak",
              title: "Your rig can't handle this",
              message: `${def.title} needs a tier ${def.minFleetTier} fleet or better. You're running "${state.fleet.name}" (tier ${state.fleet.tier}).`,
              projectId,
            },
          });
          return { ok: false, reason: "fleet" };
        }

        const p = projectionOf(def, state.fleet, state.holdings);

        if (!p.tokensOk) {
          set({
            alert: {
              kind: "insufficient-tokens",
              title: "Not enough tokens",
              message: `${def.title} burns ${def.tokenCost.toLocaleString(
                "en-US",
              )} tokens, but your eligible pools only cover ${p.sources
                .reduce((s, x) => s + x.tokens, 0)
                .toLocaleString("en-US")}. Buy more of a "${def.capability}" capable model.`,
              projectId,
              neededTokens: def.tokenCost,
            },
          });
          return { ok: false, reason: "tokens" };
        }

        if (state.computeHours < p.billedHours) {
          set({
            alert: {
              kind: "insufficient-compute",
              title: "Not enough compute",
              message: `${def.title} reserves ${p.billedHours.toFixed(
                1,
              )}h on your fleet, but only ${state.computeHours.toFixed(
                1,
              )}h is free. On a faster rig this same job would reserve far fewer hours.`,
              projectId,
              neededHours: p.billedHours,
            },
          });
          return { ok: false, reason: "compute" };
        }

        const plan = COMPUTE_BY_ID[state.fleet.planId ?? ""] ?? null;
        const reliability = plan?.reliability ?? 88;
        const willFail = Math.random() < failureRisk(reliability);

        const now = Date.now();
        const durationSeconds = Math.max(4, p.seconds);

        // Burn tokens up front, reserve compute hours up front.
        const holdings = { ...state.holdings };
        for (const s of p.sources) {
          const cur = holdings[s.modelId];
          if (!cur) continue;
          holdings[s.modelId] = { ...cur, tokens: Math.max(0, cur.tokens - s.tokens) };
        }

        const run: BuildRun = {
          id: newId("run"),
          projectId: def.id,
          status: "running",
          startedAt: now,
          endsAt: now + durationSeconds * 1000,
          durationSeconds,
          workloadHours: def.computeHours,
          billedHours: p.billedHours,
          hoursConsumed: 0,
          tokensConsumed: def.tokenCost,
          tokenSources: p.sources.map((s) => ({
            modelId: s.modelId,
            tokens: s.tokens,
          })),
          speedMultiplier: p.speed,
          payoutMultiplier: round2(p.fleetBonus * p.qualityBonus),
          payout: p.payout,
          fleetTierAtLaunch: state.fleet.tier,
          label: def.title,
          willFail,
        };

        set({
          holdings,
          computeHours: round2(state.computeHours - p.billedHours),
          runs: [run, ...state.runs],
          history: pushHistory(
            state.history,
            tx(
              "build",
              -0,
              `Started: ${def.title}`,
              `${p.billedHours.toFixed(1)}h reserved · ${def.tokenCost.toLocaleString(
                "en-US",
              )} tokens burned · ETA ${Math.round(durationSeconds)}s`,
            ),
          ),
          stats: {
            ...state.stats,
            runsStarted: state.stats.runsStarted + 1,
            tokensBurned: state.stats.tokensBurned + def.tokenCost,
            hoursBurned: round2(state.stats.hoursBurned + p.billedHours),
            totalSpent: state.stats.totalSpent,
          },
          alert: null,
        });

        return { ok: true, message: `Running ${def.title}` };
      },

      /* ---------------------------------------------------- */
      /* Cancelling                                           */
      /* ---------------------------------------------------- */
      cancelBuild: (runId) => {
        const state = get();
        const run = state.runs.find((r) => r.id === runId);
        if (!run || run.status !== "running") {
          return { ok: false, reason: "unknown-project" };
        }
        const now = Date.now();
        const consumed = run.billedHours * clamp(
          (now - run.startedAt) / Math.max(1, run.endsAt - run.startedAt),
          0,
          1,
        );
        const refund = Math.max(0, run.billedHours - consumed);

        set({
          computeHours: round2(state.computeHours + refund),
          runs: state.runs.map((r) =>
            r.id === runId
              ? { ...r, status: "cancelled" as const, hoursConsumed: consumed }
              : r,
          ),
          history: pushHistory(
            state.history,
            tx(
              "build",
              0,
              `Aborted: ${run.label}`,
              `${refund.toFixed(1)}h of compute released back to the pool`,
            ),
          ),
        });
        return { ok: true };
      },

      /* ---------------------------------------------------- */
      /* Free redeem / bailout                                */
      /* ---------------------------------------------------- */
      redeemBailout: () => {
        const state = get();
        set({
          cash: round2(state.cash + BAILOUT_CASH),
          computeHours: round2(state.computeHours + BAILOUT_HOURS),
          history: pushHistory(
            state.history,
            tx(
              "bailout",
              BAILOUT_CASH,
              "Free redeem claimed",
              `+$${BAILOUT_CASH} and +${BAILOUT_HOURS}h compute, no strings attached`,
            ),
          ),
          stats: {
            ...state.stats,
            bailouts: state.stats.bailouts + 1,
            totalEarned: round2(state.stats.totalEarned + BAILOUT_CASH),
            hoursBought: round2(state.stats.hoursBought + BAILOUT_HOURS),
          },
          alert: {
            kind: "redeem-success",
            title: "Top-up delivered",
            message: `$${BAILOUT_CASH} and ${BAILOUT_HOURS} hours of compute have been added to your account. Go build something.`,
          },
        });
      },

      /* ---------------------------------------------------- */
      /* Misc                                                 */
      /* ---------------------------------------------------- */
      setAlert: (alert) => set({ alert }),
      clearAlert: () => set({ alert: null }),
      dismissWelcome: () => set({ welcomed: true }),
      resetSim: () => set({ ...initialState(), hydrated: true }),
    }),
    {
      name: "mcpsim-state",
      version: STATE_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => {
        const out: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(state)) {
          if (PERSIST_SKIP.includes(key)) continue;
          if (typeof value === "function") continue;
          out[key] = value;
        }
        return out as unknown as SimStore;
      },
      migrate: (persisted) => {
        const data = persisted as Partial<SimState> | undefined;
        if (!data || data.version !== STATE_VERSION) {
          return { ...initialState(), welcomed: false } as unknown as SimStore;
        }
        return data as SimStore;
      },
      onRehydrateStorage: () => (state) => {
        state?.tick();
        useSim.setState({ hydrated: true });
      },
    },
  ),
);

/* ============================================================
   Selectors — keep components from re-rendering on everything
   ============================================================ */

export const selectRunning = (s: SimStore) =>
  s.runs.filter((r) => r.status === "running");

export const selectResolved = (s: SimStore) =>
  s.runs.filter((r) => r.status !== "running");

export const selectTokenPools = (s: SimStore) =>
  Object.values(s.holdings)
    .filter((h) => h.tokens > 0)
    .sort((a, b) => b.tokens - a.tokens);

export const selectBlendedPrice = (modelId: string) => {
  const m = MODEL_BY_ID[modelId];
  return m ? blendedPricePer1M(m) : 0;
};
