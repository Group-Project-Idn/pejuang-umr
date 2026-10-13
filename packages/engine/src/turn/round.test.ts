import { describe, expect, it } from "vitest";
import { getHexDistance, getNeighbors, hexKey } from "@pejuang/shared";
import { getEnterableHexes } from "../board/movement";
import { SequenceRandomSource } from "../random";
import { GOLD_TILES } from "../data";
import { createGame } from "../game/create-game";
import type { DomainEvent } from "../game/domain-events";
import type { GameState } from "../game/game-state";
import { getCalendarInfo } from "../calendar/calendar";
import { toPublicState } from "../game/public-view";
import {
  allMonthPaymentsAnswered,
  answerCalendarEvent,
  answerMonthPayment,
  allBatchDecisionsAnswered,
  allCalendarEventAnswered,
  batchNeedsDecision,
  closeBatch,
  hasMonthDebtors,
  startRound,
} from "./round";
import { endRound } from "./turn";

const IDS = ["a", "b", "c"];

function gameAtStep(step: number): GameState {
  const { state } = createGame(IDS, "g", new SequenceRandomSource([0.1, 0.5, 0.9, 0.3, 0.7]));
  return {
    ...state,
    public: { ...state.public, calendar: getCalendarInfo(step) },
  };
}

const rand = () => new SequenceRandomSource([0.5]);

/** Majukan popup awal ronde tanpa aksi pemain untuk memeriksa persiapan giliran. */
function preparedRound(game: GameState) {
  let { state, events } = startRound(game, rand());
  if (state.phase === "batch") {
    const closed = closeBatch(state, rand());
    state = closed.state;
    events = [...events, ...closed.events];
  }
  return { state, events };
}

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
    expect(state.phase).toBe("batch");
    expect(state.pendingMonth).toBeNull();
    expect(state.pendingCalendarEvent).toEqual({
      eventId: "new-year",
      answers: {},
    });
  });

  it("season:changed memuat zonkFocus dan hint per musim (GDD 3.4)", () => {
    const seen = new Map<string, { zonkFocus: string; hint?: string }>();
    for (let step = 1; step <= 24; step++) {
      const { events } = startRound(gameAtStep(step), rand());
      for (const e of ofType(events, "season:changed")) {
        seen.set(e.payload.season, e.payload);
      }
    }
    expect(seen.get("rainy")?.zonkFocus).toBe("floodRain");
    expect(seen.get("dry")?.zonkFocus).toBe("heatPollution");
    expect(seen.get("transition")?.zonkFocus).toBe("sick");
    expect(seen.get("transition")?.hint).toBe(
      "Pancaroba: petak Kesehatan lebih rawan",
    );
    for (const payload of seen.values()) expect(payload.hint).toBeTruthy();
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

  it("ganti bulan tidak mengeliminasi, bahkan bila Kesehatan 0", () => {
    const game = gameAtStep(3);
    const id = game.baseTurnOrder[0]!;
    game.players[id] = {
      ...game.players[id]!,
      status: { ...game.players[id]!.status, health: 0 },
    };
    const { state, events } = startRound(game, rand());
    expect(state.players[id]?.eliminated).toBe(false);
    expect(state.public.eliminated).toEqual([]);
    expect(ofType(events, "player:eliminated")).toHaveLength(0);
  });

  it("popup Harbolnas punya tiga pilihan dengan efek apa adanya (1×)", () => {
    const { events } = startRound(gameAtStep(21), rand());
    const choices = ofType(events, "calendar:event")[0]!.payload.choices;
    expect(choices.map((c) => c.id)).toEqual(["join", "joinPaylater", "skip"]);
    expect(choices[0]?.effects).toContainEqual({
      stat: "wealth",
      delta: -1_500_000,
    });
  });
});

function withStatus(
  state: GameState,
  id: string,
  patch: Partial<GameState["players"][string]["status"]>,
): GameState {
  const player = state.players[id]!;
  return {
    ...state,
    players: { ...state.players, [id]: { ...player, status: { ...player.status, ...patch } } },
  };
}

describe("Ganti Bulan (GDD 2.4 v1.12)", () => {
  it("Kartu Ajakan dan Petak Emas dibagikan di awal ronde, di jendela batch yang sama", () => {
    for (const step of [5, 21]) {
      const { events, state } = startRound(gameAtStep(step), rand());
      expect(state.phase).toBe("batch");
      const index = (match: (e: DomainEvent) => boolean) => events.findIndex(match);
      const calendar = index(
        (e) => e.type === "game:patch" && e.payload.ops.some((op) => op.type === "calendar"),
      );
      const gold = index((e) => e.type === "gold:spawned");
      const card = index((e) => e.type === "invite:card");
      const burden = index(
        (e) => e.type === "game:patch" && e.payload.ops.some((op) => op.type === "rankOneBurden"),
      );
      const summary = index((e) => e.type === "month:summary");
      expect(calendar).toBe(0);
      for (const found of [gold, card, burden, summary]) expect(found).toBeGreaterThan(-1);
      expect(burden).toBeLessThan(card);
      expect(card).toBeLessThan(gold);
      const season = index((e) => e.type === "season:changed");
      if (season !== -1) expect(season).toBeGreaterThan(calendar);
      // Menutup batch tidak mengirim notifikasi awal ronde lagi.
      const closed = closeBatch(state, rand());
      for (const type of ["gold:spawned", "invite:card", "month:summary", "season:changed"]) {
        expect(closed.events.map((e) => e.type)).not.toContain(type);
      }
    }
  });

  it("phase batch: public.phase calendar, pendingMonth memuat debtor", () => {
    let game = withStatus(gameAtStep(3), "a", { debt: 4_000_000 });
    game = withStatus(game, "b", { debt: 1_000_000 });
    const { state } = startRound(game, rand());
    expect(state.phase).toBe("batch");
    expect(state.public.phase).toBe("calendar");
    expect(state.pendingMonth!.month).toBe(2);
    expect([...state.pendingMonth!.debtorIds].sort()).toEqual(["a", "b"]);
    expect(state.pendingMonth!.answers).toEqual({});
    expect(hasMonthDebtors(state)).toBe(true);
    expect(allMonthPaymentsAnswered(state)).toBe(false);
  });

  it("payDebt: max = min(Kekayaan, Hutang) bila berhutang, null bila Hutang 0", () => {
    let game = withStatus(gameAtStep(3), "a", { debt: 4_000_000 });
    game = withStatus(game, "b", { debt: 40_000_000, wealth: 0 });
    const { events } = startRound(game, rand());
    const summaries = new Map(
      ofType(events, "month:summary").map((e) => [(e.target as { playerId: string }).playerId, e]),
    );
    expect(summaries.get("a")!.payload.payDebt).toEqual({ max: 4_000_000 });
    // Kekayaan b setelah gaji dan biaya: 5.730.000 - 4.600.000 - bunga 3% dari Rp40 juta.
    const b = summaries.get("b")!.payload;
    expect(b.payDebt).toEqual({ max: b.after.wealth });
    expect(b.payDebt!.max).toBeLessThan(40_000_000);
    expect(summaries.get("c")!.payload.payDebt).toBeNull();
  });

  it("tanpa debtor: hasMonthDebtors false dan semua sudah terjawab", () => {
    const { state } = startRound(gameAtStep(3), rand());
    expect(state.phase).toBe("batch");
    expect(state.pendingMonth!.debtorIds).toEqual([]);
    expect(hasMonthDebtors(state)).toBe(false);
    expect(allMonthPaymentsAnswered(state)).toBe(true);
  });

  describe("answerMonthPayment", () => {
    const open = () =>
      startRound(withStatus(withStatus(gameAtStep(3), "a", { debt: 4_000_000, stress: 5 }), "b", { debt: 1_000_000 }), rand())
        .state;
    const code = (r: ReturnType<typeof answerMonthPayment>) => (r.ok ? "ok" : r.code);

    it("PAYMENT_CLOSED: di luar phase batch, bulan salah, bukan debtor, sudah membayar", () => {
      const state = open();
      expect(code(answerMonthPayment({ ...state, phase: "turn" }, "a", 2, 0))).toBe("PAYMENT_CLOSED");
      expect(code(answerMonthPayment(state, "a", 3, 0))).toBe("PAYMENT_CLOSED");
      expect(code(answerMonthPayment(state, "c", 2, 0))).toBe("PAYMENT_CLOSED");
      const paid = answerMonthPayment(state, "a", 2, 1_000);
      if (!paid.ok) throw new Error(paid.message);
      expect(code(answerMonthPayment(paid.state, "a", 2, 1_000))).toBe("PAYMENT_CLOSED");
      const closed = closeBatch(paid.state, rand()).state;
      expect(code(answerMonthPayment(closed, "b", 2, 0))).toBe("PAYMENT_CLOSED");
    });

    it("INVALID_PAYLOAD: bukan bilangan bulat, negatif, atau di atas max", () => {
      const state = open();
      expect(code(answerMonthPayment(state, "a", 2, 1000.5))).toBe("INVALID_PAYLOAD");
      expect(code(answerMonthPayment(state, "a", 2, Number.NaN))).toBe("INVALID_PAYLOAD");
      expect(code(answerMonthPayment(state, "a", 2, -1))).toBe("INVALID_PAYLOAD");
      expect(code(answerMonthPayment(state, "a", 2, 4_000_001))).toBe("INVALID_PAYLOAD");
      // Jawaban yang ditolak tidak menandai pemain sudah menjawab.
      expect(code(answerMonthPayment(state, "a", 2, 4_000_000))).toBe("ok");
    });

    it("bayar sebagian: Hutang dan Kekayaan berubah, Level Stress tetap", () => {
      const state = open();
      const before = state.players.a!.status;
      const result = answerMonthPayment(state, "a", 2, 1_500_000);
      if (!result.ok) throw new Error(result.message);
      expect(result).toMatchObject({ paid: 1_500_000, debtCleared: false, stressDelta: 0 });
      const after = result.state.players.a!.status;
      expect(after.debt).toBe(2_500_000);
      expect(after.wealth).toBe(before.wealth - 1_500_000);
      expect(after.stress).toBe(before.stress);
      expect(result.state.pendingMonth!.answers).toEqual({ a: 1_500_000 });
      expect(result.events).toEqual([
        { type: "player:status", target: { kind: "player", playerId: "a" }, payload: after },
      ]);
      expect(allMonthPaymentsAnswered(result.state)).toBe(false);
    });

    it("lunas: bonus Level Stress -2 dan debtCleared", () => {
      const state = open();
      const result = answerMonthPayment(state, "a", 2, 4_000_000);
      if (!result.ok) throw new Error(result.message);
      expect(result).toMatchObject({ paid: 4_000_000, debtCleared: true, stressDelta: -2 });
      expect(result.state.players.a!.status).toMatchObject({ debt: 0, stress: 3 });
    });

    it("membayar 0 diperbolehkan dan dihitung sudah menjawab", () => {
      const result = answerMonthPayment(open(), "b", 2, 0);
      if (!result.ok) throw new Error(result.message);
      expect(result).toMatchObject({ paid: 0, debtCleared: false, stressDelta: 0 });
      expect(result.state.pendingMonth!.answers).toEqual({ b: 0 });
    });

    it("allMonthPaymentsAnswered true setelah semua debtor menjawab", () => {
      let state = open();
      for (const id of ["a", "b"]) {
        const result = answerMonthPayment(state, id, 2, 0);
        if (!result.ok) throw new Error(result.message);
        state = result.state;
      }
      expect(allMonthPaymentsAnswered(state)).toBe(true);
    });
  });

  describe("closeBatch", () => {
    it("timeout: debtor yang belum menjawab dianggap bayar 0, lalu giliran", () => {
      const opened = startRound(withStatus(gameAtStep(3), "a", { debt: 4_000_000 }), rand()).state;
      const before = opened.players.a!.status;
      const { state, events } = closeBatch(opened, rand());
      expect(state.players.a!.status).toEqual(before);
      expect(state.pendingMonth).toBeNull();
      expect(state.phase).toBe("turn");
      expect(state.public.phase).toBe("turn");
      expect(events).toEqual([]);
    });

    it("Langkah 9 dan 21: month:summary dan calendar:event serentak, satu batchId", () => {
      for (const [step, eventId] of [
        [9, "labour-day"],
        [21, "harbolnas"],
      ] as const) {
        const opened = startRound(gameAtStep(step), rand());
        const summaries = ofType(opened.events, "month:summary");
        const calendarEvents = ofType(opened.events, "calendar:event");
        expect(summaries).toHaveLength(3);
        expect(calendarEvents).toHaveLength(1);
        expect(opened.state.phase).toBe("batch");
        expect(opened.state.public.phase).toBe("calendar");
        expect(opened.state.pendingCalendarEvent).toEqual({ eventId, answers: {} });
        expect(opened.state.pendingMonth).not.toBeNull();
        const batchId = calendarEvents[0]!.payload.batchId;
        expect(batchId).toBe(opened.state.batchId);
        for (const summary of summaries) expect(summary.payload.batchId).toBe(batchId);
        // Kalender tidak maju selama batch (D6/D7).
        expect(opened.state.public.calendar.step).toBe(step);

        const closed = closeBatch(opened.state, rand());
        expect(closed.state.phase).toBe("turn");
        expect(closed.state.pendingCalendarEvent).toBeNull();
        expect(closed.state.pendingMonth).toBeNull();
        expect(closed.state.batchId).toBeNull();
      }
    });

    it("batch hanya Event Tanggal (langkah 1) atau hanya Ganti Bulan (langkah 3)", () => {
      const eventOnly = startRound(gameAtStep(1), rand());
      expect(eventOnly.state.pendingMonth).toBeNull();
      expect(ofType(eventOnly.events, "calendar:event")[0]!.payload.batchId).toBe(eventOnly.state.batchId);
      const monthOnly = startRound(gameAtStep(3), rand());
      expect(monthOnly.state.pendingCalendarEvent).toBeNull();
      expect(ofType(monthOnly.events, "month:summary")[0]!.payload.batchId).toBe(monthOnly.state.batchId);
    });

    it("langkah tanpa Ganti Bulan dan Event Tanggal langsung ke giliran, tanpa batch", () => {
      const { state, events } = startRound(gameAtStep(2), rand());
      expect(state.phase).toBe("turn");
      expect(state.batchId ?? null).toBeNull();
      expect(ofType(events, "month:summary")).toHaveLength(0);
      expect(ofType(events, "calendar:event")).toHaveLength(0);
    });

    it("jawaban sebagian: batch selesai setelah semua keputusan terjawab", () => {
      const game = withStatus(gameAtStep(9), "a", { debt: 4_000_000 });
      let state = startRound(game, rand()).state;
      expect(batchNeedsDecision(state)).toBe(true);
      expect(allBatchDecisionsAnswered(state)).toBe(false);
      const paid = answerMonthPayment(state, "a", state.pendingMonth!.month, 1_000);
      if (!paid.ok) throw new Error(paid.message);
      state = paid.state;
      // Utang sudah dijawab, Event Tanggal belum.
      expect(allMonthPaymentsAnswered(state)).toBe(true);
      expect(allCalendarEventAnswered(state)).toBe(false);
      expect(allBatchDecisionsAnswered(state)).toBe(false);
      for (const id of IDS) {
        const answered = answerCalendarEvent(state, id, "labour-day", "join");
        if (!answered.ok) throw new Error(answered.message);
        state = answered.state;
      }
      expect(allBatchDecisionsAnswered(state)).toBe(true);
    });

    it("waktu habis: Bayar Hutang Rp0 dan Event Tanggal 'Tidak ikut' otomatis", () => {
      const game = withStatus(gameAtStep(9), "a", { debt: 4_000_000 });
      const opened = startRound(game, rand()).state;
      const before = opened.players.a!.status;
      const closed = closeBatch(opened, rand());
      expect(closed.state.players.a!.status.debt).toBe(before.debt);
      const results = ofType(closed.events, "calendar:result");
      expect(results).toHaveLength(3);
      for (const result of results) {
        expect(result.payload).toMatchObject({ choice: "skip", autoChosen: true });
      }
    });

    it("batch hanya informasi tidak butuh keputusan", () => {
      const state = startRound(gameAtStep(3), rand()).state;
      expect(batchNeedsDecision(state)).toBe(false);
      expect(batchNeedsDecision(startRound(gameAtStep(1), rand()).state)).toBe(true);
    });

    it("tidak melakukan apa-apa di luar phase batch", () => {
      const state = gameAtStep(3);
      expect(closeBatch(state, rand())).toEqual({ state, events: [] });
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
  const GOLD_STEPS = [5, 9, 13, 17, 21];
  const CENTER = { q: 0, r: 0 };

  it("gold:spawned hanya di langkah 5,9,13,17,21; posisi <= 4 dari pusat dan tidak bersebelahan dengan pion", () => {
    for (let step = 1; step <= 24; step += 1) {
      const { events } = preparedRound(gameAtStep(step));
      const spawned = ofType(events, "gold:spawned");
      if (GOLD_STEPS.includes(step)) {
        expect(spawned, `langkah ${step}`).toHaveLength(1);
        const gold = spawned[0]!.payload.gold;
        expect(getHexDistance(CENTER, gold.hex)).toBeLessThanOrEqual(4);
        const game = gameAtStep(step);
        for (const pawn of game.public.pawns) {
          expect(getHexDistance(pawn.hex, gold.hex)).toBeGreaterThan(1);
        }
        expect(gold.expiresAtStep).toBe(step + 4);
      } else {
        expect(spawned, `langkah ${step}`).toHaveLength(0);
      }
    }
  });

  it("Langkah 1-4 tidak punya Petak Emas", () => {
    for (let step = 1; step <= 4; step += 1) {
      const { state, events } = preparedRound(gameAtStep(step));
      expect(state.public.gold, `langkah ${step}`).toBeNull();
      expect(ofType(events, "gold:spawned")).toHaveLength(0);
    }
  });

  it("Beban Peringkat 1 ditetapkan sebelum Petak Emas muncul", () => {
    const { events } = preparedRound(gameAtStep(5));
    const spawnedAt = events.findIndex((e) => e.type === "gold:spawned");
    const burdenAt = events.findIndex(
      (e) =>
        e.type === "game:patch" &&
        e.payload.ops.some((op) => op.type === "rankOneBurden"),
    );
    expect(spawnedAt).toBeGreaterThanOrEqual(0);
    expect(burdenAt).toBeLessThan(spawnedAt);
  });

  it("Petak Emas tak diambil -> gold:expired di langkah +4 (5 -> 9), heksa kembali ke petak asli, lalu spawn baru", () => {
    const opened = preparedRound(gameAtStep(5)).state;
    const gold1 = opened.public.gold!;
    expect(gold1).not.toBeNull();
    const originalTile = opened.board.goldOrigin!.tileId;
    expect(opened.board.goldOrigin!.hexKey).toBe(hexKey(gold1.hex));
    expect(opened.board.tiles[hexKey(gold1.hex)]).toBe(gold1.goldId);
    expect(gold1.expiresAtStep).toBe(9);

    const at9: GameState = {
      ...opened,
      phase: "roundStart",
      movedThisRound: [],
      pendingCalendarEvent: null,
      public: { ...opened.public, calendar: getCalendarInfo(9) },
    };
    const { state, events } = preparedRound(at9);

    const expired = ofType(events, "gold:expired");
    expect(expired).toHaveLength(1);
    expect(expired[0]!.payload).toEqual({
      version: 0,
      goldId: gold1.goldId,
      hex: gold1.hex,
    });
    expect(state.board.usedHexKeys).not.toContain(hexKey(gold1.hex));
    // Isi asli tidak pernah dikirim: tidak ada di event maupun state publik.
    expect(JSON.stringify(events)).not.toContain(`"${originalTile}"`);
    expect(JSON.stringify(toPublicState(state))).not.toContain(`"${originalTile}"`);
    expect(JSON.stringify(opened.public)).not.toContain(`"${originalTile}"`);

    const spawned = ofType(events, "gold:spawned");
    expect(spawned).toHaveLength(1);
    const gold2 = state.public.gold!;
    expect(gold2.expiresAtStep).toBe(13);
    // Heksa lama kembali menjadi petak biasa dan bisa dipilih lagi sebagai Petak Emas baru.
    const restored = state.board.tiles[hexKey(gold1.hex)];
    if (hexKey(gold2.hex) === hexKey(gold1.hex)) {
      expect(state.board.tiles[hexKey(gold1.hex)]).toBe(gold2.goldId);
      expect(state.board.goldOrigin?.tileId).toBe(originalTile);
    } else {
      expect(restored).toBe(originalTile);
      expect(state.board.goldOrigin?.hexKey).toBe(hexKey(gold2.hex));
    }
  });

  it("heksa Petak Emas yang kembali bisa menyala lagi seperti heksa tertutup lain", () => {
    const opened = preparedRound(gameAtStep(5)).state;
    const gold1 = opened.public.gold!;
    const at9: GameState = {
      ...opened,
      phase: "roundStart",
      movedThisRound: [],
      pendingCalendarEvent: null,
      public: { ...opened.public, calendar: getCalendarInfo(9) },
    };
    const { state } = preparedRound(at9);
    const key = hexKey(gold1.hex);
    if (state.public.gold && hexKey(state.public.gold.hex) === key) return;
    expect(state.board.usedHexKeys).not.toContain(key);
    expect(Object.keys(state.board.tiles)).toContain(key);
    const neighbor = getNeighbors(gold1.hex).find(
      (hex) => !state.board.usedHexKeys.includes(hexKey(hex)),
    )!;
    expect(getEnterableHexes(state.board, neighbor).map(hexKey)).toContain(key);
  });

  it("5 spawn Petak Emas (langkah 5, 9, 13, 17, 21) memakai 5 id berbeda dari 8, urut sesuai antrean game", () => {
    let state = gameAtStep(5);
    const queue = [...state.board.goldQueue];
    expect(queue).toHaveLength(5);
    expect(new Set(queue).size).toBe(5);
    const catalog = GOLD_TILES.map((tile) => tile.id);
    for (const id of queue) expect(catalog).toContain(id);

    const spawnedIds: string[] = [];
    for (const step of [5, 9, 13, 17, 21]) {
      const at: GameState = {
        ...state,
        phase: "roundStart",
        movedThisRound: [],
        pendingCalendarEvent: null,
        public: { ...state.public, calendar: getCalendarInfo(step) },
      };
      const result = preparedRound(at);
      state = result.state;
      spawnedIds.push(ofType(result.events, "gold:spawned")[0]!.payload.gold.goldId);
    }
    expect(spawnedIds).toEqual(queue);
    expect(new Set(spawnedIds).size).toBe(5);
    expect(state.board.goldQueue).toEqual([]);
  });

  it("antrean Petak Emas berbeda antar game (seed berbeda) tetapi tetap deterministik per seed", () => {
    const make = (seed: number) =>
      createGame(IDS, "g", new SequenceRandomSource([seed, 0.5, 0.9, 0.3, 0.7])).state.board.goldQueue;
    expect(make(0.1)).toEqual(make(0.1));
    const queues = new Set([0.05, 0.25, 0.45, 0.65, 0.85, 0.99].map((seed) => make(seed).join(",")));
    expect(queues.size).toBeGreaterThan(1);
  });

  it("Petak Emas yang diambil tidak mengembalikan petak asli saat Petak Emas berikutnya muncul", () => {
    const opened = preparedRound(gameAtStep(5)).state;
    const gold1 = opened.public.gold!;
    const taken: GameState = {
      ...opened,
      board: {
        ...opened.board,
        usedHexKeys: [...opened.board.usedHexKeys, hexKey(gold1.hex)],
        goldOrigin: null,
        goldQueue: [],
      },
      public: { ...opened.public, gold: null, calendar: getCalendarInfo(9) },
      phase: "roundStart",
      movedThisRound: [],
      pendingCalendarEvent: null,
    };
    const { state, events } = preparedRound(taken);
    expect(ofType(events, "gold:expired")).toHaveLength(0);
    expect(state.board.tiles[hexKey(gold1.hex)]).toBe(gold1.goldId);
  });
});

describe("Event Tanggal", () => {
  function status(state: GameState, id: string) {
    return state.players[id]!.status;
  }

  it("Tahun Baru join: Kekayaan -750.000, stress tetap 0", () => {
    const opened = startRound(gameAtStep(1), rand()).state;
    const answered = answerCalendarEvent(opened, "a", "new-year", "join");
    expect(answered.ok).toBe(true);
    if (!answered.ok) return;
    const { state, events } = closeBatch(answered.state, rand());
    expect(status(state, "a").wealth).toBe(6_750_000);
    expect(status(state, "a").stress).toBe(0);
    const result = ofType(events, "calendar:result").find(
      (e) => e.target.kind === "player" && e.target.playerId === "a",
    );
    expect(result?.payload.autoChosen).toBe(false);
    expect(state.phase).toBe("turn");
    expect(state.pendingCalendarEvent).toBeNull();
  });

  it("Lebaran skip: Kekayaan +2.500.000, stress +1", () => {
    const opened = startRound(gameAtStep(6), rand()).state;
    const answered = answerCalendarEvent(opened, "a", "lebaran-thr", "skip");
    if (!answered.ok) throw new Error("jawaban ditolak");
    const { state } = closeBatch(answered.state, rand());
    expect(status(state, "a").wealth).toBe(10_000_000);
    expect(status(state, "a").stress).toBe(1);
  });

  it("pemain tidak menjawab: autoChosen true, choice skip", () => {
    const opened = startRound(gameAtStep(1), rand()).state;
    const { state, events } = closeBatch(opened, rand());
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
    const { state, events } = closeBatch(answered.state, new SequenceRandomSource([0]));
    const result = ofType(events, "calendar:result").find(
      (e) => e.target.kind === "player" && e.target.playerId === "a",
    );
    expect(result?.payload.flavor).toBe("Menang lomba");
    expect(status(state, "a").wealth).toBe(7_500_000 - 250_000 + 750_000);
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

  /** Langkah 9: Ganti Bulan ditutup, lalu a memilih "Tidak ikut" (Kesehatan -1). */
  function labourDaySkipped(): GameState {
    const opened = startRound(withHealth(twoPlayers(9), "a", 1), rand()).state;
    const answered = answerCalendarEvent(opened, "a", "labour-day", "skip");
    if (!answered.ok) throw new Error("jawaban ditolak");
    return answered.state;
  }

  it("Libur Hari Buruh 'Tidak ikut' membuat Kesehatan 0 tetapi belum mengeliminasi", () => {
    const closed = closeBatch(withHealth(labourDaySkipped(), "b", 10), rand());
    const player = closed.state.players.a!;
    expect(player.status.health).toBe(0);
    expect(player.eliminated).toBe(false);
    expect(closed.state.public.eliminated).toEqual([]);
    expect(ofType(closed.events, "player:eliminated")).toHaveLength(0);
    expect(closed.nextAction).toBeUndefined();
    expect(closed.state.phase).toBe("turn");
  });

  it("Event Tanggal yang membuat Kesehatan 0 baru mengeliminasi di Fase Pembalikan", () => {
    const closed = closeBatch(labourDaySkipped(), rand());
    const ended = endRound(closed.state, rand());
    const player = ended.state.players.a!;
    expect(player.eliminated).toBe(true);
    expect(player.eliminatedReason).toBe("burnout");
    expect(player.eliminatedAtStep).toBe(9);
    expect(ended.state.public.eliminated).toContain("a");
    expect(ofType(ended.events, "player:eliminated")[0]?.payload).toMatchObject({
      playerId: "a",
      reason: "burnout",
      step: 9,
    });
    // 2 pemain: yang tersisa menang.
    expect(ended.nextAction).toBe("finished");
    const ranking = ofType(ended.events, "game:finished")[0]!.payload.ranking;
    expect(ranking.find((row) => row.playerId === "b")?.rank).toBe(1);
    expect(ranking.find((row) => row.playerId === "a")?.rank).toBe(2);
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
    const closed = closeBatch(answered.state, rand());
    expect(closed.state.players.a?.eliminated).toBe(false);
    expect(closed.nextAction).toBeUndefined();
  });

  it("ganti bulan: Hutang di atas Rp25jt tidak langsung Bangkrut dan tidak ada Doom Spending", () => {
    const game = gameAtStep(3);
    const a = game.players.a!;
    game.players.a = { ...a, status: { ...a.status, debt: 26_000_000, stress: 9 } };
    const { state, events } = startRound(game, rand());
    expect(state.players.a?.eliminated).toBe(false);
    expect(ofType(events, "player:eliminated")).toHaveLength(0);
    expect(ofType(events, "doom:triggered")).toHaveLength(0);
    // Bila tidak dibayar sampai Fase Pembalikan, baru Bangkrut.
    const ended = endRound(closeBatch(state, rand()).state, rand());
    expect(ended.state.players.a?.eliminatedReason).toBe("bankrupt");
  });

  it("semua pemain Kesehatan 0 saat ganti bulan: game berlanjut sampai Fase Pembalikan", () => {
    const game = gameAtStep(3);
    for (const id of IDS) game.players[id] = withHealth(game, id, 0).players[id]!;
    const { state, events, nextAction } = startRound(game, rand());
    expect(nextAction).toBeUndefined();
    expect(state.phase).toBe("batch");
    expect(ofType(events, "player:eliminated")).toHaveLength(0);
    const ended = endRound(closeBatch(state, rand()).state, rand());
    expect(ended.nextAction).toBe("finished");
    expect(ofType(ended.events, "player:eliminated")).toHaveLength(3);
    expect(ofType(ended.events, "game:finished")).toHaveLength(1);
  });

  it("ganti bulan: tersisa satu pemain setelah Fase Pembalikan -> pemain itu rank 1", () => {
    const game = gameAtStep(3);
    game.players.a = withHealth(game, "a", 0).players.a!;
    game.players.b = withHealth(game, "b", 0).players.b!;
    const { state } = startRound(game, rand());
    const ended = endRound(closeBatch(state, rand()).state, rand());
    expect(ended.nextAction).toBe("finished");
    expect(ended.state.phase).toBe("finished");
    const ranking = ofType(ended.events, "game:finished")[0]!.payload.ranking;
    expect(ranking.find((row) => row.playerId === "c")?.rank).toBe(1);
  });
});

describe("startRound: Kartu Ajakan", () => {
  it("invite:card hanya di langkah 1, 5, 9, 13, 17, 21", () => {
    for (let step = 1; step <= 24; step += 1) {
      const { events } = preparedRound(gameAtStep(step));
      const expected = [1, 5, 9, 13, 17, 21].includes(step) ? 3 : 0;
      expect(ofType(events, "invite:card"), `langkah ${step}`).toHaveLength(expected);
    }
  });

  it("hanya untuk pemain yang belum tereliminasi, target privat", () => {
    const game = gameAtStep(5);
    const out = game.baseTurnOrder[0]!;
    game.players[out] = {
      ...game.players[out]!,
      eliminated: true,
      eliminatedAtStep: 4,
      eliminatedReason: "bankrupt",
    };
    const { state, events } = preparedRound(game);
    const cards = ofType(events, "invite:card");
    expect(cards).toHaveLength(2);
    for (const e of cards) {
      expect(e.target.kind).toBe("player");
      expect(e.target).not.toEqual({ kind: "player", playerId: out });
    }
    expect(state.players[out]?.inviteCard).toBeNull();
  });

  it("kartu baru tersimpan di state dan sesuai payload", () => {
    const { state, events } = preparedRound(gameAtStep(1));
    for (const e of ofType(events, "invite:card")) {
      const playerId = e.target.kind === "player" ? e.target.playerId : "";
      expect(state.players[playerId]?.inviteCard).toEqual(e.payload.card);
      expect(e.payload.expiredCardId).toBeNull();
      expect(e.payload.card?.expiresAtMonth).toBe(3);
    }
  });

  it("kartu lama yang belum dipakai -> expiredCardId terisi", () => {
    const first = preparedRound(gameAtStep(1)).state;
    const oldIds = Object.fromEntries(
      IDS.map((id) => [id, first.players[id]!.inviteCard!.cardId]),
    );
    const second = preparedRound(
      { ...first, public: { ...first.public, calendar: getCalendarInfo(5) } },
    );
    for (const e of ofType(second.events, "invite:card")) {
      const playerId = e.target.kind === "player" ? e.target.playerId : "";
      expect(e.payload.expiredCardId).toBe(oldIds[playerId]);
      expect(e.payload.card?.cardId).not.toBe(oldIds[playerId]);
    }
  });

  it("urutan: Beban Peringkat 1, Kartu Ajakan, Petak Emas sesudah popup", () => {
    const { events } = preparedRound(gameAtStep(5));
    const types = events.map((e) =>
      e.type === "game:patch" && e.payload.ops.some((op) => op.type === "rankOneBurden")
        ? "burden"
        : e.type,
    );
    const lastGold = types.lastIndexOf("gold:spawned");
    const firstInvite = types.indexOf("invite:card");
    const lastInvite = types.lastIndexOf("invite:card");
    const burden = types.indexOf("burden");
    expect(lastGold).toBeGreaterThanOrEqual(0);
    expect(firstInvite).toBeGreaterThan(burden);
    expect(lastGold).toBeGreaterThan(lastInvite);
  });

  it("roundInvites dikosongkan di setiap startRound", () => {
    for (const step of [1, 2, 5]) {
      const game = {
        ...gameAtStep(step),
        roundInvites: [
          {
            inviteId: "i",
            senderId: "a",
            targetId: "b",
            plan: "hangout" as const,
            planEffects: [],
            motive: "sincere" as const,
            answer: null,
            autoDeclined: false,
          },
        ],
      };
      expect(startRound(game, rand()).state.roundInvites).toEqual([]);
    }
  });

  it("motif tidak bocor ke event room maupun state publik", () => {
    for (const step of [1, 5, 21]) {
      const { state, events } = startRound(gameAtStep(step), rand());
      for (const e of events.filter((ev) => ev.target.kind === "room")) {
        expect(JSON.stringify(e.payload)).not.toContain("motive");
      }
      const publicJson = JSON.stringify(toPublicState(state));
      expect(publicJson).not.toContain("motive");
      expect(publicJson).not.toContain("inviteCard");
    }
  });
});
