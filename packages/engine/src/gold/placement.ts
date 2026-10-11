import {
  createBoard,
  getHexDistance,
  hexKey,
  type HexCoord,
} from "@pejuang/shared";
import type { BoardState } from "../board/board-state";
import type { GameState } from "../game/game-state";
import type { RandomSource } from "../random";

/** GDD 4.7: Petak Emas muncul di cincin luar papan (radius >= 4 dari pusat). */
const GOLD_MIN_CENTER_DISTANCE = 4;

const CENTER: HexCoord = { q: 0, r: 0 };

function isClosed(board: BoardState, hex: HexCoord): boolean {
  const key = hexKey(hex);
  return !board.usedHexKeys.includes(key) && !board.deadHexKeys.includes(key);
}

/**
 * GDD 4.7: pilih heksa untuk Petak Emas.
 *
 * Kandidat = heksa yang belum dipakai, bukan Heksa Mati, dan berjarak >= 4 dari
 * pusat. Untuk tiap kandidat dihitung jarak ke pion setiap pemain yang belum
 * tereliminasi; dipilih kandidat dengan selisih (jarak terjauh - jarak terdekat)
 * paling kecil supaya posisinya adil bagi semua pemain. Jika beberapa kandidat
 * seri, salah satu dipilih acak. Mengembalikan null bila tidak ada kandidat.
 */
export function pickGoldHex(state: GameState, random: RandomSource): HexCoord | null {
  const board = state.board;
  const candidates = createBoard(board.radius).filter(
    (hex) =>
      isClosed(board, hex) && getHexDistance(CENTER, hex) >= GOLD_MIN_CENTER_DISTANCE,
  );
  if (candidates.length === 0) return null;

  const alivePawns = state.public.pawns.filter(
    (pawn) => !state.players[pawn.playerId]?.eliminated,
  );

  const spreadOf = (hex: HexCoord): number => {
    if (alivePawns.length === 0) return 0;
    const distances = alivePawns.map((pawn) => getHexDistance(pawn.hex, hex));
    return Math.max(...distances) - Math.min(...distances);
  };

  let best: HexCoord[] = [];
  let bestSpread = Number.POSITIVE_INFINITY;
  for (const hex of candidates) {
    const spread = spreadOf(hex);
    if (spread < bestSpread) {
      bestSpread = spread;
      best = [hex];
    } else if (spread === bestSpread) {
      best.push(hex);
    }
  }

  return random.pick(best);
}
