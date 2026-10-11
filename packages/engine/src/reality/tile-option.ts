import type { HexCoord, TileOption } from "@pejuang/shared";
import { GOLD_TILES, TILES } from "../data";
import { toMultiplayerEffects } from "../data/multiplier";
import type { RealityContext } from "./resolve-reality";
import { calculateZonkChance, getRiskLevel, getRiskTags } from "./zonk-chance";

export type { RealityContext } from "./resolve-reality";

const GOLD_TILES_BY_ID = new Map(
  GOLD_TILES.map((tile) => [tile.id, tile] as const),
);

/**
 * Membuat opsi heksa untuk Fase Pilihan (API_CONTRACT 3.2 `TileOption`).
 *
 * Petak biasa: Rencana dikali ke nilai Multiplayer, `risk` dan `riskTags`
 * berasal dari Peluang Zonk pemain yang melihat (GDD 4.5, API_CONTRACT 3.2).
 * Petak Emas: Rencana dipakai apa adanya karena data GoldTile sudah nilai
 * Multiplayer, `risk` null dan `riskTags` kosong (GDD 4.7).
 *
 * Hasil tidak pernah memuat `outcome`, `realities`, atau `zonkPct` supaya
 * isi heksa rahasia tidak bocor ke klien (GDD 4.3).
 */
export function buildTileOption(
  hex: HexCoord,
  tileId: string,
  context: RealityContext,
): TileOption {
  const gold = GOLD_TILES_BY_ID.get(tileId);
  if (gold) {
    return {
      hex,
      category: "gold",
      title: gold.title,
      plan: gold.plan,
      risk: null,
      riskTags: [],
      isGold: true,
    };
  }

  const tile = TILES.find((candidate) => candidate.id === tileId);
  if (!tile) {
    throw new Error(`Petak "${tileId}" tidak ada di katalog TILES.`);
  }

  const chance = calculateZonkChance({
    baseZonkPct: tile.baseZonkPct,
    category: tile.category,
    season: context.season,
    isRankOneBurden: context.isRankOneBurden,
    health: context.health,
  });

  return {
    hex,
    category: tile.category,
    title: tile.title,
    plan: toMultiplayerEffects(tile.plan),
    risk: getRiskLevel(chance.pct),
    riskTags: getRiskTags(chance),
    isGold: false,
  };
}
