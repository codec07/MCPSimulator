"use client";

import { cn } from "@/lib/cn";

function Bar({ className }: { className?: string }) {
  return (
    <span
      className={cn("sheen block rounded-full bg-abyss-700/80", className)}
    />
  );
}

function CardPlaceholder() {
  return (
    <div className="panel flex flex-col gap-3 p-5">
      <div className="flex items-start gap-3">
        <span className="sheen h-10 w-10 shrink-0 rounded-xl bg-abyss-700/80" />
        <div className="flex-1 space-y-2">
          <Bar className="h-3.5 w-3/4" />
          <Bar className="h-2.5 w-1/3" />
        </div>
      </div>
      <Bar className="h-2.5 w-full" />
      <Bar className="h-2.5 w-5/6" />
      <div className="grid grid-cols-2 gap-2">
        {[0, 1, 2, 3].map((cell) => (
          <span
            key={cell}
            className="sheen block h-12 rounded-xl bg-abyss-700/60"
          />
        ))}
      </div>
    </div>
  );
}

/**
 * The `.sheen` placeholder shown before persisted state is readable, so the
 * server pass and the first client pass render identical markup.
 */
export function MakeSkeleton() {
  return (
    <div className="animate-fade" aria-busy="true">
      <span className="sr-only">Loading the workshop…</span>

      <div className="panel mb-6 p-6">
        <Bar className="h-2.5 w-24" />
        <Bar className="mt-3 h-7 w-64 max-w-full" />
        <Bar className="mt-3 h-3 w-full max-w-2xl" />
        <Bar className="mt-2 h-3 w-4/5 max-w-xl" />
        <div className="mt-5 flex flex-wrap gap-2">
          <span className="sheen h-9 w-28 rounded-xl bg-abyss-700/70" />
          <span className="sheen h-9 w-28 rounded-xl bg-abyss-700/70" />
          <span className="sheen h-9 w-36 rounded-xl bg-abyss-700/70" />
        </div>
      </div>

      <div className="panel mb-5 p-4">
        <div className="flex flex-wrap gap-2">
          {[0, 1, 2, 3, 4, 5].map((chunk) => (
            <span
              key={chunk}
              className="sheen h-8 w-20 rounded-lg bg-abyss-700/70"
            />
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="sheen h-8 w-56 rounded-xl bg-abyss-700/60" />
          <span className="sheen h-8 w-40 rounded-xl bg-abyss-700/60" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((card) => (
          <CardPlaceholder key={card} />
        ))}
      </div>
    </div>
  );
}
