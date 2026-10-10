import type { HexCoord } from "@pejuang/shared";
import { getNeighbors, hexKey } from "./coordinates";

export function getUnopenedNeighbors(
  origin: HexCoord,
  boardHexKeys: ReadonlySet<string>,
  openedHexKeys: ReadonlySet<string>,
  deadHexKeys: ReadonlySet<string>,
): HexCoord[] {
  return getNeighbors(origin).filter((hex) => {
    const key = hexKey(hex);
    return (
      boardHexKeys.has(key) &&
      !openedHexKeys.has(key) &&
      !deadHexKeys.has(key)
    );
  });
}