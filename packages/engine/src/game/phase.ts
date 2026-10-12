import type { PublicGameState } from "@pejuang/shared";
import type { GamePhase, GameState } from "./game-state";

type PublicPhase = NonNullable<PublicGameState["phase"]>;

/** Fase publik untuk klien: ganti bulan dan Event Tanggal sama-sama "calendar". */
export function publicPhaseOf(phase: GamePhase): PublicPhase {
  switch (phase) {
    case "roundStart":
    case "monthChange":
    case "calendarEvent":
      return "calendar";
    case "turn":
      return "turn";
    case "reveal":
      return "reveal";
    case "finished":
      return "finished";
  }
}

/** Mengganti phase engine sekaligus `public.phase`. */
export function withPhase(state: GameState, phase: GamePhase): GameState {
  return { ...state, phase, public: { ...state.public, phase: publicPhaseOf(phase) } };
}
