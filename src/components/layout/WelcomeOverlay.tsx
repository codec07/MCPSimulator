"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import {
  STARTING_CASH,
  STARTING_COMPUTE_HOURS,
  netWorth,
} from "@/lib/economy";
import { money2 } from "@/lib/format";
import { useHydrated } from "@/lib/hooks";
import { useSim } from "@/lib/store";

const STEPS = [
  {
    icon: "ShoppingCart",
    tone: "text-iris-300",
    title: "Spend",
    body: "Buy token credits for 52 frontier and open models, and rent GPU hours from 16 real providers. Better rigs build faster and reserve fewer of your hours.",
  },
  {
    icon: "Rocket",
    tone: "text-mint-300",
    title: "Build",
    body: "Pick from 34 contracts — landing pages, fine-tunes, agent pipelines. Each one burns tokens and compute while a live progress bar runs.",
  },
  {
    icon: "TrendingUp",
    tone: "text-solar-300",
    title: "Grow",
    body: "Shipped work pays out. Higher difficulty pays more but needs a stronger fleet, and premium models earn a quality bonus on every invoice.",
  },
] as const;

export function WelcomeOverlay() {
  const router = useRouter();
  const welcomed = useSim((s) => s.welcomed);
  const dismissWelcome = useSim((s) => s.dismissWelcome);
  const worth = useSim((s) => netWorth(s));
  const hydrated = useHydrated();

  if (!hydrated || welcomed) return null;

  return (
    <Modal
      open
      onClose={dismissWelcome}
      size="lg"
      tone="iris"
      icon={<Icon name="Sparkles" size={16} />}
      title="Welcome to MCP Simulator"
      subtitle="No sign-up. No server. Just an economy that only exists in your browser."
      footer={
        <>
          <Button variant="ghost" onClick={dismissWelcome}>
            Just browse
          </Button>
          <Button
            variant="primary"
            leftIcon={<Icon name="ShoppingCart" size={14} />}
            onClick={() => {
              dismissWelcome();
              router.push("/buy");
            }}
          >
            Spend my first {money2(STARTING_CASH)}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-mint-400/30 bg-mint-500/8 p-4">
            <span className="text-[10px] uppercase tracking-[0.16em] text-mint-400">
              Opening float
            </span>
            <p className="num mt-1 text-3xl font-semibold text-mint-300">
              {money2(STARTING_CASH)}
            </p>
            <p className="mt-1 text-xs text-fog-400">
              play money, spend it badly and we&apos;ll top you up
            </p>
          </div>
          <div className="rounded-xl border border-aqua-400/30 bg-aqua-500/8 p-4">
            <span className="text-[10px] uppercase tracking-[0.16em] text-aqua-400">
              Free compute
            </span>
            <p className="num mt-1 text-3xl font-semibold text-aqua-300">
              {STARTING_COMPUTE_HOURS}h
            </p>
            <p className="mt-1 text-xs text-fog-400">
              enough for your first few contracts
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {STEPS.map((step) => (
            <div
              key={step.title}
              className="flex items-start gap-3 rounded-xl border border-abyss-500/50 bg-abyss-900/60 p-3.5"
            >
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-abyss-500/60 bg-abyss-800">
                <Icon name={step.icon} size={15} className={step.tone} />
              </span>
              <div>
                <p className="text-sm font-semibold text-fog-100">
                  {step.title}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-fog-400">
                  {step.body}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between rounded-xl border border-iris-400/25 bg-iris-500/8 px-3.5 py-3">
          <span className="text-xs uppercase tracking-wider text-iris-300">
            Current net worth
          </span>
          <span className="num text-sm font-semibold text-fog-100">
            {money2(worth)}
          </span>
        </div>
      </div>
    </Modal>
  );
}
