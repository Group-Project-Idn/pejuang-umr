import type {
  Effect,
  ErrorCode,
  InviteCard,
  InviteMotive,
  InviteResolvedPayload,
} from "@pejuang/shared";
import { INVITE_MOTIVE_EFFECTS, INVITE_MOTIVE_WEIGHTS, INVITE_PLANS } from "../data";
import { applyEffects } from "../economy/apply-effects";
import { isBurnout } from "../economy/elimination";
import type { DomainEvent } from "../game/domain-events";
import type { GameState, PlayerState } from "../game/game-state";
import type { RandomSource } from "../random";
import { toScoreRows, type RankingEntry } from "../score/ranking";

export type InviteAnswer = "join" | "decline";

export type InviteTransitionResult =
  | { ok: true; state: GameState; events: DomainEvent[] }
  | { ok: false; code: ErrorCode; message: string };

function fail(code: ErrorCode, message: string): InviteTransitionResult {
  return { ok: false, code, message };
}

function pickMotive(random: RandomSource): InviteMotive {
  const roll = random.integer(1, 100);
  let total = 0;
  for (const motive of ["sincere", "commission", "trap"] as const) {
    total += INVITE_MOTIVE_WEIGHTS[motive];
    if (roll <= total) return motive;
  }
  return "trap";
}

export function distributeInviteCards(
  state: GameState,
  random: RandomSource,
): { state: GameState; events: DomainEvent[] } {
  const month = state.public.calendar.month;
  if (month % 2 === 0) {
    return { state: { ...state, inviteUsedAtStep: null }, events: [] };
  }
  const inviteCards = { ...state.inviteCards };
  const events: DomainEvent[] = [];
  for (const playerId of state.baseTurnOrder) {
    const player = state.players[playerId];
    if (!player || player.eliminated) continue;
    const expiredCardId = inviteCards[playerId]?.cardId ?? null;
    const plan = random.pick(INVITE_PLANS);
    const card: InviteCard = {
      cardId: `invite-card-${state.public.calendar.step}-${playerId}`,
      plan: plan.id,
      planEffects: plan.effects,
      motive: pickMotive(random),
      expiresAtMonth: Math.min(12, month + 1),
    };
    inviteCards[playerId] = card;
    events.push({
      type: "invite:card",
      target: { kind: "player", playerId },
      payload: { card, expiredCardId },
    });
  }
  return {
    state: { ...state, inviteCards, inviteUsedAtStep: null },
    events,
  };
}

export function sendInvite(
  state: GameState,
  fromPlayerId: string,
  fromName: string,
  cardId: string,
  targetPlayerId: string,
): InviteTransitionResult {
  if (state.phase === "finished") return fail("GAME_FINISHED", "Permainan sudah selesai.");
  if (state.pendingInvite || state.inviteUsedAtStep === state.public.calendar.step) {
    return fail("INVITE_LIMIT", "Ajakan meja sudah dipakai pada ronde ini.");
  }
  const card = state.inviteCards[fromPlayerId];
  if (!card || card.cardId !== cardId) return fail("NO_INVITE_CARD", "Kartu Ajakan tidak tersedia.");
  if (
    fromPlayerId === targetPlayerId ||
    !state.players[targetPlayerId] ||
    state.players[targetPlayerId]?.eliminated
  ) {
    return fail("INVALID_TARGET", "Target Ajakan tidak valid.");
  }
  const inviteId = `invite-${state.public.calendar.step}-${fromPlayerId}-${targetPlayerId}`;
  return {
    ok: true,
    state: {
      ...state,
      inviteCards: { ...state.inviteCards, [fromPlayerId]: null },
      pendingInvite: { inviteId, fromPlayerId, targetPlayerId, card },
      inviteUsedAtStep: state.public.calendar.step,
    },
    events: [
      {
        type: "invite:card",
        target: { kind: "player", playerId: fromPlayerId },
        payload: { card: null, expiredCardId: null },
      },
      {
        type: "invite:incoming",
        target: { kind: "player", playerId: targetPlayerId },
        payload: {
          inviteId,
          fromPlayerId,
          fromName,
          plan: card.plan,
          planEffects: card.planEffects,
          deadline: 0,
        },
      },
    ],
  };
}

function updatePlayer(
  player: PlayerState,
  effects: readonly Effect[],
  step: number,
): PlayerState {
  const status = applyEffects(player.status, effects).status;
  if (!player.eliminated && isBurnout(status)) {
    return {
      status,
      eliminated: true,
      eliminatedAtStep: step,
      eliminatedReason: "burnout",
    };
  }
  return { ...player, status };
}

function resolvedPayload(
  state: GameState,
  answer: InviteAnswer,
  autoDeclined: boolean,
  motive: InviteMotive | null,
  effectsForYou: Effect[],
): InviteResolvedPayload {
  const pending = state.pendingInvite!;
  return {
    inviteId: pending.inviteId,
    fromPlayerId: pending.fromPlayerId,
    targetPlayerId: pending.targetPlayerId,
    answer,
    autoDeclined,
    motive,
    effectsForYou,
  };
}

export function resolveInvite(
  state: GameState,
  targetPlayerId: string,
  inviteId: string,
  answer: InviteAnswer,
  autoDeclined = false,
): InviteTransitionResult {
  const pending = state.pendingInvite;
  if (!pending || pending.inviteId !== inviteId || pending.targetPlayerId !== targetPlayerId) {
    return fail("INVITE_EXPIRED", "Ajakan sudah berakhir.");
  }
  const rule = INVITE_MOTIVE_EFFECTS[pending.card.motive][answer];
  const targetEffects: Effect[] = [];
  const senderEffects: Effect[] = [...rule.senderExtra];
  if (answer === "join" && rule.planAppliesToTarget) {
    targetEffects.push(...pending.card.planEffects);
  }
  targetEffects.push(...rule.targetExtra);
  if (answer === "decline" && rule.declineWealthPenalty !== 0) {
    targetEffects.push({ stat: "wealth", delta: rule.declineWealthPenalty });
  }

  const players = { ...state.players };
  players[pending.targetPlayerId] = updatePlayer(
    players[pending.targetPlayerId]!,
    targetEffects,
    state.public.calendar.step,
  );
  players[pending.fromPlayerId] = updatePlayer(
    players[pending.fromPlayerId]!,
    senderEffects,
    state.public.calendar.step,
  );
  const events: DomainEvent[] = [
    {
      type: "invite:resolved",
      target: { kind: "player", playerId: pending.fromPlayerId },
      payload: resolvedPayload(state, answer, autoDeclined, pending.card.motive, senderEffects),
    },
    {
      type: "invite:resolved",
      target: { kind: "player", playerId: pending.targetPlayerId },
      payload: resolvedPayload(
        state,
        answer,
        autoDeclined,
        answer === "join" || pending.card.motive === "sincere" ? pending.card.motive : null,
        targetEffects,
      ),
    },
    {
      type: "player:status",
      target: { kind: "player", playerId: pending.fromPlayerId },
      payload: players[pending.fromPlayerId]!.status,
    },
    {
      type: "player:status",
      target: { kind: "player", playerId: pending.targetPlayerId },
      payload: players[pending.targetPlayerId]!.status,
    },
  ];
  if (answer === "decline" && pending.card.motive === "sincere") {
    events.push({
      type: "game:patch",
      target: { kind: "room" },
      payload: {
        version: 0,
        ops: [{
          type: "inviteSincereDeclined",
          fromPlayerId: pending.fromPlayerId,
          targetPlayerId: pending.targetPlayerId,
        }],
      },
    });
  }
  for (const playerId of [pending.fromPlayerId, pending.targetPlayerId]) {
    const before = state.players[playerId]!;
    const after = players[playerId]!;
    if (!before.eliminated && after.eliminated) {
      events.push({
        type: "player:eliminated",
        target: { kind: "room" },
        payload: {
          version: 0,
          playerId,
          reason: "burnout",
          step: state.public.calendar.step,
        },
      });
    }
  }
  const eliminated = state.baseTurnOrder.filter((id) => players[id]?.eliminated);
  const entries: RankingEntry[] = state.baseTurnOrder.map((playerId) => ({
    playerId,
    status: players[playerId]!.status,
    eliminated: players[playerId]!.eliminated,
    eliminatedAtStep: players[playerId]!.eliminatedAtStep,
  }));
  const scores = toScoreRows(entries);
  const rankOneBurden = state.public.calendar.step >= 5
    ? scores.filter((row) => row.rank === 1 && !row.eliminated).map((row) => row.playerId)
    : [];
  events.push({
    type: "game:patch",
    target: { kind: "room" },
    payload: {
      version: 0,
      ops: [
        { type: "scores", scores },
        { type: "rankOneBurden", playerIds: rankOneBurden },
      ],
    },
  });
  return {
    ok: true,
    state: {
      ...state,
      players,
      pendingInvite: null,
      public: {
        ...state.public,
        eliminated,
        scores,
        rankOneBurden,
        turnOrder: state.public.turnOrder.filter((id) => !players[id]?.eliminated),
      },
    },
    events,
  };
}