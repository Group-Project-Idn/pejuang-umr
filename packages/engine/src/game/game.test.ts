import { describe, expect, it } from "vitest";
import { SequenceRandomSource } from "../random";
import { TILES } from "../data";
import { INITIAL_STATUS } from "../economy/constants";
import { createGame } from "./create-game";
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
