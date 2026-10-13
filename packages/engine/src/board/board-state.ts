import { createBoard, hexKey, type HexCoord } from "@pejuang/shared";
import { GOLD_TILES, TILES } from "../data";
import type { BoardRadius } from "../hex/board";
import type { RandomSource } from "../random";

export interface BoardState {
  radius: BoardRadius;
  tiles: Record<string, string>;
  usedHexKeys: string[];
  /** Isi petak asli di heksa Petak Emas aktif; rahasia, tidak masuk state publik. */
  goldOrigin: { hexKey: string; tileId: string } | null;
  /** Id Petak Emas yang belum muncul, urut spawn (5 dari 8, tanpa pengulangan); rahasia. */
  goldQueue: string[];
}

/** GDD 4.7 v1.14: jumlah Petak Emas yang dipakai per game (satu per spawn). */
export const GOLD_TILES_PER_GAME = 5;

/** Fisher-Yates lewat RandomSource supaya deterministik di tes. */
export function shuffle<T>(items: readonly T[], random: RandomSource): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = random.integer(0, i);
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}

export function createBoardState(
  radius: BoardRadius,
  startHexes: readonly HexCoord[],
  random: RandomSource,
): BoardState {
  const startKeys = new Set(startHexes.map(hexKey));
  // GDD 5.1 v1.14: urutan acak dari seluruh petak biasa; tiap heksa mengambil petak
  // berikutnya, dan bila heksa lebih banyak dari petak, lanjut dari awal urutan yang sama.
  const tileOrder = shuffle(
    TILES.map((tile) => tile.id),
    random,
  );
  const tiles: Record<string, string> = {};
  let next = 0;
  for (const hex of createBoard(radius)) {
    const key = hexKey(hex);
    if (!startKeys.has(key)) {
      tiles[key] = tileOrder[next % tileOrder.length]!;
      next += 1;
    }
  }
  const goldQueue = shuffle(
    GOLD_TILES.map((tile) => tile.id),
    random,
  ).slice(0, GOLD_TILES_PER_GAME);
  return {
    radius,
    tiles,
    usedHexKeys: [...startKeys],
    goldOrigin: null,
    goldQueue,
  };
}
