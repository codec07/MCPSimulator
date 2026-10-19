import type { ReactElement } from "react";

import { cn } from "@/lib/cn";

/** One shimmering placeholder bar. */
function Bar({ className }: { className?: string }): ReactElement {
  return (
    <span
      aria-hidden="true"
      className={cn("sheen block rounded-full bg-abyss-700/70", className)}
    />
  );
}

function SkeletonTile(): ReactElement {
  return (
    <div className="panel flex h-36 flex-col justify-between p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <Bar className="h-2.5 w-16" />
          <Bar className="h-6 w-28" />
        </div>
        <span className="sheen h-9 w-9 rounded-xl bg-abyss-700/70" aria-hidden="true" />
      </div>
      <div className="flex flex-col gap-2">
        <Bar className="h-8 w-full" />
        <Bar className="h-2.5 w-24" />
      </div>
    </div>
  );
}

/**
 * The pre-hydration face of the dashboard.
 *
 * Persisted state is only read back on the client, so rendering it on the
 * server would flash the "$20 / 10h" starting position. This skeleton keeps
 * the first paint stable and honest instead.
 */
export function DashboardSkeleton(): ReactElement {
  const stagger = (index: number) => ({ animationDelay: `${index * 55}ms` });

  return (
    <div className="flex flex-col gap-5" aria-busy="true">
      <span className="sr-only">Loading your command deck…</span>

      <div className="panel relative overflow-hidden p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <span className="sheen h-11 w-11 rounded-xl bg-abyss-700/70" aria-hidden="true" />
            <div className="flex flex-col gap-2">
              <Bar className="h-2.5 w-24" />
              <Bar className="h-7 w-56" />
              <Bar className="h-2.5 w-72 max-w-full" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="sheen h-10 w-32 rounded-xl bg-abyss-700/70" aria-hidden="true" />
            <span className="sheen h-10 w-28 rounded-xl bg-abyss-700/70" aria-hidden="true" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="animate-rise" style={stagger(index)}>
            <SkeletonTile />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="flex flex-col gap-5 xl:col-span-2">
          <div className="panel flex flex-col gap-4 p-5">
            <Bar className="h-4 w-32" />
            <Bar className="h-40 w-full rounded-2xl" />
          </div>
          <div className="panel flex flex-col gap-3 p-5">
            <Bar className="h-4 w-28" />
            {[0, 1, 2, 3].map((index) => (
              <Bar key={index} className="h-10 w-full rounded-xl" />
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-5">
          <div className="panel flex flex-col gap-4 p-5">
            <Bar className="h-4 w-24" />
            <Bar className="h-32 w-full rounded-2xl" />
          </div>
          <div className="panel flex flex-col gap-4 p-5">
            <Bar className="h-4 w-28" />
            <div className="grid grid-cols-3 gap-2">
              {[0, 1, 2, 3, 4, 5].map((index) => (
                <Bar key={index} className="h-12 w-full rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
