# MCP Simulator

[![Try it live](https://img.shields.io/badge/try_it_live-mcpsimulator.netlify.app-00C7B7?logo=netlify&logoColor=white)](https://mcpsimulator.netlify.app/)
![Next.js](https://img.shields.io/badge/Next.js-16.4.2-000000?logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19.3-087EA4?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38BDF8?logo=tailwindcss&logoColor=white)
![Backend](https://img.shields.io/badge/backend-none-brightgreen)

> **▶ Try it out first → [mcpsimulator.netlify.app](https://mcpsimulator.netlify.app/)**
>
> Live on Netlify. No signup, no install, and nothing leaves your browser.
> Want it running locally instead? Jump to [Quick start](#quick-start).

A no-signup, offline, single-player simulator for the economics of building
software with frontier models and rented GPUs.

You start with **$20 of play money** and **10 free compute hours**, then buy
tokens for specific models and hours on specific rigs, and take contracts that
consume both.

Every contract is a **fixed fee**: the client pays for the deliverable, not for
what it cost you to produce. Cheap iron therefore keeps more of each cheque,
while big iron finishes the job in a fraction of the time. The market is finite,
too — the first time you ship a given contract it pays a healthy markup over its
real cost, and every copy after that cools the market toward a thin spot rate.
That is what keeps the money from running away: your income per run is a dollar
amount tied to the work, never a percentage of your bankroll.

Once you have stock on hand, any contract can be **batched**: run it several
times over and the whole set reports as a single job.

**Everything in it is fake.** There is no backend, no account, no payment and no
API call of any kind. The whole simulation runs in your browser and persists to
`localStorage`. Nothing you do here leaves your machine.

---

## Contents

- [Quick start](#quick-start)
- [Your first five minutes](#your-first-five-minutes)
- [The loop](#the-loop)
- [Batch builds](#batch-builds)
- [The economy, precisely](#the-economy-precisely)
- [Pages](#pages)
- [What's in the catalog](#whats-in-the-catalog)
- [Architecture](#architecture)
- [Design system](#design-system)
- [Tech](#tech)
- [Deploying](#deploying)
- [Resetting](#resetting)
- [FAQ](#faq)
- [Notes and limitations](#notes-and-limitations)

---

## Quick start

**Requirements:** Node.js **≥ 20.9** (Next.js 16's minimum) and npm.

```bash
npm install
npm run dev          # http://localhost:3000
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |

There is nothing to configure: no `.env`, no database, no keys. If the app ever
looks wrong, the culprit is almost always stale `localStorage` — see
[Resetting](#resetting).

---

## Your first five minutes

1. **Land on the dashboard.** A welcome overlay explains the premise. Dismiss it
   and you're looking at a wall of KPIs, charts and an activity feed — all
   currently empty, because you haven't done anything yet.
2. **Buy tokens.** Go to **Buy → Models**. Pick something cheap to start
   (a budget model is fine). Each model sells four packs — *Starter, Builder,
   Studio, Foundry* — with a rising bonus of free tokens. Buy the Starter pack.
3. **Buy compute.** Switch to **Buy → Compute**. Pick a rig and choose an hour
   bundle (1 / 5 / 25 / 100 and similar, with a volume discount at 5+, 25+, 100+
   and 250+ hours). **The rig you buy becomes your flagship** — it sets the speed
   of every future build and the rate at which buying hours re-prices the whole
   pool. Match the rig to the work: a tier-5 rig on a tier-1 contract loses money.
4. **Take a contract.** Go to **Make**. Every card is priced *against your rig*,
   not against a generic baseline. Open one and read the detail modal: the
   deliverables, which of your token pools satisfy the required capability, a
   project-vs-your-rig economics table, and a before/after balance projection.
5. **Build it.** Hit **Build**. Tokens are spent immediately; compute hours are
   reserved and released as the bar fills. The navbar shows hours *in use*
   counting down, and the dashboard grows a live build. Once one contract is
   working, the batch controls in the same modal run it 2–50 times at once — see
   [Batch builds](#batch-builds).
6. **Get paid.** When the bar lands, the payout hits your cash, the run moves to
   your history, and the dashboard's lifetime stats update. Reload the page
   mid-build and nothing is lost.

If you go broke, the app notices rather than dead-ending you — see
[the loop](#the-loop) below.

---

## The loop

Money buys two things:

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

## Batch builds

The Make page has 34 contracts, and the good ones are worth repeating. Rather than
opening a card, building, waiting, and opening it again, the detail modal carries a
**Batch size** panel:

- **Custom batch** — a stepper from 1 up to whatever you can currently afford.
- **Max batch** — one click, fills in the largest batch your stock allows.

`Max batch` is the smallest of three limits:

```
byHours  = floor(computeHours / billedHours)   // free hours you hold
byTokens = floor(eligibleTokens / tokenCost)   // tokens the capability accepts
maxBatch = min(byHours, byTokens, 50)          // 50 is a hard ceiling
```

So a batch is bounded by whichever resource runs out first. The card shows the
result as a `batch ×10` chip; the modal spells out which ceiling applied.

**A batch is N *independent* runs launched at once:**

- Each run burns its own `tokenCost`, reserves its own `billedHours`, and rolls
  its **own** failure chance. A batch of 10 with a 2% failure rate will usually
  deliver 9 or 10, occasionally fewer.
- Each run is priced against the pool the run before it left behind, so a batch of
  5 costs exactly what 5 separate launches would have — no discount, no rounding
  drift, no averaging.
- They share one timer, so all N finish together.
- They are priced against the **same cooling market**: run *k* of a batch sees a
  market that has already absorbed the previous *k−1* deliveries. A batch of 10
  Podcast Show Notes pays $0.25 for the first copy and $0.20 for the tenth —
  batching cannot dodge the decay, it only parallels it. The premium cools; the
  floor does not.

What *does* change is the presentation:

- **One card, not N.** The navbar, dashboard and Make page show a single
  `Running batch: <contract> ×N` card with combined hours, tokens and payout, plus
  one **Abort batch** button that releases every run's unconsumed hours at once.
- **One ledger line, not N.** Settlement writes a single entry —
  `Shipped batch: Podcast Show Notes ×10`, with `+$2.20` in the amount column. If
  some runs failed it reads `Batch settled: … 8/10 delivered · 2 failed · 6.4h
  compute`; a total loss reads `Batch failed: …`.
- **Runs still count as runs.** `runsStarted`, `runsCompleted` and `runsFailed`
  increment per run, because that is what they measure. Only the navbar's *live*
  pill counts **jobs** — so a batch of 10 shows as `1 live`.

---

## The economy, precisely

This is the part worth reading. One rule keeps every number in the app coherent:
**the client pays a fixed fee for the deliverable, not for what it cost you.**

A contract has a fixed **workload** — `computeHours` of compute *load* and
`tokenCost` tokens. It does **not** have a fixed wall-clock time, and it does
**not** have a variable price. Your rig decides how fast that load burns down and
how many of *your* purchased hours it eats; the fee is the same either way:

```
speed       = speedMultiplier(fleet)      // from TFLOPS and vCPUs, 0.2x - 5.0x
billedHours = computeHours / speed        // hours reserved from your pool
wallClock   = baseSeconds  / speed        // seconds of progress bar
payout      = floor + premium × marketHeat(shipped) × qualityPremium(pool)
```

Profit is `payout − (billedHours × yourRate + tokens × yourTokenPrice)`, so a
bigger rig is *not* a strict upgrade — it is a trade:

- **Cheap iron** finishes slowly, but burns the fewest dollars per workload-hour,
  so it keeps the most of each fee. Best money per *run*.
- **Big iron** costs far more per hour, yet reserves a fraction of your hours and
  finishes in a fraction of the time. Best money per *minute* — but only on
  contracts whose fee is large enough to cover the rate.

### The speed curve

Speed comes from a deliberately sub-linear blend of tensor throughput and vCPU
count, clamped to `0.2× … 5.0×`:

```ts
speed = clamp(0.05 + tflops^0.30 × 0.3 + vcpus^0.25 × 0.08, 0.2, 5)
```

Because it is sub-linear, the whole 16-rig catalog compresses into five narrow
speed bands, and the tier ladder — not the raw spec sheet — is what separates
one class of hardware from the next:

| Tier | Class | Rigs | Speed | $ / hour | $ / workload-hour |
| --- | --- | --- | --- | --- | --- |
| 1 | Shared CPU | 3 | 0.35–0.45× | 0.02–0.09 | 0.04–0.23 |
| 2 | Consumer GPU | 4 | 1.46–1.59× | 0.24–0.52 | 0.16–0.36 |
| 3 | Prosumer GPU | 4 | 1.90–1.97× | 1.10–1.50 | 0.56–0.76 |
| 4 | Datacenter GPU | 3 | 2.61–3.19× | 2.49–3.40 | 0.96–1.29 |
| 5 | Hyperscale cluster | 2 | 5.00× | 9.40–11.00 | 1.88–2.20 |

Two numbers decide whether a rate is worth paying:

- **Rate per workload-hour** — `$/h ÷ speed`, what an hour of *actual work*
  costs you. It spans **0.04 → 2.20** across the catalog, a ~50× spread.
- **Speed** — it spans only **0.35× → 5.0×**, a ~14× spread. Speed is worth
  paying for, but not at any price: a rate 470× higher only buys ~11× the
  throughput.

The catalog is deliberately unbalanced in favour of cheap iron per *run* and
expensive iron per *minute*, and there is no dominant rig: OCI's free ARM box is
the cheapest per workload-hour, the tier-5 H100 the fastest, and both are the
right answer to a different question.

### How the catalog is calibrated

Every contract's fee is generated, not guessed. The basis is the **achievable
minimum cost** of doing the job — the cheapest rig that can legally run it, with
the cheapest eligible token pool:

```
refCost(p) = (p.computeHours / speed(bestRig(p.minFleetTier))) × rate(bestRig)
           + (p.tokenCost / 1e6) × cheapestBlended[capability]

fee = roundPrice(refCost(p) × MARKUP_BY_DIFFICULTY[p.difficulty])
MARKUP_BY_DIFFICULTY = {1: 1.30, 2: 1.45, 3: 1.65, 4: 1.90, 5: 2.20}
```

Because the basis is the *cheapest legal* setup, careful shopping is rewarded on
every contract, and the markup climbs with the difficulty of the work:

| Difficulty | Contracts | Fresh market | Fully saturated |
| --- | --- | --- | --- |
| 1 | 8 | +30% | +1.0% |
| 2 | 9 | +45% | +1.0% |
| 3 | 8 | +65% | +1.0% |
| 4 | 6 | +90% | +1.0% |
| 5 | 3 | +119% | +1.0% |

### The market cools

The engine keeps a **shipped counter** per contract. The first time you deliver
one you are paid the full premium; every copy after that pays `MARKET_DECAY =
0.78` of whatever premium was left:

```
heat   = 0.78 ^ shippedBefore
payout = floor + (fee − floor) × heat × qualityPremium(avgQuality)
floor  = refCost × 1.01                      // a ~1% spot margin, never less
```

Two consequences, both deliberate:

- **Copy-and-paste stops paying.** Ship the same easy contract ten times and
  ~8% of its premium remains; the eleventh copy is worth almost exactly its
  reference cost. Grinding one button buys *linear* income, not exponential.
- **A bigger fee is not a multiplier on your bankroll.** Premium is a fixed
  dollar amount tied to the work; only the floor scales with cost. Income grows
  with *runs per minute*, so wealth compounds only while it is small relative to
  a batch's spend — after that the game is throughput, not yield.

There is roughly **$2.5k of premium in existence** in the whole catalog (all 34
contracts, summed at reasonable pool quality; under $3k even at perfect quality).
That is the game's entire bounded windfall; once it has been sold, the world is a
spot market.

Quality moves only the premium, never the floor, so a weak token pool can slow
you down but can never sink a run all by itself:

```
qualityPremium(q) = clamp(1 + (q − 76.5) × 0.0085, 0.35, 1.20)
```

### Pacing

What that adds up to, running each tier on the cheapest rig that can legally run
it, buying the cheapest eligible tokens, and starting from an untouched market:

| Tier | Contracts | Net per run (avg) | Wall clock (avg) | Net per minute |
| --- | --- | --- | --- | --- |
| 1 | 12 | $0.60 | 0.7 min | **$0.59** |
| 2 | 11 | $4.41 | 0.5 min | **$8.95** |
| 3 | 4 | $32.71 | 0.6 min | **$49.61** |
| 4 | 5 | $121.26 | 0.7 min | **$158.32** |
| 5 | 2 | $749.00 | 0.6 min | **$1,281.87** |

Read it as a *capital* ladder, not a skill ladder. The fee is proportional to the
cost basis, and cost is dominated by the rig rate — which spans ~470×, while the
reference speed spans only ~11× — so income per minute climbs steeply with the
tier you can afford to provision. What does *not* climb is the [premium
inventory](#the-market-cools): $2.5k of margin exists in the world, and every run
spends some of it. After that the game is a 1%-per-cycle spot market, which is
linear by construction. If the ladder feels too steep, the two dials are
`MARKUP_BY_DIFFICULTY` (how much margin exists) and `MARKET_DECAY` (how fast it
burns off).

### Where your tokens go

A contract requires a **capability** (`coding`, `reasoning`, `vision`, `audio`,
`agentic`, …). When you launch it, the engine taps every pool you own that
satisfies that capability, **cheapest per token first** — so your premium tokens
survive for the jobs that actually need them. The detail modal shows the exact
split before you commit.

Tokens burn **up front**. Compute hours are **reserved** up front and released
progressively as the bar fills, which is why the dashboard can show you hours
"in use" as well as hours "left".

Prices are blended: `input × 0.35 + output × 0.65` per million tokens, so an
output-heavy workload costs more than the headline input rate suggests.

### Risk

Every rig has an uptime record. Cheap spot capacity is cheap for a reason:

```
failureRisk = clamp(((100 − reliability) / 100) × 0.28, 0.004, 0.22)
```

A run can fail mid-flight, in which case you get a **30% partial delivery** and
the remaining compute is released. Reliability 99% is essentially free of risk;
reliability 71% is not. The roll happens at launch and is revealed at
completion — spot capacity is not forever.

### A worked example

*Podcast Show Notes* on the cheapest rig that can run it — the numbers below are
from an actual run in the app:

| | |
| --- | --- |
| Listed fee | **$0.25** |
| Workload | 4 compute-hours, 3,000,000 audio tokens |
| Rig | OCI Ampere A1 Flex — 0.9 TFLOPS, 4 vCPU, $0.02/h |
| Speed | 0.454× |
| Hours reserved | 4 / 0.454 = **8.81 h** |
| Wall clock | 14 / 0.454 ≈ **31 s** |
| Compute cost | 8.81 × $0.02 = **$0.18** |
| Token cost | 3M × $0.006/M (Whisper Large v3) = **$0.02** |
| Market heat | ×1.00 — you have never shipped this contract |
| Quality | ×1.05 (Whisper's quality index is 82) |
| **Payout** | $0.196 + ($0.25 − $0.196) × 1.00 × 1.05 = **$0.25** |
| **Net** | **+$0.05** |

The fee is fixed at $0.25. The **floor** — $0.196, the reference cost ($0.194)
with a 1% spot margin — is what the market still pays for this contract once it
is fully saturated. Everything above the floor is premium, and premium cools:
this is the most this job will ever pay, and it is worth less every time you ship
it. A second copy launched right behind it pays $0.24.

Run the same job on a hyperscale H100 and it finishes in **3 seconds instead of
31** — but the client still pays $0.25, while your compute bill jumps from $0.18
to $7.52. **You lose $7.29.** Your rig no longer changes the cheque, only what it
costs you to cash it, so matching the rig to the work *is* the game.

The $0.25 fee is the calibration formula in action:
`refCost = (4 / 0.454) × $0.02 + 3 × $0.006 = $0.194`, times the difficulty-1
markup of 1.30, rounded to a clean `$0.25`.

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
  projection, batch controls (custom size or `Max batch`), and a blocked-aware
  Build button. In-flight work collapses to one card per job, batches included.

---

## What's in the catalog

The catalogs are plain TypeScript arrays in `src/data/`, typed against
`src/lib/types.ts`. Names, specs and prices are drawn from real, publicly known
models and cloud instances and are realistic — but they are **static snapshots
baked into the source**, not live quotations. See
[Notes and limitations](#notes-and-limitations).

| Catalog | File | Contents |
| --- | --- | --- |
| Models | `src/data/models.ts` | **52 models** from **23 vendors**, each with 4 token packs |
| Compute | `src/data/compute.ts` | **16 rigs** from **16 providers**, across 5 tiers |
| Projects | `src/data/projects.ts` | **34 contracts** across **10 categories**, difficulty 1–5 |

**Models** span four tiers (`budget`, `open`, `frontier`, `specialist`) and 11
capabilities (`text`, `reasoning`, `coding`, `vision`, `image`, `video`,
`audio`, `embedding`, `math`, `long-context`, `agentic`). Each carries a quality
index (drives payouts), a throughput index, a context window, and input/output
prices per million tokens.

**Rigs** range from a $0.02/hour always-free ARM instance to an $11/hour
H100 cluster, with TFLOPS, vCPUs, VRAM, regions, a billing model (hourly,
per-second, spot, monthly) and a reliability record. Each sells four hour
bundles.

**Contracts** run from a $0.25 podcast-notes job to a $1,500 autonomous support
agent, with workloads from 3 to 200 compute-hours and token bills from 2.8M to
900M. Fees are calibrated against the *cheapest legal* way to do the job: the
reference cost of that podcast job is 19 cents, and of the support agent $682.

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
│   │                         #   Icon (152-glyph curated registry), charts, Controls
│   ├── layout/               # NavBar, AlertCenter, WelcomeOverlay, PageHeader, SimClock
│   ├── shared/               # BuildProgressCard, BatchProgressCard, Ledger
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

The dependency direction is one-way: `types.ts` imports nothing from the
catalogs, the catalogs import only types, and the engine imports the catalogs.
So the same pure function prices a contract on the Make card, in the detail
modal, and at launch — there is no second implementation to drift.

### State and persistence

One `zustand` store, persisted under the `localStorage` key `mcpsim-state`
(currently schema version `5`). It holds cash, the compute-hour pool, token
holdings, your flagship `fleet`, running and settled `runs`, a transaction
`history`, lifetime `stats`, and the set of contracts you've shipped — the last
of which doubles as the market's **shipped counter** for every contract.

Two deliberate details:

- **`partialize`** keeps non-serialisable keys (actions) and the `hydrated`
  flag out of storage, so a schema change can't resurrect stale function
  references.
- **`migrate`** runs on rehydrate, so bumping the version is the supported way
  to change the shape of saved state.

### The clock, and why reloading mid-build is safe

A `<SimClock />` ticks the store at 4 Hz. That is what advances progress bars and
settles finished runs — there is no per-run timer.

Each run stores `endsAt` rather than a remaining-time counter, so completion is
*derived* from the wall clock. Reload the page in the middle of a build and the
run resumes at the right progress and settles correctly. The tick function also
returns early when nothing is due to finish, so an idle tab does no work.

Runs that came from one batch share an `endsAt`, so an entire batch settles inside
a single tick — which is what lets settlement collapse it into one ledger line
instead of N.

### Hydration is intentional

Persisted state and the clock are both read only after mount, via
`useSyncExternalStore` (`useClientValue`, `useMounted`, `useHydrated`), so the
server HTML and the first client render always agree. There is no flash of
wrong numbers and no hydration mismatch from the sim itself.

### Charts are hand-rolled SVG

No charting dependency. Every sparkline, donut and bar is generated SVG —
deterministic, safe to render on the server, and it adds no third-party runtime
library to the bundle.

### Rendering budget

Two rules keep the long lists smooth, and both are easy to regress:

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

## Design system

There is no component library — the primitives in `src/components/ui/` are built
from Tailwind utilities over a small set of CSS custom properties defined in
`src/app/globals.css`.

The palette is a dark surface ramp with single-hue accents, so a colour always
means the same thing:

| Token family | Role |
| --- | --- |
| `abyss-950 … 500` | Surfaces, borders, elevation |
| `fog-50 … 500` | Text, from primary down to muted |
| `iris-*` | Primary accent / interactive |
| `mint-*` | Success, profit, positive deltas |
| `solar-*` | Warning, low balance |
| `ember-*` | Danger, overspend, failures |
| `aqua-*`, `plasma-*` | Informational and categorical accents |

`Icon.tsx` is a **curated registry of 152 glyphs**: the app's data layer refers to
icons by stable string keys, and only the icons actually referenced are imported
from `lucide-react`. The lucide namespace is never spread, so tree-shaking works.
`charts.tsx` holds the SVG chart primitives, and `Controls.tsx` the segmented
controls and toggles.

---

## Tech

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript (strict) · Tailwind
CSS v4 · zustand · lucide-react · clsx + tailwind-merge.

No API routes, no database, no environment variables, no server-only APIs. All
four routes are statically prerendered, and the entire economy runs on the
client.

---

## Deploying

Because nothing here needs a server, there are two valid routes. Both are tested.

### Route A — static export

Add one line to `next.config.ts`:

```ts
const nextConfig: NextConfig = {
  output: "export",
  // ...
};
```

Then:

```bash
npm run build        # emits ./out
npx serve out        # local preview — `npm run start` does not apply to an export
```

Upload the `out/` folder to any static host. The export is one `index.html`,
`buy.html`, `make.html` and `404.html` plus hashed assets — about 1.3 MB, with
the Geist fonts self-hosted in `_next/static/media` so there is no runtime
dependency on Google Fonts.

### Route B — native Next.js hosting

Vercel and Netlify build and serve a Next.js app out of the box, with **no code
changes**: point either at the repository and accept the detected defaults.

| Host | Build command | Output | Notes |
| --- | --- | --- | --- |
| Vercel | `next build` | `.next` | Zero config. CLI: `vercel` / `vercel --prod` |
| Netlify | `npm run build` | `.next` | Zero config via the official Next.js runtime |
| Cloudflare Pages | `npm run build` | `out` | Use **Route A** + set `NODE_VERSION=22` |

Whatever the host, check two things after the first deploy:

- **Clean URLs.** `/buy` must resolve to `buy.html`. Netlify and Cloudflare do
  this automatically; if a deep link 404s, add a `_redirects` file
  (`/buy /buy.html 200`).
- **No SPA catch-all.** Don't add a `/* /index.html 200` fallback — every route
  has its own HTML file, and the catch-all would swallow your `404.html`.

`localStorage` is scoped per origin, so each deploy URL starts from a fresh $20
and keeps its own save. That's expected, not a bug.

---

## Resetting

The reset button in the navbar wipes your local state back to $20 and 10 hours.
Clearing site data does the same thing. If the UI ever looks inconsistent after
an update, reset first — a schema change with stale storage is the most likely
cause.

Saved state carries a schema version (`STATE_VERSION` in `src/lib/economy.ts`).
When it is bumped — as it was for **v1.1**, which reset the opening float to $20,
added batch runs, and replaced the old payout multipliers with the fixed-fee,
cooling-market economy — the next load discards the old blob and drops you at a
fresh start, welcome overlay and all. That is deliberate: saves are not
balance-patched across a rebalance. (`STATE_VERSION` is `5`; anything older is
thrown away.)

---

## FAQ

**Is any of this real?** No. No payments, no accounts, no network calls. The
prices and specs are realistic but static.

**Why did my build fail?** Cheap spot capacity has a bad uptime record. The roll
happens at launch and is revealed at completion; failures pay a 30% partial
delivery.

**Why does a stronger model cost more for the same fee?** Quality buys labour, not
revenue: the client pays a fixed fee either way, so a better model can only
recover *part* of its price by lifting the premium (×0.35–×1.20 of what remains
unsold). On a fresh contract that can pay off; on a saturated one all you have
left is the bill.

**Why is a cheaper rig sometimes more profitable?** Because the client pays a
flat fee and your cost is `workloadHours / speed × hourlyRate`. A slow, cheap rig
bills more hours at a much lower rate — and there is no tier bonus to bail out an
expensive one. A tier-5 rig running a tier-1 contract loses money. See the worked
example.

**Why does shipping the same contract twice pay less?** The market absorbs what
you deliver: `heat = 0.78^shipped`. The first copy earns the full markup; later
copies converge on the reference cost plus a 1% spot margin. Grinding one
contract is a way to buy linear income, not exponential wealth.

**I saw a hydration warning in the dev console mentioning an unknown attribute.**
A browser extension is editing the page before React loads. `<body>` carries
`suppressHydrationWarning` for exactly this reason (ColorZilla's
`cz-shortcut-listen`, Grammarly, and friends). It is dev-only noise and does not
affect the build.

**Why is my batch capped at, say, 10?** Something ran out. `Max batch` is the
smaller of your free hours divided by the hours one run reserves, and your
eligible tokens divided by the tokens one run burns. Buy whichever is short — the
modal shows the per-run cost so you can see which one binds.

**Can I run it offline?** Yes — `npm run build` then `npm run start`, or any
static export. Nothing phones home.

---

## Notes and limitations

- **The catalogs are snapshots, not feeds.** Model and rig names, specs and
  prices were written by hand to be realistic as of their writing. They drift,
  and no attempt is made to track the market. Treat the numbers as plausible,
  not authoritative.
- **Two tier-5 rigs, one speed.** The speed formula clamps at 5.0×, and both
  hyperscale rigs hit the ceiling, so they differ only in price. The cheaper one
  is the better buy; this is a known catalog quirk rather than a balance
  decision.
- **Fees are stored literals, not computed on the fly.** Each `payment` is
  `roundPrice(refCost × markup)`, generated from the catalogs and pasted in, so a
  fee can look arbitrary (Podcast Show Notes is $0.25, not $0.252). Change a
  model or rig price and the stored fees drift out of calibration — regenerating
  them is a deliberate two-step, not a build step.
- **A cheap model can be the *right* model.** The reference token price is the
  cheapest eligible one, so the cheapest pool is usually also the correct pool.
  The exception is worth knowing: *Whisper Large v3* used to advertise `text` as
  well as `audio`, which made a speech model the cheapest text engine in the game
  and quietly inflated two contracts' token bills ~5×. It is `audio` only.
- **Single player, single browser.** State is one `localStorage` blob. No sync,
  no export, no undo beyond the reset button.
- **Batches are scheduled as truly parallel.** Every run in a batch shares one
  timer and finishes together, as though the rig had unlimited capacity. Ten
  heavy runs on one GPU would in reality contend for it. The *economics* stay
  honest — each run pays its own hours and tokens — but the scheduling is
  idealised.
- **50 runs is the batch ceiling.** It keeps `localStorage` small and the numbers
  legible, not because of any economic constraint.

---

## License

No license has been chosen for this project yet. Until one is added, the default
is "all rights reserved" — which is fine for a private repo, but worth fixing
with an explicit `LICENSE` file (MIT and Apache-2.0 are the usual picks) before
inviting contributions.

_Everything in this application is fictional. It is a toy economy, not financial
advice, and it is not affiliated with any of the vendors whose names appear in
its catalogs._
