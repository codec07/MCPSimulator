"use client";

import type { ReactElement } from "react";

import { Fact, SpecRow } from "@/components/buy/Spec";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { Progress } from "@/components/ui/Progress";
import {
  COMPUTE_TIER_META,
  costPerWorkloadHour,
  speedMultiplier,
} from "@/data/compute";
import {
  STOCK_HOUR_RATE,
  bulkDiscount,
  planEfficiency,
  planHourCost,
  round2,
} from "@/lib/economy";
import { cn } from "@/lib/cn";
import { count, hours, money2, moneySigned, multiplier, titleCase } from "@/lib/format";
import type { ComputePlan } from "@/lib/types";

/** The reference job the worked example is priced against. */
const WORKLOAD_HOURS = 40;

/**
 * Full rig dossier: every spec, the per-workload-hour economics, a worked
 * example against the player's current fleet, and the discount hour bundles.
 */
export function RigDetailModal({
  plan,
  fleetPlan,
  fleetName,
  fleetSpeed,
  cash,
  onClose,
  onBuy,
}: {
  plan: ComputePlan | null;
  fleetPlan: ComputePlan | null;
  fleetName: string;
  fleetSpeed: number;
  cash: number;
  onClose: () => void;
  onBuy: (hours: number) => void;
}): ReactElement | null {
  if (!plan) return null;

  const speed = speedMultiplier(plan);
  const tierMeta = COMPUTE_TIER_META[plan.tier];
  const perWorkloadHour = costPerWorkloadHour(plan);
  const efficiency = planEfficiency(plan);

  const safeFleetSpeed = Math.max(fleetSpeed, 0.01);
  const fleetRate = fleetPlan ? fleetPlan.pricePerHour : STOCK_HOUR_RATE;
  const rigReserved = WORKLOAD_HOURS / speed;
  const nowReserved = WORKLOAD_HOURS / safeFleetSpeed;
  const rigCost = round2(rigReserved * plan.pricePerHour);
  const nowCost = round2(nowReserved * fleetRate);
  const costDelta = round2(rigCost - nowCost);

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      tone="aqua"
      icon={<Icon name="Cpu" size={16} />}
      title={plan.name}
      subtitle={`${plan.provider} · ${tierMeta?.label ?? `Tier ${plan.tier}`}`}
    >
      <div className="flex flex-col gap-5">
        <p className="text-sm leading-relaxed text-fog-300">
          {plan.description}
        </p>

        <div className="rounded-xl border border-abyss-600/40 bg-abyss-900/50 px-3 py-2">
          <SpecRow label="Accelerator" value={plan.gpu ?? "CPU only"} mono={false} />
          <SpecRow label="GPUs" value={plan.gpuCount > 0 ? count(plan.gpuCount) : "—"} />
          <SpecRow label="VRAM" value={plan.vram > 0 ? `${plan.vram} GB` : "—"} />
          <SpecRow label="vCPU" value={count(plan.vcpus)} />
          <SpecRow label="System RAM" value={`${plan.ram} GB`} />
          <SpecRow label="Peak TFLOPS" value={count(plan.tflops)} />
          <SpecRow label="Billing" value={titleCase(plan.billing)} mono={false} />
          <SpecRow
            label="Regions"
            value={`${plan.regions.length} · ${plan.regions.slice(0, 2).join(", ")}`}
            mono={false}
          />
          <SpecRow label="Hourly price" value={`${money2(plan.pricePerHour)} /h`} />
          <SpecRow label="Throughput" value={`${multiplier(speed)} your speed`} />
        </div>

        <div>
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-fog-400">
            Per workload-hour economics
          </h3>
          <div className="mb-2.5 grid grid-cols-2 gap-2.5 rounded-xl border border-abyss-600/40 bg-abyss-900/50 px-3 py-2.5 sm:grid-cols-3">
            <Fact label="Cost / workload-h" value={money2(perWorkloadHour)} />
            <Fact label="Efficiency index" value={efficiency.toFixed(3)} />
            <Fact label="List / hour" value={money2(plan.pricePerHour)} />
          </div>
          <Progress
            value={plan.reliability}
            label="Uptime record"
            size="xs"
            tone={plan.reliability >= 95 ? "mint" : plan.reliability >= 85 ? "aqua" : "solar"}
            showValue
          />
        </div>

        <div>
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-fog-400">
            Worked example — a {WORKLOAD_HOURS}-workload-hour job
          </h3>
          <div className="scroll-thin overflow-x-auto">
            <table className="w-full min-w-[20rem] text-xs">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-fog-500">
                  <th className="pb-2 pr-3 font-medium">Rig</th>
                  <th className="pb-2 pr-3 font-medium">Speed</th>
                  <th className="pb-2 pr-3 text-right font-medium">
                    Your hours
                  </th>
                  <th className="pb-2 text-right font-medium">Cost</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-abyss-600/40">
                  <td className="py-2 pr-3 text-fog-300">{fleetName}</td>
                  <td className="num py-2 pr-3 text-fog-300">
                    {multiplier(fleetSpeed)}
                  </td>
                  <td className="num py-2 pr-3 text-right text-fog-100">
                    {hours(nowReserved)}
                  </td>
                  <td className="num py-2 text-right text-fog-100">
                    {money2(nowCost)}
                  </td>
                </tr>
                <tr className="border-t border-abyss-600/40">
                  <td className="py-2 pr-3 text-iris-200">{plan.name}</td>
                  <td className="num py-2 pr-3 text-iris-200">
                    {multiplier(speed)}
                  </td>
                  <td className="num py-2 pr-3 text-right text-iris-200">
                    {hours(rigReserved)}
                  </td>
                  <td className="num py-2 text-right text-iris-200">
                    {money2(rigCost)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="mt-2.5 grid grid-cols-3 gap-2.5 rounded-xl border border-abyss-600/40 bg-abyss-900/50 px-3 py-2.5">
            <Fact label="This rig reserves" value={hours(rigReserved)} />
            <Fact label="Compute bill" value={money2(rigCost)} />
            <Fact
              label="vs your fleet"
              value={
                <span className={costDelta <= 0 ? "text-mint-300" : "text-ember-400"}>
                  {moneySigned(costDelta)}
                </span>
              }
            />
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-fog-400">
            Hour bundles
          </h3>
          <div className="flex flex-col gap-2">
            {plan.hourOptions.map((bundle) => {
              const list = round2(bundle * plan.pricePerHour);
              const total = planHourCost(plan, bundle);
              const discountPct = Math.round((1 - bulkDiscount(bundle)) * 100);

              return (
                <div
                  key={bundle}
                  className="flex items-center justify-between gap-2 rounded-xl border border-abyss-600/50 bg-abyss-900/60 px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="num text-xs font-semibold text-fog-100">
                      {bundle} h
                    </div>
                    <div className="num text-[10px] text-fog-500">
                      {money2(list)} list
                      {discountPct > 0 ? (
                        <span className="text-mint-300">
                          {" "}
                          · volume −{discountPct}%
                        </span>
                      ) : null}
                    </div>
                    {cash < total ? (
                      <div className="num text-[10px] text-ember-400">
                        {money2(total - cash)} short — click to claim a top-up
                      </div>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span
                      className={cn(
                        "num text-sm font-semibold",
                        cash < total ? "text-ember-400" : "text-fog-50",
                      )}
                    >
                      {money2(total)}
                    </span>
                    <Button
                      size="sm"
                      variant="subtle"
                      onClick={() => onBuy(bundle)}
                      leftIcon={<Icon name="ShoppingCart" size={13} />}
                    >
                      Buy
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] text-fog-500">
            Volume pricing is automatic: 5 h and up trims 5%, 25 h trims 10%, 100 h
            trims 15% and 250 h trims 20%.
          </p>
        </div>
      </div>
    </Modal>
  );
}
