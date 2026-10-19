"use client";

import type { ReactElement } from "react";

import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { hoursInUse } from "@/lib/economy";
import { hours } from "@/lib/format";
import { useNow } from "@/lib/hooks";
import type { BuildRun } from "@/lib/types";

/**
 * The "hours locked in builds" pill in the workshop header.
 *
 * It borrows the shared clock on its own so the page body stays clock-free —
 * otherwise a countdown would re-render all 34 contract cards twice a second.
 * Renders nothing while no run is holding compute.
 */
export function LockedComputeBadge({
  runs,
}: {
  runs: BuildRun[];
}): ReactElement | null {
  const now = useNow();

  if (now === null) return null;

  const inUse = hoursInUse(runs, now);
  if (inUse <= 0) return null;

  return (
    <Badge tone="solar" size="md" icon={<Icon name="Timer" size={13} />}>
      <span className="num">{hours(inUse)}</span>
      <span className="text-fog-400">locked in builds</span>
    </Badge>
  );
}
