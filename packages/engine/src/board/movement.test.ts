import { describe, expect, it } from "vitest";
import { createBoard, getHexDistance, getNeighbors, hexKey } from "@pejuang/shared";
import { SequenceRandomSource } from "../random";
import type { BoardRadius } from "../hex/board";
import type { BoardState } from "./board-state";
import {
  findDeadEndOptions,
  getEnterableHexes,
  markHexUsed,
  pickLitHexes,
} from "./movement";

const origin = { q: 0, r: 0 };

function emptyBoard(radius: BoardRadius = 4): BoardState {
  return { radius, tiles: {}, usedHexKeys: [hexKey(origin)], goldOrigin: null, goldQueue: [] };
}

describe("pickLitHexes", () => {
  it("6 tetangga terbuka: 3 heksa unik, semuanya tetangga", () => {
    const lit = pickLitHexes(emptyBoard(), origin, new SequenceRandomSource([0.1, 0.7, 0.4]));
    const neighborKeys = new Set(getNeighbors(origin).map(hexKey));
    expect(lit).toHaveLength(3);
    expect(new Set(lit.map(hexKey)).size).toBe(3);
    expect(lit.every((hex) => neighborKeys.has(hexKey(hex)))).toBe(true);
  });

  it("hanya 2 tetangga bisa dimasuki: keduanya menyala", () => {
    const [a, b, ...rest] = getNeighbors(origin);
    let board = emptyBoard();
    rest.forEach((hex) => (board = markHexUsed(board, hex)));
    const lit = pickLitHexes(board, origin, new SequenceRandomSource([0.5]));
    expect(lit.map(hexKey).sort()).toEqual([hexKey(a!), hexKey(b!)].sort());
  });

  it("tetangga yang sudah diinjak tidak pernah menyala", () => {
    const [used, other] = getNeighbors(origin);
    const board = markHexUsed(emptyBoard(), used!);
    for (const seed of [0, 0.2, 0.4, 0.6, 0.8, 0.99]) {
      const lit = pickLitHexes(board, origin, new SequenceRandomSource([seed, 1 - seed]));
      const keys = lit.map(hexKey);
      expect(keys).not.toContain(hexKey(used!));
      expect(keys.length).toBe(3);
      expect(other).toBeDefined();
    }
  });

  it("mengembalikan kosong jika tidak ada yang bisa dimasuki", () => {
    const board = getNeighbors(origin).reduce(markHexUsed, emptyBoard());
    expect(pickLitHexes(board, origin, new SequenceRandomSource([0.5]))).toEqual([]);
  });
});

describe("getEnterableHexes", () => {
  it("heksa di tepi papan: tidak ada tetangga di luar papan", () => {
    const edge = { q: 4, r: 0 };
    const enterable = getEnterableHexes(emptyBoard(), edge);
    const boardKeys = new Set(createBoard(4).map(hexKey));
    expect(enterable).toHaveLength(3);
    expect(enterable.every((hex) => boardKeys.has(hexKey(hex)))).toBe(true);
  });
});

describe("findDeadEndOptions", () => {
  it("semua tetangga used: 3 heksa tertutup terdekat", () => {
    const board = getNeighbors(origin).reduce(markHexUsed, emptyBoard());
    const options = findDeadEndOptions(board, origin, new SequenceRandomSource([0.3]));
    expect(options).toHaveLength(3);
    expect(options.every((option) => option.distance === 2)).toBe(true);
    expect(options.every((option) => getHexDistance(origin, option.hex) === 2)).toBe(true);
    expect(options.every((o) => !board.usedHexKeys.includes(hexKey(o.hex)))).toBe(true);
  });

  it("seri jarak: pilihan di antara yang seri bisa berbeda", () => {
    const board = getNeighbors(origin).reduce(markHexUsed, emptyBoard());
    const run = (values: number[]) =>
      findDeadEndOptions(board, origin, new SequenceRandomSource(values))
        .map((o) => hexKey(o.hex))
        .sort()
        .join("|");
    expect(run([0, 0, 0, 0, 0])).not.toBe(run([0.99, 0.99, 0.99, 0.99, 0.99]));
  });

  it("sisa heksa tertutup hanya 2: hasil 2", () => {
    const keep = [{ q: 1, r: 1 }, { q: -3, r: 0 }];
    const board = createBoard(4).reduce(
      (current, hex) =>
        keep.some((k) => hexKey(k) === hexKey(hex)) ? current : markHexUsed(current, hex),
      emptyBoard(),
    );
    const options = findDeadEndOptions(board, origin, new SequenceRandomSource([0.5]));
    expect(options.map((o) => hexKey(o.hex)).sort()).toEqual(keep.map(hexKey).sort());
    expect(options.map((o) => o.distance)).toEqual([2, 3]);
  });
});

describe("markHexUsed", () => {
  it("tidak mengubah BoardState lama", () => {
    const board = emptyBoard();
    const used = markHexUsed(board, { q: 1, r: 0 });
    expect(board.usedHexKeys).toEqual(["0,0"]);
    expect(used.usedHexKeys).toEqual(["0,0", "1,0"]);
  });
});
