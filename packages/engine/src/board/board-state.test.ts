import { describe, expect, it } from "vitest";
import { hexKey } from "@pejuang/shared";
import { GOLD_TILES, TILES } from "../data";
import { createGameSetup, createStartPositions } from "../game/initial-state";
import { MathRandomSource, SequenceRandomSource } from "../random";
import { createBoardState } from "./board-state";

const ids = (count: number) => Array.from({ length: count }, (_, i) => `p${i}`);

describe("createBoardState", () => {
  it("radius 6 dengan 4 pemain: 123 heksa terisi, 4 titik awal kosong", () => {
    const starts = createStartPositions(ids(4)).map(({ hex }) => hex);
    const board = createBoardState(6, starts, new MathRandomSource());
    expect(Object.keys(board.tiles)).toHaveLength(123);
    for (const hex of starts) {
      expect(board.tiles[hexKey(hex)]).toBeUndefined();
      expect(board.usedHexKeys).toContain(hexKey(hex));
    }
    expect(board.usedHexKeys).toHaveLength(4);
    expect(board).not.toHaveProperty("deadHexKeys");
    expect(board.goldOrigin).toBeNull();
  });

  it("radius 6 dengan 2 dan 3 pemain: 125 dan 124 heksa terisi", () => {
    for (const [count, filled] of [[2, 125], [3, 124]] as const) {
      const starts = createStartPositions(ids(count)).map(({ hex }) => hex);
      const board = createBoardState(6, starts, new MathRandomSource());
      expect(Object.keys(board.tiles)).toHaveLength(filled);
    }
  });

  it("hanya memakai id petak biasa, tanpa Petak Emas", () => {
    const starts = createStartPositions(ids(4)).map(({ hex }) => hex);
    const board = createBoardState(6, starts, new MathRandomSource());
    const valid = new Set(TILES.map((tile) => tile.id));
    const gold = new Set(GOLD_TILES.map((tile) => tile.id));
    for (const id of Object.values(board.tiles)) {
      expect(valid.has(id)).toBe(true);
      expect(gold.has(id)).toBe(false);
    }
  });

  it("deterministik dengan SequenceRandomSource yang sama", () => {
    const starts = createStartPositions(ids(3)).map(({ hex }) => hex);
    const make = () =>
      createBoardState(5, starts, new SequenceRandomSource([0.1, 0.5, 0.9, 0.33]));
    expect(make()).toEqual(make());
  });

  it("radius 6 memunculkan ke-12 jenis petak", () => {
    const starts = createStartPositions(ids(4)).map(({ hex }) => hex);
    const board = createBoardState(6, starts, new MathRandomSource());
    expect(TILES).toHaveLength(12);
    expect(new Set(Object.values(board.tiles)).size).toBe(12);
  });
});

describe("createGameSetup", () => {
  it("publicState tidak membocorkan id petak", () => {
    const { publicState, board } = createGameSetup(
      ids(4),
      "game-1",
      new MathRandomSource(),
    );
    const json = JSON.stringify(publicState);
    for (const tile of TILES) {
      expect(json).not.toContain(tile.id);
    }
    expect(Object.keys(board.tiles)).toHaveLength(123);
    expect(board.usedHexKeys.sort()).toEqual(
      publicState.pawns.map(({ hex }) => hexKey(hex)).sort(),
    );
  });
});
