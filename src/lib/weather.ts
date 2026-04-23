import type { Item } from "../db/schema";

export type WarmthLevel = 0 | 1 | 2 | 3;

/** Map a temperature (°F) to the warmth the wearer wants. */
export function desiredWarmth(temp: number): WarmthLevel {
  if (temp >= 78) return 0;
  if (temp >= 68) return 1;
  if (temp >= 58) return 2;
  return 3;
}

/**
 * Suitability score for an item vs. target weather.
 * 0 = perfect match, higher = worse. Random jitter breaks ties.
 */
export function itemSuitability(item: Item, target: WarmthLevel): number {
  return Math.abs(item.warmth - target) + Math.random() * 0.25;
}

/** True when an item is noticeably off for the target warmth (too warm or too light). */
export function isWarmthOff(item: Item | undefined, target: WarmthLevel): boolean {
  if (!item) return false;
  return Math.abs(item.warmth - target) >= 2;
}
