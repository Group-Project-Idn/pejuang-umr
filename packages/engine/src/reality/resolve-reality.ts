import type { Effect, Outcome, Season } from "@pejuang/shared";
import {
  GOLD_TILES,
  REALITY_POOLS,
  SEASON_ZONKS,
  TILES,
  type RealityPoolId,
  type RealityVariant,
  type SeasonZonkDefinition,
} from "../data";
import type { RandomSource } from "../random";
import { rollOutcome } from "./roll-outcome";
import { calculateZonkChance } from "./zonk-chance";

/** GDD 4.5: peluang memakai Zonk Musim bila Zonk muncul di petak kategori rawan. */
const SEASONAL_ZONK_PCT = 50;

/** Kondisi pemain dan musim yang menentukan Realita (GDD 3.4, 4.4, 4.5). */
export interface RealityContext {
  season: Season;
  isRankOneBurden: boolean;
  health: number;
}

/** Hasil {@link resolveReality}; efek dipakai apa adanya (1×, GDD 1.3). */
export interface ResolvedReality {
  outcome: Outcome;
  text: string;
  effects: Effect[];
  seasonal: boolean;
  variantId: string;
  zonkPct: number;
}

const GOLD_TILE_IDS = new Set(GOLD_TILES.map((tile) => tile.id));

function requireRegularTile(tileId: string) {
  const tile = TILES.find((candidate) => candidate.id === tileId);
  if (!tile) {
    if (GOLD_TILE_IDS.has(tileId)) {
      throw new Error(
        `Petak Emas "${tileId}" tidak punya Realita (GDD 4.7), tidak bisa diresolve.`,
      );
    }
    throw new Error(`Petak "${tileId}" tidak ada di katalog TILES.`);
  }
  return tile;
}

function seasonZonksFor(season: Season): SeasonZonkDefinition[] {
  return SEASON_ZONKS.filter((zonk) => zonk.season === season);
}

function variantsOfOutcome(
  poolId: RealityPoolId,
  outcome: Outcome,
): RealityVariant[] {
  const pool = REALITY_POOLS.find((candidate) => candidate.id === poolId);
  if (!pool) {
    throw new Error(`Tumpukan Realita "${poolId}" tidak ada di katalog.`);
  }
  return pool.variants.filter((variant) => variant.outcome === outcome);
}

/**
 * Menentukan Realita yang diambil pemain di sebuah petak (GDD 4.4).
 *
 * 1. Peluang Zonk dihitung lewat {@link calculateZonkChance} (GDD 4.5), lalu
 *    jenis hasil digelempar lewat {@link rollOutcome} (GDD 4.4 langkah 1).
 * 2. Satu varian acak diambil dari jenis tersebut di Tumpukan Realita (pool) milik petak.
 * 3. Khusus Zonk di petak kategori rawan: 50% memakai Zonk Musim acak sesuai
 *    Fokus Zonk musim itu (GDD 3.4), sisanya memakai varian Zonk dari pool petak.
 *
 * Imunitas Sakit (GDD 3.4) sudah tertanam di {@link calculateZonkChance}: saat
 * `seasonApplied` false, cabang Zonk Musim tidak pernah terpilih, jadi pemain
 * Pancaroba dengan Kesehatan >= 8 tidak akan melihat Zonk Musim Sakit.
 *
 * Semua efek dipakai apa adanya (1×, GDD 1.3 v1.12).
 */
export function resolveReality(
  tileId: string,
  context: RealityContext,
  random: RandomSource,
): ResolvedReality {
  const tile = requireRegularTile(tileId);

  const chance = calculateZonkChance({
    baseZonkPct: tile.baseZonkPct,
    category: tile.category,
    season: context.season,
    isRankOneBurden: context.isRankOneBurden,
    health: context.health,
  });

  const outcome = rollOutcome(chance.pct, random);

  const canUseSeasonZonk =
    outcome === "zonk" &&
    chance.seasonApplied &&
    seasonZonksFor(context.season).length > 0;

  if (canUseSeasonZonk && random.chance(SEASONAL_ZONK_PCT)) {
    const seasonal = random.pick(seasonZonksFor(context.season));
    return {
      outcome,
      text: seasonal.title,
      effects: seasonal.effects,
      seasonal: true,
      variantId: seasonal.id,
      zonkPct: chance.pct,
    };
  }

  const variants = variantsOfOutcome(tile.realityPool, outcome);
  if (variants.length === 0) {
    // Skema pool menjamin minimal 1 varian per jenis hasil (CONTENT_SCHEMA).
    throw new Error(
      `Pool "${tile.realityPool}" milik petak "${tileId}" tidak punya varian Realita "${outcome}".`,
    );
  }
  const variant = random.pick(variants);

  return {
    outcome,
    text: variant.text,
    effects: variant.effects,
    seasonal: false,
    variantId: variant.id,
    zonkPct: chance.pct,
  };
}
