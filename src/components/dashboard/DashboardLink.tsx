"use client";

import Link from "next/link";
import type { ReactElement, ReactNode } from "react";

import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

type LinkVariant = "primary" | "secondary" | "outline" | "ghost";
type LinkSize = "sm" | "md" | "lg";

/* Full literal class strings only — Tailwind v4 scans source text. */
const VARIANT_CLASSES: Record<LinkVariant, string> = {
  primary:
    "border border-transparent bg-gradient-to-br from-iris-500 to-iris-600 text-fog-50 shadow-lg shadow-iris-600/25 hover:from-iris-400 hover:to-iris-500 hover:shadow-iris-500/40",
  secondary:
    "border border-abyss-500/60 bg-abyss-700 text-fog-100 hover:border-abyss-400/70 hover:bg-abyss-600",
  outline:
    "border border-iris-400/45 bg-transparent text-iris-200 hover:border-iris-400/80 hover:bg-iris-500/10",
  ghost:
    "border border-transparent bg-transparent text-fog-300 hover:bg-abyss-700/60 hover:text-fog-100",
};

const SIZE_CLASSES: Record<LinkSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

/**
 * A real `next/link` that looks exactly like `Button`.
 *
 * `Button` renders a `<button>`, and nesting one inside an anchor is invalid
 * markup, so navigation CTAs use this instead — same geometry, same variants,
 * but an honest anchor element that middle-clicks and opens in a new tab.
 */
export function DashboardLink({
  href,
  children,
  variant = "outline",
  size = "md",
  icon,
  arrow = false,
  className,
}: {
  href: string;
  children: ReactNode;
  variant?: LinkVariant;
  size?: LinkSize;
  icon?: string;
  arrow?: boolean;
  className?: string;
}): ReactElement {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-abyss-950",
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      )}
    >
      {icon ? <Icon name={icon} size={14} className="shrink-0" /> : null}
      <span>{children}</span>
      {arrow ? <Icon name="ArrowRight" size={14} className="shrink-0 opacity-70" /> : null}
    </Link>
  );
}
