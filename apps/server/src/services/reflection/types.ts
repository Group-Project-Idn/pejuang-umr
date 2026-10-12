import type { DecisionEntry } from "@pejuang/engine";
import type { Reflection } from "@pejuang/shared";

/** Entri log tanpa id pemain lain: Ajakan cukup ditulis "pemain lain" (GDD 6.5, privasi). */
export type ReflectionLogEntry =
  | Exclude<DecisionEntry, { kind: "inviteSent" } | { kind: "inviteResult" }>
  | Omit<Extract<DecisionEntry, { kind: "inviteSent" }>, "targetId">
  | Omit<Extract<DecisionEntry, { kind: "inviteResult" }>, "otherPlayerId">;

/**
 * Masukan refleksi untuk SATU pemain. Tidak boleh memuat nama, status privat, atau kartu
 * pemain lain (GDD 6.5, API_CONTRACT 1.8).
 */
export interface ReflectionInput {
  /** Jumlah pemain di game ini (angka saja). */
  playerCount: number;
  log: ReflectionLogEntry[];
  finalStatus: { wealth: number; debt: number; health: number; stress: number };
  /** Skor Kesejahteraan 0-100 (desimal) dan tiga poinnya. */
  score: number;
  points: { finance: number; health: number; calm: number };
  /** Peringkat akhir (game selesai) atau data eliminasi; salah satunya terisi. */
  rank: number | null;
  eliminated: { step: number; reason: "bankrupt" | "burnout" } | null;
}

/** Penyedia refleksi (LLM). Hasil mentahnya selalu divalidasi dengan ReflectionSchema. */
export interface ReflectionProvider {
  generate(input: ReflectionInput, signal: AbortSignal): Promise<unknown>;
}

export type { Reflection };
