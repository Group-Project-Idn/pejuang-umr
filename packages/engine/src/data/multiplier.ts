import type { Effect } from "@pejuang/shared";

const SOLO_TO_MULTIPLAYER_MONEY = 2;
const SOLO_TO_MULTIPLAYER_STATUS = 2;
const MAX_STATUS_DELTA = 3;
const MIN_STATUS_DELTA = -3;

/**
 * Mengalikan efek nilai Solo ke nilai Multiplayer (GDD 1.3):
 * Kekayaan dan Hutang dikali 2, Kesehatan dan Level Stress dikali 2
 * lalu dibatasi maksimal +3 dan minimal -3 per efek.
 */
export function toMultiplayerEffects(effects: readonly Effect[]): Effect[] {
  return effects.map((effect) => {
    if (effect.stat === "wealth" || effect.stat === "debt") {
      return { stat: effect.stat, delta: effect.delta * SOLO_TO_MULTIPLAYER_MONEY };
    }
    const scaled = effect.delta * SOLO_TO_MULTIPLAYER_STATUS;
    return {
      stat: effect.stat,
      delta: Math.min(MAX_STATUS_DELTA, Math.max(MIN_STATUS_DELTA, scaled)),
    };
  });
}
