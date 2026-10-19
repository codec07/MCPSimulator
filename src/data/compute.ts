/**
 * MCP Simulator — compute catalog.
 *
 * Sixteen purchasable rigs from real providers, grouped by fleet tier.
 * Tier is the spine: 1 = shared CPU, 2 = consumer GPU, 3 = prosumer GPU,
 * 4 = datacenter GPU, 5 = hyperscale cluster.
 *
 * Every plan's `tflops` is `perGpuTflops * gpuCount`, and the economy reads
 * cost through `costPerWorkloadHour` so a rig's real price per *workload*
 * hour is `pricePerHour / speedMultiplier`.
 */

import type { ComputePlan, FleetTier, GPUClass } from "@/lib/types";

/* ============================================================
   The speed model
   ============================================================ */

/**
 * Effective throughput multiplier of a rig, from its peak tensor TFLOPS and
 * its vCPU count.
 *
 * Tuned so the tiers form a genuine trade rather than a strict ladder: a cheap
 * box is the most cost-effective per workload-hour, while a big rig finishes in
 * a fraction of the wall-clock time and bills a premium for the privilege.
 *
 * Measured against `REFERENCE_COMPUTE_PRICE` (0.6 $/workload-hour) the tiers
 * land at roughly:
 *   tier      1      2      3      4      5
 *   speed    0.4x   1.6x   2.0x   2.7x   5.0x
 *   $/w-h    0.15   0.25   0.55   1.00   2.50
 */
export function speedMultiplier(plan: { tflops: number; vcpus: number }): number {
  const gpu = Math.pow(Math.max(plan.tflops, 0.1), 0.3);
  const cpu = Math.pow(Math.max(plan.vcpus, 1), 0.25);
  const raw = 0.05 + gpu * 0.3 + cpu * 0.08;
  return Math.max(0.2, Math.min(5, Number(raw.toFixed(3))));
}

/* ============================================================
   The catalog
   ============================================================ */

export const COMPUTE_PLANS: ComputePlan[] = [
  /* ----------------------------------------------------------
     Tier 1 — Shared CPU (no GPU)
     ---------------------------------------------------------- */
  {
    id: "fly-io-cpu-burst",
    name: "Fly.io Machines",
    provider: "Fly.io",
    kind: "cpu",
    gpu: null,
    gpuCount: 0,
    vram: 0,
    vcpus: 2,
    ram: 4,
    tflops: 0.3,
    tier: 1,
    gpuClass: "none",
    tagline: "Firecracker microVMs in 30 seconds",
    description:
      "Shared-cpu-1x Firecracker microVMs that boot in under a second and scale to zero. Fine for webhooks, glue services and CI jobs that need to sit physically near users.",
    pricePerHour: 0.08,
    regions: ["iad", "lhr", "sin", "syd"],
    billing: "hourly",
    reliability: 97,
    hourOptions: [1, 5, 25, 100],
    accent: "#22d3ee",
  },
  {
    id: "vercel-fluid-compute",
    name: "Vercel Fluid Compute",
    provider: "Vercel",
    kind: "cpu",
    gpu: null,
    gpuCount: 0,
    vram: 0,
    vcpus: 4,
    ram: 8,
    tflops: 0.6,
    tier: 1,
    gpuClass: "none",
    tagline: "Serverless functions, billed per second",
    description:
      "Fluid compute reuses warm Node instances and charges for real CPU seconds, so bursty rendering, cron sweeps and edge middleware cost almost nothing while idle.",
    pricePerHour: 0.09,
    regions: ["iad1", "sfo1", "fra1", "sin1"],
    billing: "per-second",
    reliability: 99,
    hourOptions: [2, 10, 50, 200],
    accent: "#94a3b8",
  },
  {
    id: "oracle-oci-arm-free",
    name: "OCI Ampere A1 Flex",
    provider: "Oracle OCI",
    kind: "cpu",
    gpu: null,
    gpuCount: 0,
    vram: 0,
    vcpus: 4,
    ram: 16,
    tflops: 0.9,
    tier: 1,
    gpuClass: "none",
    tagline: "Always-free Ampere A1 ARM cores",
    description:
      "Oracle's always-free Ampere A1 allocation: four OCPU and 16 GB of ARM memory you can leave running forever. Slow per core, but genuinely zero cost for long-lived side projects.",
    pricePerHour: 0.02,
    regions: ["us-ashburn-1", "uk-london-1", "ap-singapore-1"],
    billing: "hourly",
    reliability: 98,
    hourOptions: [1, 10, 50, 250],
    accent: "#34d399",
    badge: "Free tier",
  },

  /* ----------------------------------------------------------
     Tier 2 — Consumer GPU (24 GB, 1 card)
     ---------------------------------------------------------- */
  {
    id: "runpod-rtx4090",
    name: "RunPod RTX 4090",
    provider: "RunPod",
    kind: "gpu",
    gpu: "NVIDIA RTX 4090",
    gpuCount: 1,
    vram: 24,
    vcpus: 12,
    ram: 48,
    tflops: 165,
    tier: 2,
    gpuClass: "consumer",
    tagline: "Community-priced 4090s on demand",
    description:
      "RTX 4090 pods with 24 GB of GDDR6X and a per-second API, spun up from a template in under a minute. The default pick for LoRA fine-tunes, diffusion batches and small inference endpoints.",
    pricePerHour: 0.44,
    regions: ["us-east-1", "us-west-2", "eu-ro-1", "ca-central-1"],
    billing: "hourly",
    reliability: 94,
    hourOptions: [1, 5, 25, 100],
    accent: "#7c5cff",
    badge: "Best value",
  },
  {
    id: "vast-spot-3090",
    name: "Vast.ai RTX 3090 (interruptible)",
    provider: "Vast.ai",
    kind: "gpu",
    gpu: "NVIDIA RTX 3090",
    gpuCount: 1,
    vram: 24,
    vcpus: 8,
    ram: 32,
    tflops: 142,
    tier: 2,
    gpuClass: "consumer",
    tagline: "Peer-to-peer 3090s, interruptible",
    description:
      "The cheapest route onto a 24 GB card: a bidding marketplace of third-party hosts. Instances can be reclaimed at any moment, so it only suits checkpointed, restartable batch work.",
    pricePerHour: 0.24,
    regions: ["us-east-1", "us-west-2", "eu-west-1", "ap-southeast-1"],
    billing: "spot",
    reliability: 74,
    hourOptions: [2, 10, 50, 200],
    accent: "#f97316",
    badge: "Spot",
  },
  {
    id: "salad-rtx4090",
    name: "SaladCloud RTX 4090 Grid",
    provider: "Salad",
    kind: "gpu",
    gpu: "NVIDIA RTX 4090",
    gpuCount: 1,
    vram: 24,
    vcpus: 10,
    ram: 32,
    tflops: 165,
    tier: 2,
    gpuClass: "consumer",
    tagline: "Idle gaming PCs, pennies per hour",
    description:
      "Salad rents consumer desktops and gaming rigs while their owners are asleep and turns them into a container grid. Superb throughput per dollar for batch rendering; nodes come and go without warning.",
    pricePerHour: 0.3,
    regions: ["us-west-1", "us-east-1", "eu-central-1"],
    billing: "spot",
    reliability: 71,
    hourOptions: [1, 10, 50, 250],
    accent: "#a3e635",
  },
  {
    id: "aws-g5-a10g",
    name: "AWS EC2 G5",
    provider: "AWS",
    kind: "gpu",
    gpu: "NVIDIA A10G",
    gpuCount: 1,
    vram: 24,
    vcpus: 8,
    ram: 32,
    tflops: 125,
    tier: 2,
    gpuClass: "consumer",
    tagline: "The easiest GPU to actually get",
    description:
      "g5.xlarge hands you one A10G, 24 GB of VRAM and the entire boring AWS toolbox: VPC, IAM, EBS, CloudWatch. You pay a premium for it, but capacity is nearly always available.",
    pricePerHour: 0.52,
    regions: ["us-east-1", "us-west-2", "eu-west-1", "ap-southeast-1"],
    billing: "hourly",
    reliability: 99,
    hourOptions: [1, 5, 25, 100],
    accent: "#fbbf24",
  },

  /* ----------------------------------------------------------
     Tier 3 — Prosumer GPU (48–96 GB)
     ---------------------------------------------------------- */
  {
    id: "hyperstack-2x-a6000",
    name: "Hyperstack 2× RTX A6000",
    provider: "Hyperstack",
    kind: "gpu",
    gpu: "NVIDIA RTX A6000",
    gpuCount: 2,
    vram: 96,
    vcpus: 24,
    ram: 128,
    tflops: 310,
    tier: 3,
    gpuClass: "prosumer",
    tagline: "96 GB of pro VRAM, no egress bill",
    description:
      "A matched pair of RTX A6000s at 48 GB each, built for tensor-parallel splits of quantised 70B models. Hyperstack's flat pricing and free egress make it the quiet favourite for long training runs.",
    pricePerHour: 1.2,
    regions: ["us-1", "canada-1", "eu-1", "eu-2"],
    billing: "hourly",
    reliability: 96,
    hourOptions: [5, 25, 100, 500],
    accent: "#38bdf8",
  },
  {
    id: "crusoe-l40s",
    name: "Crusoe L40S Instance",
    provider: "Crusoe",
    kind: "gpu",
    gpu: "NVIDIA L40S",
    gpuCount: 1,
    vram: 48,
    vcpus: 16,
    ram: 96,
    tflops: 362,
    tier: 3,
    gpuClass: "prosumer",
    tagline: "Flared-gas L40S with Ada encoders",
    description:
      "One L40S on Crusoe's carbon-aware cloud, which powers racks from stranded and flared gas. The Ada media engines give it an unusual edge on video-diffusion and mixed encode-then-infer jobs.",
    pricePerHour: 1.35,
    regions: ["us-west-2", "us-east-1", "eu-north-1"],
    billing: "hourly",
    reliability: 97,
    hourOptions: [1, 5, 25, 100],
    accent: "#2ee0a4",
  },
  {
    id: "nebius-l40s",
    name: "Nebius AI Cloud L40S",
    provider: "Nebius",
    kind: "gpu",
    gpu: "NVIDIA L40S",
    gpuCount: 1,
    vram: 48,
    vcpus: 16,
    ram: 96,
    tflops: 362,
    tier: 3,
    gpuClass: "prosumer",
    tagline: "EU-hosted L40S with NVMe scratch",
    description:
      "Nebius pairs every L40S with fast local NVMe and 200 Gb/s networking across Finland and Paris. A tidy option when both the model and the training data have to stay inside the EU.",
    pricePerHour: 1.1,
    regions: ["eu-north1", "eu-west1", "us-central1"],
    billing: "hourly",
    reliability: 95,
    hourOptions: [2, 10, 50, 200],
    accent: "#facc15",
  },
  {
    id: "fireworks-l40s-serverless",
    name: "Fireworks Serverless L40S",
    provider: "Fireworks AI",
    kind: "serverless",
    gpu: "NVIDIA L40S",
    gpuCount: 1,
    vram: 48,
    vcpus: 16,
    ram: 96,
    tflops: 362,
    tier: 3,
    gpuClass: "prosumer",
    tagline: "Per-second L40S, no cold starts",
    description:
      "Fireworks keeps your weights hot and bills by the second, so bursty agent traffic never pays for an idle card. You trade SSH access for their tuned serving stack and automatic batching.",
    pricePerHour: 1.5,
    regions: ["us-east-1", "us-west-2", "eu-west-1", "ap-southeast-1"],
    billing: "per-second",
    reliability: 95,
    hourOptions: [1, 5, 25, 100],
    accent: "#fb7185",
    badge: "Serverless",
  },

  /* ----------------------------------------------------------
     Tier 4 — Datacenter GPU (80–160 GB)
     ---------------------------------------------------------- */
  {
    id: "lambda-h100-sxm",
    name: "Lambda H100 SXM",
    provider: "Lambda Labs",
    kind: "gpu",
    gpu: "NVIDIA H100 SXM",
    gpuCount: 1,
    vram: 80,
    vcpus: 26,
    ram: 200,
    tflops: 989,
    tier: 4,
    gpuClass: "datacenter",
    tagline: "Bare-metal H100 for real training",
    description:
      "A single H100 SXM5 with 80 GB of HBM3 and 3.35 TB/s of memory bandwidth, on bare metal with no hypervisor tax. The reference rig for full 7B–13B fine-tunes.",
    pricePerHour: 2.49,
    regions: ["us-east-1", "us-west-2", "us-west-1", "ap-southeast-1"],
    billing: "hourly",
    reliability: 97,
    hourOptions: [5, 25, 100, 500],
    accent: "#818cf8",
    badge: "Best for training",
  },
  {
    id: "azure-nc-h100-v5",
    name: "Azure NC H100 v5",
    provider: "Microsoft Azure",
    kind: "gpu",
    gpu: "NVIDIA H100 NVL",
    gpuCount: 1,
    vram: 94,
    vcpus: 40,
    ram: 320,
    tflops: 989,
    tier: 4,
    gpuClass: "datacenter",
    tagline: "One H100, full Azure governance",
    description:
      "NC40ads H100 v5 puts a single H100 NVL inside a real VNet with Entra ID, Private Link and inherited compliance. Slower to provision, but the safest place for regulated inference.",
    pricePerHour: 3.4,
    regions: ["eastus", "westus3", "swedencentral", "japaneast"],
    billing: "monthly",
    reliability: 99,
    hourOptions: [5, 25, 100, 500],
    accent: "#60a5fa",
    badge: "Enterprise",
  },
  {
    id: "together-h100-serverless",
    name: "Together H100 Serverless",
    provider: "Together AI",
    kind: "serverless",
    gpu: "NVIDIA H100 SXM",
    gpuCount: 2,
    vram: 160,
    vcpus: 48,
    ram: 320,
    tflops: 1978,
    tier: 4,
    gpuClass: "datacenter",
    tagline: "Two H100s, billed by the second",
    description:
      "A serverless pair of H100s with 160 GB of combined HBM3 and Together's FlashAttention kernels behind an OpenAI-compatible API. You pay only for the seconds a generation actually runs.",
    pricePerHour: 3.2,
    regions: ["us-east-1", "us-west-2", "eu-west-1"],
    billing: "per-second",
    reliability: 96,
    hourOptions: [2, 10, 50, 200],
    accent: "#e879f9",
  },

  /* ----------------------------------------------------------
     Tier 5 — Hyperscale Cluster (8 GPUs, NVLink)
     ---------------------------------------------------------- */
  {
    id: "coreweave-hgx-h100",
    name: "CoreWeave HGX H100",
    provider: "CoreWeave",
    kind: "cluster",
    gpu: "NVIDIA H100 SXM",
    gpuCount: 8,
    vram: 640,
    vcpus: 144,
    ram: 1200,
    tflops: 15840,
    tier: 5,
    gpuClass: "cluster",
    tagline: "Eight H100s on one NVLink spine",
    description:
      "A whole HGX H100 baseboard: 8 GPUs, 640 GB of HBM3 and 900 GB/s of NVLink joining them. Engineered for tensor-parallel pre-training of 70B+ models and long RLHF loops.",
    pricePerHour: 11,
    regions: ["us-east-1", "us-west-2", "eu-west-1"],
    billing: "hourly",
    reliability: 98,
    hourOptions: [5, 25, 100, 500],
    accent: "#c084fc",
    badge: "Fastest",
  },
  {
    id: "gcp-a3-h100",
    name: "Google Cloud A3 Mega",
    provider: "Google Cloud",
    kind: "cluster",
    gpu: "NVIDIA H100 SXM",
    gpuCount: 8,
    vram: 640,
    vcpus: 192,
    ram: 1500,
    tflops: 15840,
    tier: 5,
    gpuClass: "cluster",
    tagline: "8×H100 behind a 3.2 Tb/s fabric",
    description:
      "A3 Mega exposes eight H100s over GPUDirect-TCPX and Google's Jupiter fabric, so all-reduce barely stalls. Its niche is distributed training that lives or dies on east-west bandwidth.",
    pricePerHour: 9.4,
    regions: ["us-central1", "us-east4", "europe-west4", "asia-southeast1"],
    billing: "hourly",
    reliability: 99,
    hourOptions: [10, 50, 100, 500],
    accent: "#f472b6",
  },
];

/* ============================================================
   Lookups & derived helpers
   ============================================================ */

/** Plan lookup keyed by id, kept in sync with `COMPUTE_PLANS`. */
export const COMPUTE_BY_ID: Record<string, ComputePlan> = Object.fromEntries(
  COMPUTE_PLANS.map((plan) => [plan.id, plan]),
);

/** The $/hour anchor every project payout is calibrated against. */
export const REFERENCE_COMPUTE_PRICE = 0.6;

/**
 * What one *workload* hour really costs on this rig: the sticker price divided
 * by how much work the rig gets done in that hour.
 */
export function costPerWorkloadHour(plan: ComputePlan): number {
  return plan.pricePerHour / speedMultiplier(plan);
}

/* ============================================================
   Tier presentation metadata
   ============================================================ */

export const COMPUTE_TIER_META: Record<
  FleetTier,
  { label: string; blurb: string; tone: string; gpuClass: GPUClass }
> = {
  1: {
    label: "Shared CPU",
    blurb: "Elastic CPU sandboxes — fine for glue code, hopeless for models.",
    tone: "neutral",
    gpuClass: "none",
  },
  2: {
    label: "Consumer GPU",
    blurb: "Single 24 GB cards that punch far above their price per hour.",
    tone: "aqua",
    gpuClass: "consumer",
  },
  3: {
    label: "Prosumer GPU",
    blurb: "48–96 GB Ada and Ampere rigs for quantised 70B and video diffusion.",
    tone: "mint",
    gpuClass: "prosumer",
  },
  4: {
    label: "Datacenter GPU",
    blurb: "H100-class silicon with HBM3 for full fine-tunes and heavy inference.",
    tone: "solar",
    gpuClass: "datacenter",
  },
  5: {
    label: "Hyperscale Cluster",
    blurb: "Eight-GPU NVLink baseboards for pre-training and long RLHF loops.",
    tone: "plasma",
    gpuClass: "cluster",
  },
};
