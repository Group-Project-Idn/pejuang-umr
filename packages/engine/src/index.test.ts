import { describe, expect, it } from "vitest";
import {
  ENGINE_VERSION,
  SequenceRandomSource,
  createBoard,
  createInitialGameState,
  createStartPositions,
  getBoardRadius,
  getHexDistance,
  hexKey,
  isInsideBoard,
} from "./index";

describe("engine", () => {
  it("punya versi", () => {
    expect(ENGINE_VERSION).toBe("0.0.1");
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
    expect(createStartPositions(["p1", "p2"])).toHaveLength(2);
  });

  it.each([
    [2, 3, [9, 9]],
    [3, 3, [6, 6, 6]],
    [4, 2, [3, 3, 3, 3]],
  ])("menaruh titik awal %i pemain di cincin radius %i", (count, ringRadius, gaps) => {
    const ids = Array.from({ length: count }, (_, index) => `p${index}`);
    const hexes = createStartPositions(ids).map(({ hex }) => hex);
    expect(new Set(hexes.map(hexKey)).size).toBe(count);
    expect(
      hexes.every((hex) => getHexDistance({ q: 0, r: 0 }, hex) === ringRadius),
    ).toBe(true);
    // Jarak antar pemain bersebelahan lewat cincin: berselang sama (2 pemain berseberangan).
    const distances = hexes.map((hex, index) =>
      getHexDistance(hex, hexes[(index + 1) % count]!),
    );
    if (count === 2) {
      expect(distances[0]).toBe(ringRadius * 2);
    } else {
      expect(new Set(distances).size).toBe(1);
    }
    expect(gaps).toHaveLength(count);
  });

  it.each([2, 3, 4])("papan selalu radius 6 untuk %i pemain", (count) => {
    const ids = Array.from({ length: count }, (_, index) => `p${index}`);
    expect(getBoardRadius(ids.length)).toBe(6);
    const state = createInitialGameState(ids, "g", new SequenceRandomSource([0.3]));
    expect(state.boardRadius).toBe(6);
  });
});
