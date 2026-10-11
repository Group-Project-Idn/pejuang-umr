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

export function getHexRing(center: HexCoord, radius: number): HexCoord[] {
  if (radius === 0) {
    return [{ ...center }];
  }
  const ring: HexCoord[] = [];
  const start = DIRECTIONS[4]!;
  let current = { q: center.q + start.q * radius, r: center.r + start.r * radius };
  for (const direction of DIRECTIONS) {
    for (let step = 0; step < radius; step += 1) {
      ring.push(current);
      current = { q: current.q + direction.q, r: current.r + direction.r };
    }
  }
  return ring;
}
