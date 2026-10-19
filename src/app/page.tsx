"use client";

import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { DashboardLink } from "@/components/dashboard/DashboardLink";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { FleetCard } from "@/components/dashboard/FleetCard";
import { KpiTiles } from "@/components/dashboard/KpiTiles";
import { LiveBuilds } from "@/components/dashboard/LiveBuilds";
import { Milestones } from "@/components/dashboard/Milestones";
import { ShippedContracts } from "@/components/dashboard/ShippedContracts";
import { SpendBreakdown } from "@/components/dashboard/SpendBreakdown";
import { StatsGrid } from "@/components/dashboard/StatsGrid";
import { TokenPortfolio } from "@/components/dashboard/TokenPortfolio";
import { riseDelay } from "@/components/dashboard/utils";
import { PageHeader } from "@/components/layout/PageHeader";
import { useClientValue, useHydrated } from "@/lib/hooks";

/** Time-of-day greeting, resolved on the client only so SSR stays neutral. */
function greetingFor(hour: number): string {
  if (hour < 5) return "Still up";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/** Stable identity so `useClientValue` never re-subscribes. */
const currentGreeting = () => greetingFor(new Date().getHours());

/**
 * The command deck: balance, fleet, token portfolio, live builds and the whole
 * ledger in one screen. Every value that depends on the clock or on persisted
 * state waits for hydration first, so the first paint never lies.
 *
 * This page deliberately holds no clock. Each section that shows a countdown —
 * the KPI tiles, live builds, the fleet ring, the activity feed — subscribes to
 * the shared clock itself, so a tick re-renders those sections only rather than
 * the entire deck.
 */
export default function DashboardPage() {
  const hydrated = useHydrated();
  const greeting = useClientValue(currentGreeting, "");

  if (!hydrated) return <DashboardSkeleton />;

  const title = greeting ? `${greeting}, operator` : "Welcome back, operator";

  return (
    <div className="flex flex-col gap-5">
      <div className="animate-rise" style={riseDelay(0)}>
        <PageHeader
          eyebrow="Command Deck"
          icon="LayoutDashboard"
          accent="#7c5cff"
          title={title}
          subtitle="Buy tokens and GPU hours, ship contracts from the catalog, then reinvest the payout — the client pays a flat fee, so a cheaper rig keeps more of it and a faster rig ships more of them."
          actions={
            <>
              <DashboardLink href="/buy" variant="secondary" icon="ShoppingCart">
                Buy supplies
              </DashboardLink>
              <DashboardLink href="/make" variant="primary" icon="Rocket" arrow>
                Start a build
              </DashboardLink>
            </>
          }
        />
      </div>

      <KpiTiles />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="flex flex-col gap-5 xl:col-span-2">
          <div className="animate-rise" style={riseDelay(1)}>
            <LiveBuilds />
          </div>
          <div className="animate-rise" style={riseDelay(2)}>
            <TokenPortfolio />
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div className="animate-rise" style={riseDelay(3)}>
            <FleetCard />
          </div>
          <div className="animate-rise" style={riseDelay(4)}>
            <Milestones />
          </div>
          <div className="animate-rise" style={riseDelay(5)}>
            <SpendBreakdown />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="animate-rise lg:col-span-2" style={riseDelay(6)}>
          <ActivityFeed />
        </div>
        <div className="animate-rise" style={riseDelay(7)}>
          <ShippedContracts />
        </div>
      </div>

      <div className="animate-rise" style={riseDelay(8)}>
        <StatsGrid />
      </div>
    </div>
  );
}
