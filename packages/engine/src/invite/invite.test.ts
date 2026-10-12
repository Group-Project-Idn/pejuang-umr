import { describe, expect, it } from "vitest";
import type { InviteCard, InviteMotive, InvitePlan } from "@pejuang/shared";
import { INVITE_PLANS } from "../data";
import { SequenceRandomSource } from "../random";
import { createGame } from "../game/create-game";
import type { DomainEvent } from "../game/domain-events";
import type { GameState } from "../game/game-state";
import { expireInvite, respondInvite, sendInvite } from "./invite";

function ofType<T extends DomainEvent["type"]>(events: DomainEvent[], type: T) {
  return events.filter((e): e is Extract<DomainEvent, { type: T }> => e.type === type);
}

function cardOf(plan: InvitePlan, motive: InviteMotive, cardId = "c"): InviteCard {
  return {
    cardId,
    plan,
    planEffects: INVITE_PLANS.find((p) => p.id === plan)!.effects,
    motive,
    expiresAtMonth: 3,
  };
}

function makeGame(ids = ["a", "b", "c"]): GameState {
  const { state } = createGame(ids, "g", new SequenceRandomSource([0.5]));
  return state;
}

function withCard(state: GameState, playerId: string, card: InviteCard | null): GameState {
  return { ...state, players: { ...state.players, [playerId]: { ...state.players[playerId]!, inviteCard: card } } };
}

/** a mengajak b; mengembalikan state dengan pendingInvite. */
function invited(plan: InvitePlan, motive: InviteMotive, base = makeGame()) {
  const result = sendInvite(withCard(base, "a", cardOf(plan, motive)), "a", "c", "b");
  if (!result.ok) throw new Error(result.message);
  return result;
}

function respond(plan: InvitePlan, motive: InviteMotive, answer: "join" | "decline") {
  const sent = invited(plan, motive);
  const base = makeGame();
  const result = respondInvite(sent.state, "b", sent.state.pendingInvite!.inviteId, answer);
  if (!result.ok) throw new Error(result.message);
  const statusEvent = (events: DomainEvent[], id: string) =>
    ofType(events, "player:status").find((e) => e.target.kind === "player" && e.target.playerId === id)?.payload;
  const resolved = (id: string) =>
    ofType(result.events, "invite:resolved").find((e) => e.target.kind === "player" && e.target.playerId === id)!;
  return { result, base, statusEvent, resolved };
}

describe("sendInvite", () => {
  it("sukses: kartu terpakai, pendingInvite terisi, incoming tanpa motive", () => {
    const sent = invited("hangout", "commission");
    expect(sent.state.players.a!.inviteCard).toBeNull();
    expect(sent.state.inviteUsedThisRound).toBe(true);
    expect(sent.state.pendingInvite).toMatchObject({ senderId: "a", targetId: "b", plan: "hangout", motive: "commission" });
    const incoming = ofType(sent.events, "invite:incoming");
    expect(incoming).toHaveLength(1);
    expect(incoming[0]!.target).toEqual({ kind: "player", playerId: "b" });
    expect(JSON.stringify(incoming[0]!.payload)).not.toContain("motive");
    expect(sent.targetIsActivePlayer).toBe(false);
  });

  it("targetIsActivePlayer true bila target sedang giliran", () => {
    const base = makeGame();
    base.public = { ...base.public, activePlayerId: "b" };
    expect(invited("hangout", "sincere", base).targetIsActivePlayer).toBe(true);
  });

  it("Ajakan kedua di ronde yang sama -> INVITE_LIMIT, kartu kedua tetap ada", () => {
    const first = invited("hangout", "sincere");
    const state = withCard(first.state, "c", cardOf("morningRun", "commission", "c2"));
    const second = sendInvite(state, "c", "c2", "b");
    expect(second).toMatchObject({ ok: false, code: "INVITE_LIMIT" });
    expect(state.players.c!.inviteCard?.cardId).toBe("c2");
  });

  it("INVITE_LIMIT juga bila inviteUsedThisRound true", () => {
    const state = { ...withCard(makeGame(), "a", cardOf("hangout", "sincere")), inviteUsedThisRound: true };
    expect(sendInvite(state, "a", "c", "b")).toMatchObject({ ok: false, code: "INVITE_LIMIT" });
  });

  it("NO_INVITE_CARD bila tanpa kartu atau cardId beda", () => {
    expect(sendInvite(makeGame(), "a", "c", "b")).toMatchObject({ ok: false, code: "NO_INVITE_CARD" });
    const state = withCard(makeGame(), "a", cardOf("hangout", "sincere"));
    expect(sendInvite(state, "a", "lain", "b")).toMatchObject({ ok: false, code: "NO_INVITE_CARD" });
  });

  it("INVALID_TARGET: diri sendiri, tereliminasi, bukan pemain game", () => {
    const state = withCard(makeGame(), "a", cardOf("hangout", "sincere"));
    expect(sendInvite(state, "a", "c", "a")).toMatchObject({ ok: false, code: "INVALID_TARGET" });
    expect(sendInvite(state, "a", "c", "zzz")).toMatchObject({ ok: false, code: "INVALID_TARGET" });
    const out = { ...state, players: { ...state.players, b: { ...state.players.b!, eliminated: true } } };
    expect(sendInvite(out, "a", "c", "b")).toMatchObject({ ok: false, code: "INVALID_TARGET" });
  });

  it("pengirim tereliminasi -> INVALID_TARGET; game selesai -> GAME_FINISHED", () => {
    const state = withCard(makeGame(), "a", cardOf("hangout", "sincere"));
    const out = { ...state, players: { ...state.players, a: { ...state.players.a!, eliminated: true } } };
    expect(sendInvite(out, "a", "c", "b")).toMatchObject({ ok: false, code: "INVALID_TARGET" });
    expect(sendInvite({ ...state, phase: "finished" }, "a", "c", "b")).toMatchObject({
      ok: false,
      code: "GAME_FINISHED",
    });
  });
});

describe("respondInvite", () => {
  it("Proyek Bareng + commission + join", () => {
    const { result, base, statusEvent, resolved } = respond("jointProject", "commission", "join");
    const b = base.players.b!.status;
    const a = base.players.a!.status;
    expect(statusEvent(result.events, "b")).toMatchObject({
      wealth: b.wealth + 1_000_000,
      health: b.health - 1,
      stress: b.stress,
    });
    expect(statusEvent(result.events, "a")).toMatchObject({ wealth: a.wealth + 500_000 });
    expect(resolved("b").payload.motive).toBe("commission");
    expect(resolved("a").payload.motive).toBe("commission");
    expect(result.state.pendingInvite).toBeNull();
    expect(result.state.players.b!.status.wealth).toBe(b.wealth + 1_000_000);
  });

  it("Nongkrong + sincere + join", () => {
    const { result, base, statusEvent, resolved } = respond("hangout", "sincere", "join");
    const b = base.players.b!.status;
    const a = base.players.a!.status;
    expect(statusEvent(result.events, "b")).toMatchObject({
      wealth: b.wealth - 500_000,
      stress: Math.max(0, b.stress - 3),
    });
    expect(statusEvent(result.events, "a")).toMatchObject({ stress: Math.max(0, a.stress - 1) });
    expect(resolved("b").payload.effectsForYou).toEqual([
      { stat: "wealth", delta: -500_000 },
      { stat: "stress", delta: -2 },
      { stat: "stress", delta: -1 },
    ]);
    expect(resolved("a").payload.effectsForYou).toEqual([{ stat: "stress", delta: -1 }]);
  });

  it("commission + join: plan dan biaya tersembunyi berlaku", () => {
    const { result, base, statusEvent, resolved } = respond("staycation", "commission", "join");
    const b = base.players.b!.status;
    expect(statusEvent(result.events, "b")).toMatchObject({
      wealth: b.wealth - 1_500_000,
      health: Math.min(10, b.health + 1),
      stress: Math.max(0, b.stress - 2),
    });
    expect(statusEvent(result.events, "a")?.wealth).toBe(base.players.a!.status.wealth + 500_000);
    expect(resolved("b").payload.motive).toBe("commission");
  });

  it("sincere + decline: stress +1, game:patch, motive terbuka", () => {
    const { result, base, statusEvent, resolved } = respond("hangout", "sincere", "decline");
    expect(statusEvent(result.events, "b")).toMatchObject({
      stress: base.players.b!.status.stress + 1,
    });
    expect(resolved("b").payload.motive).toBe("sincere");
    const ops = ofType(result.events, "game:patch").flatMap((e) => e.payload.ops);
    expect(ops).toContainEqual({ type: "inviteSincereDeclined", fromPlayerId: "a", targetPlayerId: "b" });
  });

  it("commission + decline: stress -1, motif dibuka untuk target", () => {
    const { result, statusEvent, resolved } = respond("hangout", "commission", "decline");
    expect(statusEvent(result.events, "b")).toBeDefined();
    expect(resolved("b").payload.motive).toBe("commission");
    expect(resolved("b").payload.effectsForYou).toEqual([{ stat: "stress", delta: -1 }]);
    expect(resolved("a").payload.motive).toBe("commission");
    expect(ofType(result.events, "game:patch").flatMap((event) => event.payload.ops).some((op) => op.type === "inviteSincereDeclined")).toBe(false);
  });

  it("INVITE_EXPIRED: tanpa pending, inviteId beda, bukan target", () => {
    const sent = invited("hangout", "sincere");
    const id = sent.state.pendingInvite!.inviteId;
    expect(respondInvite(makeGame(), "b", id, "join")).toMatchObject({ ok: false, code: "INVITE_EXPIRED" });
    expect(respondInvite(sent.state, "b", "x", "join")).toMatchObject({ ok: false, code: "INVITE_EXPIRED" });
    expect(respondInvite(sent.state, "c", id, "join")).toMatchObject({ ok: false, code: "INVITE_EXPIRED" });
  });

  it("Komisi Proyek Bareng membuat target Burnout -> eliminated; tinggal 1 pemain -> game selesai", () => {
    const base = makeGame(["a", "b"]);
    const state = withCard(base, "a", cardOf("jointProject", "commission"));
    state.players.b = { ...state.players.b!, status: { ...state.players.b!.status, health: 1, stress: 9 } };
    const sent = sendInvite(state, "a", "c", "b");
    if (!sent.ok) throw new Error(sent.message);
    const result = respondInvite(sent.state, "b", sent.state.pendingInvite!.inviteId, "join");
    if (!result.ok) throw new Error(result.message);
    expect(result.state.players.b).toMatchObject({ eliminated: true, eliminatedReason: "burnout" });
    expect(result.state.players.b!.status).toMatchObject({ stress: 9, health: 0 });
    expect(result.state.public.eliminated).toContain("b");
    expect(ofType(result.events, "player:eliminated")[0]!.payload.playerId).toBe("b");
    expect(result.nextAction).toBe("finished");
    expect(result.state.phase).toBe("finished");
    expect(ofType(result.events, "game:finished")).toHaveLength(1);
  });

  it("Burnout dengan 3 pemain: game lanjut", () => {
    const base = makeGame();
    const state = withCard(base, "a", cardOf("jointProject", "commission"));
    state.players.b = { ...state.players.b!, status: { ...state.players.b!.status, health: 1, stress: 9 } };
    const sent = sendInvite(state, "a", "c", "b");
    if (!sent.ok) throw new Error(sent.message);
    const result = respondInvite(sent.state, "b", sent.state.pendingInvite!.inviteId, "join");
    if (!result.ok) throw new Error(result.message);
    expect(result.state.players.b!.eliminated).toBe(true);
    expect(result.nextAction).toBeUndefined();
    expect(result.state.phase).not.toBe("finished");
  });
});

describe("expireInvite", () => {
  it("sama dengan Tolak, autoDeclined true", () => {
    const sent = invited("hangout", "sincere");
    const result = expireInvite(sent.state, sent.state.pendingInvite!.inviteId);
    if (!result.ok) throw new Error(result.message);
    const resolved = ofType(result.events, "invite:resolved");
    expect(resolved).toHaveLength(2);
    for (const e of resolved) {
      expect(e.payload).toMatchObject({ answer: "decline", autoDeclined: true });
    }
    expect(result.state.players.b!.status.stress).toBe(makeGame().players.b!.status.stress + 1);
    expect(result.state.pendingInvite).toBeNull();
  });

  it("INVITE_EXPIRED bila inviteId tidak cocok", () => {
    expect(expireInvite(makeGame(), "x")).toMatchObject({ ok: false, code: "INVITE_EXPIRED" });
  });
});
