"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

type LinkVariant = "outline" | "subtle" | "ghost" | "secondary";
type LinkSize = "sm" | "md" | "lg";

/* Literal class strings only — Tailwind v4 scans source text. */
const VARIANT_CLASSES: Record<LinkVariant, string> = {
  outline:
    "border border-iris-400/45 bg-transparent text-iris-200 hover:border-iris-400/80 hover:bg-iris-500/10",
  subtle:
    "border border-iris-400/20 bg-iris-500/12 text-iris-200 hover:border-iris-400/40 hover:bg-iris-500/20",
  ghost:
    "border border-transparent text-fog-300 hover:bg-abyss-700/60 hover:text-fog-100",
  secondary:
    "border border-abyss-500/60 bg-abyss-700 text-fog-100 hover:border-abyss-400/70 hover:bg-abyss-600",
};

const SIZE_CLASSES: Record<LinkSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

/**
 * A real anchor that reads like a `Button`, for the many "go buy something"
 * shortcuts on the Make page. Kept here because `<a>` cannot wrap `<button>`.
 */
export function BuyLink({
  href = "/buy",
  label,
  children,
  icon = "ShoppingCart",
  variant = "outline",
  size = "md",
  className,
}: {
  href?: string;
  label?: string;
  children?: ReactNode;
  icon?: string | null;
  variant?: LinkVariant;
  size?: LinkSize;
  className?: string;
}) {
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
      {icon ? <Icon name={icon} size={size === "sm" ? 13 : 15} /> : null}
      {children ?? label}
    </Link>
  );
}
