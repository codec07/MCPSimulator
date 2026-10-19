"use client";

import { X } from "lucide-react";
import { useEffect } from "react";
import type { ReactElement, ReactNode } from "react";

import type { Tone } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";

/** Hex per tone — used only for inline gradients/tints (arbitrary values). */
const TONE_HEX: Record<Tone, string> = {
  neutral: "#9aa3c0",
  iris: "#7c5cff",
  mint: "#2ee0a4",
  solar: "#fbbf24",
  ember: "#fb7185",
  aqua: "#38bdf8",
  plasma: "#d946ef",
};

const SIZE_CLASSES: Record<"sm" | "md" | "lg" | "xl", string> = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  icon,
  children,
  footer,
  tone = "iris",
  size = "md",
  dismissible = true,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  tone?: Tone;
  size?: "sm" | "md" | "lg" | "xl";
  dismissible?: boolean;
}): ReactElement | null {
  useEffect(() => {
    if (!open) return;
    if (typeof document === "undefined") return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && dismissible) onClose();
    };
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, dismissible, onClose]);

  if (!open) return null;

  const accent = TONE_HEX[tone];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        aria-hidden="true"
        onClick={() => {
          if (dismissible !== false) onClose();
        }}
        className="animate-fade absolute inset-0 bg-abyss-950/80 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "panel animate-pop scroll-thin relative w-full overflow-y-auto max-h-[88vh]",
          SIZE_CLASSES[size],
        )}
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{
            background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
          }}
        />
        <div className="p-6">
          <div className="flex items-start gap-3">
            {icon ? (
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border"
                style={{
                  backgroundColor: `color-mix(in srgb, ${accent} 15%, transparent)`,
                  borderColor: `color-mix(in srgb, ${accent} 35%, transparent)`,
                  color: accent,
                }}
              >
                {icon}
              </span>
            ) : null}
            <div className="min-w-0 flex-1">
              {title ? (
                <h2 className="text-lg font-semibold text-fog-100">{title}</h2>
              ) : null}
              {subtitle ? (
                <p className={cn("text-sm text-fog-400", title ? "mt-1" : undefined)}>
                  {subtitle}
                </p>
              ) : null}
            </div>
            {dismissible === false ? null : (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close dialog"
                className="ml-auto inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-transparent text-fog-400 transition-colors duration-200 hover:bg-abyss-700/60 hover:text-fog-100"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
          {children ? <div className="py-5">{children}</div> : null}
          {footer ? (
            <div className="flex justify-end gap-3 border-t border-abyss-600/50 pt-4">
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
