"use client";

import { useState } from "react";
import type { ReactElement } from "react";

import { Fact } from "@/components/buy/Spec";
import { asTone } from "@/components/buy/util";
import { Badge, Pill } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Stepper } from "@/components/ui/Controls";
import { Icon } from "@/components/ui/Icon";
import { Progress } from "@/components/ui/Progress";
import { cn } from "@/lib/cn";
import { COMPUTE_TIER_META, speedMultiplier } from "@/data/compute";
import { bulkDiscount, planHourCost } from "@/lib/economy";
import { hours, money2, multiplier, titleCase } from "@/lib/format";
import type { ComputePlan } from "@/lib/types";

const MIN_HOURS = 1;
const MAX_HOURS = 1000;

function kindIcon(kind: ComputePlan["kind"]): string {
  if (kind === "cpu") return "Server";
  if (kind === "cluster") return "Network";
  if (kind === "serverless") return "Cloud";
  return "Cpu";
}

function reliabilityTone(reliability: number): "mint" | "aqua" | "solar" {
  if (reliability >= 95) return "mint";
  if (reliability >= 85) return "aqua";
  return "solar";
}

/**
 * One purchasable rig, with an inline hour stepper.
 *
 * The card owns buy controls, so a stretched real `<button>` opens the detail
 * modal and the purchase block re-enables pointer events on top of it. The
 * `animate-rise` wrapper sits outside the `hover` Card so the entry animation
 * never fights the hover lift.
 */
export function RigCard({
  plan,
  cash,
  fleetPlanId,
  fleetSpeed,
  index,
  onOpen,
  onBuy,
}: {
  plan: ComputePlan;
  cash: number;
  fleetPlanId: string | null;
  fleetSpeed: number;
  index: number;
  onOpen: () => void;
  onBuy: (hours: number) => void;
}): ReactElement {
  const [selectedHours, setSelectedHours] = useState<number>(
    () => plan.hourOptions[0] ?? MIN_HOURS,
  );

  const speed = speedMultiplier(plan);
  const tierMeta = COMPUTE_TIER_META[plan.tier];
  const isFlagship = fleetPlanId === plan.id;
  const isFaster = !isFlagship && speed > fleetSpeed;
  const cost = planHourCost(plan, selectedHours);
  const discountPct = Math.round((1 - bulkDiscount(selectedHours)) * 100);
  const affordable = cash >= cost;

  return (
    <div
      className="animate-rise"
      style={{ animationDelay: `${Math.min(index, 12) * 45}ms` }}
    >
      <Card
        hover
        padded={false}
        accent={plan.accent}
        className="flex h-full overflow-hidden"
      >
        <button
          type="button"
          onClick={onOpen}
          aria-label={`View full details for ${plan.name}`}
          className="absolute inset-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-iris-400/70"
        />

        <div className="pointer-events-none relative flex h-full w-full flex-col">
          <div
            className="border-b border-abyss-600/50 px-4 pb-3 pt-3.5"
            style={{
              background: `linear-gradient(135deg, color-mix(in srgb, ${plan.accent} 17%, transparent), transparent 72%)`,
            }}
          >
            <div className="flex items-start gap-2.5">
              <span
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border"
                style={{
                  borderColor: `color-mix(in srgb, ${plan.accent} 40%, transparent)`,
                  background: `color-mix(in srgb, ${plan.accent} 15%, transparent)`,
                  color: plan.accent,
                }}
              >
                <Icon name={kindIcon(plan.kind)} size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-semibold text-fog-50">
                  {plan.name}
                </h3>
                <p className="mt-0.5 truncate text-[11px] text-fog-400">
                  {plan.provider}
                </p>
              </div>
            </div>

            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              <Badge tone={asTone(tierMeta?.tone, "aqua")} size="sm">
                {tierMeta?.label ?? `Tier ${plan.tier}`}
              </Badge>
              {isFlagship ? (
                <Badge tone="mint" size="sm" dot>
                  Your flagship
                </Badge>
              ) : null}
              {isFaster ? (
                <Badge
                  tone="iris"
                  size="sm"
                  icon={<Icon name="TrendingUp" size={11} />}
                >
                  Faster than your rig
                </Badge>
              ) : null}
              {plan.badge ? (
                <Badge tone="solar" size="sm">
                  {plan.badge}
                </Badge>
              ) : null}
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-3 p-4">
            <p className="text-xs leading-relaxed text-fog-300">{plan.tagline}</p>

            <div className="flex items-center gap-2 rounded-xl border border-abyss-600/40 bg-abyss-900/50 px-2.5 py-2">
              <Icon name="Microchip" size={14} className="shrink-0 text-fog-400" />
              <span className="min-w-0 flex-1 truncate text-xs text-fog-200">
                {plan.gpu ?? "CPU only"}
              </span>
              <span className="num shrink-0 text-xs font-semibold text-fog-100">
                {multiplier(speed)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-xl border border-abyss-600/40 bg-abyss-900/50 px-2.5 py-2 sm:grid-cols-4">
              <Fact label="VRAM" value={plan.vram > 0 ? `${plan.vram} GB` : "—"} />
              <Fact label="vCPU" value={plan.vcpus} />
              <Fact label="RAM" value={`${plan.ram} GB`} />
              <Fact label="TFLOPS" value={plan.tflops.toLocaleString("en-US")} />
            </div>

            <Progress
              value={plan.reliability}
              label="Reliability"
              size="xs"
              tone={reliabilityTone(plan.reliability)}
              showValue
            />

            <div className="flex flex-wrap items-center gap-1.5">
              <Badge tone="neutral" size="sm">
                {titleCase(plan.billing)}
              </Badge>
              {plan.regions.slice(0, 3).map((region) => (
                <Badge key={region} tone="neutral" size="sm">
                  {region}
                </Badge>
              ))}
              {plan.regions.length > 3 ? (
                <Badge tone="neutral" size="sm">
                  +{plan.regions.length - 3}
                </Badge>
              ) : null}
            </div>

            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-fog-500">
                  Hourly
                </div>
                <div className="num text-lg font-semibold text-fog-50">
                  {money2(plan.pricePerHour)}
                  <span className="text-xs text-fog-500">/h</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider text-fog-500">
                  Throughput
                </div>
                {isFaster ? (
                  <div className="num text-xs text-fog-300">
                    {multiplier(fleetSpeed)} →{" "}
                    <span className="text-iris-200">{multiplier(speed)}</span>
                  </div>
                ) : (
                  <div className="num text-xs text-fog-100">
                    {multiplier(speed)}
                  </div>
                )}
              </div>
            </div>

            <div className="pointer-events-auto mt-auto flex flex-col gap-2.5 rounded-xl border border-abyss-600/50 bg-abyss-900/60 p-2.5">
              <div className="flex flex-wrap items-center gap-1.5">
                {plan.hourOptions.map((option) => (
                  <Pill
                    key={option}
                    active={option === selectedHours}
                    onClick={() => setSelectedHours(option)}
                  >
                    {hours(option)}
                  </Pill>
                ))}
              </div>

              <div className="flex flex-wrap items-end justify-between gap-2">
                <Stepper
                  value={selectedHours}
                  min={MIN_HOURS}
                  max={MAX_HOURS}
                  step={1}
                  onChange={setSelectedHours}
                  format={(n) => `${n}h`}
                  label="Hours"
                />
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-wider text-fog-500">
                    Total
                  </div>
                  <div className="num text-base font-semibold text-fog-50">
                    {money2(cost)}
                  </div>
                  <div
                    className={cn(
                      "num text-[10px]",
                      discountPct > 0 ? "text-mint-300" : "text-fog-500",
                    )}
                  >
                    volume {discountPct > 0 ? `−${discountPct}%` : "—"}
                  </div>
                </div>
              </div>

              <Button
                variant={affordable ? "primary" : "outline"}
                size="md"
                fullWidth
                onClick={() => onBuy(selectedHours)}
                leftIcon={<Icon name="ShoppingCart" size={14} />}
              >
                Buy {selectedHours} h — {money2(cost)}
              </Button>

              {affordable ? null : (
                <p className="text-center text-[10px] text-ember-400">
                  You need {money2(cost - cash)} more — click to claim a top-up.
                </p>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
