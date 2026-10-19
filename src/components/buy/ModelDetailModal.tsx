"use client";

import type { ReactElement } from "react";

import { PackButton } from "@/components/buy/PackButton";
import { Fact, SpecRow } from "@/components/buy/Spec";
import {
  asTone,
  capabilityBlurb,
  capabilityIcon,
  capabilityLabel,
} from "@/components/buy/util";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { Ring } from "@/components/ui/Progress";
import {
  MODEL_TIER_META,
  blendedPricePer1M,
  modelQualityTier,
} from "@/data/models";
import { tokenValueOf } from "@/lib/economy";
import { money2, tokens, tokensLong } from "@/lib/format";
import type { ModelDef } from "@/lib/types";

/**
 * Full model dossier: license, capability blurbs and a per-pack breakdown that
 * shows what each bundle really costs per million tokens.
 */
export function ModelDetailModal({
  model,
  cash,
  held,
  onClose,
  onBuyPack,
}: {
  model: ModelDef | null;
  cash: number;
  held: number;
  onClose: () => void;
  onBuyPack: (modelId: string, packId: string) => void;
}): ReactElement | null {
  if (!model) return null;

  const tierMeta = MODEL_TIER_META[model.tier];
  const grade = modelQualityTier(model);
  const blended = blendedPricePer1M(model);
  const primaryCapability = model.capabilities[0];

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      tone="iris"
      icon={
        <Icon
          name={primaryCapability ? capabilityIcon(primaryCapability) : "Sparkles"}
          size={16}
        />
      }
      title={model.name}
      subtitle={`${model.vendor} · ${model.family} · released ${model.releaseYear}`}
    >
      <div className="flex flex-col gap-5">
        <p className="text-sm leading-relaxed text-fog-300">
          {model.description}
        </p>

        <div className="flex flex-wrap items-center gap-6 rounded-xl border border-abyss-600/40 bg-abyss-900/50 px-4 py-4">
          <Ring value={model.quality} size={82} thickness={8} tone="iris">
            <span className="num text-lg font-semibold text-fog-50">
              {model.quality}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-fog-500">
              quality
            </span>
          </Ring>
          <Ring value={model.speed} size={82} thickness={8} tone="aqua">
            <span className="num text-lg font-semibold text-fog-50">
              {model.speed}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-fog-500">
              speed
            </span>
          </Ring>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge tone={asTone(tierMeta?.tone, "iris")} size="sm">
                {tierMeta?.label ?? model.tier}
              </Badge>
              <Badge tone="plasma" size="sm">
                Grade {grade}
              </Badge>
              {model.badge ? (
                <Badge tone="solar" size="sm">
                  {model.badge}
                </Badge>
              ) : null}
            </div>
            <p className="text-[11px] leading-relaxed text-fog-400">
              {tierMeta?.blurb}
            </p>
          </div>
        </div>

        <div className="grid gap-x-6 sm:grid-cols-2">
          <SpecRow label="License" value={model.license} mono={false} />
          <SpecRow
            label="Weights"
            value={model.isOpenSource ? "Open" : "Closed"}
            mono={false}
          />
          <SpecRow label="Context window" value={tokens(model.contextWindow)} />
          <SpecRow label="Blended price" value={`${money2(blended)} /1M`} />
          {held > 0 ? (
            <SpecRow
              label="You hold"
              value={`${tokens(held)} tokens · ${money2(tokenValueOf(model.id, held))}`}
              mono={false}
            />
          ) : null}
        </div>

        <div>
          <h3 className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-fog-400">
            Capabilities
          </h3>
          <ul className="grid gap-2 sm:grid-cols-2">
            {model.capabilities.map((capability) => (
              <li
                key={capability}
                className="flex items-start gap-2.5 rounded-xl border border-abyss-600/40 bg-abyss-900/50 px-3 py-2"
              >
                <span className="mt-0.5 shrink-0 text-iris-300">
                  <Icon name={capabilityIcon(capability)} size={14} />
                </span>
                <div className="min-w-0">
                  <div className="text-xs font-medium text-fog-100">
                    {capabilityLabel(capability)}
                  </div>
                  <div className="mt-0.5 text-[11px] leading-relaxed text-fog-400">
                    {capabilityBlurb(capability)}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-fog-400">
            Token packs
          </h3>
          <div className="flex flex-col gap-2.5">
            {model.packs.map((pack) => {
              const granted = Math.round(
                pack.tokens * (1 + (pack.bonusPct ?? 0) / 100),
              );
              const effective = granted > 0 ? pack.price / (granted / 1_000_000) : 0;
              const worth = tokenValueOf(model.id, granted);
              const surplus = worth - pack.price;

              return (
                <div
                  key={pack.id}
                  className="rounded-xl border border-abyss-600/50 bg-abyss-900/60 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-sm font-semibold text-fog-100">
                        {pack.name}
                      </span>
                      {pack.badge ? (
                        <Badge tone="solar" size="sm">
                          {pack.badge}
                        </Badge>
                      ) : null}
                    </div>
                    <span className="num shrink-0 text-sm font-semibold text-fog-50">
                      {money2(pack.price)}
                    </span>
                  </div>

                  <div className="mt-2.5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                    <Fact label="Tokens" value={tokensLong(granted)} />
                    <Fact
                      label="Bonus"
                      value={pack.bonusPct ? `+${pack.bonusPct}%` : "—"}
                    />
                    <Fact label="Effective /1M" value={money2(effective)} />
                    <Fact label="Pool value" value={money2(worth)} />
                  </div>

                  <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] text-fog-500">
                      {surplus > 0.005 ? (
                        <span className="text-mint-300">
                          {money2(surplus)} cheaper than blended list rates.
                        </span>
                      ) : (
                        <span>Priced at the blended list rate.</span>
                      )}
                    </span>
                    <PackButton
                      variant="inline"
                      pack={pack}
                      affordable={cash >= pack.price}
                      onBuy={() => onBuyPack(model.id, pack.id)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
}
