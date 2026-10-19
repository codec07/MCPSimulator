"use client";

import type { ReactElement } from "react";

import { PackButton } from "@/components/buy/PackButton";
import { Fact } from "@/components/buy/Spec";
import { asTone, capabilityIcon, capabilityLabel } from "@/components/buy/util";
import { Badge, type Tone } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { Progress } from "@/components/ui/Progress";
import { MODEL_TIER_META, modelQualityTier } from "@/data/models";
import { tokenValueOf } from "@/lib/economy";
import { money2, tokens, titleCase } from "@/lib/format";
import type { ModelDef } from "@/lib/types";

const MAX_CAPS = 4;

/** Grade → badge tone, so an S reads hot and a D reads flat. */
const GRADE_TONE: Record<"S" | "A" | "B" | "C" | "D", Tone> = {
  S: "plasma",
  A: "mint",
  B: "aqua",
  C: "solar",
  D: "neutral",
};

/**
 * One catalog model.
 *
 * The card carries its own buy controls, so it cannot itself be a `<button>`
 * (nesting buttons is invalid). Instead a real, screen-reader-labelled button
 * is stretched across the card to open the detail modal, and the pack tiles
 * re-enable pointer events on top of it. The `animate-rise` wrapper sits
 * outside the `hover` Card so the entry animation never fights the hover lift.
 */
export function ModelCard({
  model,
  cash,
  held,
  index,
  onOpen,
  onBuyPack,
}: {
  model: ModelDef;
  cash: number;
  held: number;
  index: number;
  onOpen: () => void;
  onBuyPack: (packId: string) => void;
}): ReactElement {
  const tierMeta = MODEL_TIER_META[model.tier];
  const grade = modelQualityTier(model);
  const primaryCapability = model.capabilities[0];

  return (
    <div
      className="animate-rise"
      style={{ animationDelay: `${Math.min(index, 12) * 45}ms` }}
    >
      <Card
        hover
        padded={false}
        accent={model.accent}
        className="flex h-full overflow-hidden"
      >
        <button
          type="button"
          onClick={onOpen}
          aria-label={`View full details for ${model.name}`}
          className="absolute inset-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-iris-400/70"
        />

        <div className="pointer-events-none relative flex h-full w-full flex-col">
          <div
            className="border-b border-abyss-600/50 px-4 pb-3 pt-3.5"
            style={{
              background: `linear-gradient(135deg, color-mix(in srgb, ${model.accent} 17%, transparent), transparent 72%)`,
            }}
          >
            <div className="flex items-start gap-2.5">
              <span
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border"
                style={{
                  borderColor: `color-mix(in srgb, ${model.accent} 40%, transparent)`,
                  background: `color-mix(in srgb, ${model.accent} 15%, transparent)`,
                  color: model.accent,
                }}
              >
                <Icon
                  name={
                    primaryCapability
                      ? capabilityIcon(primaryCapability)
                      : "Sparkles"
                  }
                  size={16}
                />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-semibold text-fog-50">
                  {model.name}
                </h3>
                <p className="mt-0.5 truncate text-[11px] text-fog-400">
                  {model.vendor} · {model.family}
                </p>
              </div>
            </div>

            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              <Badge tone={asTone(tierMeta?.tone, "iris")} size="sm">
                {tierMeta?.label ?? titleCase(model.tier)}
              </Badge>
              <Badge tone={GRADE_TONE[grade]} size="sm">
                Grade {grade}
              </Badge>
              {model.isOpenSource ? (
                <Badge tone="mint" size="sm">
                  Open weights
                </Badge>
              ) : null}
              {model.badge ? (
                <Badge tone="solar" size="sm">
                  {model.badge}
                </Badge>
              ) : null}
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-3 p-4">
            <p className="text-xs leading-relaxed text-fog-300">
              {model.tagline}
            </p>

            <div className="flex flex-wrap gap-1">
              {model.capabilities.slice(0, MAX_CAPS).map((capability) => (
                <Badge key={capability} tone="neutral" size="sm">
                  {capabilityLabel(capability)}
                </Badge>
              ))}
              {model.capabilities.length > MAX_CAPS ? (
                <Badge tone="neutral" size="sm">
                  +{model.capabilities.length - MAX_CAPS}
                </Badge>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Progress
                value={model.quality}
                label="Quality"
                size="xs"
                tone="iris"
                showValue
              />
              <Progress
                value={model.speed}
                label="Speed"
                size="xs"
                tone="aqua"
                showValue
              />
            </div>

            <div className="grid grid-cols-3 gap-2 rounded-xl border border-abyss-600/40 bg-abyss-900/50 px-2.5 py-2">
              <Fact label="Context" value={tokens(model.contextWindow)} />
              <Fact label="In /1M" value={money2(model.inputPricePer1M)} />
              <Fact label="Out /1M" value={money2(model.outputPricePer1M)} />
            </div>

            {held > 0 ? (
              <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 rounded-xl border border-iris-400/25 bg-iris-500/8 px-2.5 py-1.5">
                <span className="text-[11px] text-iris-200">
                  You hold {tokens(held)} tokens
                </span>
                <span className="num text-[11px] text-iris-200/80">
                  worth {money2(tokenValueOf(model.id, held))}
                </span>
              </div>
            ) : null}

            <div className="pointer-events-auto mt-auto grid grid-cols-2 gap-2">
              {model.packs.map((pack) => (
                <PackButton
                  key={pack.id}
                  pack={pack}
                  affordable={cash >= pack.price}
                  onBuy={() => onBuyPack(pack.id)}
                />
              ))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
