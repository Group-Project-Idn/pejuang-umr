import type { Effect } from "@pejuang/shared";

/** GDD 1.3 v1.12: nilai semua konten sama di Solo dan Multiplayer (1×). */
export function toMultiplayerEffects(effects: readonly Effect[]): Effect[] {
  return effects.map((effect) => ({ ...effect }));
}
