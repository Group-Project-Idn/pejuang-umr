import { describe, expect, it } from "vitest";
import { getHexDistance, hexKey } from "@pejuang/shared";
import { SequenceRandomSource } from "../random";
import { createGame } from "../game/create-game";
import type { DomainEvent } from "../game/domain-events";
import type { GameState } from "../game/game-state";
import { getCalendarInfo } from "../calendar/calendar";
import { answerCalendarEvent, closeCalendarEvent, startRound } from "./round";

const IDS = ["a", "b", "c"];

function gameAtStep(step: number): GameState {
  const { state } = createGame(IDS, "g", new SequenceRandomSource([0.1, 0.5, 0.9, 0.3, 0.7]));
  return {
    ...state,
    public: { ...state.public, calendar: getCalendarInfo(step) },
  };
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
    expect(state.pendingCalendarEvent).toEqual({
      eventId: "new-year",
      answers: {},
    });
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
    expect(choices[0]?.effects).toContainEqual({
      stat: "wealth",
      delta: -3_000_000,
    });
  });
});

describe("Beban Peringkat 1 (GDD 4.6)", () => {
  function withScores(
    step: number,
    rows: Array<{ playerId: string; provisionalScore: number; eliminated?: boolean }>,
  ): GameState {
    const game = gameAtStep(step);
    return {
      ...game,
      public: {
        ...game.public,
        scores: rows.map((row, index) => ({
          playerId: row.playerId,
          provisionalScore: row.provisionalScore,
          rank: index + 1,
          eliminated: row.eliminated ?? false,
        })),
      },
    };
  }

  function rankOneOps(events: DomainEvent[]) {
    return ofType(events, "game:patch").flatMap((e) =>
      e.payload.ops.filter((op) => op.type === "rankOneBurden"),
    );
  }

  it("langkah 1-4: rankOneBurden selalu kosong walau ada skor tertinggi", () => {
    for (const step of [1, 2, 3, 4]) {
      const { state } = startRound(
        withScores(step, [
          { playerId: "a", provisionalScore: 100 },
          { playerId: "b", provisionalScore: 50 },
          { playerId: "c", provisionalScore: 10 },
        ]),
        rand(),
      );
      expect(state.public.rankOneBurden).toEqual([]);
    }
  });

  it("langkah 5: pemain dengan skor tertinggi menanggung beban, dikirim via game:patch", () => {
    const { state, events } = startRound(
      withScores(5, [
        { playerId: "a", provisionalScore: 30 },
        { playerId: "b", provisionalScore: 90 },
        { playerId: "c", provisionalScore: 10 },
      ]),
      rand(),
    );
    expect(state.public.rankOneBurden).toEqual(["b"]);
    expect(rankOneOps(events)).toEqual([
      { type: "rankOneBurden", playerIds: ["b"] },
    ]);
  });

  it("langkah 5: dua pemain seri di puncak, keduanya menanggung beban", () => {
    const { state } = startRound(
      withScores(5, [
        { playerId: "a", provisionalScore: 80 },
        { playerId: "b", provisionalScore: 80 },
        { playerId: "c", provisionalScore: 10 },
      ]),
      rand(),
    );
    expect(state.public.rankOneBurden).toEqual(["a", "b"]);
  });

  it("langkah 5: pemain tereliminasi tidak menanggung beban walau skornya tertinggi", () => {
    const base = withScores(5, [
      { playerId: "a", provisionalScore: 999, eliminated: true },
      { playerId: "b", provisionalScore: 80 },
      { playerId: "c", provisionalScore: 10 },
    ]);
    const game: GameState = {
      ...base,
      players: {
        ...base.players,
        a: {
          ...base.players.a!,
          eliminated: true,
          eliminatedAtStep: 4,
          eliminatedReason: "bankrupt",
        },
      },
    };
    const { state } = startRound(game, rand());
    expect(state.public.rankOneBurden).toEqual(["b"]);
  });
});

describe("Petak Emas (GDD 4.7)", () => {
  const GOLD_STEPS = [1, 5, 9, 13, 17, 21];
  const CENTER = { q: 0, r: 0 };

  it("gold:spawned hanya di langkah 1,5,9,13,17,21; posisi >= 4 dari pusat", () => {
    for (let step = 1; step <= 24; step += 1) {
      const { events } = startRound(gameAtStep(step), rand());
      const spawned = ofType(events, "gold:spawned");
      if (GOLD_STEPS.includes(step)) {
        expect(spawned, `langkah ${step}`).toHaveLength(1);
        const gold = spawned[0]!.payload.gold;
        expect(getHexDistance(CENTER, gold.hex)).toBeGreaterThanOrEqual(4);
        expect(gold.expiresAtStep).toBe(step + 4);
      } else {
        expect(spawned, `langkah ${step}`).toHaveLength(0);
      }
    }
  });

  it("urutan Fase Kalender: Petak Emas sebelum Beban Peringkat 1", () => {
    const { events } = startRound(gameAtStep(5), rand());
    const spawnedAt = events.findIndex((e) => e.type === "gold:spawned");
    const burdenAt = events.findIndex(
      (e) =>
        e.type === "game:patch" &&
        e.payload.ops.some((op) => op.type === "rankOneBurden"),
    );
    expect(spawnedAt).toBeGreaterThanOrEqual(0);
    expect(burdenAt).toBeGreaterThan(spawnedAt);
  });

  it("Petak Emas tak diambil -> gold:expired di langkah +4, heksa mati, lalu spawn baru", () => {
    const opened = startRound(gameAtStep(1), rand()).state;
    const gold1 = opened.public.gold!;
    expect(gold1).not.toBeNull();
    expect(gold1.expiresAtStep).toBe(5);

    const at5: GameState = {
      ...opened,
      phase: "roundStart",
      movedThisRound: [],
      pendingCalendarEvent: null,
      public: { ...opened.public, calendar: getCalendarInfo(5) },
    };
    const { state, events } = startRound(at5, rand());

    const expired = ofType(events, "gold:expired");
    expect(expired).toHaveLength(1);
    expect(expired[0]!.payload).toEqual({
      version: 0,
      goldId: gold1.goldId,
      hex: gold1.hex,
    });
    expect(state.board.deadHexKeys).toContain(hexKey(gold1.hex));
    expect(state.public.deadHexes).toContainEqual(gold1.hex);

    const spawned = ofType(events, "gold:spawned");
    expect(spawned).toHaveLength(1);
    const gold2 = state.public.gold!;
    expect(gold2.expiresAtStep).toBe(9);
    expect(hexKey(gold2.hex)).not.toBe(hexKey(gold1.hex));
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

describe("rotasi urutan giliran lintas bulan (GDD 1.2)", () => {
  const ORDER = ["a", "b", "c", "d"];

  function newGame(): GameState {
    const { state } = createGame(ORDER, "g", new SequenceRandomSource([0.1, 0.5, 0.9, 0.3, 0.7]));
    return { ...state, baseTurnOrder: [...ORDER] };
  }

  function eliminate(state: GameState, id: string, step: number): GameState {
    return {
      ...state,
      players: {
        ...state.players,
        [id]: {
          ...state.players[id]!,
          eliminated: true,
          eliminatedAtStep: step,
          eliminatedReason: "bankrupt",
        },
      },
    };
  }

  /** Jalankan startRound untuk langkah 1..lastStep, melewati phase seperti server. */
  function playRounds(
    initial: GameState,
    lastStep: number,
    onStep?: (state: GameState, step: number) => GameState,
  ): string[][] {
    const orders: string[][] = [];
    let state = initial;
    for (let step = 1; step <= lastStep; step++) {
      state = {
        ...state,
        public: { ...state.public, calendar: getCalendarInfo(step) },
      };
      if (onStep) state = onStep(state, step);
      state = startRound(state, rand()).state;
      orders.push(state.public.turnOrder);
    }
    return orders;
  }

  it("contoh audit: C tereliminasi di Bulan 2 -> Bulan 3 [D,A,B], 4 [A,B,D], 5 [B,D,A]", () => {
    const orders = playRounds(newGame(), 9, (state, step) =>
      step === 3 ? eliminate(state, "c", 3) : state,
    );
    expect(orders[0]).toEqual(["a", "b", "c", "d"]); // Bulan 1
    expect(orders[2]).toEqual(["b", "d", "a"]); // Bulan 2 (langkah 3), C dibuang
    expect(orders[3]).toEqual(["b", "d", "a"]); // langkah genap: urutan tetap
    expect(orders[4]).toEqual(["d", "a", "b"]); // Bulan 3
    expect(orders[6]).toEqual(["a", "b", "d"]); // Bulan 4
    expect(orders[8]).toEqual(["b", "d", "a"]); // Bulan 5
  });

  it("12 bulan: pemain pertama tidak sama di dua bulan berturut-turut", () => {
    const orders = playRounds(newGame(), 24, (state, step) =>
      step === 7 ? eliminate(state, "b", 7) : state,
    );
    const firsts: string[] = [];
    for (let month = 1; month <= 12; month++) {
      const order = orders[month * 2 - 2]!;
      expect(order.length).toBeGreaterThanOrEqual(2);
      firsts.push(order[0]!);
    }
    for (let i = 1; i < firsts.length; i++) {
      expect(firsts[i]).not.toBe(firsts[i - 1]);
    }
  });

  it("tanpa eliminasi sama dengan rotasi biasa", () => {
    const orders = playRounds(newGame(), 24);
    for (let month = 1; month <= 12; month++) {
      const shift = (month - 1) % ORDER.length;
      const expected = [...ORDER.slice(shift), ...ORDER.slice(0, shift)];
      expect(orders[month * 2 - 2]).toEqual(expected);
      expect(orders[month * 2 - 1]).toEqual(expected);
    }
  });
});

describe("Burnout dan game selesai lebih cepat", () => {
  function withHealth(state: GameState, id: string, health: number): GameState {
    return {
      ...state,
      players: {
        ...state.players,
        [id]: {
          ...state.players[id]!,
          status: { ...state.players[id]!.status, health },
        },
      },
    };
  }

  function twoPlayers(step: number): GameState {
    const { state } = createGame(["a", "b"], "g", new SequenceRandomSource([0.1, 0.5, 0.9]));
    return {
      ...state,
      public: { ...state.public, calendar: getCalendarInfo(step) },
    };
  }

  // Data: "Tidak ikut" Libur Hari Buruh = Kesehatan -1 (Solo), dikali 2 di Multiplayer = -2.
  it("Libur Hari Buruh 'Tidak ikut' menurunkan Kesehatan ke 0 -> burnout", () => {
    const opened = startRound(withHealth(twoPlayers(9), "a", 2), rand()).state;
    const answered = answerCalendarEvent(opened, "a", "labour-day", "skip");
    if (!answered.ok) throw new Error("jawaban ditolak");
    const closed = closeCalendarEvent(withHealth(answered.state, "b", 10), rand());
    const player = closed.state.players.a!;
    expect(player.status.health).toBe(0);
    expect(player.eliminated).toBe(true);
    expect(player.eliminatedReason).toBe("burnout");
    expect(player.eliminatedAtStep).toBe(9);
    expect(closed.state.public.eliminated).toContain("a");
    expect(ofType(closed.events, "player:eliminated")[0]?.payload).toMatchObject({
      playerId: "a",
      reason: "burnout",
      step: 9,
    });
  });

  it("Kekurangan Kekayaan dari Event Tanggal tidak menyebabkan Bangkrut", () => {
    const base = startRound(twoPlayers(1), rand()).state;
    const poor = {
      ...base,
      players: {
        ...base.players,
        a: {
          ...base.players.a!,
          status: { ...base.players.a!.status, wealth: 0, debt: 25_000_000 },
        },
      },
    };
    const answered = answerCalendarEvent(poor, "a", "new-year", "join");
    if (!answered.ok) throw new Error("jawaban ditolak");
    const closed = closeCalendarEvent(answered.state, rand());
    expect(closed.state.players.a?.eliminated).toBe(false);
    expect(closed.nextAction).toBeUndefined();
  });

  it("2 pemain, satu Burnout di Event Tanggal -> game:finished, pemain lain rank 1", () => {
    const opened = startRound(withHealth(twoPlayers(9), "a", 2), rand()).state;
    const answered = answerCalendarEvent(opened, "a", "labour-day", "skip");
    if (!answered.ok) throw new Error("jawaban ditolak");
    const closed = closeCalendarEvent(answered.state, rand());
    expect(closed.nextAction).toBe("finished");
    expect(closed.state.phase).toBe("finished");
    const ranking = ofType(closed.events, "game:finished")[0]!.payload.ranking;
    expect(ranking.find((row) => row.playerId === "b")?.rank).toBe(1);
    expect(ranking.find((row) => row.playerId === "a")?.rank).toBe(2);
  });

  it("semua pemain tereliminasi sekaligus saat ganti bulan -> game selesai", () => {
    const game = gameAtStep(3);
    for (const id of IDS) game.players[id] = withHealth(game, id, 0).players[id]!;
    const { state, events, nextAction } = startRound(game, rand());
    expect(nextAction).toBe("finished");
    expect(state.phase).toBe("finished");
    expect(ofType(events, "player:eliminated")).toHaveLength(3);
    expect(ofType(events, "game:finished")).toHaveLength(1);
  });

  it("ganti bulan: tersisa satu pemain -> game selesai, pemain itu rank 1", () => {
    const game = gameAtStep(3);
    game.players.a = withHealth(game, "a", 0).players.a!;
    game.players.b = withHealth(game, "b", 0).players.b!;
    const { state, events, nextAction } = startRound(game, rand());
    expect(nextAction).toBe("finished");
    expect(state.phase).toBe("finished");
    const ranking = ofType(events, "game:finished")[0]!.payload.ranking;
    expect(ranking.find((row) => row.playerId === "c")?.rank).toBe(1);
  });
});
