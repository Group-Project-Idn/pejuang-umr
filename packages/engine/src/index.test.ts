import { describe, expect, it } from "vitest";
import {
  ENGINE_VERSION,
  SequenceRandomSource,
  createBoard,
  findNearestClosedHexes,
  getHexDistance,
  getNeighbors,
  hexKey,
  isInsideBoard,
} from "./index";

describe("engine", () => {
  it("punya versi", () => {
    expect(ENGINE_VERSION).toBe("0.0.1");
  });

  it("membuat jumlah heksa yang benar", () => {
    expect(createBoard(4)).toHaveLength(61);
    expect(createBoard(5)).toHaveLength(91);
    expect(createBoard(6)).toHaveLength(127);
  });

  it("menghitung tetangga dan jarak axial", () => {
    const center = { q: 0, r: 0 };
    expect(getNeighbors(center)).toHaveLength(6);
    expect(getHexDistance(center, { q: 2, r: -1 })).toBe(2);
    expect(isInsideBoard({ q: 4, r: -4 }, 4)).toBe(true);
    expect(isInsideBoard({ q: 5, r: -4 }, 4)).toBe(false);
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
});
