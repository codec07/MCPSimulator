"use client";

import type { Tone } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";

export interface Flash {
  tone: Tone;
  title: string;
  message?: string;
}

const FLASH_ICONS: Record<Tone, string> = {
  neutral: "Info",
  iris: "Info",
  mint: "CheckCircle2",
  solar: "AlertTriangle",
  ember: "AlertTriangle",
  aqua: "Info",
  plasma: "Sparkles",
};

const FLASH_HEX: Record<Tone, string> = {
  neutral: "#9aa3c0",
  iris: "#7c5cff",
  mint: "#2ee0a4",
  solar: "#fbbf24",
  ember: "#fb7185",
  aqua: "#38bdf8",
  plasma: "#d946ef",
};

/**
 * Bottom-right confirmation for whatever `startBuild` just told us. The page
 * owns the state and clears it; this is just the paint.
 */
export function FlashToast({ flash }: { flash: Flash | null }) {
  if (!flash) return null;

  const hex = FLASH_HEX[flash.tone];

  return (
    <div
      role="status"
      aria-live="polite"
      className="animate-pop pointer-events-none fixed bottom-5 right-5 z-[90] w-[min(22rem,calc(100vw-2.5rem))]"
    >
      <div
        className="panel flex items-start gap-3 p-3.5"
        style={{ borderColor: `${hex}66` }}
      >
        <span
          className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border"
          style={{
            borderColor: `${hex}55`,
            background: `color-mix(in srgb, ${hex} 16%, transparent)`,
          }}
        >
          <Icon
            name={FLASH_ICONS[flash.tone]}
            size={15}
            style={{ color: hex }}
          />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-fog-100">{flash.title}</p>
          {flash.message ? (
            <p className="mt-0.5 text-xs leading-relaxed text-fog-400">
              {flash.message}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
