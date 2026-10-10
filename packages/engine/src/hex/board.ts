import type { HexCoord } from "@pejuang/shared";
import { compareHexes, getHexDistance, hexKey } from "@pejuang/shared";

export { createBoard, isInsideBoard, type BoardRadius } from "@pejuang/shared";

export function findNearestClosedHexes(
  origin: HexCoord,
  board: readonly HexCoord[],
  openedHexKeys: ReadonlySet<string>,
  limit = 3,
): HexCoord[] {
  if (limit <= 0) return [];

  return board
    .filter((hex) => !openedHexKeys.has(hexKey(hex)))
    .sort(
      (first, second) =>
        getHexDistance(origin, first) - getHexDistance(origin, second) ||
        compareHexes(first, second),
    )
    .slice(0, limit);
}