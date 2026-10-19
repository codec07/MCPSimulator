"use client";

import { Loader2 } from "lucide-react";
import type {
  ButtonHTMLAttributes,
  ReactElement,
  ReactNode,
} from "react";

import { cn } from "@/lib/cn";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger"
  | "success"
  | "subtle";

export type ButtonSize = "sm" | "md" | "lg" | "icon";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

/* Full literal class strings only — Tailwind v4 scans source text. */
const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "border border-transparent bg-gradient-to-br from-iris-500 to-iris-600 text-fog-50 shadow-lg shadow-iris-600/25 hover:from-iris-400 hover:to-iris-500 hover:shadow-iris-500/40",
  secondary:
    "border border-abyss-500/60 bg-abyss-700 text-fog-100 hover:border-abyss-400/70 hover:bg-abyss-600",
  outline:
    "border border-iris-400/45 bg-transparent text-iris-200 hover:border-iris-400/80 hover:bg-iris-500/10",
  ghost:
    "border border-transparent bg-transparent text-fog-300 hover:bg-abyss-700/60 hover:text-fog-100",
  danger:
    "border border-transparent bg-gradient-to-br from-ember-500 to-ember-400 text-abyss-950 shadow-lg shadow-ember-500/25 hover:from-ember-400 hover:to-ember-500 hover:shadow-ember-400/35",
  success:
    "border border-transparent bg-gradient-to-br from-mint-400 to-mint-600 text-abyss-950 shadow-lg shadow-mint-500/25 hover:from-mint-300 hover:to-mint-500 hover:shadow-mint-400/35",
  subtle:
    "border border-iris-400/20 bg-iris-500/12 text-iris-200 hover:border-iris-400/40 hover:bg-iris-500/20",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
  icon: "h-9 w-9 p-0",
};

const BASE_CLASSES =
  "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-abyss-950 disabled:opacity-45 disabled:pointer-events-none";

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  className,
  children,
  disabled,
  type = "button",
  ...rest
}: ButtonProps): ReactElement {
  return (
    <button
      type={type}
      className={cn(
        BASE_CLASSES,
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        fullWidth && "w-full",
        className,
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
      ) : leftIcon ? (
        <span className="shrink-0" aria-hidden="true">
          {leftIcon}
        </span>
      ) : null}
      {children}
      {rightIcon ? (
        <span className="shrink-0" aria-hidden="true">
          {rightIcon}
        </span>
      ) : null}
    </button>
  );
}
