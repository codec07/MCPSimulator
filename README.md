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

You start with **$20 of play money** and **10 free compute hours** — deliberately
thin, so the opening move is a real choice between a token pack and the hours to
run it, and a $4 gig genuinely matters. You buy tokens for specific models and
hours on specific rigs, then take contracts that consume both and pay out. The
interesting part is the trade: cheap iron maximises profit per run, big iron
maximises profit per minute — and your choice of model changes both the token bill
and the payout. Once you have stock on hand, any contract can be **batched**: run
it several times over and the whole set reports as a single job.

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
   Studio, Foundry* — with rising bonus percentages. Buy the Starter pack.
3. **Buy compute.** Switch to **Buy → Compute**. Pick a rig and choose an hour
   bundle (1 / 5 / 25 / 100 and similar, with a volume discount at 5+, 25+, 100+
   and 250+ hours). **The rig you buy becomes your flagship** — it sets the speed
   and the payout bonus for every future build.
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

**Nothing about the economy changes.** A batch is N *independent* runs launched at
once:

- Each run burns its own `tokenCost`, reserves its own `billedHours`, and rolls
  its **own** failure chance. A batch of 10 with a 2% failure rate will usually
  deliver 9 or 10, occasionally fewer.
- Each run is priced against the pool the run before it left behind, so a batch of
  5 costs exactly what 5 separate launches would have — no discount, no rounding
  drift, no averaging.
- They share one timer, so all N finish together.

What *does* change is the presentation:

- **One card, not N.** The navbar, dashboard and Make page show a single
  `Running batch: <contract> ×N` card with combined hours, tokens and payout, plus
  one **Abort batch** button that releases every run's unconsumed hours at once.
- **One ledger line, not N.** Settlement writes a single entry —
  `Shipped batch: Podcast Show Notes ×10 · $73.00`. If some runs failed it reads
  `Batch settled: … 8/10 delivered · 2 failed · 6.4h compute`; a total loss reads
  `Batch failed: …`.
- **Runs still count as runs.** `runsStarted`, `runsCompleted` and `runsFailed`
  increment per run, because that is what they measure. Only the navbar's *live*
  pill counts **jobs** — so a batch of 10 shows as `1 live`.

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

Two further multipliers sharpen the choice:

- **Fleet bonus** — `1.00 / 1.10 / 1.22 / 1.38 / 1.55` by tier. Serious hardware
  commands a better invoice.
- **Quality bonus** — `0.85 … 1.25`, scaled by the mean quality index of the
  token pools a run actually drains. Solving a job with a stronger model pays
  better, but costs far more per token.

### How the catalog is calibrated

Every contract's price is generated, not guessed. A project's *fair value* is
its compute load at a $0.60/workload-hour floor, plus its token bill at a
per-capability reference price; the stored payout is that fair value times a
difficulty markup:

```
fairValue = computeHours × 0.60 + (tokenCost / 1e6) × REFERENCE_TOKEN_PRICE[capability]
payment   = round(fairValue × DIFFICULTY_MARGIN[difficulty])

DIFFICULTY_MARGIN = {1: 1.20, 2: 1.32, 3: 1.45, 4: 1.60, 5: 1.78}
```

That guarantee survives contact with the simulation. Priced against **the
cheapest rig that can legally run it**, at the **worst payout multipliers** its
tier allows (fleet bonus ×1.00–1.55 floor and the quality-bonus floor of ×0.85),
and the **conservative reference token prices**, all 34 contracts still turn a
profit. The tightest is *Recommender System* at **+24%**; the roomiest is
*Podcast Show Notes* at **+68%**. Nothing in the catalog is dead content.

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
| Listed payout | **$4** |
| Workload | 4 compute-hours, 3,000,000 audio tokens |
| Rig | OCI Ampere A1 Flex — 0.9 TFLOPS, 4 vCPU, $0.02/h |
| Speed | 0.454× |
| Hours reserved | 4 / 0.454 = **8.81 h** |
| Wall clock | 14 / 0.454 ≈ **31 s** |
| Compute cost | 8.81 × $0.02 = **$0.18** |
| Token cost | 3M × $0.006/M (Whisper Large v3) = **$0.02** |
| Fleet bonus | ×1.00 (tier 1) |
| Quality bonus | ×1.18 (Whisper's quality index is 82) |
| **Payout** | $4 × 1.00 × 1.18 = **$4.71** |
| **Net** | **+$4.51** |

Notice the hourly rate is almost irrelevant here — the run costs 18 cents
because it reserves 8.81 hours of a two-cent rig. The same contract on a
datacenter H100 reserves just 1.54 hours at $2.49/h, finishes in about **5
seconds instead of 31**, and pays **1.38× more** — for roughly **20× the compute
cost**. That is the whole game.

The $4 payout itself is the calibration formula in action:
`(4 × 0.60) + (3 × 0.30) = $3.30`, times the difficulty-1 markup of 1.20 =
`$3.96`, stored pre-rounded as `$4`.

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

**Contracts** run from a $4 podcast-notes job to a $2,000 autonomous support
agent, with workloads from 3 to 200 compute-hours and token bills from 2.8M to
900M.

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
(currently schema version `4`). It holds cash, the compute-hour pool, token
holdings, your flagship `fleet`, running and settled `runs`, a transaction
`history`, lifetime `stats`, and the set of contracts you've shipped.

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
When it is bumped — as it was for **v1.1**, which reset the opening float to $20
and added batch runs — the next load discards the old blob and drops you at a
fresh start, welcome overlay and all. That is deliberate: saves are not
balance-patched across a rebalance.

---

## FAQ

**Is any of this real?** No. No payments, no accounts, no network calls. The
prices and specs are realistic but static.

**Why did my build fail?** Cheap spot capacity has a bad uptime record. The roll
happens at launch and is revealed at completion; failures pay a 30% partial
delivery.

**Why does a stronger model pay *and* cost more?** Quality drives both the token
price and the payout bonus (×0.85–×1.25). On an easy job the extra quality
rarely pays for itself; on hard ones it does.

**Why is a cheaper rig sometimes more profitable?** Because a run costs
`workloadHours / speed × hourlyRate`. A slow, cheap rig bills more hours at a
much lower rate, and the tier payout bonus (up to ×1.55) only partly closes the
gap. See the worked example.

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
- **A few payouts are rounded to round numbers.** `payment` is stored
  pre-rounded, so five of the 34 contracts sit up to ~11% below their formula
  value. None of them fall below profitable.
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
