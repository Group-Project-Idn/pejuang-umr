import {
  compareHexes,
  createBoard,
  getHexDistance,
  getNeighbors,
  hexKey,
  isInsideBoard,
  type HexCoord,
} from "@pejuang/shared";
import type { RandomSource } from "../random";
import type { BoardState } from "./board-state";

export const LIT_HEX_COUNT = 3;
const DEAD_END_OPTION_COUNT = 3;

export interface DeadEndOption {
  hex: HexCoord;
  distance: number;
}

function isClosed(board: BoardState, hex: HexCoord): boolean {
  const key = hexKey(hex);
  return !board.usedHexKeys.includes(key) && !board.deadHexKeys.includes(key);
}

function shuffle<T>(items: readonly T[], random: RandomSource): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = random.integer(0, index);
    [result[index], result[target]] = [result[target]!, result[index]!];
  }
  return result;
}

export function getEnterableHexes(
  board: BoardState,
  origin: HexCoord,
): HexCoord[] {
  return getNeighbors(origin).filter(
    (hex) => isInsideBoard(hex, board.radius) && isClosed(board, hex),
  );
}

export function pickLitHexes(
  board: BoardState,
  origin: HexCoord,
  random: RandomSource,
): HexCoord[] {
  const enterable = getEnterableHexes(board, origin);
  if (enterable.length <= LIT_HEX_COUNT) return enterable;
  return shuffle(enterable, random).slice(0, LIT_HEX_COUNT);
}

export function findDeadEndOptions(
  board: BoardState,
  origin: HexCoord,
  random: RandomSource,
): DeadEndOption[] {
  const byDistance = new Map<number, HexCoord[]>();
  for (const hex of createBoard(board.radius).sort(compareHexes)) {
    if (!isClosed(board, hex)) continue;
    const distance = getHexDistance(origin, hex);
    const group = byDistance.get(distance) ?? [];
    group.push(hex);
    byDistance.set(distance, group);
  }

  const options: DeadEndOption[] = [];
  const distances = [...byDistance.keys()].sort((a, b) => a - b);
  for (const distance of distances) {
    const group = byDistance.get(distance)!;
    const remaining = DEAD_END_OPTION_COUNT - options.length;
    const chosen =
      group.length <= remaining
        ? group
        : shuffle(group, random).slice(0, remaining);
    options.push(...chosen.map((hex) => ({ hex, distance })));
    if (options.length >= DEAD_END_OPTION_COUNT) break;
  }
  return options;
}

export function markHexUsed(board: BoardState, hex: HexCoord): BoardState {
  const key = hexKey(hex);
  if (board.usedHexKeys.includes(key)) return board;
  return { ...board, usedHexKeys: [...board.usedHexKeys, key] };
}

export function markHexDead(board: BoardState, hex: HexCoord): BoardState {
  const key = hexKey(hex);
  if (board.deadHexKeys.includes(key)) return board;
  return { ...board, deadHexKeys: [...board.deadHexKeys, key] };
}
