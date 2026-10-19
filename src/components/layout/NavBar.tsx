"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import {
  LOW_BALANCE_THRESHOLD,
  STARTING_CASH,
  STARTING_COMPUTE_HOURS,
  groupRuns,
  hoursInUse,
  totalTokens,
} from "@/lib/economy";
import { hours, money2, tokens as fmtTokens } from "@/lib/format";
import { useNow } from "@/lib/hooks";
import { useSim } from "@/lib/store";

const LINKS = [
  { href: "/", label: "Dashboard", icon: "LayoutDashboard" },
  { href: "/buy", label: "Buy", icon: "ShoppingCart" },
  { href: "/make", label: "Make", icon: "Rocket" },
] as const;

function StatPill({
  icon,
  value,
  label,
  tone,
  alert,
  title,
}: {
  icon: string;
  value: string;
  label: string;
  tone: string;
  alert?: boolean;
  title?: string;
}) {
  return (
    <div
      title={title}
      className={cn(
        "flex items-center gap-2 rounded-xl border px-2.5 py-1.5 transition-colors",
        alert
          ? "border-ember-400/50 bg-ember-500/10"
          : "border-abyss-500/50 bg-abyss-800/60",
      )}
    >
      <Icon
        name={icon}
        size={14}
        className={cn("shrink-0", alert ? "text-ember-400" : tone)}
      />
      <div className="flex flex-col leading-none">
        <span
          className={cn(
            "num text-[13px] font-semibold",
            alert ? "text-ember-400" : "text-fog-100",
          )}
        >
          {value}
        </span>
        <span className="mt-0.5 hidden text-[9px] uppercase tracking-[0.12em] text-fog-500 sm:block">
          {label}
        </span>
      </div>
    </div>
  );
}

export function NavBar() {
  const pathname = usePathname();
  const now = useNow();
  const [confirmReset, setConfirmReset] = useState(false);

  const cash = useSim((s) => s.cash);
  const computeHours = useSim((s) => s.computeHours);
  const holdings = useSim((s) => s.holdings);
  const runs = useSim((s) => s.runs);
  const resetSim = useSim((s) => s.resetSim);

  const low = cash < LOW_BALANCE_THRESHOLD;
  const running = runs.filter((r) => r.status === "running");
  // A batch is one job, however many runs are behind it.
  const groups = groupRuns(running);
  const inUse = now === null ? 0 : hoursInUse(runs, now);
  const pool = totalTokens(holdings);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-abyss-600/50 bg-abyss-950/80 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[1440px] flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 sm:px-6 lg:px-8">
          {/* Brand */}
          <Link href="/" className="group flex items-center gap-3">
            <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-iris-400 to-iris-600 shadow-lg shadow-iris-600/25">
              <Icon name="Cpu" size={17} className="text-white" />
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-mint-400 animate-pulse-ring" />
            </span>
            <span className="flex flex-col leading-none">
              <span className="text-sm font-semibold tracking-tight text-fog-50">
                MCP Simulator
              </span>
              <span className="mt-0.5 text-[10px] uppercase tracking-[0.16em] text-fog-500">
                play money division
              </span>
            </span>
          </Link>

          {/* Nav */}
          <nav className="order-3 -mx-1 flex w-full items-center gap-1 sm:order-none sm:mx-0 sm:w-auto">
            {LINKS.map((link) => {
              const active =
                link.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "relative flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors sm:flex-none",
                    active
                      ? "bg-iris-500/15 text-iris-200"
                      : "text-fog-400 hover:bg-abyss-800/70 hover:text-fog-100",
                  )}
                >
                  <Icon name={link.icon} size={15} />
                  <span>{link.label}</span>
                  {active && (
                    <span className="absolute inset-x-3 -bottom-px h-px bg-gradient-to-r from-transparent via-iris-400 to-transparent" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Vitals */}
          <div className="ml-auto flex items-center gap-2">
            <StatPill
              icon="CircleDollarSign"
              value={money2(cash)}
              label="balance"
              tone="text-mint-400"
              alert={low}
              title={low ? "Below the $5 warning line" : "Play-money balance"}
            />
            <StatPill
              icon="Gauge"
              value={hours(computeHours)}
              label={inUse > 0 ? `${hours(inUse)} in use` : "compute"}
              tone="text-aqua-400"
              title="Compute hours available in your pool"
            />
            <StatPill
              icon="Coins"
              value={fmtTokens(pool)}
              label="tokens"
              tone="text-iris-300"
              title="Total model tokens across every pool"
            />

            {running.length > 0 && (
              <div
                title={
                  running.length === groups.length
                    ? `${running.length} build${running.length === 1 ? "" : "s"} running`
                    : `${groups.length} job${groups.length === 1 ? "" : "s"} · ${running.length} runs in flight`
                }
                className="flex items-center gap-2 rounded-xl border border-mint-400/40 bg-mint-500/10 px-2.5 py-1.5"
              >
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-mint-400 animate-pulse-ring" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-mint-400" />
                </span>
                <span className="num text-[13px] font-semibold text-mint-300">
                  {groups.length}
                </span>
                <span className="hidden text-[9px] uppercase tracking-[0.12em] text-mint-400/80 sm:block">
                  live
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              aria-label="Reset the simulation"
              title="Reset the simulation"
              className="grid h-9 w-9 place-items-center rounded-xl border border-abyss-500/50 bg-abyss-800/60 text-fog-400 transition-colors hover:border-ember-400/40 hover:text-ember-400"
            >
              <Icon name="RotateCcw" size={15} />
            </button>
          </div>
        </div>
      </header>

      <Modal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Reset everything?"
        subtitle={`Your balance, tokens, hardware and build history will be wiped back to $${STARTING_CASH} and ${STARTING_COMPUTE_HOURS} free compute hours.`}
        icon={<Icon name="RotateCcw" size={16} />}
        tone="ember"
        size="sm"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setConfirmReset(false)}
            >
              Keep playing
            </Button>
            <Button
              variant="danger"
              leftIcon={<Icon name="Trash2" size={14} />}
              onClick={() => {
                resetSim();
                setConfirmReset(false);
              }}
            >
              Reset sim
            </Button>
          </>
        }
      >
        <p className="text-sm text-fog-300">
          This is irreversible, but it only ever touches your local browser
          storage. Useful if you want to replay the early game from scratch.
        </p>
      </Modal>
    </>
  );
}
