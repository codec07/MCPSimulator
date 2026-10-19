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
  fleetHourRate,
  marketHeat,
  maxBatchFor,
  planHourCost,
  projectionOf,
  refundHoursOf,
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
        detail: `$${STARTING_CASH} play-money float and ${STARTING_COMPUTE_HOURS} free compute hours`,
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
  /** Launches one run, or `count` of them as a single batch. */
  startBuild: (projectId: string, count?: number) => ActionResult;
  cancelBuild: (runId: string) => ActionResult;
  /** Aborts every still-running member of a batch, with one ledger line. */
  cancelBatch: (runIds: string[]) => ActionResult;
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
  "cancelBatch",
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

        const done = new Set(finished.map((r) => r.id));

        let cash = state.cash;
        const stats = { ...state.stats };
        const completed = { ...state.completed };

        /** What each finished run actually paid, so a batch bills as one line. */
        const settled: { run: BuildRun; delivered: boolean; credited: number }[] =
          [];

        const runs = state.runs.map((run) => {
          if (!done.has(run.id)) return run;

          if (run.willFail) {
            // Spot capacity evaporated. Partial delivery, compute released.
            const partial = round2(run.payout * 0.3);
            cash = round2(cash + partial);
            stats.runsFailed += 1;
            stats.totalEarned = round2(stats.totalEarned + partial);
            settled.push({ run, delivered: false, credited: partial });
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
          settled.push({ run, delivered: true, credited: run.payout });
          return {
            ...run,
            status: "done" as const,
            hoursConsumed: run.billedHours,
          };
        });

        // Runs that shared a launch share a ledger line too. A lone run keeps
        // exactly the entry it had before batching existed.
        const groups = new Map<string, typeof settled>();
        for (const entry of settled) {
          const key = entry.run.batchId ?? entry.run.id;
          const bucket = groups.get(key);
          if (bucket) bucket.push(entry);
          else groups.set(key, [entry]);
        }

        let history = state.history;

        for (const group of groups.values()) {
          const head = group[0].run;
          const count = group.length;
          const delivered = group.filter((g) => g.delivered).length;
          const failed = count - delivered;
          const credited = round2(group.reduce((sum, g) => sum + g.credited, 0));

          if (count === 1) {
            history = pushHistory(
              history,
              group[0].delivered
                ? tx(
                    "project-payout",
                    credited,
                    `Shipped: ${head.label}`,
                    `${head.tokenSources.length} token pool${head.tokenSources.length === 1 ? "" : "s"} · ${head.billedHours.toFixed(1)}h compute`,
                  )
                : tx(
                    "penalty",
                    credited,
                    `${head.label} — partial delivery`,
                    `Run failed on ${head.fleetTierAtLaunch >= 4 ? "high-tier" : "spot"} capacity. 30% of payout credited, compute released.`,
                  ),
            );
            continue;
          }

          const batchHours = group.reduce((sum, g) => sum + g.run.billedHours, 0);

          history = pushHistory(
            history,
            tx(
              failed === 0 ? "project-payout" : "penalty",
              credited,
              failed === 0
                ? `Shipped batch: ${head.label} ×${count}`
                : delivered > 0
                  ? `Batch settled: ${head.label} ×${count}`
                  : `Batch failed: ${head.label} ×${count}`,
              failed === 0
                ? `${count} runs delivered · ${batchHours.toFixed(1)}h compute`
                : `${delivered}/${count} delivered · ${failed} failed · ${batchHours.toFixed(1)}h compute`,
            ),
          );
        }

        // Keep only the most recent resolved runs so storage stays small.
        const resolved = runs.filter((r) => r.status !== "running").length;
        const trimmed =
          resolved > 40
            ? runs.filter((r) => r.status === "running").concat(
                runs.filter((r) => r.status !== "running").slice(0, 40),
              )
            : runs;

        set({ cash, runs: trimmed, history, stats, completed });
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
        const faster = candidateSpeed > currentSpeed;
        const switched = state.fleet.planId !== plan.id;

        // A run is always billed at the rig it ran on, so the pool can never be
        // a mix of price points: switching flagships re-provisions the hours you
        // already hold at the new rig's rate, value for value. Without this you
        // could stockpile $0.02 OCI hours and then burn them at H100 speed, which
        // was worth ~470x the money you actually spent.
        const prevRate = fleetHourRate(state.fleet);
        const carriedHours =
          switched && prevRate > 0
            ? Math.round((state.computeHours * (prevRate / plan.pricePerHour)) * 100) / 100
            : state.computeHours;

        const fleet = {
          planId: plan.id,
          name: plan.name,
          tier: plan.tier as FleetTier,
          tflops: plan.tflops,
          vcpus: plan.vcpus,
          vram: plan.vram,
          gpu: plan.gpu,
        };

        const reProvisioned = round2(carriedHours - state.computeHours);

        const history = pushHistory(
          state.history,
          tx(
            "purchase-compute",
            -cost,
            switched
              ? `${hours}h on ${plan.name}`
              : `${hours}h more on ${plan.name}`,
            switched
              ? `${faster ? "New flagship rig" : "Slower flagship rig"} — ${candidateSpeed.toFixed(2)}x throughput (was ${currentSpeed.toFixed(2)}x)${
                  reProvisioned !== 0
                    ? ` · ${reProvisioned > 0 ? "+" : ""}${reProvisioned.toFixed(1)}h re-provisioned from your pool`
                    : ""
                }`
              : `${plan.provider} · ${speedMultiplier(plan).toFixed(2)}x throughput`,
          ),
        );

        set({
          cash,
          computeHours: round2(carriedHours + hours),
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
      startBuild: (projectId, count) => {
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

        const shipped0 = state.completed[def.id] ?? 0;
        const p = projectionOf(def, state.fleet, state.holdings, shipped0);

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

        // One run definitely fits — the checks above proved it. How many more?
        // Bounded by the hours left, the eligible token pool, and MAX_BATCH.
        const available = maxBatchFor(
          def,
          state.fleet,
          state.holdings,
          state.computeHours,
        );
        const batchSize = clamp(
          Math.floor(count ?? 1) || 1,
          1,
          Math.max(1, available),
        );

        const plan = COMPUTE_BY_ID[state.fleet.planId ?? ""] ?? null;
        const reliability = plan?.reliability ?? 88;
        const risk = failureRisk(reliability);

        const now = Date.now();
        const durationSeconds = Math.max(4, p.seconds);

        // Burn tokens and reserve hours up front, once per run. Each run is
        // priced against the pool the run before it left behind, so a batch of
        // five costs exactly what five separate launches would have.
        const pool = { ...state.holdings };
        const fresh: BuildRun[] = [];
        let hoursReserved = 0;
        let tokensBurned = 0;
        let expectedPayout = 0;

        for (let index = 0; index < batchSize; index += 1) {
          // The market cools with every copy you ship, so run N of a batch is
          // priced against the demand runs 0..N-1 already consumed.
          const shipped = shipped0 + index;
          const slice =
            index === 0 ? p : projectionOf(def, state.fleet, pool, shipped);
          if (!slice.tokensOk) break;

          for (const s of slice.sources) {
            const cur = pool[s.modelId];
            if (!cur) continue;
            pool[s.modelId] = {
              ...cur,
              tokens: Math.max(0, cur.tokens - s.tokens),
            };
          }

          fresh.push({
            id: newId("run"),
            projectId: def.id,
            status: "running",
            startedAt: now,
            endsAt: now + durationSeconds * 1000,
            durationSeconds,
            workloadHours: def.computeHours,
            billedHours: slice.billedHours,
            hoursConsumed: 0,
            tokensConsumed: def.tokenCost,
            tokenSources: slice.sources.map((s) => ({
              modelId: s.modelId,
              tokens: s.tokens,
            })),
            speedMultiplier: slice.speed,
            payoutMultiplier: round2(slice.qualityPremium),
            marketHeat: marketHeat(shipped),
            payout: slice.payout,
            fleetTierAtLaunch: state.fleet.tier,
            hourRateAtLaunch: fleetHourRate(state.fleet),
            label: def.title,
            willFail: Math.random() < risk,
          });

          hoursReserved = round2(hoursReserved + slice.billedHours);
          tokensBurned += def.tokenCost;
          expectedPayout = round2(expectedPayout + slice.payout);
        }

        // Only tag the runs when they really are a batch, so a single build
        // serialises exactly as it always did.
        const launched = fresh.length;
        const batch: Pick<BuildRun, "batchId" | "batchSize"> =
          launched > 1 ? { batchId: newId("batch"), batchSize: launched } : {};

        set({
          holdings: pool,
          computeHours: round2(state.computeHours - hoursReserved),
          runs: [...fresh.map((r) => ({ ...r, ...batch })), ...state.runs],
          history: pushHistory(
            state.history,
            tx(
              "build",
              -0,
              launched > 1
                ? `Started batch: ${def.title} ×${launched}`
                : `Started: ${def.title}`,
              `${hoursReserved.toFixed(1)}h reserved · ${tokensBurned.toLocaleString(
                "en-US",
              )} tokens burned · ${
                launched > 1
                  ? `${launched} runs in parallel, ETA ${Math.round(durationSeconds)}s each`
                  : `ETA ${Math.round(durationSeconds)}s`
              }`,
            ),
          ),
          stats: {
            ...state.stats,
            runsStarted: state.stats.runsStarted + launched,
            tokensBurned: state.stats.tokensBurned + tokensBurned,
            hoursBurned: round2(state.stats.hoursBurned + hoursReserved),
            totalSpent: state.stats.totalSpent,
          },
          alert: null,
        });

        return {
          ok: true,
          message:
            launched > 1
              ? `${launched} × ${def.title} queued · up to $${expectedPayout.toFixed(2)}`
              : `Running ${def.title}`,
        };
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
        const released = refundHoursOf(
          refund,
          run.hourRateAtLaunch,
          fleetHourRate(state.fleet),
        );

        set({
          computeHours: round2(state.computeHours + released),
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
              `${released.toFixed(1)}h of compute released back to the pool`,
            ),
          ),
        });
        return { ok: true };
      },

      /* ---------------------------------------------------- */
      /* Aborting a whole batch at once                       */
      /* ---------------------------------------------------- */
      cancelBatch: (runIds) => {
        const state = get();
        const now = Date.now();
        const wanted = new Set(runIds);
        const targets = state.runs.filter(
          (r) => r.status === "running" && wanted.has(r.id),
        );
        if (!targets.length) return { ok: false, reason: "unknown-project" };

        // Every run in a batch shares one launch, so one rate covers them all.
        // Accumulate in dollars and convert once, at today's rate.
        const launchRate = targets[0].hourRateAtLaunch || 1;
        let refundedHours = 0;
        const consumedById = new Map<string, number>();

        for (const run of targets) {
          const consumed =
            run.billedHours *
            clamp(
              (now - run.startedAt) / Math.max(1, run.endsAt - run.startedAt),
              0,
              1,
            );
          consumedById.set(run.id, consumed);
          refundedHours += Math.max(0, run.billedHours - consumed) * (run.hourRateAtLaunch || launchRate);
        }

        const head = targets[0];
        const count = targets.length;
        const released = refundHoursOf(
          refundedHours / launchRate,
          launchRate,
          fleetHourRate(state.fleet),
        );

        set({
          computeHours: round2(state.computeHours + released),
          runs: state.runs.map((r) =>
            consumedById.has(r.id)
              ? {
                  ...r,
                  status: "cancelled" as const,
                  hoursConsumed: consumedById.get(r.id) ?? 0,
                }
              : r,
          ),
          history: pushHistory(
            state.history,
            tx(
              "build",
              0,
              count > 1
                ? `Aborted batch: ${head.label} ×${count}`
                : `Aborted: ${head.label}`,
              `${released.toFixed(1)}h of compute released back to the pool`,
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
