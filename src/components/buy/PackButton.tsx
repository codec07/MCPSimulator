"use client";

import type { ReactElement } from "react";

import { cn } from "@/lib/cn";
import { money2, tokens as fmtTokens, tokensLong } from "@/lib/format";
import type { TokenPack } from "@/lib/types";

/**
 * A single token pack, rendered either as a tile (card grid) or a compact
 * inline button (detail modal).
 *
 * An unaffordable pack stays *clickable* on purpose — the click reaches the
 * store, which raises the shortfall modal offering a Free Redeem top-up. A
 * truly disabled button would leave the player with no way forward.
 *
 * This is always a real `<button>`, so the enclosing card never needs a
 * click handler of its own for the storefront interaction to work.
 */
export function PackButton({
  pack,
  affordable = true,
  onBuy,
  variant = "tile",
  className,
}: {
  pack: TokenPack;
  affordable?: boolean;
  onBuy: () => void;
  variant?: "tile" | "inline";
  className?: string;
}): ReactElement {
  const granted = Math.round(pack.tokens * (1 + (pack.bonusPct ?? 0) / 100));
  const label = `Buy the ${pack.name} pack: ${tokensLong(granted)} tokens for ${money2(pack.price)}`;

  if (variant === "inline") {
    return (
      <button
        type="button"
        onClick={onBuy}
        aria-label={label}
        title={affordable ? label : "Not enough cash — click for your options"}
        className={cn(
          "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors",
          affordable
            ? "border-iris-400/40 bg-iris-500/12 text-iris-200 hover:border-iris-400/70 hover:bg-iris-500/20"
            : "border-ember-400/40 bg-ember-500/10 text-ember-400 hover:border-ember-400/70 hover:bg-ember-500/20",
          className,
        )}
      >
        Buy
        <span className="num">{money2(pack.price)}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onBuy}
      aria-label={label}
      title={affordable ? label : "Not enough cash — click for your options"}
      className={cn(
        "flex flex-col gap-0.5 rounded-xl border px-2.5 py-2 text-left transition-colors",
        affordable
          ? "border-abyss-500/60 bg-abyss-800/60 hover:border-iris-400/50 hover:bg-iris-500/10"
          : "border-ember-400/30 bg-abyss-900/50 hover:border-ember-400/60 hover:bg-ember-500/10",
        className,
      )}
    >
      <span className="flex min-w-0 items-center gap-1.5">
        <span className="truncate text-[11px] font-medium text-fog-200">
          {pack.name}
        </span>
        {pack.bonusPct ? (
          <span className="num shrink-0 rounded-md border border-mint-400/30 bg-mint-500/12 px-1 py-px text-[9px] font-semibold text-mint-300">
            +{pack.bonusPct}%
          </span>
        ) : null}
      </span>
      <span className="num text-[10px] text-fog-400">
        {fmtTokens(granted)} tok
      </span>
      <span className="num text-xs font-semibold text-fog-100">
        {money2(pack.price)}
      </span>
    </button>
  );
}
