import type { Effect, ErrorCode } from "@pejuang/shared";
import { INVITE_MOTIVE_EFFECTS, type ActiveInviteMotive } from "../data";
import type { DomainEvent } from "../game/domain-events";
import type { GameState, RoundInvite } from "../game/game-state";
import { appendDecision } from "../log/decision-log";

export type SendInviteResult =
  | { ok: true; state: GameState; events: DomainEvent[] }
  | { ok: false; code: ErrorCode; message: string };

export type RecordInviteResult =
  | { ok: true; state: GameState }
  | { ok: false; code: ErrorCode; message: string };

function fail(code: ErrorCode, message: string): { ok: false; code: ErrorCode; message: string } {
  return { ok: false, code, message };
}

/** Ada Ajakan ronde ini yang belum dijawab target (untuk server: tunda Fase Pembalikan). */
export function hasOpenInvites(state: GameState): boolean {
  return state.roundInvites.some((invite) => invite.answer === null);
}

/** Motif "trap" tidak punya aturan di engine; kartu lama diperlakukan sebagai Tulus. */
function toActiveMotive(motive: string): ActiveInviteMotive {
  return motive === "commission" ? "commission" : "sincere";
}

/**
 * invite:send (GDD 4.8 v1.12). Hanya di Fase Pilihan giliran pengirim sendiri,
 * sebelum memilih heksa. Beberapa Ajakan per ronde diizinkan (1 kartu per pemain).
 */
export function sendInvite(
  state: GameState,
  senderId: string,
  cardId: string,
  targetId: string,
  turnId?: string,
): SendInviteResult {
  if (state.phase === "finished") return fail("GAME_FINISHED", "Permainan sudah selesai.");
  const sender = state.players[senderId];
  if (!sender || sender.eliminated) {
    return fail("INVALID_TARGET", "Pemain yang tereliminasi tidak bisa mengajak.");
  }
  const pending = state.pendingTurn;
  if (
    state.phase !== "turn" ||
    !pending ||
    pending.playerId !== senderId ||
    state.public.activePlayerId !== senderId
  ) {
    return fail(
      "INVITE_NOT_ALLOWED",
      "Ajakan hanya bisa dikirim di giliranmu sebelum memilih heksa.",
    );
  }
  if (turnId !== undefined && turnId !== pending.turnId) {
    return fail("INVITE_NOT_ALLOWED", "Giliran sudah lewat.");
  }
  const card = sender.inviteCard;
  if (!card || card.cardId !== cardId) {
    return fail("NO_INVITE_CARD", "Kamu tidak punya Kartu Ajakan ini.");
  }
  const target = state.players[targetId];
  if (targetId === senderId || !target || target.eliminated) {
    return fail("INVALID_TARGET", "Target Ajakan tidak valid.");
  }
  if (state.roundInvites.some((invite) => invite.targetId === targetId && invite.answer === null)) {
    return fail("INVALID_TARGET", "Target sedang punya Ajakan lain.");
  }

  const invite: RoundInvite = {
    inviteId: `invite-${state.public.calendar.step}-${senderId}`,
    senderId,
    targetId,
    plan: card.plan,
    planEffects: card.planEffects,
    motive: toActiveMotive(card.motive),
    answer: null,
    autoDeclined: false,
  };
  return {
    ok: true,
    state: {
      ...state,
      players: { ...state.players, [senderId]: { ...sender, inviteCard: null } },
      roundInvites: [...state.roundInvites, invite],
      decisionLog: appendDecision(state.decisionLog, senderId, {
        kind: "inviteSent",
        step: state.public.calendar.step,
        targetId,
        plan: invite.plan,
      }),
    },
    events: [
      {
        type: "invite:incoming",
        target: { kind: "player", playerId: targetId },
        payload: {
          inviteId: invite.inviteId,
          fromPlayerId: senderId,
          fromName: senderId, // diganti server dengan nama pemain
          plan: invite.plan,
          planEffects: invite.planEffects,
          deadline: 0, // diisi server (15 detik)
        },
      },
    ],
  };
}

function record(
  state: GameState,
  inviteId: string,
  matches: (invite: RoundInvite) => boolean,
  answer: "join" | "decline",
  autoDeclined: boolean,
): RecordInviteResult {
  const found = state.roundInvites.find(
    (invite) => invite.inviteId === inviteId && invite.answer === null && matches(invite),
  );
  if (!found) return fail("INVITE_EXPIRED", "Ajakan sudah tidak berlaku.");
  return {
    ok: true,
    state: {
      ...state,
      roundInvites: state.roundInvites.map((invite) =>
        invite === found ? { ...invite, answer, autoDeclined } : invite,
      ),
    },
  };
}

/** invite:respond. Hanya mencatat jawaban; efek diterapkan di Fase Pembalikan. */
export function respondInvite(
  state: GameState,
  playerId: string,
  inviteId: string,
  answer: "join" | "decline",
): RecordInviteResult {
  return record(state, inviteId, (invite) => invite.targetId === playerId, answer, false);
}

/** Waktu 15 detik habis: sama dengan Tolak, `autoDeclined` true. Hanya mencatat. */
export function expireInvite(state: GameState, inviteId: string): RecordInviteResult {
  return record(state, inviteId, () => true, "decline", true);
}

/** Efek Ajakan untuk target dan pengirim sesuai motif dan jawaban (GDD 4.8 v1.12). */
export function inviteEffects(
  invite: Pick<RoundInvite, "motive" | "planEffects">,
  answer: "join" | "decline",
): { targetEffects: Effect[]; senderEffects: Effect[] } {
  const rule = INVITE_MOTIVE_EFFECTS[invite.motive][answer];
  return {
    targetEffects: [
      ...(rule.planAppliesToTarget ? invite.planEffects : []),
      ...rule.targetExtra,
    ],
    senderEffects: [...rule.senderExtra],
  };
}
