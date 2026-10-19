"use client";

import type { ReactElement } from "react";

import { Card, CardHeader } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { moneySigned, timeAgo } from "@/lib/format";
import { useNow } from "@/lib/hooks";
import { useSim } from "@/lib/store";
import { cn } from "@/lib/cn";

const KIND_META: Record<string, { icon: string; tone: string; label: string }> = {
  grant: { icon: "Gift", tone: "text-iris-300", label: "Grant" },
  "purchase-model": { icon: "Coins", tone: "text-iris-300", label: "Tokens" },
  "purchase-compute": { icon: "Server", tone: "text-aqua-400", label: "Compute" },
  build: { icon: "Rocket", tone: "text-solar-300", label: "Build" },
  "project-payout": { icon: "TrendingUp", tone: "text-mint-300", label: "Payout" },
  bailout: { icon: "PiggyBank", tone: "text-solar-300", label: "Top-up" },
  penalty: { icon: "AlertTriangle", tone: "text-ember-400", label: "Failure" },
};

const FALLBACK = { icon: "CircleDot", tone: "text-fog-400", label: "Ledger" };

const FEED_LENGTH = 12;

/** The ledger, newest first — every dollar in and out of the account. */
export function ActivityFeed(): ReactElement {
  const now = useNow();
  const history = useSim((s) => s.history);
  const entries = history.slice(0, FEED_LENGTH);

  return (
    <Card accent="#a3e635">
      <CardHeader
        accent="#a3e635"
        icon={<Icon name="List" size={16} />}
        title="Activity"
        subtitle={
          <>
            last <span className="num text-fog-300">{entries.length}</span> of{" "}
            <span className="num text-fog-300">{history.length}</span> ledger
            entries
          </>
        }
      />

      {entries.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-abyss-500/60 bg-abyss-900/40 px-6 py-9 text-center text-xs text-fog-400">
          Nothing has happened yet. Your first purchase or build will appear here.
        </p>
      ) : (
        <ul className="scroll-thin flex max-h-[420px] flex-col gap-2 overflow-y-auto pr-1">
          {entries.map((entry) => {
            const meta = KIND_META[entry.kind] ?? FALLBACK;
            const positive = entry.amount > 0;
            const negative = entry.amount < 0;
            return (
              <li
                key={entry.id}
                className="flex items-start gap-3 rounded-xl border border-abyss-600/50 bg-abyss-900/60 px-3 py-2.5"
              >
                <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-abyss-500/60 bg-abyss-800">
                  <Icon name={meta.icon} size={13} className={meta.tone} />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-xs font-semibold text-fog-100">
                      {entry.label}
                    </span>
                    <span className="shrink-0 text-[9px] uppercase tracking-[0.12em] text-fog-500">
                      {meta.label}
                    </span>
                  </span>
                  {entry.detail ? (
                    <span className="mt-0.5 block truncate text-[11px] text-fog-500">
                      {entry.detail}
                    </span>
                  ) : null}
                </span>

                <span className="shrink-0 text-right">
                  <span
                    className={cn(
                      "num block text-xs font-semibold",
                      positive && "text-mint-300",
                      negative && "text-ember-400",
                      !positive && !negative && "text-fog-400",
                    )}
                  >
                    {entry.amount === 0 ? "—" : moneySigned(entry.amount)}
                  </span>
                  <span className="num block text-[10px] text-fog-500">
                    {now === null ? "—" : timeAgo(entry.at, now)}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
