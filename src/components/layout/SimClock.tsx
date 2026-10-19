"use client";

import { useEffect } from "react";

import { useSim } from "@/lib/store";

/**
 * Drives the simulation forward. Runs at 4 Hz, which is enough for smooth
 * progress bars without thrashing React on every animation frame.
 */
export function SimClock() {
  useEffect(() => {
    const advance = () => useSim.getState().tick();
    advance();
    const id = window.setInterval(advance, 250);
    return () => window.clearInterval(id);
  }, []);

  return null;
}
