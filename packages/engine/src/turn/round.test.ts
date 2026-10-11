import { describe, expect, it } from "vitest";
import { SequenceRandomSource } from "../random";
import { createGame } from "../game/create-game";
import type { DomainEvent } from "../game/domain-events";
import type { GameState } from "../game/game-state";
import { getCalendarInfo } from "../calendar/calendar";
import { answerCalendarEvent, closeCalendarEvent, startRound } from "./round";

const IDS = ["a", "b", "c"];

function gameAtStep(step: number): GameState {
  const { state } = createGame(IDS, "g", new SequenceRandomSource([0.1, 0.5, 0.9, 0.3, 0.7]));
  return { ...state, public: { ...state.public, calendar: getCalendarInfo(step) } };
}

const rand = () => new SequenceRandomSource([0.5]);

function ofType<T extends DomainEvent["type"]>(events: DomainEvent[], type: T) {
  return events.filter((e): e is Extract<DomainEvent, { type: T }> => e.type === type);
}

describe("startRound", () => {
  it("langkah 1: season rainy dan Tahun Baru, tanpa month:summary", () => {
    const { state, events } = startRound(gameAtStep(1), rand());
    expect(ofType(events, "season:changed")[0]?.payload.season).toBe("rainy");
    expect(ofType(events, "calendar:event")[0]?.payload.name).toBe("Tahun Baru");
    expect(ofType(events, "month:summary")).toHaveLength(0);
    expect(ofType(events, "game:patch")).toHaveLength(1);
    expect(state.phase).toBe("calendarEvent");
    expect(state.pendingCalendarEvent).toEqual({ eventId: "new-year", answers: {} });
  });

  it("langkah 2 tanpa event: phase turn", () => {
    const { state, events } = startRound(gameAtStep(2), rand());
    expect(state.phase).toBe("turn");
    expect(ofType(events, "calendar:event")).toHaveLength(0);
    expect(ofType(events, "season:changed")).toHaveLength(0);
  });

  it("langkah 3: month:summary per pemain, urutan giliran bergeser 1", () => {
    const first = startRound(gameAtStep(1), rand()).state;
    const { state, events } = startRound(gameAtStep(3), rand());
    expect(ofType(events, "month:summary")).toHaveLength(3);
    expect(ofType(events, "player:status")).toHaveLength(3);
    const base = first.baseTurnOrder;
    expect(first.public.turnOrder).toEqual(base);
    expect(state.public.turnOrder).toEqual([base[1], base[2], base[0]]);
  });

  it("pemain tereliminasi tidak dapat month:summary dan tidak di turnOrder", () => {
    const game = gameAtStep(3);
    const out = game.baseTurnOrder[0]!;
    game.players[out] = {
      ...game.players[out]!,
      eliminated: true,
      eliminatedAtStep: 2,
      eliminatedReason: "bankrupt",
    };
    const { state, events } = startRound(game, rand());
    const targets = ofType(events, "month:summary").map((e) => e.target);
    expect(targets).toHaveLength(2);
    expect(targets).not.toContainEqual({ kind: "player", playerId: out });
    expect(state.public.turnOrder).not.toContain(out);
    expect(state.public.turnOrder).toHaveLength(2);
  });

  it("pemain yang bangkrut saat ganti bulan tereliminasi", () => {
    const game = gameAtStep(3);
    const id = game.baseTurnOrder[0]!;
    game.players[id] = {
      ...game.players[id]!,
      status: { ...game.players[id]!.status, health: 0 },
    };
    const { state, events } = startRound(game, rand());
    expect(state.players[id]?.eliminated).toBe(true);
    expect(state.players[id]?.eliminatedAtStep).toBe(3);
    expect(state.public.eliminated).toContain(id);
    expect(state.public.turnOrder).not.toContain(id);
    expect(ofType(events, "player:eliminated")[0]?.payload.playerId).toBe(id);
  });

  it("popup Harbolnas punya tiga pilihan dengan efek Multiplayer", () => {
    const { events } = startRound(gameAtStep(21), rand());
    const choices = ofType(events, "calendar:event")[0]!.payload.choices;
    expect(choices.map((c) => c.id)).toEqual(["join", "joinPaylater", "skip"]);
    expect(choices[0]?.effects).toContainEqual({ stat: "wealth", delta: -3_000_000 });
  });
});

describe("Event Tanggal", () => {
  function status(state: GameState, id: string) {
    return state.players[id]!.status;
  }

  it("Tahun Baru join: Kekayaan -1.500.000, stress tetap 0", () => {
    const opened = startRound(gameAtStep(1), rand()).state;
    const answered = answerCalendarEvent(opened, "a", "new-year", "join");
    expect(answered.ok).toBe(true);
    if (!answered.ok) return;
    const { state, events } = closeCalendarEvent(answered.state, rand());
    expect(status(state, "a").wealth).toBe(6_000_000);
    expect(status(state, "a").stress).toBe(0);
    const result = ofType(events, "calendar:result").find(
      (e) => e.target.kind === "player" && e.target.playerId === "a",
    );
    expect(result?.payload.autoChosen).toBe(false);
    expect(state.phase).toBe("turn");
    expect(state.pendingCalendarEvent).toBeNull();
  });

  it("Lebaran skip: Kekayaan +5.000.000, stress +2", () => {
    const opened = startRound(gameAtStep(6), rand()).state;
    const answered = answerCalendarEvent(opened, "a", "lebaran-thr", "skip");
    if (!answered.ok) throw new Error("jawaban ditolak");
    const { state } = closeCalendarEvent(answered.state, rand());
    expect(status(state, "a").wealth).toBe(12_500_000);
    expect(status(state, "a").stress).toBe(2);
  });

  it("pemain tidak menjawab: autoChosen true, choice skip", () => {
    const opened = startRound(gameAtStep(1), rand()).state;
    const { state, events } = closeCalendarEvent(opened, rand());
    const results = ofType(events, "calendar:result");
    expect(results).toHaveLength(3);
    for (const r of results) {
      expect(r.payload.autoChosen).toBe(true);
      expect(r.payload.choice).toBe("skip");
    }
    expect(ofType(events, "player:status")).toHaveLength(3);
    expect(status(state, "a").health).toBe(10);
  });

  it("17 Agustus: peluang menang memberi flavor dan efek tambahan", () => {
    const opened = startRound(gameAtStep(16), rand()).state;
    const answered = answerCalendarEvent(opened, "a", "independence-day", "join");
    if (!answered.ok) throw new Error("jawaban ditolak");
    const { state, events } = closeCalendarEvent(answered.state, new SequenceRandomSource([0]));
    const result = ofType(events, "calendar:result").find(
      (e) => e.target.kind === "player" && e.target.playerId === "a",
    );
    expect(result?.payload.flavor).toBe("Menang lomba");
    expect(status(state, "a").wealth).toBe(7_500_000 - 500_000 + 1_500_000);
  });

  it("menolak jawaban yang tidak valid", () => {
    const opened = startRound(gameAtStep(1), rand()).state;
    const code = (r: ReturnType<typeof answerCalendarEvent>) => (r.ok ? "ok" : r.code);

    expect(code(answerCalendarEvent(opened, "a", "salah", "join"))).toBe("EVENT_CLOSED");
    expect(code(answerCalendarEvent(opened, "a", "new-year", "joinPaylater"))).toBe(
      "INVALID_PAYLOAD",
    );
    expect(code(answerCalendarEvent(opened, "zzz", "new-year", "join"))).toBe("INVALID_PAYLOAD");

    const once = answerCalendarEvent(opened, "a", "new-year", "join");
    if (!once.ok) throw new Error("jawaban ditolak");
    expect(code(answerCalendarEvent(once.state, "a", "new-year", "skip"))).toBe("EVENT_CLOSED");

    const noEvent = startRound(gameAtStep(2), rand()).state;
    expect(code(answerCalendarEvent(noEvent, "a", "new-year", "join"))).toBe("EVENT_CLOSED");

    const out = { ...opened, players: { ...opened.players } };
    out.players.a = { ...out.players.a!, eliminated: true };
    expect(code(answerCalendarEvent(out, "a", "new-year", "join"))).toBe("INVALID_PAYLOAD");
  });
});
