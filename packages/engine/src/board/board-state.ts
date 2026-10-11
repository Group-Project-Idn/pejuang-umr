import { createBoard, hexKey, type HexCoord } from "@pejuang/shared";
import { TILES } from "../data";
import type { BoardRadius } from "../hex/board";
import type { RandomSource } from "../random";

export interface BoardState {
  radius: BoardRadius;
  tiles: Record<string, string>;
  usedHexKeys: string[];
  deadHexKeys: string[];
}

export function createBoardState(
  radius: BoardRadius,
  startHexes: readonly HexCoord[],
  random: RandomSource,
): BoardState {
  const startKeys = new Set(startHexes.map(hexKey));
  const tileIds = TILES.map((tile) => tile.id);
  const tiles: Record<string, string> = {};
  for (const hex of createBoard(radius)) {
    const key = hexKey(hex);
    if (!startKeys.has(key)) {
      tiles[key] = random.pick(tileIds);
    }
  }
  return {
    radius,
    tiles,
    usedHexKeys: [...startKeys],
    deadHexKeys: [],
  };
}
