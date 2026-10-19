import type { ReactElement, ReactNode } from "react";

import { cn } from "@/lib/cn";

export type Tone =
  | "neutral"
  | "iris"
  | "mint"
  | "solar"
  | "ember"
  | "aqua"
  | "plasma";

/* Full literal class strings only — Tailwind v4 scans source text. */
const BADGE_TONE_CLASSES: Record<Tone, string> = {
  neutral: "text-fog-200 bg-abyss-600/50 border-abyss-500/60",
  iris: "text-iris-200 bg-iris-500/12 border-iris-400/30",
  mint: "text-mint-300 bg-mint-500/12 border-mint-400/30",
  solar: "text-solar-300 bg-solar-500/12 border-solar-400/30",
  ember: "text-ember-400 bg-ember-500/12 border-ember-400/30",
  aqua: "text-aqua-400 bg-aqua-500/12 border-aqua-400/30",
  plasma: "text-plasma-400 bg-plasma-500/12 border-plasma-400/30",
};

const BADGE_SIZE_CLASSES: Record<"sm" | "md", string> = {
  sm: "text-[10px] px-2 py-0.5",
  md: "text-xs px-2.5 py-1",
};

export function Badge({
  children,
  tone = "neutral",
  size = "sm",
  icon,
  className,
  dot,
}: {
  children: ReactNode;
  tone?: Tone;
  size?: "sm" | "md";
  icon?: ReactNode;
  className?: string;
  dot?: boolean;
}): ReactElement {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium tracking-wide",
        BADGE_TONE_CLASSES[tone],
        BADGE_SIZE_CLASSES[size],
        className,
      )}
    >
      {dot ? (
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 rounded-full bg-current"
        />
      ) : null}
      {icon ? (
        <span className="shrink-0" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      {children}
    </span>
  );
}

export function Pill({
  children,
  className,
  active,
  onClick,
  icon,
}: {
  children: ReactNode;
  className?: string;
  active?: boolean;
  onClick?: () => void;
  icon?: ReactNode;
}): ReactElement {
  const classes = cn(
    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-all duration-200",
    active
      ? "border-iris-400/50 bg-iris-500/12 text-iris-200"
      : "border-abyss-500/60 bg-abyss-800/70 text-fog-300 hover:border-iris-400/40 hover:text-fog-100",
    className,
  );

  const inner = (
    <>
      {icon ? (
        <span className="shrink-0" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      {children}
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={classes}>
        {inner}
      </button>
    );
  }

  return <span className={classes}>{inner}</span>;
}
