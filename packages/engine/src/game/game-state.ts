import type { Effect, HexCoord, InviteCard, InvitePlan, Outcome, PrivateStatus, PublicGameState } from "@pejuang/shared";
import type { BoardState } from "../board/board-state";
import type { ActiveInviteMotive } from "../data";
import type { DecisionLog } from "../log/decision-log";
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

/**
 * Satu Ajakan di ronde ini (GDD 4.8 v1.12). Jawaban hanya dicatat; hasilnya
 * diterapkan di Fase Pembalikan. Memuat motif, jadi tidak boleh keluar dari server
 * sebelum Fase Pembalikan (motif hanya ke pengirim lewat `invite:card`).
 */
export interface RoundInvite {
  inviteId: string;
  senderId: string;
  targetId: string;
  plan: InvitePlan;
  planEffects: Effect[];
  motive: ActiveInviteMotive;
  /** null selama target belum menjawab. */
  answer: "join" | "decline" | null;
  autoDeclined: boolean;
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
  /** Ajakan ronde ini (GDD 4.8 v1.12); dikosongkan setelah Fase Pembalikan. */
  roundInvites: RoundInvite[];
  /**
   * Log keputusan per pemain (GDD 6.5). Privat: tidak pernah masuk `public` maupun event;
   * server memakainya untuk Refleksi di akhir game / saat eliminasi.
   */
  decisionLog: DecisionLog;
  /** Realita tersembunyi ronde ini; dikosongkan setelah Fase Pembalikan. */
  pendingRealities: PendingReality[];
}
