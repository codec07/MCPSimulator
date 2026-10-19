"use client";

import type { ReactElement } from "react";

import { Icon } from "@/components/ui/Icon";

/** Local purchase feedback. Rendered as a floating toast, never a modal. */
export interface Flash {
  kind: "ok" | "err";
  text: string;
}

const FLASH_STYLE: Record<
  Flash["kind"],
  { icon: string; hex: string; title: string }
> = {
  ok: { icon: "CheckCircle2", hex: "#2ee0a4", title: "Purchase complete" },
  err: { icon: "AlertTriangle", hex: "#fb7185", title: "Purchase declined" },
};

/**
 * Bottom-right confirmation for whatever `buyTokens` / `buyCompute` just said.
 * The page owns the state and clears it; this is just the paint. The shell is
 * click-through so the toast never blocks the card underneath it.
 */
export function BuyToast({
  flash,
  onDismiss,
}: {
  flash: Flash | null;
  onDismiss: () => void;
}): ReactElement | null {
  if (!flash) return null;

  const view = FLASH_STYLE[flash.kind];

  return (
    <div
      role="status"
      aria-live="polite"
      className="animate-pop pointer-events-none fixed bottom-5 right-5 z-[90] w-[min(22rem,calc(100vw-2.5rem))]"
    >
      <div
        className="panel flex items-start gap-3 p-3.5"
        style={{ borderColor: `${view.hex}66` }}
      >
        <span
          className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border"
          style={{
            borderColor: `${view.hex}55`,
            background: `color-mix(in srgb, ${view.hex} 16%, transparent)`,
          }}
        >
          <Icon name={view.icon} size={15} style={{ color: view.hex }} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-fog-100">{view.title}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-fog-400">
            {flash.text}
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss notification"
          className="pointer-events-auto grid h-6 w-6 shrink-0 place-items-center rounded-md text-fog-500 transition-colors hover:bg-abyss-700/70 hover:text-fog-100"
        >
          <Icon name="X" size={12} />
        </button>
      </div>
    </div>
  );
}
