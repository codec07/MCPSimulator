import type { ReactNode } from "react";

import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

/**
 * The shared page banner. Every page opens with one so the shell reads
 * consistently no matter which tab the player is on.
 */
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  icon,
  accent = "#7c5cff",
  actions,
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: string;
  accent?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "panel relative mb-6 overflow-hidden p-5 sm:p-6",
        className,
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full blur-3xl opacity-20"
        style={{ background: accent }}
      />
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
        }}
      />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          {icon && (
            <span
              className="mt-0.5 grid h-11 w-11 shrink-0 place-items-center rounded-xl border"
              style={{
                borderColor: `${accent}55`,
                background: `color-mix(in srgb, ${accent} 14%, transparent)`,
              }}
            >
              <Icon name={icon} size={20} style={{ color: accent }} />
            </span>
          )}
          <div>
            {eyebrow && (
              <p
                className="text-[11px] font-semibold uppercase tracking-[0.18em]"
                style={{ color: accent }}
              >
                {eyebrow}
              </p>
            )}
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-fog-50 sm:text-3xl">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-fog-400">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
