import { describe, expect, it } from "vitest";
import type { Effect, InviteCard, InvitePlan, PrivateStatus } from "@pejuang/shared";
import { INVITE_PLANS, type ActiveInviteMotive } from "../data";
import { SequenceRandomSource } from "../random";
import { createGame } from "../game/create-game";
import type { DomainEvent } from "../game/domain-events";
import type { GameState } from "../game/game-state";
import { chooseHex, endRound, startTurn } from "../turn/turn";
import { expireInvite, hasOpenInvites, respondInvite, sendInvite } from "./invite";
import { pickInviteMotive } from "./deal-invite";

function ofType<T extends DomainEvent["type"]>(events: readonly DomainEvent[], type: T) {
  return events.filter((e): e is Extract<DomainEvent, { type: T }> => e.type === type);
}

const seeded = () => new SequenceRandomSource([0.5]);

function cardOf(plan: InvitePlan, motive: ActiveInviteMotive, cardId = "c"): InviteCard {
  return {
    cardId,
    plan,
    planEffects: INVITE_PLANS.find((p) => p.id === plan)!.effects,
    motive,
    expiresAtMonth: 3,
  };
}

function withCard(state: GameState, playerId: string, card: InviteCard | null): GameState {
  return {
    ...state,
    players: { ...state.players, [playerId]: { ...state.players[playerId]!, inviteCard: card } },
  };
}

function withStatus(state: GameState, playerId: string, status: Partial<PrivateStatus>): GameState {
  const player = state.players[playerId]!;
  return {
    ...state,
    players: { ...state.players, [playerId]: { ...player, status: { ...player.status, ...status } } },
  };
}

/** Game 3 pemain; giliran pertama sudah dimulai. Mengembalikan urutan [x, y, z]. */
function begin(ids = ["a", "b", "c"]) {
  const created = createGame(ids, "g", new SequenceRandomSource([0.5])).state;
  const started = startTurn(created, seeded());
  const [x, y, z] = started.state.public.turnOrder as [string, string, string];
  return { state: started.state, x, y, z };
}

/** x (pemain aktif) mengajak y dengan kartu tertentu. */
function invited(plan: InvitePlan, motive: ActiveInviteMotive) {
  const { state, x, y, z } = begin();
  const sent = sendInvite(withCard(state, x, cardOf(plan, motive)), x, "c", y);
  if (!sent.ok) throw new Error(sent.message);
  return { ...sent, x, y, z };
}

function code(result: ReturnType<typeof sendInvite>): string {
  return result.ok ? "ok" : result.code;
}

describe("sendInvite: kode error (GDD 4.8 v1.12)", () => {
  it("sukses: kartu terpakai, roundInvites terisi, incoming tanpa motive", () => {
    const sent = invited("hangout", "commission");
    expect(sent.state.players[sent.x]!.inviteCard).toBeNull();
    expect(sent.state.roundInvites).toHaveLength(1);
    expect(sent.state.roundInvites[0]).toMatchObject({
      senderId: sent.x,
      targetId: sent.y,
      plan: "hangout",
      motive: "commission",
      answer: null,
      autoDeclined: false,
    });
    const incoming = ofType(sent.events, "invite:incoming");
    expect(incoming).toHaveLength(1);
    expect(incoming[0]!.target).toEqual({ kind: "player", playerId: sent.y });
    expect(JSON.stringify(sent.events)).not.toContain("motive");
    expect(JSON.stringify(sent.events)).not.toContain("commission");
    expect(hasOpenInvites(sent.state)).toBe(true);
  });

  it("GAME_FINISHED bila game selesai", () => {
    const { state, x, y } = begin();
    const finished = { ...withCard(state, x, cardOf("hangout", "sincere")), phase: "finished" as const };
    expect(code(sendInvite(finished, x, "c", y))).toBe("GAME_FINISHED");
  });

  it("INVITE_NOT_ALLOWED: phase bukan turn", () => {
    const { state, x, y } = begin();
    const s = { ...withCard(state, x, cardOf("hangout", "sincere")), phase: "roundStart" as const };
    expect(code(sendInvite(s, x, "c", y))).toBe("INVITE_NOT_ALLOWED");
  });

  it("INVITE_NOT_ALLOWED: pengirim bukan pemain aktif", () => {
    const { state, y, z } = begin();
    const s = withCard(state, y, cardOf("hangout", "sincere"));
    expect(code(sendInvite(s, y, "c", z))).toBe("INVITE_NOT_ALLOWED");
  });

  it("INVITE_NOT_ALLOWED: pengirim sudah memilih heksa", () => {
    const { state, x, y } = begin();
    const s = withCard(state, x, cardOf("hangout", "sincere"));
    const moved = chooseHex(s, x, s.pendingTurn!.turnId, s.pendingTurn!.options[0]!, seeded());
    if (!moved.ok) throw new Error(moved.message);
    expect(code(sendInvite(moved.state, x, "c", y))).toBe("INVITE_NOT_ALLOWED");
  });

  it("turnId harus sama dengan giliran aktif", () => {
    const { state, x, y } = begin();
    const s = withCard(state, x, cardOf("hangout", "sincere"));
    expect(code(sendInvite(s, x, "c", y, "turn-lama"))).toBe("INVITE_NOT_ALLOWED");
    expect(code(sendInvite(s, x, "c", y, s.pendingTurn!.turnId))).toBe("ok");
  });

  it("NO_INVITE_CARD: tanpa kartu atau cardId tidak cocok", () => {
    const { state, x, y } = begin();
    expect(code(sendInvite(state, x, "c", y))).toBe("NO_INVITE_CARD");
    const s = withCard(state, x, cardOf("hangout", "sincere"));
    expect(code(sendInvite(s, x, "lain", y))).toBe("NO_INVITE_CARD");
  });

  it("INVALID_TARGET: diri sendiri, target tereliminasi, target tak dikenal", () => {
    const { state, x, y } = begin();
    const s = withCard(state, x, cardOf("hangout", "sincere"));
    expect(code(sendInvite(s, x, "c", x))).toBe("INVALID_TARGET");
    expect(code(sendInvite(s, x, "c", "zzz"))).toBe("INVALID_TARGET");
    const dead = {
      ...s,
      players: { ...s.players, [y]: { ...s.players[y]!, eliminated: true, eliminatedAtStep: 1 } },
    };
    expect(code(sendInvite(dead, x, "c", y))).toBe("INVALID_TARGET");
  });

  it("INVALID_TARGET: pengirim tereliminasi", () => {
    const { state, x, y } = begin();
    const s = withCard(state, x, cardOf("hangout", "sincere"));
    const dead = {
      ...s,
      players: { ...s.players, [x]: { ...s.players[x]!, eliminated: true, eliminatedAtStep: 1 } },
    };
    expect(code(sendInvite(dead, x, "c", y))).toBe("INVALID_TARGET");
  });

  it("INVALID_TARGET: target masih punya Ajakan yang belum dijawab; bebas setelah dijawab", () => {
    const { state, x, y, z } = begin();
    let s = withCard(state, x, cardOf("hangout", "sincere", "c1"));
    s = withCard(s, y, cardOf("morningRun", "sincere", "c2"));
    const first = sendInvite(s, x, "c1", z);
    if (!first.ok) throw new Error(first.message);
    // y menjadi pemain aktif lalu mengajak z yang sedang sibuk.
    const moved = chooseHex(first.state, x, first.state.pendingTurn!.turnId, first.state.pendingTurn!.options[0]!, seeded());
    if (!moved.ok) throw new Error(moved.message);
    const second = startTurn(moved.state, seeded()).state;
    expect(second.public.activePlayerId).toBe(y);
    expect(code(sendInvite(second, y, "c2", z))).toBe("INVALID_TARGET");

    const answered = respondInvite(second, z, first.state.roundInvites[0]!.inviteId, "join");
    if (!answered.ok) throw new Error(answered.message);
    expect(code(sendInvite(answered.state, y, "c2", z))).toBe("ok");
  });

  it("dua pemain berbeda bisa mengirim Ajakan di ronde yang sama (tanpa batas per ronde)", () => {
    const { state, x, y, z } = begin();
    let s = withCard(state, x, cardOf("hangout", "sincere", "c1"));
    s = withCard(s, y, cardOf("morningRun", "commission", "c2"));
    const first = sendInvite(s, x, "c1", z);
    if (!first.ok) throw new Error(first.message);
    const moved = chooseHex(first.state, x, first.state.pendingTurn!.turnId, first.state.pendingTurn!.options[0]!, seeded());
    if (!moved.ok) throw new Error(moved.message);
    const second = startTurn(moved.state, seeded()).state;
    const target = x; // x tidak sibuk
    const sent = sendInvite(second, y, "c2", target);
    expect(sent.ok).toBe(true);
    if (sent.ok) expect(sent.state.roundInvites).toHaveLength(2);
  });
});

describe("respondInvite dan expireInvite hanya mencatat", () => {
  it("jawaban tidak mengubah status siapa pun dan tidak menghasilkan efek", () => {
    const sent = invited("hangout", "commission");
    const before = JSON.stringify(Object.values(sent.state.players).map((p) => p.status));
    const answered = respondInvite(sent.state, sent.y, sent.state.roundInvites[0]!.inviteId, "join");
    expect(answered.ok).toBe(true);
    if (!answered.ok) return;
    expect(answered.state.roundInvites[0]!.answer).toBe("join");
    expect(answered.state.roundInvites[0]!.autoDeclined).toBe(false);
    expect(JSON.stringify(Object.values(answered.state.players).map((p) => p.status))).toBe(before);
    expect(answered.state.players[sent.x]!.eliminated).toBe(false);
    expect(answered.state.phase).toBe("turn");
    expect(answered).not.toHaveProperty("events");
    expect(hasOpenInvites(answered.state)).toBe(false);
  });

  it("expireInvite = Tolak dengan autoDeclined true", () => {
    const sent = invited("hangout", "sincere");
    const expired = expireInvite(sent.state, sent.state.roundInvites[0]!.inviteId);
    if (!expired.ok) throw new Error(expired.message);
    expect(expired.state.roundInvites[0]).toMatchObject({ answer: "decline", autoDeclined: true });
  });

  it("INVITE_EXPIRED: pemain bukan target, inviteId salah, atau sudah dijawab", () => {
    const sent = invited("hangout", "sincere");
    const id = sent.state.roundInvites[0]!.inviteId;
    const c = (r: ReturnType<typeof respondInvite>) => (r.ok ? "ok" : r.code);
    expect(c(respondInvite(sent.state, sent.z, id, "join"))).toBe("INVITE_EXPIRED");
    expect(c(respondInvite(sent.state, sent.y, "invite-lain", "join"))).toBe("INVITE_EXPIRED");
    const answered = respondInvite(sent.state, sent.y, id, "decline");
    if (!answered.ok) throw new Error(answered.message);
    expect(c(respondInvite(answered.state, sent.y, id, "join"))).toBe("INVITE_EXPIRED");
    expect(expireInvite(answered.state, id).ok).toBe(false);
  });
});

/** x mengajak y, y menjawab (atau tidak), x memilih heksa, lalu Fase Pembalikan. */
function playToReveal(
  plan: InvitePlan,
  motive: ActiveInviteMotive,
  answer: "join" | "decline" | null,
  yStatus: Partial<PrivateStatus> = { wealth: 5_000_000, health: 5, stress: 5 },
) {
  const sent = invited(plan, motive);
  let state = withStatus(sent.state, sent.y, yStatus);
  const id = state.roundInvites[0]!.inviteId;
  if (answer) {
    const answered = respondInvite(state, sent.y, id, answer);
    if (!answered.ok) throw new Error(answered.message);
    state = answered.state;
  }
  const moved = chooseHex(state, sent.x, state.pendingTurn!.turnId, state.pendingTurn!.options[0]!, seeded());
  if (!moved.ok) throw new Error(moved.message);
  const before = moved.state;
  const ended = endRound(before, seeded());
  const resolved = (playerId: string) =>
    ofType(ended.events, "invite:resolved").find(
      (e) => e.target.kind === "player" && e.target.playerId === playerId,
    )!;
  return { ...sent, before, ended, resolved, plan: INVITE_PLANS.find((p) => p.id === plan)! };
}

function sum(effects: readonly Effect[], stat: Effect["stat"]): number {
  return effects.filter((e) => e.stat === stat).reduce((total, e) => total + e.delta, 0);
}

describe("hasil Ajakan di Fase Pembalikan: empat kombinasi motif dan jawaban (GDD 4.8 v1.12)", () => {
  it("Tulus + Ikut: efek Rencana ke target, Level Stress -1 untuk target dan pengirim", () => {
    const r = playToReveal("hangout", "sincere", "join");
    const target = r.resolved(r.y);
    const sender = r.resolved(r.x);
    expect(target.payload).toMatchObject({ answer: "join", autoDeclined: false, motive: "sincere" });
    expect(target.payload.effectsForYou).toEqual([...r.plan.effects, { stat: "stress", delta: -1 }]);
    expect(sender.payload.effectsForYou).toEqual([{ stat: "stress", delta: -1 }]);
    const after = r.ended.state.players[r.y]!.status;
    expect(after.wealth).toBe(5_000_000 - 500_000);
    expect(after.stress).toBe(5 - 2 - 1);
  });

  it("Tulus + Tolak: target Level Stress +1, pengirim tanpa efek", () => {
    const r = playToReveal("hangout", "sincere", "decline");
    expect(r.resolved(r.y).payload.effectsForYou).toEqual([{ stat: "stress", delta: 1 }]);
    expect(r.resolved(r.x).payload.effectsForYou).toEqual([]);
    expect(r.resolved(r.y).payload.motive).toBe("sincere");
    const after = r.ended.state.players[r.y]!.status;
    expect(after.stress).toBe(6);
    expect(after.wealth).toBe(5_000_000);
  });

  it("Komisi + Ikut: Rencana plus target Kekayaan -500.000, pengirim Kekayaan +500.000", () => {
    const r = playToReveal("hangout", "commission", "join");
    expect(r.resolved(r.y).payload.effectsForYou).toEqual([
      ...r.plan.effects,
      { stat: "wealth", delta: -500_000 },
    ]);
    expect(r.resolved(r.x).payload.effectsForYou).toEqual([{ stat: "wealth", delta: 500_000 }]);
    const after = r.ended.state.players[r.y]!.status;
    expect(after.wealth).toBe(5_000_000 - 500_000 - 500_000);
    expect(after.stress).toBe(3);
    expect(sum(r.resolved(r.x).payload.effectsForYou, "wealth")).toBe(500_000);
  });

  it("Komisi + Tolak: target Level Stress -1", () => {
    const r = playToReveal("hangout", "commission", "decline");
    expect(r.resolved(r.y).payload.effectsForYou).toEqual([{ stat: "stress", delta: -1 }]);
    expect(r.resolved(r.x).payload.effectsForYou).toEqual([]);
    expect(r.ended.state.players[r.y]!.status.stress).toBe(4);
    expect(r.resolved(r.y).payload.motive).toBe("commission");
  });

  it("Ajakan yang belum dijawab saat endRound menjadi Tolak otomatis (autoDeclined)", () => {
    const r = playToReveal("hangout", "sincere", null);
    expect(r.resolved(r.y).payload).toMatchObject({ answer: "decline", autoDeclined: true });
    expect(r.resolved(r.x).payload).toMatchObject({ answer: "decline", autoDeclined: true });
    expect(r.ended.state.players[r.y]!.status.stress).toBe(6);
  });

  it("Ajakan dikosongkan setelah Fase Pembalikan", () => {
    const r = playToReveal("hangout", "sincere", "join");
    expect(r.ended.state.roundInvites).toEqual([]);
  });

  it("jawaban tidak berefek sebelum Fase Pembalikan", () => {
    const sent = invited("hangout", "sincere");
    const yBefore = sent.state.players[sent.y]!.status;
    const answered = respondInvite(sent.state, sent.y, sent.state.roundInvites[0]!.inviteId, "join");
    if (!answered.ok) throw new Error(answered.message);
    const moved = chooseHex(
      answered.state,
      sent.x,
      answered.state.pendingTurn!.turnId,
      answered.state.pendingTurn!.options[0]!,
      seeded(),
    );
    if (!moved.ok) throw new Error(moved.message);
    expect(moved.state.players[sent.y]!.status).toEqual(yBefore);
    expect(ofType(moved.events, "invite:resolved")).toHaveLength(0);
  });
});

describe("urutan event Fase Pembalikan dengan Ajakan", () => {
  it("tile:resolved, lalu invite:resolved, lalu doom, lalu eliminasi", () => {
    const r = playToReveal("hangout", "sincere", "decline", {
      wealth: 0,
      debt: 26_000_000,
      health: 5,
      stress: 9,
    });
    const types = r.ended.events.map((e) => e.type);
    const reveal = types.indexOf("round:reveal");
    const tile = types.lastIndexOf("tile:resolved");
    const resolved = types.indexOf("invite:resolved");
    const doom = types.indexOf("doom:triggered");
    const eliminated = types.indexOf("player:eliminated");
    expect(reveal).toBe(0);
    expect(tile).toBeGreaterThan(reveal);
    expect(resolved).toBeGreaterThan(tile);
    expect(doom).toBeGreaterThan(resolved);
    expect(eliminated).toBeGreaterThan(doom);
    // Efek Ajakan dicek Bangkrut di Fase Pembalikan yang sama.
    expect(r.ended.state.players[r.y]!.eliminatedReason).toBe("bankrupt");
    // invite:resolved untuk pengirim dan target berurutan, diikuti player:status pihak yang berubah.
    expect(types[resolved + 1]).toBe("invite:resolved");
    expect(ofType(r.ended.events, "doom:triggered")[0]!.target).toEqual({ kind: "player", playerId: r.y });
  });

  it("efek Ajakan ikut memicu Burnout di Fase Pembalikan yang sama", () => {
    const r = playToReveal("jointProject", "sincere", "join", {
      wealth: 5_000_000,
      health: 1,
      stress: 5,
    });
    expect(r.ended.state.players[r.y]!.status.health).toBe(0);
    expect(r.ended.state.players[r.y]!.eliminatedReason).toBe("burnout");
    const types = r.ended.events.map((e) => e.type);
    expect(types.indexOf("player:eliminated")).toBeGreaterThan(types.indexOf("invite:resolved"));
  });

  it("pengirim yang tereliminasi di ronde yang sama tetap menerima hasil Ajakannya", () => {
    const sent = invited("hangout", "commission");
    let state = sent.state;
    const answered = respondInvite(state, sent.y, state.roundInvites[0]!.inviteId, "join");
    if (!answered.ok) throw new Error(answered.message);
    state = withStatus(answered.state, sent.x, { health: 0 });
    const moved = chooseHex(state, sent.x, state.pendingTurn!.turnId, state.pendingTurn!.options[0]!, seeded());
    if (!moved.ok) throw new Error(moved.message);
    const ended = endRound(moved.state, seeded());
    const forSender = ofType(ended.events, "invite:resolved").find(
      (e) => e.target.kind === "player" && e.target.playerId === sent.x,
    )!;
    expect(forSender.payload.effectsForYou).toEqual([{ stat: "wealth", delta: 500_000 }]);
  });
});

describe("privasi motif Ajakan", () => {
  it("motif hanya ada di invite:resolved milik pengirim dan target, tidak ke pemain ketiga atau room", () => {
    const r = playToReveal("hangout", "commission", "join");
    const withMotive = r.ended.events.filter((e) => JSON.stringify(e.payload).includes("motive"));
    expect(withMotive.every((e) => e.type === "invite:resolved")).toBe(true);
    const receivers = withMotive.map((e) => (e.target.kind === "player" ? e.target.playerId : "room"));
    expect(receivers.sort()).toEqual([r.x, r.y].sort());
    expect(receivers).not.toContain(r.z);
    expect(JSON.stringify(r.before.public)).not.toContain("commission");
  });

  it("motif tidak pernah ada sebelum Fase Pembalikan (incoming, jawaban, pilih heksa)", () => {
    const sent = invited("hangout", "commission");
    expect(JSON.stringify(sent.events)).not.toContain("motive");
    const answered = respondInvite(sent.state, sent.y, sent.state.roundInvites[0]!.inviteId, "join");
    if (!answered.ok) throw new Error(answered.message);
    const moved = chooseHex(
      answered.state,
      sent.x,
      answered.state.pendingTurn!.turnId,
      answered.state.pendingTurn!.options[0]!,
      seeded(),
    );
    if (!moved.ok) throw new Error(moved.message);
    expect(JSON.stringify(moved.events)).not.toContain("motive");
  });
});

describe("pickInviteMotive", () => {
  it("hanya sincere dan commission, mendekati 50:50 di 20.000 undian", () => {
    let a = 12345;
    const next = () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const integer = (min: number, max: number) => min + Math.floor(next() * (max - min + 1));
    const random = { integer, chance: (p: number) => next() * 100 < p, pick: <T>(items: readonly T[]) => items[integer(0, items.length - 1)]! };
    const counts: Record<string, number> = {};
    const total = 20_000;
    for (let i = 0; i < total; i += 1) {
      const motive = pickInviteMotive(random);
      counts[motive] = (counts[motive] ?? 0) + 1;
    }
    expect(Object.keys(counts).sort()).toEqual(["commission", "sincere"]);
    expect(Math.abs((counts.sincere ?? 0) / total - 0.5)).toBeLessThan(0.02);
  });
});
