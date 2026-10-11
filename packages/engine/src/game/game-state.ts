import type { HexCoord, PrivateStatus, PublicGameState } from "@pejuang/shared";
import type { BoardState } from "../board/board-state";
import type { EliminationReason } from "../economy/elimination";

export type CalendarChoiceId = "join" | "joinPaylater" | "skip";

export interface PlayerState {
  status: PrivateStatus;
  eliminated: boolean;
  eliminatedAtStep: number | null;
  eliminatedReason: EliminationReason | null;
}

export interface PendingTurn {
  turnId: string;
  playerId: string;
  mode: "normal" | "deadEnd";
  options: HexCoord[];
}

export interface PendingCalendarEvent {
  eventId: string;
  answers: Record<string, CalendarChoiceId>;
}

export type GamePhase = "roundStart" | "calendarEvent" | "turn" | "finished";

/** State lengkap game. Hanya ada di engine/server; klien hanya menerima `public`. */
export interface GameState {
  public: PublicGameState;
  board: BoardState;
  players: Record<string, PlayerState>;
  baseTurnOrder: string[];
  pendingTurn: PendingTurn | null;
  pendingCalendarEvent: PendingCalendarEvent | null;
  phase: GamePhase;
}
