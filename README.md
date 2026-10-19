# MCP Simulator

A no-signup, offline, single-player simulator for the economics of building
software with frontier models and rented GPUs.

Everything in it is fake. There is no backend, no account, no payment, and no
API call of any kind — the whole simulation runs in your browser and persists to
`localStorage`.

```bash
npm install
npm run dev      # http://localhost:3000
```

---

## The loop

You start with **$100 of play money** and **10 free compute hours**, and nothing
else. Money buys two things:

| Buy | What it gives you | Where it lives |
| --- | --- | --- |
| **Model tokens** | A pool of tokens for one specific model (52 to choose from) | `holdings` |
| **Compute hours** | Hours in a shared pool, plus your **flagship rig** | `computeHours` + `fleet` |

Contracts on the **Make** page consume both, run on a live progress bar, and pay
out. Harder work pays more but needs a stronger fleet and a bigger token bill.

If you run dry, the app notices. Below **$5** you get a warning modal, and any
purchase or build you can't afford offers a **Free Redeem**: **$20 and 10 hours**,
instantly, as often as you like. Nothing here is ever gated behind real money.

---

## The economy, precisely

This is the part worth reading. One rule keeps every number in the app coherent.

A contract has a fixed **workload** — `computeHours` of compute *load* and
`tokenCost` tokens. It does **not** have a fixed wall-clock time. Your rig
decides how fast that load burns down, and how many of *your* purchased hours it
eats:

```
speed       = speedMultiplier(fleet)          // from TFLOPS and vCPUs
billedHours = computeHours / speed            // hours reserved from your pool
wallClock   = baseSeconds  / speed            // seconds of progress bar
payout      = payment × fleetBonus × qualityBonus
```

So a bigger rig is *not* a strict upgrade — it is a trade:

- **Cheap iron** finishes slowly, but burns the fewest dollars per workload-hour.
  Best margin per run.
- **Big iron** costs more per hour, yet reserves far fewer of your hours and
  finishes in a fraction of the time. Best money per minute.

The speed curve is deliberately sub-linear, tuned so the five tiers land at
roughly:

| Tier | Class | Speed | $ / workload-hour |
| --- | --- | --- | --- |
| 1 | Shared CPU | ~0.4× | ~0.15 |
| 2 | Consumer GPU | ~1.6× | ~0.25 |
| 3 | Prosumer GPU | ~2.0× | ~0.55 |
| 4 | Datacenter GPU | ~2.7× | ~1.00 |
| 5 | Hyperscale cluster | ~5.0× | ~2.50 |

Two further multipliers sharpen the choice:

- **Fleet bonus** — `1.00 / 1.10 / 1.22 / 1.38 / 1.55` by tier. Serious hardware
  commands a better invoice.
- **Quality bonus** — `0.85 … 1.25`, scaled by the mean quality index of the
  token pools a run actually drains. Solving a job with a stronger model pays
  better, but costs far more per token.

Every contract in the catalog is calibrated so it turns a profit on the *cheapest*
rig that can legally run it (the worst case is a 49% margin). Nothing in the
catalog is dead content.

### Where your tokens go

A contract requires a **capability** (`coding`, `reasoning`, `vision`, `audio`,
`agentic`, …). When you launch it, the engine taps every pool you own that
satisfies that capability, **cheapest per token first** — so your premium tokens
survive for the jobs that actually need them. The detail modal shows the exact
split before you commit.

Tokens burn **up front**. Compute hours are **reserved** up front and released
progressively as the bar fills, which is why the dashboard can show you hours
"in use" as well as hours "left".

### Risk

Every rig has an uptime record. Cheap spot capacity is cheap for a reason: a run
can fail mid-flight, in which case you get a **30% partial delivery** and the
remaining compute is released. Reliability 99% is essentially free of risk;
reliability 71% is not.

---

## Pages

- **`/` Dashboard** — net worth, cash, compute and token KPIs with sparklines
  reconstructed from your real ledger; live builds with progress and hours
  locked up; your flagship rig and the tier ladder; a per-model token portfolio
  with a vendor allocation donut; spend by category; the full activity feed;
  lifetime stats; contracts shipped; and milestones.
- **`/buy` Buy** — two tabs. **Models** (52) with capability/tier/open-weights
  filters and four buy packs each; **Compute** (16 rigs across 5 tiers) with an
  hour stepper, volume discounts, and a live "faster than your rig" comparison.
  Both have detail modals with the full spec and the per-unit economics.
- **`/make` Make** — 34 contracts across 10 categories. Each card is priced
  **against your own rig**, not against a generic baseline. The detail modal
  shows deliverables, the required capability and which of your pools satisfy
  it, a Project-vs-On-your-rig economics table, a before/after balance
  projection, and a blocked-aware Build button.

---

## Architecture

```
src/
├── app/
│   ├── layout.tsx            # shell: NavBar, SimClock, AlertCenter, WelcomeOverlay
│   ├── page.tsx              # dashboard
│   ├── buy/page.tsx
│   └── make/page.tsx
├── components/
│   ├── ui/                   # design system: Card, Button, Badge, Progress, Modal,
│   │                         #   Icon (curated registry), charts, Controls
│   ├── layout/               # NavBar, AlertCenter, WelcomeOverlay, PageHeader, SimClock
│   ├── shared/               # BuildProgressCard
│   ├── dashboard/ buy/ make/ # page composition
├── data/
│   ├── models.ts             # 52 models — pricing, quality, capabilities, token packs
│   ├── compute.ts            # 16 rigs — specs, pricing, and the speed model
│   └── projects.ts           # 34 contracts — payouts, workloads, capabilities
└── lib/
    ├── types.ts              # every contract, single source of truth
    ├── economy.ts            # the simulation engine (pure functions)
    ├── store.ts              # zustand + persist: state and all mutations
    ├── format.ts             # money / tokens / hours / duration formatting
    ├── hooks.ts              # hydration-safe client reads + the shared 500 ms clock
    └── cn.ts                 # class merging
```

**State** is one `zustand` store persisted under `mcpsim-state`. A
`<SimClock />` ticks it at 4 Hz, which is what advances progress bars and settles
finished runs. Reload mid-build and the build resumes and settles correctly,
because completion is derived from `endsAt` rather than a timer.

**All engine maths is pure** and lives in `lib/economy.ts`, so the same function
prices a contract on the Make card, in the detail modal, and at launch.

**Hydration is intentional.** Persisted state and the clock are both read only
after mount, via `useSyncExternalStore`, so the server HTML and the first client
render always agree. There is no flash of wrong numbers.

**Charts are hand-rolled SVG** — no charting dependency, fully deterministic, and
safe to render on the server.

**Rendering budget.** Two rules keep the long lists smooth, and both are easy to
regress:

1. **No `backdrop-filter` on cards.** `.panel` is ~99.7% opaque, so a blur behind
   it is invisible — but not free: it buys every card its own composited layer,
   re-sampled on scroll. On `/buy` (55 cards) it cost roughly 47% more frame time
   (12.2ms vs 8.3ms average, p95 24.6ms vs 14.8ms). Glass is reserved for the two
   surfaces where content actually passes underneath: the sticky navbar and the
   modal scrim.
2. **The clock lives in leaves, never in a page.** `useNow()` draws on a single
   shared 500ms interval and only components that display a countdown subscribe
   to it. Calling it at page level would re-render every card on every tick — 34
   contracts on `/make`. Card grids are memoised on top of that.

The unused `drift`/`sweep` keyframes and `text-rendering: optimizeLegibility`
were dropped for the same reason: real or potential cost, no visible benefit.

---

## Tech

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript (strict) · Tailwind
CSS v4 · zustand · lucide-react · clsx + tailwind-merge.

No API routes, no database, no environment variables. All four routes are
statically prerendered.

```bash
npm run build     # production build
npm run lint      # eslint
```

## Resetting

The reset button in the navbar wipes your local state back to $100 and 10 hours.
Clearing site data does the same thing.
