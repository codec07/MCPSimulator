/**
 * Small presentation helpers for the storefront.
 *
 * The data catalogs deliberately avoid importing UI types, so their `tone`
 * fields are loose strings. These helpers narrow them for the UI layer.
 */

import { hasIcon } from "@/components/ui/Icon";
import type { Tone } from "@/components/ui/Badge";
import { CAPABILITY_META } from "@/data/models";
import type { Capability } from "@/lib/types";

const TONES: readonly string[] = [
  "neutral",
  "iris",
  "mint",
  "solar",
  "ember",
  "aqua",
  "plasma",
];

/** Narrow a catalog `tone` string to a real `Tone`, falling back when unknown. */
export function asTone(value: string | undefined, fallback: Tone = "neutral"): Tone {
  return value && TONES.includes(value) ? (value as Tone) : fallback;
}

/**
 * Capability metadata ships icon *names*, and the registry is a curated
 * subset — anything missing (e.g. `Code2`) degrades to a generic glyph.
 */
export function capabilityIcon(capability: Capability): string {
  const name = CAPABILITY_META[capability]?.icon;
  return name && hasIcon(name) ? name : "Sparkles";
}

/** Display label for a capability, tolerant of a missing metadata entry. */
export function capabilityLabel(capability: Capability): string {
  const label = CAPABILITY_META[capability]?.label;
  return label ?? capability.replace(/-/g, " ");
}

/** One-line explanation of what a capability means, for detail views. */
export function capabilityBlurb(capability: Capability): string {
  return CAPABILITY_META[capability]?.blurb ?? "";
}
