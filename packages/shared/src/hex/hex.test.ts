import { describe, expect, it } from "vitest";
import {
  createBoard,
  getHexDistance,
  getNeighbors,
  hexKey,
  isInsideBoard,
} from "../index";

describe("hex geometry", () => {
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

  it("membuat kunci heksa yang stabil", () => {
    expect(hexKey({ q: 2, r: -3 })).toBe("2,-3");
  });
});
