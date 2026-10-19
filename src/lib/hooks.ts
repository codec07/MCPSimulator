"use client";

import { useCallback, useRef, useSyncExternalStore } from "react";

import { useSim } from "@/lib/store";

/** A store that never changes — used for one-shot client reads. */
const noopSubscribe = () => () => {};

/**
 * Read a value that only exists in the browser: the clock, `location.search`,
 * `matchMedia`, and so on.
 *
 * `useSyncExternalStore` renders `server` during SSR *and* during hydration,
 * then swaps to the `client` value on the next pass. That ordering is exactly
 * what stops `Date.now()` from causing a hydration mismatch — and unlike
 * `useState` + `useEffect`, it does not cascade a render.
 */
export function useClientValue<T>(client: () => T, server: T): T {
  const getSnapshot = useCallback(() => client(), [client]);
  const getServerSnapshot = useCallback(() => server, [server]);
  return useSyncExternalStore(noopSubscribe, getSnapshot, getServerSnapshot);
}

/* ------------------------------------------------------------------ */
/* The shared clock                                                    */
/* ------------------------------------------------------------------ */

/**
 * One 500 ms interval for the entire app, shared by every `useNow()` caller.
 *
 * The previous version gave each caller its own `setInterval`, and callers
 * lived at the *page* level — so `/make` re-rendered all 34 contract cards and
 * their SVGs twice a second just to move a countdown. Subscribing through a
 * single module-level store means one notification per tick (React batches
 * them into one commit) and only the components that genuinely display a
 * countdown re-render. The card grids around them stay untouched.
 */
const CLOCK_MS = 500;
const clockListeners = new Set<() => void>();
let clockValue = 0;
let clockTimer: number | null = null;

function subscribeClock(onStoreChange: () => void): () => void {
  // Seed on first subscribe so callers get a real timestamp, not the sentinel.
  if (clockValue === 0) clockValue = Date.now();
  clockListeners.add(onStoreChange);

  if (clockTimer === null) {
    clockTimer = window.setInterval(() => {
      clockValue = Date.now();
      for (const listener of clockListeners) listener();
    }, CLOCK_MS);
  }

  onStoreChange();

  return () => {
    clockListeners.delete(onStoreChange);
    // Never leave an interval running with nothing watching it.
    if (clockListeners.size === 0 && clockTimer !== null) {
      window.clearInterval(clockTimer);
      clockTimer = null;
      clockValue = 0;
    }
  };
}

const getClockSnapshot = () => clockValue;
const getClockServerSnapshot = () => 0;

/**
 * The shared ticking clock. Returns `null` while rendering on the server and on
 * the first client pass, then advances every 500 ms.
 *
 * Call this from the leaf component that displays a countdown — never from a
 * page — so the tick cannot cascade through a long list.
 */
export function useNow(): number | null {
  const value = useSyncExternalStore(
    subscribeClock,
    getClockSnapshot,
    getClockServerSnapshot,
  );
  return value === 0 ? null : value;
}

const clientTrue = () => true;
const serverFalse = () => false;

/** True only after the component has mounted on the client. */
export function useMounted(): boolean {
  return useSyncExternalStore(noopSubscribe, clientTrue, serverFalse);
}

/** True once persisted state has been read back from localStorage. */
export function useHydrated(): boolean {
  const hydrated = useSim((s) => s.hydrated);
  const mounted = useMounted();
  return hydrated || mounted;
}

/** Interval-driven counter, useful for placeholder/shimmer states. */
export function useTick(intervalMs = 500): number {
  const ref = useRef(0);
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const id = window.setInterval(() => {
        ref.current += 1;
        onStoreChange();
      }, intervalMs);
      return () => window.clearInterval(id);
    },
    [intervalMs],
  );
  const getSnapshot = useCallback(() => ref.current, []);
  const getServerSnapshot = useCallback(() => 0, []);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
