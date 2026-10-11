import type { PublicGameState } from "@pejuang/shared";
import type { GameState } from "./game-state";

/** Satu-satunya bagian state yang boleh dikirim ke semua klien. */
export function toPublicState(state: GameState): PublicGameState {
  return state.public;
}
