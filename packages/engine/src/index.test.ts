import { describe, expect, it } from "vitest";
import {
  ENGINE_VERSION,
  SequenceRandomSource,
  createBoard,
  createInitialGameState,
  createStartPositions,
  findNearestClosedHexes,
  hexKey,
  isInsideBoard,
} from "./index";

describe("engine", () => {
  it("punya versi", () => {
    expect(ENGINE_VERSION).toBe("0.0.1");
  });

  it("mencari heksa tertutup terdekat secara deterministik", () => {
    const board = createBoard(4);
    const opened = new Set(board.map(hexKey));
    opened.delete(hexKey({ q: 2, r: 0 }));
    opened.delete(hexKey({ q: -1, r: 0 }));
    opened.delete(hexKey({ q: 0, r: 3 }));

    expect(findNearestClosedHexes({ q: 0, r: 0 }, board, opened, 2)).toEqual([
      { q: -1, r: 0 },
      { q: 2, r: 0 },
    ]);
  });

  it("menyediakan random source yang dapat diprediksi untuk test", () => {
    const random = new SequenceRandomSource([0, 0.49, 0.99]);
    expect(random.integer(1, 3)).toBe(1);
    expect(random.chance(50)).toBe(true);
    expect(random.pick(["a", "b", "c"])).toBe("c");
  });

  it("membuat initial game state deterministik dan posisi unik", () => {
    const players = ["p1", "p2", "p3", "p4"];
    const first = createInitialGameState(
      players,
      "game-1",
      new SequenceRandomSource([0.2, 0.8, 0.4]),
    );
    const second = createInitialGameState(
      players,
      "game-1",
      new SequenceRandomSource([0.2, 0.8, 0.4]),
    );
    expect(first).toEqual(second);
    expect(first.boardRadius).toBe(6);
    expect(new Set(first.pawns.map(({ hex }) => hexKey(hex))).size).toBe(4);
    expect(first.pawns.every(({ hex }) => isInsideBoard(hex, 6))).toBe(true);
    expect(createStartPositions(["p1", "p2"], 4)).toHaveLength(2);
  });
});
