"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import type { Tone } from "@/components/ui/Badge";
import { BAILOUT_CASH, BAILOUT_HOURS, LOW_BALANCE_THRESHOLD } from "@/lib/economy";
import { money2 } from "@/lib/format";
import { useSim } from "@/lib/store";
import type { ModalKind } from "@/lib/types";

interface Presentation {
  icon: string;
  tone: Tone;
  /** Where the "go fix it" button should send the player. */
  action?: { label: string; href: string };
  redeem: boolean;
}

const PRESENTATION: Record<Exclude<ModalKind, null>, Presentation> = {
  "low-balance": {
    icon: "AlertTriangle",
    tone: "solar",
    action: { label: "Buy credits", href: "/buy" },
    redeem: true,
  },
  "insufficient-funds": {
    icon: "CircleDollarSign",
    tone: "solar",
    action: { label: "Open the shop", href: "/buy" },
    redeem: true,
  },
  "insufficient-compute": {
    icon: "Gauge",
    tone: "aqua",
    action: { label: "Buy compute", href: "/buy?tab=compute" },
    redeem: true,
  },
  "insufficient-tokens": {
    icon: "Coins",
    tone: "iris",
    action: { label: "Buy tokens", href: "/buy?tab=models" },
    redeem: true,
  },
  "fleet-too-weak": {
    icon: "Cpu",
    tone: "plasma",
    action: { label: "Upgrade my rig", href: "/buy?tab=compute" },
    redeem: false,
  },
  "redeem-success": {
    icon: "Gift",
    tone: "mint",
    redeem: false,
  },
  welcome: {
    icon: "Sparkles",
    tone: "iris",
    redeem: false,
  },
};

export function AlertCenter() {
  const router = useRouter();
  const alert = useSim((s) => s.alert);
  const clearAlert = useSim((s) => s.clearAlert);
  const redeemBailout = useSim((s) => s.redeemBailout);
  const cash = useSim((s) => s.cash);

  if (!alert || !alert.kind) return null;

  const kind = alert.kind as Exclude<ModalKind, null>;
  const view = PRESENTATION[kind] ?? PRESENTATION["low-balance"];

  const isLowBalance = kind === "low-balance";
  const shortfall = alert.needed != null ? alert.needed - cash : null;

  return (
    <Modal
      open
      onClose={clearAlert}
      tone={view.tone}
      size="md"
      icon={<Icon name={view.icon} size={16} />}
      title={alert.title ?? "Heads up"}
      subtitle={
        isLowBalance
          ? `Warning line is ${money2(LOW_BALANCE_THRESHOLD)}`
          : undefined
      }
      footer={
        <>
          {view.action && (
            <Button
              variant="ghost"
              leftIcon={<Icon name="ArrowRight" size={14} />}
              onClick={() => {
                clearAlert();
                router.push(view.action!.href);
              }}
            >
              {view.action.label}
            </Button>
          )}

          {view.redeem ? (
            <Button
              variant="success"
              leftIcon={<Icon name="Gift" size={14} />}
              onClick={redeemBailout}
            >
              Free Redeem — ${BAILOUT_CASH} + {BAILOUT_HOURS}h
            </Button>
          ) : (
            <Button variant="primary" onClick={clearAlert}>
              Got it
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-sm leading-relaxed text-fog-300">{alert.message}</p>

        {shortfall != null && shortfall > 0 && (
          <div className="flex items-center justify-between rounded-xl border border-abyss-500/50 bg-abyss-900/70 px-3 py-2.5">
            <span className="text-xs uppercase tracking-wider text-fog-500">
              You&apos;re short by
            </span>
            <span className="num text-sm font-semibold text-ember-400">
              {money2(shortfall)}
            </span>
          </div>
        )}

        {alert.neededHours != null && (
          <div className="flex items-center justify-between rounded-xl border border-abyss-500/50 bg-abyss-900/70 px-3 py-2.5">
            <span className="text-xs uppercase tracking-wider text-fog-500">
              Compute hours needed
            </span>
            <span className="num text-sm font-semibold text-aqua-400">
              {alert.neededHours.toFixed(1)}h
            </span>
          </div>
        )}

        {alert.neededTokens != null && (
          <div className="flex items-center justify-between rounded-xl border border-abyss-500/50 bg-abyss-900/70 px-3 py-2.5">
            <span className="text-xs uppercase tracking-wider text-fog-500">
              Tokens needed
            </span>
            <span className="num text-sm font-semibold text-iris-300">
              {Math.round(alert.neededTokens).toLocaleString("en-US")}
            </span>
          </div>
        )}

        {view.redeem && (
          <p className="rounded-xl border border-mint-400/25 bg-mint-500/8 px-3 py-2.5 text-xs leading-relaxed text-mint-300">
            Free Redeem drops ${BAILOUT_CASH} and {BAILOUT_HOURS} fresh compute
            hours into your account, instantly and as often as you need. Nothing
            here costs real money — it&apos;s all play money.
          </p>
        )}
      </div>
    </Modal>
  );
}
