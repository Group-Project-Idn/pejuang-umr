import type { Effect, HexCoord, InviteCard, InviteMotive, InvitePlan, Outcome, PrivateStatus, PublicGameState } from "@pejuang/shared";
import type { BoardState } from "../board/board-state";
import type { EliminationReason } from "../economy/elimination";

export type CalendarChoiceId = "join" | "joinPaylater" | "skip";

export interface PlayerState {
  status: PrivateStatus;
  eliminated: boolean;
  eliminatedAtStep: number | null;
  eliminatedReason: EliminationReason | null;
  /** Skor Kesejahteraan yang dibekukan saat eliminasi (GDD 1.2 v1.12). */
  frozenScore?: number | null;
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

/** Popup Ganti Bulan yang menunggu slider Bayar Hutang (GDD 2.4 v1.12). */
export interface PendingMonth {
  month: number;
  /** Pemain hidup dengan Hutang > 0 saat ganti bulan. */
  debtorIds: string[];
  /** Jumlah Hutang yang dibayar tiap debtor yang sudah menjawab. */
  answers: Record<string, number>;
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

/**
 * Realita yang sudah diundi saat pemain memilih heksa tetapi baru dibuka di Fase
 * Pembalikan (GDD 4.2 v1.12). Isinya rahasia: tidak boleh masuk state publik
 * atau event apa pun sebelum `round:reveal`.
 */
export interface PendingReality {
  playerId: string;
  turnId: string;
  hex: HexCoord;
  outcome: Outcome;
  text: string;
  effects: Effect[];
  seasonal: boolean;
}

export type GamePhase =
  | "roundStart"
  | "monthChange"
  | "calendarEvent"
  | "turn"
  | "reveal"
  | "finished";

/** State lengkap game. Hanya ada di engine/server; klien hanya menerima `public`. */
export interface GameState {
  public: PublicGameState;
  board: BoardState;
  players: Record<string, PlayerState>;
  baseTurnOrder: string[];
  pendingTurn: PendingTurn | null;
  pendingCalendarEvent: PendingCalendarEvent | null;
  pendingMonth: PendingMonth | null;
  /** Pemain yang sudah melangkah di ronde ini; dikosongkan di awal ronde baru. */
  movedThisRound: string[];
  phase: GamePhase;
  /** GDD 4.8: 1 Ajakan per ronde; direset di setiap startRound. */
  inviteUsedThisRound: boolean;
  pendingInvite: PendingInvite | null;
  /** Realita tersembunyi ronde ini; dikosongkan setelah Fase Pembalikan. */
  pendingRealities: PendingReality[];
}
