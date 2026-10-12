import type { Category, Effect, Outcome } from "@pejuang/shared";
import type { ActiveInviteMotive } from "../data";

/**
 * Log keputusan per pemain (GDD 6.5 v1.12). Hanya hidup di GameState (server):
 * tidak pernah masuk state publik maupun event, karena memuat Realita dan motif.
 */
export interface IndicatorSnapshot {
  wealth: number;
  debt: number;
  health: number;
  stress: number;
}

export type DecisionEntry =
  | {
      kind: "tile";
      step: number;
      /** Id petak (internal, untuk aturan insight seperti "online-loan"). */
      tileId: string;
      category: Category;
      title: string;
      plan: Effect[];
      autoPicked: boolean;
      viaJump: boolean;
      /** Diisi saat Realita dibuka di Fase Pembalikan; null untuk Petak Emas. */
      reality: { outcome: Outcome; text: string; effects: Effect[]; seasonal: boolean } | null;
    }
  | {
      kind: "calendar";
      step: number;
      eventId: string;
      choice: "join" | "joinPaylater" | "skip";
      autoChosen: boolean;
    }
  | {
      kind: "debtPayment";
      step: number;
      month: number;
      amount: number;
      debtBefore: number;
      cleared: boolean;
    }
  | { kind: "inviteSent"; step: number; targetId: string; plan: string }
  | {
      kind: "inviteResult";
      step: number;
      role: "sender" | "target";
      otherPlayerId: string;
      plan: string;
      answer: "join" | "decline";
      autoDeclined: boolean;
      /** Motif dibuka di Fase Pembalikan, jadi baru tercatat saat hasil Ajakan. */
      motive: ActiveInviteMotive;
    }
  | { kind: "doom"; step: number; amount: number }
  | ({ kind: "roundEnd"; step: number } & IndicatorSnapshot);

export type DecisionLog = Record<string, DecisionEntry[]>;

export function emptyDecisionLog(playerIds: readonly string[]): DecisionLog {
  return Object.fromEntries(playerIds.map((id) => [id, []]));
}

/** Menambah satu entri tanpa memutasi log lama. */
export function appendDecision(
  log: DecisionLog,
  playerId: string,
  entry: DecisionEntry,
): DecisionLog {
  return { ...log, [playerId]: [...(log[playerId] ?? []), entry] };
}

/** Mengisi Realita pada entri petak terakhir pemain di langkah itu. */
export function attachReality(
  log: DecisionLog,
  playerId: string,
  step: number,
  reality: NonNullable<Extract<DecisionEntry, { kind: "tile" }>["reality"]>,
): DecisionLog {
  const entries = log[playerId] ?? [];
  let index = -1;
  for (let i = entries.length - 1; i >= 0; i -= 1) {
    const entry = entries[i]!;
    if (entry.kind === "tile" && entry.step === step) {
      index = i;
      break;
    }
  }
  if (index < 0) return log;
  const target = entries[index] as Extract<DecisionEntry, { kind: "tile" }>;
  const updated = entries.map((entry, i) => (i === index ? { ...target, reality } : entry));
  return { ...log, [playerId]: updated };
}

export function indicatorsOf(status: IndicatorSnapshot): IndicatorSnapshot {
  return {
    wealth: status.wealth,
    debt: status.debt,
    health: status.health,
    stress: status.stress,
  };
}
