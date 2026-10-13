import { describe, expect, it } from "vitest";
import { createBoard, getHexDistance, hexKey } from "@pejuang/shared";
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

  it("deterministik untuk seed sama dan berbeda untuk seed lain", () => {
    const starts = createStartPositions(ids(4)).map(({ hex }) => hex);
    const make = (seed: number) =>
      createBoardState(6, starts, new SequenceRandomSource([seed, 0.5, 0.9, 0.33]));
    expect(make(0.2)).toEqual(make(0.2));
    expect(make(0.2).tiles).not.toEqual(make(0.8).tiles);
  });

  it("117 heksa pertama berisi 117 petak berbeda (tiap petak tepat sekali)", () => {
    for (const count of [2, 3, 4]) {
      const starts = createStartPositions(ids(count)).map(({ hex }) => hex);
      const board = createBoardState(6, starts, new MathRandomSource());
      const startKeys = new Set(starts.map(hexKey));
      const sequence = createBoard(6)
        .map(hexKey)
        .filter((key) => !startKeys.has(key))
        .map((key) => board.tiles[key]!);
      expect(sequence.slice(0, TILES.length)).toHaveLength(117);
      expect(new Set(sequence.slice(0, TILES.length)).size).toBe(117);
      expect(new Set(sequence.slice(0, TILES.length))).toEqual(new Set(TILES.map((tile) => tile.id)));
    }
  });

  it("sisa heksa melanjutkan dari awal urutan acak yang sama (wrap-around)", () => {
    for (const [count, filled] of [[4, 123], [3, 124], [2, 125]] as const) {
      const starts = createStartPositions(ids(count)).map(({ hex }) => hex);
      const board = createBoardState(6, starts, new MathRandomSource());
      const startKeys = new Set(starts.map(hexKey));
      const sequence = createBoard(6)
        .map(hexKey)
        .filter((key) => !startKeys.has(key))
        .map((key) => board.tiles[key]!);
      expect(sequence).toHaveLength(filled);
      for (let i = TILES.length; i < filled; i += 1) {
        expect(sequence[i]).toBe(sequence[i - TILES.length]);
      }
    }
  });

  it("radius 6 memunculkan seluruh 117 jenis petak biasa", () => {
    const starts = createStartPositions(ids(4)).map(({ hex }) => hex);
    const board = createBoardState(6, starts, new MathRandomSource());
    expect(new Set(Object.values(board.tiles)).size).toBe(117);
  });

  it("antrean Petak Emas: 5 id unik dari 8 katalog, rahasia di BoardState", () => {
    const starts = createStartPositions(ids(4)).map(({ hex }) => hex);
    const board = createBoardState(6, starts, new MathRandomSource());
    expect(board.goldQueue).toHaveLength(5);
    expect(new Set(board.goldQueue).size).toBe(5);
    const catalog = new Set(GOLD_TILES.map((tile) => tile.id));
    for (const id of board.goldQueue) expect(catalog.has(id)).toBe(true);
    for (const id of board.goldQueue) expect(Object.values(board.tiles)).not.toContain(id);
  });

  it("antrean Petak Emas berubah antar game", () => {
    const starts = createStartPositions(ids(4)).map(({ hex }) => hex);
    const queues = new Set(
      Array.from({ length: 20 }, () =>
        createBoardState(6, starts, new MathRandomSource()).goldQueue.join(","),
      ),
    );
    expect(queues.size).toBeGreaterThan(1);
  });
});

describe("createGameSetup", () => {
  it("papan 127 heksa: titik awal 2/3/4 pemain tersebar sesuai cincin GDD 4.1", () => {
    for (const count of [2, 3, 4]) {
      const { publicState, board } = createGameSetup(ids(count), "g", new SequenceRandomSource([0.5]));
      expect(publicState.boardRadius).toBe(6);
      expect(createBoard(publicState.boardRadius)).toHaveLength(127);
      const starts = publicState.pawns.map(({ hex }) => hex);
      expect(starts).toHaveLength(count);
      expect(new Set(starts.map(hexKey)).size).toBe(count);
      expect(starts.every((hex) => getHexDistance({ q: 0, r: 0 }, hex) === (count === 4 ? 2 : 3))).toBe(true);
      expect(Object.keys(board.tiles)).toHaveLength(127 - count);
      expect(board.usedHexKeys).toHaveLength(count);
    }
  });

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
    expect(JSON.stringify(publicState)).not.toContain("goldQueue");
    for (const id of board.goldQueue) expect(json).not.toContain(id);
    expect(Object.keys(board.tiles)).toHaveLength(123);
    expect(board.usedHexKeys.sort()).toEqual(
      publicState.pawns.map(({ hex }) => hexKey(hex)).sort(),
    );
  });
});
