"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { BuyLink } from "@/components/make/BuyLink";
import { FlashToast, type Flash } from "@/components/make/FlashToast";
import { LiveBuilds } from "@/components/make/LiveBuilds";
import { LockedComputeBadge } from "@/components/make/LockedComputeBadge";
import { MakeFilterBar } from "@/components/make/MakeFilterBar";
import { MakeSkeleton } from "@/components/make/MakeSkeleton";
import { ProjectCard } from "@/components/make/ProjectCard";
import { ProjectDetailModal } from "@/components/make/ProjectDetailModal";
import {
  capabilityMetaOf,
  categoryMetaOf,
  runnabilityOf,
  sortRows,
  type ProjectRow,
  type SortKey,
} from "@/components/make/shared";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { PROJECT_BY_ID, PROJECT_CATEGORY_META, PROJECTS } from "@/data/projects";
import {
  LOW_BALANCE_THRESHOLD,
  isRunnable,
  maxBatchFromProjection,
  projectionOf,
} from "@/lib/economy";
import { hours, money2 } from "@/lib/format";
import { useHydrated } from "@/lib/hooks";
import { useSim } from "@/lib/store";
import type { ProjectCategory, ProjectDef } from "@/lib/types";

const CATEGORY_ORDER = Object.keys(PROJECT_CATEGORY_META) as ProjectCategory[];

/** How long a launch confirmation stays on screen. */
const FLASH_MS = 2600;

/**
 * The workshop. Note what is deliberately *absent*: a clock.
 *
 * `useNow()` used to run at this level, so every 500 ms tick re-rendered all 34
 * contract cards and their SVGs. The two things that genuinely need the time —
 * the live-build strip and the "hours locked" pill — subscribe to the shared
 * clock themselves, so this grid only re-renders when the figures it is priced
 * from actually change.
 */
export default function MakePage() {
  const hydrated = useHydrated();
  const sim = useSim((state) => state);
  const startBuild = useSim((state) => state.startBuild);
  const cancelBuild = useSim((state) => state.cancelBuild);
  const cancelBatch = useSim((state) => state.cancelBatch);

  const [category, setCategory] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("pay");
  const [difficulties, setDifficulties] = useState<number[]>([]);
  const [query, setQuery] = useState("");
  const [onlyRunnable, setOnlyRunnable] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [failReason, setFailReason] = useState<string | null>(null);
  const [flash, setFlash] = useState<Flash | null>(null);

  const { cash, computeHours, holdings, fleet, runs, completed } = sim;

  /* Toasts clear themselves; a new flash restarts the clock. */
  useEffect(() => {
    if (!flash) return;
    const id = window.setTimeout(() => setFlash(null), FLASH_MS);
    return () => window.clearTimeout(id);
  }, [flash]);

  const categoryTabs = useMemo(
    () => [
      { id: "all", label: "All", count: PROJECTS.length, icon: "LayoutGrid" },
      ...CATEGORY_ORDER.map((key) => {
        const meta = categoryMetaOf(key);
        return {
          id: key,
          label: meta.label,
          count: PROJECTS.filter((project) => project.category === key).length,
          icon: meta.icon,
        };
      }),
    ],
    [],
  );

  /* Every number on the page is priced against the player's own rig. */
  const rows = useMemo<ProjectRow[]>(() => {
    const needle = query.trim().toLowerCase();
    const found: ProjectRow[] = [];

    for (const def of PROJECTS) {
      if (category !== "all" && def.category !== category) continue;
      if (difficulties.length > 0 && !difficulties.includes(def.difficulty)) {
        continue;
      }
      if (needle) {
        const haystack = `${def.title} ${def.tagline} ${def.description} ${def.tasks.join(
          " ",
        )}`.toLowerCase();
        if (!haystack.includes(needle)) continue;
      }

      const projection = projectionOf(
        def,
        fleet,
        holdings,
        completed[def.id] ?? 0,
      );
      const readiness = runnabilityOf(def, projection, fleet.tier, computeHours);

      if (onlyRunnable) {
        // `isRunnable` is the economy's fleet/tokens verdict; a launch also
        // needs enough free hours to reserve the rig's share of the load.
        const verdict = isRunnable(def, sim);
        if (!verdict.ok || computeHours < projection.billedHours) continue;
      }

      found.push({
        def,
        projection,
        readiness,
        maxBatch: maxBatchFromProjection(
          def,
          projection,
          fleet.tier,
          holdings,
          computeHours,
        ),
      });
    }

    return sortRows(found, sort);
  }, [
    category,
    completed,
    computeHours,
    difficulties,
    fleet,
    holdings,
    onlyRunnable,
    query,
    sim,
    sort,
  ]);

  const openRow = useMemo<ProjectRow | null>(() => {
    const def: ProjectDef | undefined =
      openId === null ? undefined : PROJECT_BY_ID[openId];
    if (!def) return null;
    const projection = projectionOf(
      def,
      fleet,
      holdings,
      completed[def.id] ?? 0,
    );
    return {
      def,
      projection,
      readiness: runnabilityOf(def, projection, fleet.tier, computeHours),
      maxBatch: maxBatchFromProjection(
        def,
        projection,
        fleet.tier,
        holdings,
        computeHours,
      ),
    };
  }, [openId, fleet, holdings, computeHours, completed]);

  const runnableNow = rows.filter((row) => row.readiness.ok).length;
  const dirty =
    category !== "all" ||
    difficulties.length > 0 ||
    query.trim().length > 0 ||
    onlyRunnable ||
    sort !== "pay";
  const low = cash < LOW_BALANCE_THRESHOLD;

  const toggleDifficulty = useCallback((level: number) => {
    setDifficulties((prev) =>
      prev.includes(level)
        ? prev.filter((value) => value !== level)
        : [...prev, level].sort((a, b) => a - b),
    );
  }, []);

  const resetFilters = useCallback(() => {
    setCategory("all");
    setDifficulties([]);
    setQuery("");
    setOnlyRunnable(false);
    setSort("pay");
  }, []);

  const handleOpen = useCallback((def: ProjectDef) => {
    setFailReason(null);
    setOpenId(def.id);
  }, []);

  const handleClose = useCallback(() => {
    setOpenId(null);
    setFailReason(null);
  }, []);

  const handleBuild = useCallback(
    (def: ProjectDef, count: number) => {
      const result = startBuild(def.id, count);

      if (result.ok) {
        setOpenId(null);
        setFailReason(null);
        setFlash({
          tone: "mint",
          title:
            count > 1
              ? `Batch launched — ${def.title} ×${count}`
              : `Build launched — ${def.title}`,
          message: result.message ?? "Your rig is on it. Watch the live strip.",
        });
        return;
      }

      const capability = capabilityMetaOf(def.capability);
      const reason =
        result.reason === "fleet"
          ? `Your rig can't take this on — it needs a tier-${def.minFleetTier} fleet.`
          : result.reason === "tokens"
            ? `Not enough eligible tokens. This run needs ${capability.label.toLowerCase()} pools you don't hold enough of yet.`
            : result.reason === "compute"
              ? "Not enough free compute hours to reserve this rig's share of the load."
              : "That build could not be started.";

      setFailReason(reason);
      setFlash({ tone: "ember", title: "Launch blocked", message: reason });
    },
    [startBuild],
  );

  if (!hydrated) return <MakeSkeleton />;

  return (
    <div className="relative">
      <PageHeader
        eyebrow="Workshop"
        title="Find work"
        subtitle="Shipping a contract pays out — but it burns a fixed token bill and reserves compute hours up front. Your rig decides how long the job takes and how many of your own hours it eats, so every price below is quoted for the fleet you actually own."
        icon="Rocket"
        accent="#2ee0a4"
        actions={
          <>
            <Badge
              tone={low ? "ember" : "mint"}
              size="md"
              icon={<Icon name="CircleDollarSign" size={13} />}
            >
              <span className="text-fog-400">balance</span>
              <span className="num font-semibold">{money2(cash)}</span>
            </Badge>
            <Badge
              tone="aqua"
              size="md"
              icon={<Icon name="Gauge" size={13} />}
            >
              <span className="text-fog-400">compute free</span>
              <span className="num font-semibold">{hours(computeHours)}</span>
            </Badge>
            <LockedComputeBadge runs={runs} />
            <BuyLink href="/buy" label="Buy tokens & compute" />
          </>
        }
      />

      <LiveBuilds
        runs={runs}
        onCancel={cancelBuild}
        onCancelBatch={cancelBatch}
      />

      <MakeFilterBar
        tabs={categoryTabs}
        category={category}
        onCategory={setCategory}
        sort={sort}
        onSort={(id) => setSort(id as SortKey)}
        difficulties={difficulties}
        onToggleDifficulty={toggleDifficulty}
        onClearDifficulty={() => setDifficulties([])}
        query={query}
        onQuery={setQuery}
        onlyRunnable={onlyRunnable}
        onOnlyRunnable={setOnlyRunnable}
        shown={rows.length}
        total={PROJECTS.length}
        runnableNow={runnableNow}
        rigLabel={fleet.name}
        dirty={dirty}
        onReset={resetFilters}
      />

      {rows.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 py-10 text-center">
          <span className="grid h-11 w-11 place-items-center rounded-xl border border-abyss-500/60 bg-abyss-800/60 text-fog-500">
            <Icon name="Search" size={18} />
          </span>
          <p className="text-sm font-medium text-fog-200">
            No contracts match those filters
          </p>
          <p className="max-w-md text-xs leading-relaxed text-fog-500">
            Loosen the difficulty pills, clear the search box, or switch off the
            “only what I can run” toggle.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            leftIcon={<Icon name="RefreshCw" size={13} />}
            onClick={resetFilters}
          >
            Reset filters
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((row, index) => (
            <ProjectCard
              key={row.def.id}
              row={row}
              index={index}
              shipped={completed[row.def.id] ?? 0}
              onOpen={handleOpen}
            />
          ))}
        </div>
      )}

      {openRow ? (
        <ProjectDetailModal
          def={openRow.def}
          projection={openRow.projection}
          readiness={openRow.readiness}
          fleet={fleet}
          cash={cash}
          computeHours={computeHours}
          holdings={holdings}
          shipped={completed[openRow.def.id] ?? 0}
          failReason={failReason}
          onClose={handleClose}
          onBuild={handleBuild}
        />
      ) : null}

      <FlashToast flash={flash} />
    </div>
  );
}
