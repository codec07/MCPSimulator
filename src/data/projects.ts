/**
 * MCP Simulator — project ("Make") catalog.
 *
 * 34 freelance/agency deliverables spread across all 10 categories and all
 * 11 model capabilities. Payouts are NOT invented: every `payment` is the
 * calibrated fair value of the run plus a difficulty margin, rounded to a
 * clean number (see `fairValue` / `margin` below).
 *
 * Economy contract:
 *   REFERENCE_COMPUTE_PRICE = 0.60 USD per workload-hour
 *   REFERENCE_TOKEN_PRICE   = USD per 1M tokens, by capability
 *   fairValue(p) = p.computeHours * REFERENCE_COMPUTE_PRICE
 *                + p.tokenCost / 1e6 * REFERENCE_TOKEN_PRICE[p.capability]
 *   payment      = round(fairValue(p) * DIFFICULTY_MARGIN[p.difficulty])
 *
 * `payment` is stored pre-rounded so the UI never formats a long decimal.
 */

import type { Capability, FleetTier, ProjectCategory, ProjectDef } from "@/lib/types";

/** USD per workload-hour used as the floor for every run's fair value. */
const REFERENCE_COMPUTE_PRICE = 0.6;

/** USD per 1M tokens used to price a run's token draw, by capability. */
export const REFERENCE_TOKEN_PRICE: Record<Capability, number> = {
  text: 0.45,
  reasoning: 1.6,
  coding: 0.5,
  vision: 0.8,
  image: 0.35,
  video: 1.2,
  audio: 0.3,
  embedding: 0.12,
  math: 0.9,
  "long-context": 0.7,
  agentic: 1.1,
};

/** Markup applied over the fair value, by difficulty. */
export const DIFFICULTY_MARGIN: Record<ProjectDef["difficulty"], number> = {
  1: 1.2,
  2: 1.32,
  3: 1.45,
  4: 1.6,
  5: 1.78,
};

/* ============================================================
   Difficulty 1 — quick wins (3–8h, 1.5M–6M tokens, fleet 1)
   ============================================================ */

export const PROJECTS: ProjectDef[] = [
  {
    id: "portfolio-landing-page",
    title: "Portfolio Landing Page",
    category: "web",
    icon: "Globe",
    tagline: "A single-page portfolio that converts visitors to hires.",
    description:
      "Build a fast, responsive personal landing page with a hero, project case-study cards and a working contact form. Ship it as static output with semantic HTML, perfect Lighthouse scores and a subtle scroll reveal.",
    tasks: [
      "Design a responsive hero with headline and CTA",
      "Build a filterable case-study grid",
      "Add a validated contact form",
      "Wire scroll-reveal animations",
      "Ship a static build with 100/100 Lighthouse",
    ],
    payment: 6,
    computeHours: 5,
    tokenCost: 3_200_000,
    capability: "coding",
    baseSeconds: 14,
    difficulty: 1,
    minFleetTier: 1,
    accent: "#7c5cff",
    badge: "Quick win",
  },
  {
    id: "mobile-habit-tracker",
    title: "Mobile Habit Tracker",
    category: "mobile",
    icon: "Smartphone",
    tagline: "A streak-driven habit tracker for iOS and Android.",
    description:
      "Deliver a cross-platform habit app with daily check-ins, streaks, reminders and a progress calendar. Persist everything locally, add haptic feedback and ship a polished onboarding flow.",
    tasks: [
      "Build daily check-in and streak logic",
      "Design a progress calendar heatmap",
      "Add local reminders and notifications",
      "Persist data offline with SQLite",
      "Ship onboarding and empty states",
    ],
    payment: 7,
    computeHours: 6,
    tokenCost: 4_000_000,
    capability: "coding",
    baseSeconds: 16,
    difficulty: 1,
    minFleetTier: 1,
    accent: "#38bdf8",
    badge: "Starter friendly",
  },
  {
    id: "game-asset-pack",
    title: "Game Asset Pack",
    category: "game",
    icon: "Gamepad2",
    tagline: "A cohesive 2D game asset pack for a platformer.",
    description:
      "Produce a stylised asset set of tiles, sprites, UI frames and pickups in one consistent art direction. Deliver atlases, sprite sheets and a documented palette so a team can drop them straight into an engine.",
    tasks: [
      "Define the art direction and palette",
      "Draw the terrain tileset and decorations",
      "Animate hero and enemy sprite sheets",
      "Build UI frames, icons and pickups",
      "Export atlases with a usage guide",
    ],
    payment: 4,
    computeHours: 4,
    tokenCost: 2_800_000,
    capability: "image",
    baseSeconds: 12,
    difficulty: 1,
    minFleetTier: 1,
    accent: "#2ee0a4",
    badge: "Portfolio piece",
  },
  {
    id: "brand-logo-kit",
    title: "Brand Logo Kit",
    category: "design",
    icon: "Palette",
    tagline: "A logo suite with marks, lockups and usage rules.",
    description:
      "Design a primary logo plus monogram, horizontal and stacked lockups with clear-space and misuse guidelines. Deliver light, dark and single-colour variants as SVG and PNG alongside a one-page brand sheet.",
    tasks: [
      "Sketch three logo directions",
      "Refine the mark and wordmark lockups",
      "Produce light, dark and mono variants",
      "Document clear-space and misuse rules",
      "Export SVG and PNG at every size",
    ],
    payment: 5,
    computeHours: 5,
    tokenCost: 3_500_000,
    capability: "image",
    baseSeconds: 15,
    difficulty: 1,
    minFleetTier: 1,
    accent: "#fbbf24",
  },
  {
    id: "cold-outreach-sequence",
    title: "Cold Outreach Sequence",
    category: "business",
    icon: "Megaphone",
    tagline: "A five-touch B2B email sequence that sounds human.",
    description:
      "Write and structure a five-step outbound email sequence for a niche B2B offer, with subject-line variants and a follow-up cadence. Include personalisation tokens, spam-safe copy and a tracking plan for reply rates.",
    tasks: [
      "Research the ICP and value hooks",
      "Write five email bodies and CTAs",
      "Draft three subject-line variants each",
      "Add personalisation tokens",
      "Define the cadence and reply tracking",
    ],
    payment: 5,
    computeHours: 3,
    tokenCost: 5_500_000,
    capability: "text",
    baseSeconds: 12,
    difficulty: 1,
    minFleetTier: 1,
    accent: "#fb7185",
    badge: "Starter friendly",
  },
  {
    id: "seo-blog-cluster",
    title: "SEO Blog Cluster",
    category: "business",
    icon: "Search",
    tagline: "A ten-post content cluster built around one keyword.",
    description:
      "Plan and write a pillar page plus nine supporting articles targeting one commercial keyword cluster. Include an internal-linking map, meta descriptions, schema markup and a content-refresh schedule.",
    tasks: [
      "Map the keyword cluster and search intent",
      "Outline a pillar and nine supporting posts",
      "Write full drafts with clean headings",
      "Add meta, schema and internal links",
      "Build an editorial calendar",
    ],
    payment: 6,
    computeHours: 4,
    tokenCost: 6_000_000,
    capability: "text",
    baseSeconds: 18,
    difficulty: 1,
    minFleetTier: 1,
    accent: "#e879f9",
  },
  {
    id: "ci-test-backfill",
    title: "CI Test Backfill",
    category: "infra",
    icon: "Wrench",
    tagline: "Backfill unit tests until the pipeline is trustworthy.",
    description:
      "Raise an under-tested codebase to meaningful coverage by writing unit and integration tests around its riskiest modules. Wire the suite into CI with parallel shards, coverage gates and clear failure output.",
    tasks: [
      "Audit coverage and rank risky modules",
      "Write unit tests for core logic",
      "Add integration tests around IO",
      "Shard the suite for parallel CI",
      "Set coverage gates and reports",
    ],
    payment: 7,
    computeHours: 6,
    tokenCost: 5_000_000,
    capability: "coding",
    baseSeconds: 15,
    difficulty: 1,
    minFleetTier: 1,
    accent: "#a3e635",
  },
  {
    id: "podcast-show-notes",
    title: "Podcast Show Notes",
    category: "media",
    icon: "Mic",
    tagline: "Turn raw podcast audio into publish-ready show notes.",
    description:
      "Process a season of raw episodes into clean transcripts, chapter markers, summaries and SEO-ready show notes. Keep speaker labels, timestamps and pull-quotes consistent across every episode.",
    tasks: [
      "Transcribe episodes with speaker labels",
      "Write chapter markers and timestamps",
      "Draft summaries and pull-quotes",
      "Format show notes with links",
      "Prepare RSS-ready descriptions",
    ],
    payment: 4,
    computeHours: 4,
    tokenCost: 3_000_000,
    capability: "audio",
    baseSeconds: 14,
    difficulty: 1,
    minFleetTier: 1,
    accent: "#f97316",
    badge: "Recurring",
  },

  /* ============================================================
     Difficulty 2 — small builds (8–18h, 6M–20M tokens, fleet 1–2)
     ============================================================ */

  {
    id: "docs-portal-search",
    title: "Docs Portal Search",
    category: "web",
    icon: "BookOpen",
    tagline: "An instant, typo-tolerant search layer over your docs.",
    description:
      "Add full-text and semantic search across a large documentation portal with ranked snippets and faceted filters. Index thousands of pages, handle synonyms and ship a keyboard-first search interface.",
    tasks: [
      "Index the docs corpus with metadata",
      "Build ranked full-text search",
      "Add fuzzy matching and synonyms",
      "Design a keyboard-first result list",
      "Show highlighted snippets and filters",
    ],
    payment: 20,
    computeHours: 12,
    tokenCost: 14_000_000,
    capability: "long-context",
    baseSeconds: 30,
    difficulty: 2,
    minFleetTier: 1,
    accent: "#22d3ee",
  },
  {
    id: "fitness-watch-companion",
    title: "Fitness Watch Companion",
    category: "mobile",
    icon: "Watch",
    tagline: "A watch app that tracks workouts and syncs to the phone.",
    description:
      "Build a watchOS companion that records workouts, heart rate and activity rings, then syncs to a paired phone. Handle background sessions, watch-face complications and a glanceable in-workout screen.",
    tasks: [
      "Build the workout start and pause flow",
      "Read heart rate and activity rings",
      "Sync sessions to phone storage",
      "Add watch-face complications",
      "Design a glanceable in-workout screen",
    ],
    payment: 16,
    computeHours: 14,
    tokenCost: 8_000_000,
    capability: "coding",
    baseSeconds: 30,
    difficulty: 2,
    minFleetTier: 2,
    accent: "#818cf8",
  },
  {
    id: "browser-puzzle-game",
    title: "Browser Puzzle Game",
    category: "game",
    icon: "Puzzle",
    tagline: "A juicy, mobile-ready puzzle game in the browser.",
    description:
      "Ship a complete match-three style puzzle game with hand-tuned levels, combos, particles and a level-progression map. It runs at 60fps on mobile browsers with touch controls and local score saving.",
    tasks: [
      "Build the swap-and-match engine",
      "Tune thirty handcrafted levels",
      "Add combos, particles and juice",
      "Design the level map and win screens",
      "Optimise for 60fps touch play",
    ],
    payment: 15,
    computeHours: 13,
    tokenCost: 7_000_000,
    capability: "coding",
    baseSeconds: 28,
    difficulty: 2,
    minFleetTier: 1,
    accent: "#f472b6",
    badge: "Trending",
  },
  {
    id: "pitch-deck-redesign",
    title: "Pitch Deck Redesign",
    category: "design",
    icon: "PenTool",
    tagline: "A crisp investor deck rewritten and rebuilt.",
    description:
      "Rework a fundraising deck into a clear fifteen-slide narrative with a rebuilt visual system, sharp metrics and an appendix. Deliver editable slides plus a PDF export and speaker notes.",
    tasks: [
      "Restructure the narrative arc",
      "Rewrite headlines into assertions",
      "Design the slide master and charts",
      "Tighten the metric and traction slides",
      "Export edit-ready and PDF versions",
    ],
    payment: 11,
    computeHours: 9,
    tokenCost: 9_000_000,
    capability: "image",
    baseSeconds: 24,
    difficulty: 2,
    minFleetTier: 1,
    accent: "#60a5fa",
  },
  {
    id: "pricing-strategy-model",
    title: "Pricing Strategy Model",
    category: "business",
    icon: "Calculator",
    tagline: "A defensible pricing and packaging model.",
    description:
      "Build a spreadsheet-backed pricing model that tests tiers, willingness-to-pay and margin under several scenarios. Include a competitor benchmark, elasticity assumptions and a written recommendation memo.",
    tasks: [
      "Benchmark competitor pricing and tiers",
      "Model willingness-to-pay bands",
      "Build margin and elasticity scenarios",
      "Design a three-tier package",
      "Write the recommendation memo",
    ],
    payment: 20,
    computeHours: 12,
    tokenCost: 10_000_000,
    capability: "math",
    baseSeconds: 28,
    difficulty: 2,
    minFleetTier: 2,
    accent: "#c084fc",
  },
  {
    id: "ocr-document-pipeline",
    title: "OCR Document Pipeline",
    category: "data",
    icon: "Camera",
    tagline: "Digitise scanned documents into structured records.",
    description:
      "Build a pipeline that ingests scanned PDFs, runs OCR with layout detection and extracts typed fields into a database. Handle skewed scans, multi-column pages and a confidence-based review queue.",
    tasks: [
      "Ingest and de-skew scanned PDFs",
      "Run OCR with layout detection",
      "Extract key fields into typed records",
      "Flag low-confidence pages for review",
      "Export to a queryable database",
    ],
    payment: 35,
    computeHours: 18,
    tokenCost: 20_000_000,
    capability: "vision",
    baseSeconds: 40,
    difficulty: 2,
    minFleetTier: 2,
    accent: "#34d399",
  },
  {
    id: "terraform-module-library",
    title: "Terraform Module Library",
    category: "infra",
    icon: "Boxes",
    tagline: "Reusable, tested Terraform modules for every service.",
    description:
      "Package a platform's cloud resources into versioned, reusable Terraform modules with sane defaults and worked examples. Add policy checks, plan tests and documentation so other teams can self-serve safely.",
    tasks: [
      "Extract resources into versioned modules",
      "Add variables, defaults and examples",
      "Wire policy and plan validation",
      "Publish module registry docs",
      "Cut a first stable release tag",
    ],
    payment: 20,
    computeHours: 18,
    tokenCost: 12_000_000,
    capability: "coding",
    baseSeconds: 40,
    difficulty: 2,
    minFleetTier: 2,
    accent: "#facc15",
  },
  {
    id: "market-research-report",
    title: "Market Research Report",
    category: "research",
    icon: "Radar",
    tagline: "A sourced market report with sizing and trends.",
    description:
      "Synthesise dozens of sources into a structured market report covering size, segments, growth drivers and risks. Include a TAM/SAM/SOM model, a competitor map and a fully sourced evidence table.",
    tasks: [
      "Collect and tag the primary sources",
      "Size the market with TAM, SAM and SOM",
      "Map segments and growth drivers",
      "Profile the top ten competitors",
      "Write the report with cited evidence",
    ],
    payment: 25,
    computeHours: 16,
    tokenCost: 16_000_000,
    capability: "long-context",
    baseSeconds: 36,
    difficulty: 2,
    minFleetTier: 1,
    accent: "#94a3b8",
  },
  {
    id: "speech-to-text-pipeline",
    title: "Speech-To-Text Transcription Pipeline",
    category: "ai",
    icon: "Waves",
    tagline: "Accurate transcription with diarisation and timestamps.",
    description:
      "Build a batch ASR pipeline that transcribes hours of audio with speaker diarisation, punctuation and word-level timestamps. Add noise handling, a glossary for domain terms and a clean versioned JSON contract.",
    tasks: [
      "Batch-transcribe audio with timestamps",
      "Add speaker diarisation and labels",
      "Apply punctuation and casing",
      "Tune a domain-specific glossary",
      "Emit a versioned JSON contract",
    ],
    payment: 17,
    computeHours: 15,
    tokenCost: 12_000_000,
    capability: "audio",
    baseSeconds: 34,
    difficulty: 2,
    minFleetTier: 2,
    accent: "#7c5cff",
  },

  /* ============================================================
     Difficulty 3 — real products (18–45h, 20M–80M tokens, fleet 2–3)
     ============================================================ */

  {
    id: "headless-commerce-storefront",
    title: "Headless Commerce Storefront",
    category: "web",
    icon: "ShoppingCart",
    tagline: "A fast headless storefront wired to a commerce API.",
    description:
      "Build a headless storefront over a commerce backend with catalogue, variants, cart, checkout and search. Focus on edge caching, Core Web Vitals and a conversion-ready product page.",
    tasks: [
      "Integrate the catalogue and variant APIs",
      "Build the cart and checkout flow",
      "Add faceted search and filters",
      "Cache pages at the edge",
      "Tune the product page for conversion",
    ],
    payment: 55,
    computeHours: 30,
    tokenCost: 40_000_000,
    capability: "coding",
    baseSeconds: 55,
    difficulty: 3,
    minFleetTier: 2,
    accent: "#2ee0a4",
  },
  {
    id: "react-native-marketplace-app",
    title: "React Native Marketplace App",
    category: "mobile",
    icon: "Users",
    tagline: "A two-sided marketplace app with chat and payments.",
    description:
      "Deliver a cross-platform marketplace with listings, search, in-app messaging and payments. Handle auth, image uploads, push notifications and a seller dashboard from one React Native codebase.",
    tasks: [
      "Build listing creation and search",
      "Add real-time buyer-seller chat",
      "Integrate payments and payouts",
      "Wire up push notifications",
      "Ship a seller dashboard",
    ],
    payment: 60,
    computeHours: 34,
    tokenCost: 45_000_000,
    capability: "coding",
    baseSeconds: 60,
    difficulty: 3,
    minFleetTier: 3,
    accent: "#38bdf8",
  },
  {
    id: "procedural-level-generator",
    title: "Procedural Level Generator",
    category: "game",
    icon: "Blocks",
    tagline: "Deterministic level generation with solvable guarantees.",
    description:
      "Design a seeded level generator that produces varied, always-solvable layouts for a roguelike. Tune difficulty curves, add biome rules and validate every seed with a solver before play.",
    tasks: [
      "Design the seeded generation algorithm",
      "Add biome and difficulty rules",
      "Guarantee solvable layouts with a solver",
      "Tune pacing and reward curves",
      "Expose seeds and debug overlays",
    ],
    payment: 50,
    computeHours: 22,
    tokenCost: 25_000_000,
    capability: "math",
    baseSeconds: 46,
    difficulty: 3,
    minFleetTier: 2,
    accent: "#fbbf24",
  },
  {
    id: "rag-chatbot-private-docs",
    title: "RAG Chatbot Over Private Docs",
    category: "ai",
    icon: "MessageSquare",
    tagline: "Grounded answers with citations from private documents.",
    description:
      "Build a retrieval-augmented chatbot over an internal document set that answers with inline citations and refuses when unsure. Cover chunking strategy, hybrid retrieval, reranking and an evaluation set.",
    tasks: [
      "Chunk and embed the document corpus",
      "Build hybrid retrieval plus reranking",
      "Generate cited answers with guardrails",
      "Refuse unsupported questions cleanly",
      "Score quality against an eval set",
    ],
    payment: 25,
    computeHours: 22,
    tokenCost: 35_000_000,
    capability: "embedding",
    baseSeconds: 48,
    difficulty: 3,
    minFleetTier: 2,
    accent: "#a3e635",
  },
  {
    id: "vision-qa-pipeline",
    title: "Vision QA Inspection Pipeline",
    category: "ai",
    icon: "Microscope",
    tagline: "Automated visual inspection with defect detection.",
    description:
      "Build a computer-vision pipeline that inspects product images, detects defects and grades severity. Train on a labelled set, handle class imbalance and expose an operator review dashboard.",
    tasks: [
      "Label and augment a defect dataset",
      "Train detection and classification models",
      "Handle class imbalance and rare defects",
      "Build an operator review dashboard",
      "Report precision and recall by class",
    ],
    payment: 55,
    computeHours: 25,
    tokenCost: 30_000_000,
    capability: "vision",
    baseSeconds: 50,
    difficulty: 3,
    minFleetTier: 2,
    accent: "#e879f9",
  },
  {
    id: "warehouse-dbt-models",
    title: "Warehouse And dbt Models",
    category: "data",
    icon: "Database",
    tagline: "A modelled warehouse with tested dbt transformations.",
    description:
      "Model a raw event feed into clean staging tables, marts and dimensions in a cloud warehouse using dbt. Add tests, snapshots, documentation and a daily orchestrated run schedule.",
    tasks: [
      "Profile sources and define contracts",
      "Build staging, marts and dimensions",
      "Add dbt tests and freshness checks",
      "Document every model and column",
      "Schedule daily orchestrated runs",
    ],
    payment: 50,
    computeHours: 26,
    tokenCost: 38_000_000,
    capability: "coding",
    baseSeconds: 52,
    difficulty: 3,
    minFleetTier: 2,
    accent: "#f97316",
  },
  {
    id: "churn-prediction-model",
    title: "Churn Prediction Model",
    category: "data",
    icon: "TrendingUp",
    tagline: "Predict which accounts are about to churn.",
    description:
      "Build a churn model from product and billing history that outputs calibrated risk scores with explainable drivers. Cover feature engineering, class imbalance, backtesting and a scoring service.",
    tasks: [
      "Engineer features from product usage",
      "Train and calibrate the churn model",
      "Explain per-account risk drivers",
      "Backtest against historical churn",
      "Publish a scoring endpoint",
    ],
    payment: 55,
    computeHours: 20,
    tokenCost: 28_000_000,
    capability: "math",
    baseSeconds: 45,
    difficulty: 3,
    minFleetTier: 2,
    accent: "#22d3ee",
  },
  {
    id: "motion-graphics-ad",
    title: "Motion Graphics Ad Spot",
    category: "media",
    icon: "Clapperboard",
    tagline: "A thirty-second motion ad in three aspect ratios.",
    description:
      "Produce a thirty-second animated ad spot with kinetic type, product beats and a strong end card. Deliver 16:9, 1:1 and 9:16 cuts complete with sound design and caption assets.",
    tasks: [
      "Storyboard the thirty-second spot",
      "Animate kinetic type and product beats",
      "Design the end card and logo sting",
      "Mix sound design and a voiceover bed",
      "Export 16:9, 1:1 and 9:16 cuts",
    ],
    payment: 130,
    computeHours: 30,
    tokenCost: 60_000_000,
    capability: "video",
    baseSeconds: 65,
    difficulty: 3,
    minFleetTier: 3,
    accent: "#fb7185",
  },

  /* ============================================================
     Difficulty 4 — serious engagements (45–120h, 80M–350M tokens, fleet 3–4)
     ============================================================ */

  {
    id: "multiplayer-netcode",
    title: "Multiplayer Netcode Overhaul",
    category: "game",
    icon: "Network",
    tagline: "Lag-tolerant netcode with prediction and rollback.",
    description:
      "Rework a real-time game's networking to support prediction, reconciliation and rollback for smooth play on high-latency links. Add server authority, entity interpolation and a lag-compensation test harness.",
    tasks: [
      "Add client prediction and reconciliation",
      "Implement rollback for hit resolution",
      "Make the server fully authoritative",
      "Interpolate remote entities smoothly",
      "Build a latency test harness",
    ],
    payment: 150,
    computeHours: 60,
    tokenCost: 120_000_000,
    capability: "coding",
    baseSeconds: 90,
    difficulty: 4,
    minFleetTier: 4,
    accent: "#c084fc",
  },
  {
    id: "llm-finetune-7b",
    title: "Fine-Tune A 7B Model",
    category: "ai",
    icon: "BrainCircuit",
    tagline: "A domain-tuned 7B model with evals and serving.",
    description:
      "Fine-tune a seven-billion-parameter model on a curated domain dataset and prove the gain against a strong baseline. Cover dataset curation, parameter-efficient training, evaluation and quantised serving.",
    tasks: [
      "Curate and clean the fine-tuning set",
      "Run parameter-efficient training",
      "Build a held-out evaluation harness",
      "Compare against the base model",
      "Quantise and serve the tuned model",
    ],
    payment: 750,
    computeHours: 90,
    tokenCost: 260_000_000,
    capability: "reasoning",
    baseSeconds: 110,
    difficulty: 4,
    minFleetTier: 4,
    accent: "#818cf8",
    badge: "High pay",
  },
  {
    id: "recommender-system",
    title: "Product Recommender System",
    category: "data",
    icon: "Target",
    tagline: "Personalised recommendations that lift engagement.",
    description:
      "Build a recommender that blends collaborative signals with content embeddings and serves ranked results in milliseconds. Cover candidate generation, ranking, cold-start handling and offline metrics.",
    tasks: [
      "Build candidate generation from interactions",
      "Train a ranking model on embeddings",
      "Handle cold-start and popularity blends",
      "Evaluate with recall and nDCG",
      "Serve ranked results at low latency",
    ],
    payment: 90,
    computeHours: 65,
    tokenCost: 150_000_000,
    capability: "embedding",
    baseSeconds: 95,
    difficulty: 4,
    minFleetTier: 4,
    accent: "#34d399",
  },
  {
    id: "kubernetes-platform-migration",
    title: "Kubernetes Platform Migration",
    category: "infra",
    icon: "Server",
    tagline: "Migrate a legacy estate onto a managed Kubernetes platform.",
    description:
      "Move a legacy service estate onto managed Kubernetes with declarative manifests, autoscaling and zero-downtime cutovers. Cover networking, secrets, observability and rollback runbooks.",
    tasks: [
      "Inventory services and dependencies",
      "Author manifests and Helm charts",
      "Add autoscaling and health probes",
      "Plan zero-downtime cutovers",
      "Write rollback runbooks",
    ],
    payment: 290,
    computeHours: 100,
    tokenCost: 240_000_000,
    capability: "coding",
    baseSeconds: 115,
    difficulty: 4,
    minFleetTier: 4,
    accent: "#f472b6",
  },
  {
    id: "brand-identity-system",
    title: "Brand Identity System",
    category: "design",
    icon: "Figma",
    tagline: "A full identity system with tokens and guidelines.",
    description:
      "Build a complete identity system from logo through colour, type, layout and iconography, packaged as design tokens. Deliver a multi-chapter guideline and a ready-to-use component library.",
    tasks: [
      "Define the core identity and positioning",
      "Build colour, type and spacing tokens",
      "Design components and layout grids",
      "Package tokens for code and design tools",
      "Publish a multi-chapter guideline",
    ],
    payment: 100,
    computeHours: 50,
    tokenCost: 90_000_000,
    capability: "image",
    baseSeconds: 80,
    difficulty: 4,
    minFleetTier: 3,
    accent: "#60a5fa",
  },
  {
    id: "competitive-analysis",
    title: "Competitive Landscape Analysis",
    category: "research",
    icon: "BarChart3",
    tagline: "A deep teardown of your five closest rivals.",
    description:
      "Analyse five competitors across positioning, pricing, product depth and go-to-market, all backed by evidence. Deliver a comparison matrix, win/loss themes and a set of strategic recommendations.",
    tasks: [
      "Profile five competitors in depth",
      "Compare pricing and packaging",
      "Assess product and feature depth",
      "Extract win and loss themes",
      "Deliver strategic recommendations",
    ],
    payment: 460,
    computeHours: 55,
    tokenCost: 160_000_000,
    capability: "reasoning",
    baseSeconds: 85,
    difficulty: 4,
    minFleetTier: 3,
    accent: "#facc15",
  },

  /* ============================================================
     Difficulty 5 — flagship builds (120–400h, 350M–2B tokens, fleet 4–5)
     ============================================================ */

  {
    id: "agentic-support-agent",
    title: "Agentic Support Agent",
    category: "ai",
    icon: "Bot",
    tagline: "A support agent that triages, acts and escalates.",
    description:
      "Build an autonomous support agent that reads tickets, queries internal systems, performs refunds or resets and escalates cleanly. Cover tool calling, guardrails, audit trails and human handoff.",
    tasks: [
      "Design the tool and action surface",
      "Build multi-step ticket triage",
      "Add guardrails and approval gates",
      "Log an auditable action trail",
      "Handle handoff and escalation",
    ],
    payment: 2000,
    computeHours: 200,
    tokenCost: 900_000_000,
    capability: "agentic",
    baseSeconds: 180,
    difficulty: 5,
    minFleetTier: 5,
    accent: "#94a3b8",
    badge: "Needs big iron",
  },
  {
    id: "autonomous-research-agent",
    title: "Autonomous Research Agent",
    category: "research",
    icon: "FlaskConical",
    tagline: "An agent that plans, searches and writes sourced briefs.",
    description:
      "Build a research agent that decomposes a question, gathers and cross-checks sources, then writes a cited brief. Cover planning, tool use, contradiction handling and a reproducible evidence trail.",
    tasks: [
      "Build task planning and decomposition",
      "Add search and source-fetch tools",
      "Cross-check claims across sources",
      "Write cited research briefs",
      "Keep a reproducible evidence trail",
    ],
    payment: 1750,
    computeHours: 160,
    tokenCost: 800_000_000,
    capability: "agentic",
    baseSeconds: 170,
    difficulty: 5,
    minFleetTier: 5,
    accent: "#7c5cff",
  },
  {
    id: "youtube-explainer-series",
    title: "YouTube Explainer Series",
    category: "media",
    icon: "Video",
    tagline: "A six-episode animated explainer series.",
    description:
      "Produce a six-episode animated explainer series with a consistent look, scripted narration, captions and thumbnails. Cover scripting, scene animation, voiceover timing and per-platform exports.",
    tasks: [
      "Script six explainer episodes",
      "Design a consistent animated look",
      "Animate scenes to narration timing",
      "Add captions and thumbnail art",
      "Export per-platform cuts and formats",
    ],
    payment: 1550,
    computeHours: 140,
    tokenCost: 650_000_000,
    capability: "video",
    baseSeconds: 150,
    difficulty: 5,
    minFleetTier: 4,
    accent: "#e879f9",
  },
];

/* ============================================================
   Derived lookups & helpers
   ============================================================ */

/** Id-indexed view of the catalog, kept in sync with `PROJECTS`. */
export const PROJECT_BY_ID: Record<string, ProjectDef> = Object.fromEntries(
  PROJECTS.map((project) => [project.id, project]),
);

/** Display metadata for the ten project categories. */
export const PROJECT_CATEGORY_META: Record<
  ProjectCategory,
  {
    label: string;
    blurb: string;
    icon: string;
    tone: "neutral" | "iris" | "mint" | "solar" | "aqua" | "plasma" | "ember";
  }
> = {
  web: {
    label: "Web",
    blurb: "Sites, storefronts and web apps that ship to a browser.",
    icon: "Globe",
    tone: "iris",
  },
  mobile: {
    label: "Mobile",
    blurb: "Native and cross-platform apps for phones and watches.",
    icon: "Smartphone",
    tone: "mint",
  },
  game: {
    label: "Game",
    blurb: "Playable games, engines, netcode and art pipelines.",
    icon: "Gamepad2",
    tone: "plasma",
  },
  ai: {
    label: "AI",
    blurb: "Models, agents, retrieval and speech or vision systems.",
    icon: "BrainCircuit",
    tone: "aqua",
  },
  data: {
    label: "Data",
    blurb: "Warehouses, pipelines, models and analytics plumbing.",
    icon: "Database",
    tone: "iris",
  },
  infra: {
    label: "Infra",
    blurb: "Platform, cloud, CI/CD and reliability engineering.",
    icon: "Server",
    tone: "neutral",
  },
  design: {
    label: "Design",
    blurb: "Brand, product and presentation design deliverables.",
    icon: "Palette",
    tone: "plasma",
  },
  media: {
    label: "Media",
    blurb: "Video, motion, audio and editorial content production.",
    icon: "Clapperboard",
    tone: "solar",
  },
  research: {
    label: "Research",
    blurb: "Market, technical and competitive research and synthesis.",
    icon: "Microscope",
    tone: "ember",
  },
  business: {
    label: "Business",
    blurb: "Pricing, GTM, ops and commercial strategy work.",
    icon: "Briefcase",
    tone: "solar",
  },
};

/**
 * Calibrated fair value of a run in USD — the compute plus token cost of
 * producing the deliverable, before any difficulty margin.
 */
export function fairValue(project: ProjectDef): number {
  return (
    project.computeHours * REFERENCE_COMPUTE_PRICE +
    (project.tokenCost / 1_000_000) * REFERENCE_TOKEN_PRICE[project.capability]
  );
}

/** Margin as a fraction of the payout: (payment - fairValue) / payment. */
export function margin(project: ProjectDef): number {
  return (project.payment - fairValue(project)) / project.payment;
}

/** True when a fleet of the given tier is strong enough to attempt the run. */
export function canRun(project: ProjectDef, tier: FleetTier): boolean {
  return tier >= project.minFleetTier;
}
