/**
 * Display formatters. Everything the simulator shows is fake money, but it
 * should still read like a real dashboard.
 */

const usd0 = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const usd2 = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** "$1,240" — compact money for hero numbers. */
export function money(n: number): string {
  if (!Number.isFinite(n)) return "$0";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) {
    return `$${(n / 1_000_000).toFixed(abs >= 10_000_000 ? 1 : 2)}M`;
  }
  return usd0.format(n);
}

/** "$12.40" — precise money for ledgers and prices. */
export function money2(n: number): string {
  if (!Number.isFinite(n)) return "$0.00";
  if (Math.abs(n) >= 1_000_000) return money(n);
  return usd2.format(n);
}

/** "$12.40" with an explicit sign, for transactions. */
export function moneySigned(n: number): string {
  const sign = n > 0 ? "+" : n < 0 ? "\u2212" : "";
  return `${sign}${money2(Math.abs(n))}`;
}

/** "1.2M", "845K", "12" — token counts. */
export function tokens(n: number): string {
  if (!Number.isFinite(n)) return "0";
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `${trim(n / 1_000_000_000)}B`;
  if (abs >= 1_000_000) return `${trim(n / 1_000_000)}M`;
  if (abs >= 1_000) return `${trim(n / 1_000)}K`;
  return String(Math.round(n));
}

export function tokensLong(n: number): string {
  return `${Math.round(n).toLocaleString("en-US")}`;
}

function trim(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 100) return v.toFixed(0);
  if (abs >= 10) return v.toFixed(1);
  return v.toFixed(2).replace(/\.?0+$/, "");
}

/** "18h 30m" / "42m" / "12s" */
export function hours(n: number): string {
  if (!Number.isFinite(n)) return "0h";
  const total = Math.max(0, n);
  if (total >= 100) return `${total.toFixed(0)}h`;
  const h = Math.floor(total);
  const m = Math.round((total - h) * 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** "1h 04m 22s" — precise compute readout. */
export function hoursPrecise(n: number): string {
  const total = Math.max(0, n);
  const h = Math.floor(total);
  const m = Math.floor((total - h) * 60);
  const s = Math.floor(((total - h) * 60 - m) * 60);
  return `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
}

/** "2m 14s" / "48s" — countdown for a running build. */
export function duration(seconds: number): string {
  const total = Math.max(0, Math.ceil(seconds));
  if (total < 60) return `${total}s`;
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (m < 60) return s === 0 ? `${m}m` : `${m}m ${String(s).padStart(2, "0")}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${String(m % 60).padStart(2, "0")}m`;
}

/** "just now" / "4m ago" / "Mar 3" */
export function timeAgo(epochMs: number, now = Date.now()): string {
  const diff = Math.max(0, now - epochMs);
  const s = Math.floor(diff / 1000);
  if (s < 10) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(epochMs).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/** 0.42 -> "42%" */
export function pct(n: number, digits = 0): string {
  return `${(n * 100).toFixed(digits)}%`;
}

/** "2.4x" */
export function multiplier(n: number): string {
  return `${n.toFixed(2).replace(/\.?0+$/, "")}x`;
}

/** "1,204" */
export function count(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

export function titleCase(s: string): string {
  return s.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Deterministic 0–1 hash, so "random" flourishes stay stable per key. */
export function seeded(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}
