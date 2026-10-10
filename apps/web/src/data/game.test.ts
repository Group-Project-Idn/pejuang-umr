import { createBoard } from "@pejuang/engine";
import { describe, expect, it } from "vitest";
import {
  getBoardDeskSize,
  getBoardWorldBounds,
  hexToWorld,
  PAWN_DETAILS,
} from "./game";

describe("game view data", () => {
  it("memetakan pawn ke sprite karakter yang tersedia", () => {
    expect(Object.keys(PAWN_DETAILS)).toEqual([
      "cream-circle",
      "iceblue-square",
      "mint-triangle",
      "salmon-diamond",
    ]);
    for (const pawn of Object.values(PAWN_DETAILS)) {
      expect(pawn.sprite).toMatch(/^\/characters\/.+\.png$/);
    }
  });

  it("memproyeksikan koordinat axial ke world coordinate", () => {
    expect(hexToWorld(0, 0)).toEqual({ x: 0, z: 0 });
    expect(hexToWorld(2, -1)).toEqual({ x: 2.64, z: 0 });
  });

  it.each([4, 5, 6] as const)(
    "membuat meja yang menutup seluruh board radius %s",
    (radius) => {
      const board = createBoard(radius);
      const bounds = getBoardWorldBounds(board);
      const desk = getBoardDeskSize(board);
      expect(desk.width / 2).toBeGreaterThan(Math.max(
        Math.abs(bounds.minX),
        Math.abs(bounds.maxX),
      ));
      expect(desk.depth / 2).toBeGreaterThan(Math.max(
        Math.abs(bounds.minZ),
        Math.abs(bounds.maxZ),
      ));
    },
  );
});
