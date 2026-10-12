import {
  createBoard,
  getHexDistance,
  getNeighbors,
  hexKey,
  type HexCoord,
} from "@pejuang/shared";
import type { BoardState } from "../board/board-state";
import type { GameState } from "../game/game-state";
import type { RandomSource } from "../random";

/** GDD 4.7 v1.12: Petak Emas muncul di heksa dengan jarak <= 4 dari pusat. */
const GOLD_MAX_CENTER_DISTANCE = 4;

const CENTER: HexCoord = { q: 0, r: 0 };

function isClosed(board: BoardState, hex: HexCoord): boolean {
  return !board.usedHexKeys.includes(hexKey(hex));
}

/**
 * GDD 4.7 v1.12: pilih heksa untuk Petak Emas.
 *
 * Kandidat = heksa tertutup di radius <= 4 dari pusat yang tidak bersebelahan
 * dengan pion mana pun (termasuk pion pemain tereliminasi). Dari kandidat itu
 * dipilih yang selisih (jarak terjauh - jarak terdekat) ke pemain yang masih
 * hidup paling kecil; seri dipilih acak lewat RandomSource. Jika tidak ada
 * kandidat, syarat tidak bersebelahan dilonggarkan dulu, baru syarat radius.
 * Mengembalikan null bila tidak ada heksa tertutup sama sekali.
 */
export function pickGoldHex(state: GameState, random: RandomSource): HexCoord | null {
  const board = state.board;
  const closed = createBoard(board.radius).filter((hex) => isClosed(board, hex));

  const pawnKeys = new Set(state.public.pawns.map((pawn) => hexKey(pawn.hex)));
  const nextToPawn = (hex: HexCoord) =>
    getNeighbors(hex).some((neighbor) => pawnKeys.has(hexKey(neighbor)));
  const withinRadius = (hex: HexCoord) =>
    getHexDistance(CENTER, hex) <= GOLD_MAX_CENTER_DISTANCE;

  const tiers = [
    closed.filter((hex) => withinRadius(hex) && !nextToPawn(hex)),
    closed.filter(withinRadius),
    closed.filter((hex) => !nextToPawn(hex)),
    closed,
  ];
  const candidates = tiers.find((tier) => tier.length > 0);
  if (!candidates) return null;

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
