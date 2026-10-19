"use client";

import { type SortKey, SORT_OPTIONS } from "@/components/make/shared";
import { Badge, Pill } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { SearchInput, SegmentedControl, Tabs, Toggle } from "@/components/ui/Controls";
import { Icon } from "@/components/ui/Icon";

const DIFFICULTIES: number[] = [1, 2, 3, 4, 5];

/**
 * Every way to narrow 34 contracts down to the one worth launching next.
 * Purely presentational — the page owns the filter state and does the work.
 */
export function MakeFilterBar({
  tabs,
  category,
  onCategory,
  sort,
  onSort,
  difficulties,
  onToggleDifficulty,
  onClearDifficulty,
  query,
  onQuery,
  onlyRunnable,
  onOnlyRunnable,
  shown,
  total,
  runnableNow,
  rigLabel,
  dirty,
  onReset,
}: {
  tabs: { id: string; label: string; count: number; icon: string }[];
  category: string;
  onCategory: (id: string) => void;
  sort: SortKey;
  onSort: (id: string) => void;
  difficulties: number[];
  onToggleDifficulty: (level: number) => void;
  onClearDifficulty: () => void;
  query: string;
  onQuery: (value: string) => void;
  onlyRunnable: boolean;
  onOnlyRunnable: (value: boolean) => void;
  shown: number;
  total: number;
  runnableNow: number;
  rigLabel: string;
  dirty: boolean;
  onReset: () => void;
}) {
  return (
    <Card className="mb-5">
      <div className="flex flex-col gap-3.5">
        <Tabs tabs={tabs} value={category} onChange={onCategory} />

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <SegmentedControl
              options={SORT_OPTIONS}
              value={sort}
              onChange={onSort}
            />

            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-[0.12em] text-fog-500">
                Difficulty
              </span>
              <div className="flex items-center gap-1.5">
                {DIFFICULTIES.map((level) => (
                  <Pill
                    key={level}
                    active={difficulties.includes(level)}
                    onClick={() => onToggleDifficulty(level)}
                    className="px-2.5 py-1"
                  >
                    <span className="num">{level}</span>
                  </Pill>
                ))}
              </div>
              {difficulties.length > 0 ? (
                <button
                  type="button"
                  onClick={onClearDifficulty}
                  aria-label="Clear the difficulty filter"
                  className="rounded-lg p-1 text-fog-500 transition-colors hover:bg-abyss-700/70 hover:text-fog-100"
                >
                  <Icon name="X" size={13} />
                </button>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Toggle
              checked={onlyRunnable}
              onChange={onOnlyRunnable}
              label="Only what I can run right now"
            />
            <SearchInput
              value={query}
              onChange={onQuery}
              placeholder="Search contracts…"
              className="sm:w-64"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-abyss-600/40 pt-3">
          <p className="text-xs text-fog-400">
            Showing <span className="num text-fog-100">{shown}</span> of{" "}
            <span className="num text-fog-100">{total}</span> contracts
            <span className="text-fog-500"> · </span>
            <span className="num text-mint-400">{runnableNow}</span> ready on{" "}
            <span className="text-fog-200">{rigLabel}</span>
          </p>

          <div className="flex items-center gap-2">
            {dirty ? (
              <button
                type="button"
                onClick={onReset}
                className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-fog-400 transition-colors hover:bg-abyss-700/60 hover:text-fog-100"
              >
                <Icon name="RefreshCw" size={12} />
                Reset filters
              </button>
            ) : (
              <Badge tone="neutral" size="sm" icon={<Icon name="List" size={11} />}>
                full catalog
              </Badge>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
