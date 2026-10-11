import type { Effect, ErrorCode } from "@pejuang/shared";
import { INVITE_MOTIVE_EFFECTS } from "../data";
import { applyEffects } from "../economy/apply-effects";
import { isBurnout } from "../economy/elimination";
import type { DomainEvent } from "../game/domain-events";
import type { GameState, PendingInvite, PlayerState } from "../game/game-state";
import { toScoreRows } from "../score/ranking";
import type { RoundResult } from "../turn/round";
import { checkEarlyFinish, rankingEntries } from "../turn/turn";

export type SendInviteResult =
  | {
      ok: true;
      state: GameState;
      events: DomainEvent[];
      /** Target sedang giliran: server menjeda Timer Giliran selama Ajakan dijawab. */
      targetIsActivePlayer: boolean;
    }
  | { ok: false; code: ErrorCode; message: string };

export type RespondInviteResult =
  | ({ ok: true } & RoundResult)
  | { ok: false; code: ErrorCode; message: string };

function fail(code: ErrorCode, message: string): { ok: false; code: ErrorCode; message: string } {
  return { ok: false, code, message };
}

/** invite:send. GDD 4.8: 1 Ajakan per ronde, boleh di luar giliran dan fase apa pun. */
export function sendInvite(
  state: GameState,
  senderId: string,
  cardId: string,
  targetId: string,
): SendInviteResult {
  if (state.phase === "finished") return fail("GAME_FINISHED", "Permainan sudah selesai.");
  const sender = state.players[senderId];
  if (!sender || sender.eliminated) {
    return fail("INVALID_TARGET", "Pemain yang tereliminasi tidak bisa mengajak.");
  }
  const card = sender.inviteCard;
  if (!card || card.cardId !== cardId) {
    return fail("NO_INVITE_CARD", "Kamu tidak punya Kartu Ajakan ini.");
  }
  if (state.inviteUsedThisRound || state.pendingInvite) {
    return fail("INVITE_LIMIT", "Ajakan sudah dipakai di ronde ini.");
  }
  const target = state.players[targetId];
  if (targetId === senderId || !target || target.eliminated) {
    return fail("INVALID_TARGET", "Target Ajakan tidak valid.");
  }

  const pendingInvite: PendingInvite = {
    inviteId: `invite-${state.public.calendar.step}-${senderId}`,
    senderId,
    targetId,
    plan: card.plan,
    planEffects: card.planEffects,
    motive: card.motive,
  };
  return {
    ok: true,
    state: {
      ...state,
      players: { ...state.players, [senderId]: { ...sender, inviteCard: null } },
      inviteUsedThisRound: true,
      pendingInvite,
    },
    events: [
      {
        type: "invite:incoming",
        target: { kind: "player", playerId: targetId },
        payload: {
          inviteId: pendingInvite.inviteId,
          fromPlayerId: senderId,
          fromName: senderId, // diganti server dengan nama pemain
          plan: pendingInvite.plan,
          planEffects: pendingInvite.planEffects,
          deadline: 0, // diisi server (10 detik)
        },
      },
    ],
    targetIsActivePlayer: state.public.activePlayerId === targetId,
  };
}

/** invite:respond. */
export function respondInvite(
  state: GameState,
  playerId: string,
  inviteId: string,
  answer: "join" | "decline",
): RespondInviteResult {
  const pending = state.pendingInvite;
  if (!pending || pending.inviteId !== inviteId || pending.targetId !== playerId) {
    return fail("INVITE_EXPIRED", "Ajakan sudah tidak berlaku.");
  }
  return { ok: true, ...resolveInvite(state, pending, answer, false) };
}

/** Waktu 10 detik habis: sama dengan Tolak, `autoDeclined` true. */
export function expireInvite(state: GameState, inviteId: string): RespondInviteResult {
  const pending = state.pendingInvite;
  if (!pending || pending.inviteId !== inviteId) {
    return fail("INVITE_EXPIRED", "Ajakan sudah tidak berlaku.");
  }
  return { ok: true, ...resolveInvite(state, pending, "decline", true) };
}

function resolveInvite(
  state: GameState,
  pending: PendingInvite,
  answer: "join" | "decline",
  autoDeclined: boolean,
): RoundResult {
  const { senderId, targetId, motive } = pending;
  const rule = INVITE_MOTIVE_EFFECTS[motive][answer];
  const step = state.public.calendar.step;

  // Nilai Ajakan sudah nilai Multiplayer: tidak dikali.
  const targetEffects: Effect[] =
    answer === "join"
      ? [...(rule.planAppliesToTarget ? pending.planEffects : []), ...rule.targetExtra]
      : rule.declineWealthPenalty !== 0
        ? [{ stat: "wealth", delta: rule.declineWealthPenalty }]
        : [];
  const senderEffects: Effect[] = [...rule.senderExtra];

  const events: DomainEvent[] = [];
  const players: Record<string, PlayerState> = { ...state.players };
  const eliminated: string[] = [];

  // Hanya Burnout yang bisa mengeliminasi; Bangkrut dan Doom Spending tidak dipicu Ajakan.
  const apply = (playerId: string, effects: readonly Effect[]) => {
    const player = players[playerId]!;
    if (effects.length === 0 || player.eliminated) return;
    const status = applyEffects(player.status, effects).status;
    const burnout = isBurnout(status);
    players[playerId] = burnout
      ? { status, eliminated: true, eliminatedAtStep: step, eliminatedReason: "burnout", inviteCard: null }
      : { ...player, status };
    events.push({ type: "player:status", target: { kind: "player", playerId }, payload: status });
    if (burnout) {
      eliminated.push(playerId);
      events.push({
        type: "player:eliminated",
        target: { kind: "room" },
        payload: { version: 0, playerId, reason: "burnout", step },
      });
    }
  };

  // Efek dihitung dari status sebelum Ajakan; event resolved dikirim lebih dulu.
  const revealToTarget = rule.revealMotiveTo !== "none";
  const base = { inviteId: pending.inviteId, fromPlayerId: senderId, targetPlayerId: targetId, answer, autoDeclined };
  events.push({
    type: "invite:resolved",
    target: { kind: "player", playerId: senderId },
    payload: { ...base, motive, effectsForYou: senderEffects },
  });
  events.push({
    type: "invite:resolved",
    target: { kind: "player", playerId: targetId },
    payload: { ...base, motive: revealToTarget ? motive : null, effectsForYou: targetEffects },
  });
  if (answer === "decline" && motive === "sincere") {
    events.push({
      type: "game:patch",
      target: { kind: "room" },
      payload: {
        version: 0,
        ops: [{ type: "inviteSincereDeclined", fromPlayerId: senderId, targetPlayerId: targetId }],
      },
    });
  }

  apply(targetId, targetEffects);
  apply(senderId, senderEffects);

  let publicState = state.public;
  if (targetEffects.length > 0 || senderEffects.length > 0) {
    const scores = toScoreRows(rankingEntries(players, state.baseTurnOrder));
    publicState = {
      ...publicState,
      scores,
      eliminated: [...publicState.eliminated, ...eliminated],
    };
    events.push({
      type: "game:patch",
      target: { kind: "room" },
      payload: { version: 0, ops: [{ type: "scores", scores }] },
    });
  }

  const next: GameState = { ...state, players, public: publicState, pendingInvite: null };
  const early = checkEarlyFinish(next);
  if (early) {
    return { state: early.state, events: [...events, ...early.events], nextAction: "finished" };
  }
  return { state: next, events };
}
