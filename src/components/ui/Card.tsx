import type {
  CSSProperties,
  HTMLAttributes,
  ReactElement,
  ReactNode,
} from "react";

import { cn } from "@/lib/cn";

const IRIS_ACCENT = "#7c5cff";

/** Translucent tint/border derived from an arbitrary hex accent. */
function accentTint(accent: string, percent: number): string {
  return `color-mix(in srgb, ${accent} ${percent}%, transparent)`;
}

export function Card({
  hover,
  padded,
  accent,
  glow,
  className,
  children,
  style,
  ...rest
}: HTMLAttributes<HTMLDivElement> & {
  hover?: boolean;
  padded?: boolean;
  accent?: string;
  glow?: boolean;
}): ReactElement {
  const glowColor = accent ?? IRIS_ACCENT;

  const mergedStyle: CSSProperties | undefined = accent
    ? ({ ...style, "--card-accent": accent } as CSSProperties)
    : style;

  return (
    <div
      className={cn(
        "panel",
        hover && "panel-hover",
        padded !== false && "p-5",
        className,
      )}
      style={mergedStyle}
      {...rest}
    >
      {accent ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{
            background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
          }}
        />
      ) : null}
      {glow ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 right-0 h-40 w-40 rounded-full opacity-25 blur-3xl"
          style={{ background: glowColor }}
        />
      ) : null}
      <div className="relative">{children}</div>
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  icon,
  action,
  className,
  accent,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
  accent?: string;
}): ReactElement {
  return (
    <div
      className={cn(
        "flex items-center gap-3",
        action ? "mb-4 border-b border-abyss-600/50 pb-4" : "mb-4",
        className,
      )}
    >
      {icon ? (
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
            !accent && "border-iris-400/30 bg-iris-500/12 text-iris-300",
          )}
          style={
            accent
              ? {
                  backgroundColor: accentTint(accent, 15),
                  borderColor: accentTint(accent, 35),
                  color: accent,
                }
              : undefined
          }
        >
          {icon}
        </span>
      ) : null}
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-fog-100">
          {title}
        </div>
        {subtitle ? (
          <div className="mt-0.5 text-xs text-fog-400">{subtitle}</div>
        ) : null}
      </div>
      {action ? <div className="ml-auto shrink-0">{action}</div> : null}
    </div>
  );
}

export function SectionTitle({
  eyebrow,
  title,
  subtitle,
  action,
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  className?: string;
}): ReactElement {
  return (
    <div
      className={cn("flex items-end justify-between gap-4", className)}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <div className="mb-1 text-[11px] font-semibold tracking-[0.18em] text-iris-300 uppercase">
            {eyebrow}
          </div>
        ) : null}
        <h2 className="text-lg font-semibold text-fog-100">{title}</h2>
        {subtitle ? (
          <p className="mt-1 text-sm text-fog-400">{subtitle}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
