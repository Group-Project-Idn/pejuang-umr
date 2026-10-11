import type { Effect, HexCoord, InviteCard, InviteMotive, InvitePlan, PrivateStatus, PublicGameState } from "@pejuang/shared";
import type { BoardState } from "../board/board-state";
import type { EliminationReason } from "../economy/elimination";

export type CalendarChoiceId = "join" | "joinPaylater" | "skip";

export interface PlayerState {
  status: PrivateStatus;
  eliminated: boolean;
  eliminatedAtStep: number | null;
  eliminatedReason: EliminationReason | null;
  /** Kartu Ajakan yang dipegang (motif rahasia, jangan masuk state publik). */
  inviteCard: InviteCard | null;
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

/** Ajakan yang menunggu jawaban target. Memuat motif, jadi tidak boleh keluar dari server. */
export interface PendingInvite {
  inviteId: string;
  senderId: string;
  targetId: string;
  plan: InvitePlan;
  planEffects: Effect[];
  motive: InviteMotive;
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
  /** Pemain yang sudah melangkah di ronde ini; dikosongkan di awal ronde baru. */
  movedThisRound: string[];
  phase: GamePhase;
  /** GDD 4.8: 1 Ajakan per ronde; direset di setiap startRound. */
  inviteUsedThisRound: boolean;
  pendingInvite: PendingInvite | null;
}
