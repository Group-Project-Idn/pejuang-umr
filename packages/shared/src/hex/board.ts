import type { HexCoord } from "../types/game";
import { compareHexes, getHexDistance } from "./coordinates";

export type BoardRadius = 4 | 5 | 6;

export function isInsideBoard(hex: HexCoord, radius: number): boolean {
  return getHexDistance({ q: 0, r: 0 }, hex) <= radius;
}

export function createBoard(radius: BoardRadius): HexCoord[] {
  const board: HexCoord[] = [];

  for (let q = -radius; q <= radius; q += 1) {
    const minR = Math.max(-radius, -q - radius);
    const maxR = Math.min(radius, -q + radius);

    for (let r = minR; r <= maxR; r += 1) {
      board.push({ q, r });
    }
  }

  return board.sort(compareHexes);
}
