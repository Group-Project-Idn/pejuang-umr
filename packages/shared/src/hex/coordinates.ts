import type { HexCoord } from "../types/game";

const DIRECTIONS: readonly HexCoord[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

export function hexKey(hex: HexCoord): string {
  return `${hex.q},${hex.r}`;
}

export function getHexDistance(first: HexCoord, second: HexCoord): number {
  const dq = first.q - second.q;
  const dr = first.r - second.r;
  const ds = -first.q - first.r - (-second.q - second.r);

  return Math.max(Math.abs(dq), Math.abs(dr), Math.abs(ds));
}

export function getNeighbors(hex: HexCoord): HexCoord[] {
  return DIRECTIONS.map(({ q, r }) => ({ q: hex.q + q, r: hex.r + r }));
}

export function compareHexes(first: HexCoord, second: HexCoord): number {
  return first.q - second.q || first.r - second.r;
}
