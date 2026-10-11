import { describe, expect, it } from "vitest";
import { SequenceRandomSource } from "../random";
import { TILES } from "../data";
import { INITIAL_STATUS } from "../economy/constants";
import { getCalendarInfo } from "../calendar/calendar";
import { createGame } from "./create-game";
import { createInitialGameState } from "./initial-state";
import { toPublicState } from "./public-view";

function makeGame(ids = ["a", "b", "c"]) {
  return createGame(ids, "game-1", new SequenceRandomSource([0.1, 0.5, 0.9, 0.3, 0.7]));
}

describe("createGame", () => {
  it("memulai di langkah 1, phase roundStart, tanpa pending", () => {
    const { state } = makeGame();
    expect(state.phase).toBe("roundStart");
    expect(state.public.calendar.step).toBe(1);
    expect(state.public.calendar.dateLabel).toBe("1 Jan");
    expect(state.pendingTurn).toBeNull();
    expect(state.pendingCalendarEvent).toBeNull();
    expect(state.baseTurnOrder).toEqual(state.public.turnOrder);
    expect([...state.baseTurnOrder].sort()).toEqual(["a", "b", "c"]);
  });

  it("semua pemain mulai dengan INITIAL_STATUS dan belum tereliminasi", () => {
    const { state } = makeGame();
    for (const id of ["a", "b", "c"]) {
      expect(state.players[id]).toEqual({
        status: INITIAL_STATUS,
        eliminated: false,
        eliminatedAtStep: null,
        eliminatedReason: null,
      });
    }
  });

  it("menghasilkan player:status privat untuk tiap pemain", () => {
    const { events } = makeGame();
    expect(events).toHaveLength(3);
    expect(events.map((e) => e.target)).toEqual(
      expect.arrayContaining([
        { kind: "player", playerId: "a" },
        { kind: "player", playerId: "b" },
        { kind: "player", playerId: "c" },
      ]),
    );
    for (const event of events) {
      expect(event.type).toBe("player:status");
      expect(event.payload).toEqual(INITIAL_STATUS);
    }
  });
});

describe("toPublicState", () => {
  it("mengembalikan state.public", () => {
    const { state } = makeGame();
    expect(toPublicState(state)).toBe(state.public);
  });

  it("tidak membocorkan id petak, wealth, debt, atau motive", () => {
    const json = JSON.stringify(toPublicState(makeGame().state));
    for (const tile of TILES) expect(json).not.toContain(tile.id);
    for (const word of ["wealth", "debt", "motive"]) {
      expect(json).not.toContain(word);
    }
  });
});

describe("state awal publik", () => {
  it("createGame: Papan Skor awal Rp9.000.000 dan semua peringkat 1", () => {
    const { state } = makeGame();
    expect(state.public.scores).toHaveLength(3);
    for (const row of state.public.scores) {
      expect(row.provisionalScore).toBe(9_000_000);
      expect(row.rank).toBe(1);
      expect(row.eliminated).toBe(false);
    }
  });

  it("createInitialGameState: skor awal dan kalender sama dengan getCalendarInfo(1)", () => {
    const state = createInitialGameState(["a", "b"], "g", new SequenceRandomSource([0.1, 0.5]));
    expect(state.calendar).toEqual(getCalendarInfo(1));
    expect(state.calendar.dateLabel).toBe("1 Jan");
    expect(state.calendar.nextEvent).not.toBeNull();
    expect(state.scores.map((row) => [row.provisionalScore, row.rank])).toEqual([
      [9_000_000, 1],
      [9_000_000, 1],
    ]);
  });
});
