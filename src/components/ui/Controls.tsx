"use client";

import { Minus, Plus, Search, X } from "lucide-react";
import type { ChangeEvent, ReactElement, ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

const STEPPER_BUTTON =
  "grid h-8 w-8 shrink-0 place-items-center text-fog-300 transition-colors hover:bg-abyss-700/70 hover:text-fog-100 disabled:cursor-not-allowed disabled:opacity-35";

/** Scrollable tab strip with an iris-tinted active pill. */
export function Tabs({
  tabs,
  value,
  onChange,
  className,
  size = "md",
}: {
  tabs: { id: string; label: string; count?: number; icon?: string }[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
  size?: "sm" | "md";
}): ReactElement {
  const compact = size === "sm";

  return (
    <div
      role="tablist"
      className={cn(
        "scroll-thin flex w-full items-center gap-1 overflow-x-auto rounded-xl border border-abyss-600/60 bg-abyss-900/60 p-1",
        className,
      )}
    >
      {tabs.map((tab) => {
        const active = tab.id === value;

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-lg font-medium transition-colors",
              compact ? "px-2.5 py-1.5 text-xs" : "px-3 py-2 text-sm",
              active
                ? "bg-iris-500/15 text-iris-200 shadow-[inset_0_0_0_1px_rgba(154,125,255,0.32),inset_0_1px_0_0_rgba(214,204,255,0.16)]"
                : "text-fog-400 hover:bg-abyss-800/70 hover:text-fog-100",
            )}
          >
            {tab.icon ? (
              <Icon name={tab.icon} size={compact ? 13 : 15} className="shrink-0" />
            ) : null}
            <span className="whitespace-nowrap">{tab.label}</span>
            {typeof tab.count === "number" ? (
              <span
                className={cn(
                  "num rounded-md px-1.5 py-0.5 text-[10px] leading-none",
                  active
                    ? "bg-iris-500/25 text-iris-200"
                    : "bg-abyss-700/80 text-fog-400",
                )}
              >
                {tab.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/** Controlled search field with a leading icon and a clear affordance. */
export function SearchInput({
  value,
  onChange,
  placeholder,
  className,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}): ReactElement {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value);
  };

  return (
    <div className={cn("relative w-full", className)}>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fog-500"
      />
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder ?? "Search"}
        autoFocus={autoFocus}
        autoComplete="off"
        spellCheck={false}
        aria-label={placeholder ?? "Search"}
        className="w-full rounded-xl border border-abyss-600/60 bg-abyss-900/70 py-2 pl-9 pr-9 text-sm text-fog-100 transition-colors placeholder:text-fog-500 hover:border-abyss-500/70 focus:border-iris-400/60 focus:outline-none"
      />
      {value.length > 0 ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-md text-fog-500 transition-colors hover:bg-abyss-700/70 hover:text-fog-100"
        >
          <X aria-hidden="true" className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}

/** Single-row pill switcher without count chips. */
export function SegmentedControl({
  options,
  value,
  onChange,
  className,
}: {
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
}): ReactElement {
  return (
    <div
      role="group"
      className={cn(
        "inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-xl border border-abyss-600/60 bg-abyss-900/60 p-1",
        className,
      )}
    >
      {options.map((option) => {
        const active = option.id === value;

        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.id)}
            className={cn(
              "shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              active
                ? "bg-abyss-700 text-fog-100 shadow-[inset_0_1px_0_0_rgba(244,246,252,0.08)]"
                : "text-fog-400 hover:text-fog-100",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** Numeric `−` / value / `+` control, clamped to `min`/`max` by `step`. */
export function Stepper({
  value,
  min,
  max,
  step = 1,
  onChange,
  format,
  className,
  label,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  format?: (n: number) => string;
  className?: string;
  label?: string;
}): ReactElement {
  const delta = step > 0 ? step : 1;
  const atMin = value <= min;
  const atMax = value >= max;
  const text = format ? format(value) : String(value);
  const name = label ?? "value";

  return (
    <div className={cn("inline-flex flex-col gap-1", className)}>
      {label ? (
        <span className="text-[10px] uppercase tracking-wider text-fog-500">
          {label}
        </span>
      ) : null}

      <div className="inline-flex items-center rounded-xl border border-abyss-600/60 bg-abyss-900/70 p-0.5">
        <button
          type="button"
          aria-label={`Decrease ${name}`}
          disabled={atMin}
          onClick={() => onChange(Math.min(Math.max(value - delta, min), max))}
          className={cn(STEPPER_BUTTON, "rounded-lg")}
        >
          <Minus aria-hidden="true" className="h-3.5 w-3.5" />
        </button>
        <span className="num min-w-10 px-1 text-center text-sm text-fog-100">
          {text}
        </span>
        <button
          type="button"
          aria-label={`Increase ${name}`}
          disabled={atMax}
          onClick={() => onChange(Math.min(Math.max(value + delta, min), max))}
          className={cn(STEPPER_BUTTON, "rounded-lg")}
        >
          <Plus aria-hidden="true" className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

/** 44×24 switch with a 20×20 sliding knob. */
export function Toggle({
  checked,
  onChange,
  label,
  className,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  className?: string;
}): ReactElement {
  const control = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors",
        checked
          ? "border-iris-400/60 bg-iris-500/90"
          : "border-abyss-500/70 bg-abyss-700",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "block h-5 w-5 rounded-full bg-fog-50 shadow-md transition-transform duration-200 ease-out",
          checked ? "translate-x-[22px]" : "translate-x-[2px]",
        )}
      />
    </button>
  );

  if (label) {
    return (
      <label
        className={cn(
          "inline-flex cursor-pointer select-none items-center gap-2.5",
          className,
        )}
      >
        {control}
        <span className="text-sm text-fog-200">{label}</span>
      </label>
    );
  }

  return (
    <span className={cn("inline-flex items-center", className)}>{control}</span>
  );
}

/** Hover and focus-within tooltip; the child must be focusable. */
export function Tooltip({
  content,
  children,
  className,
}: {
  content: ReactNode;
  children: ReactNode;
  className?: string;
}): ReactElement {
  return (
    <span className={cn("group relative inline-flex", className)}>
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border border-abyss-500/60 bg-abyss-800 px-2 py-1 text-[11px] text-fog-200 shadow-xl group-hover:block group-focus-within:block"
      >
        {content}
      </span>
    </span>
  );
}
