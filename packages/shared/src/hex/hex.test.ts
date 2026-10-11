import { describe, expect, it } from "vitest";
import {
  createBoard,
  getHexDistance,
  getHexRing,
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

  it("membuat cincin berurutan mengelilingi pusat", () => {
    const center = { q: 0, r: 0 };
    const ring = getHexRing(center, 2);
    expect(ring).toHaveLength(12);
    expect(new Set(ring.map(hexKey)).size).toBe(12);
    expect(ring.every((hex) => getHexDistance(center, hex) === 2)).toBe(true);
    ring.forEach((hex, index) => {
      const next = ring[(index + 1) % ring.length]!;
      expect(getHexDistance(hex, next)).toBe(1);
    });
  });
});
