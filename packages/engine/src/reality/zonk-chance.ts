import type { Risk, RiskTag, Season } from "@pejuang/shared";
import { VULNERABLE_CATEGORIES, type TileCategory } from "../data";

/** GDD 4.6: tambahan Peluang Zonk saat pemain menanggung Beban Peringkat 1. */
const RANK_ONE_BURDEN_PCT = 15;

/** GDD 3.4 dan 4.5: tambahan Peluang Zonk untuk kategori rawan di musim aktif. */
const SEASON_VULNERABLE_PCT = 10;

/** GDD 4.5: Peluang Zonk maksimal (juga batas baseZonkPct petak di data). */
const MAX_ZONK_PCT = 80;

/** GDD 3.4: Kesehatan minimal untuk mendapat Imunitas Sakit saat Pancaroba. */
const IMMUNITY_HEALTH_MIN = 8;

/** Musim yang Fokus Zonk-nya "Sakit", jadi kena Imunitas Sakit. */
const SICK_SEASON = "transition";

/** API_CONTRACT 3.2: alasan tag imunitas sesuai skema RiskTag. */
const IMMUNITY_REASON = "health>=8" as const;

/** API_CONTRACT 3.2: Peluang Zonk <= 15% -> low. */
const RISK_LOW_MAX_PCT = 15;

/** API_CONTRACT 3.2: Peluang Zonk 16-34% -> medium, sisanya high. */
const RISK_MEDIUM_MAX_PCT = 34;

/** Masukan {@link calculateZonkChance}. */
export interface ZonkChanceInput {
  /** baseZonkPct petak (TileDefinition, 0-80). */
  baseZonkPct: number;
  /** Kategori petak (tanpa "gold"), dipakai untuk cek kategori rawan musim. */
  category: TileCategory;
  /** Musim aktif di kalender. */
  season: Season;
  /** Pemain kena Beban Peringkat 1 (GDD 4.6). Bawaan false. */
  isRankOneBurden?: boolean;
  /** Kesehatan pemain yang melihat (0-10). Bawaan 0, jadi tanpa imunitas. */
  health?: number;
}

/** Hasil {@link calculateZonkChance}. */
export interface ZonkChanceResult {
  /** Peluang Zonk akhir dalam poin persen (0-80). */
  pct: number;
  /** Beban Peringkat 1 menaikkan pct sebesar {@link RANK_ONE_BURDEN_PCT}. */
  rankOneApplied: boolean;
  /** Musim menaikkan pct sebesar {@link SEASON_VULNERABLE_PCT}. */
  seasonApplied: boolean;
  /** Imunitas Sakit berlaku: Pancaroba dengan Kesehatan >= 8 (GDD 3.4). */
  immune: boolean;
  /** Musim yang dipakai, dibutuhkan {@link getRiskTags} untuk tag season. */
  season: Season;
}

/**
 * Peluang Zonk sebuah petak untuk satu pemain (GDD 4.5).
 *
 * ```
 * Peluang Zonk = Zonk Dasar Petak
 *              + 15 poin persen   (jika kena Beban Peringkat 1)
 *              + 10 poin persen   (jika kategori petak sedang rawan karena Musim;
 *                                  tidak berlaku di Pancaroba bagi pemain
 *                                  Kesehatan >= 8)
 * Maksimal 80%
 * ```
 *
 * Imunitas Sakit (GDD 3.4) hanya berlaku di Pancaroba dan hanya untuk kenaikan
 * musim, bukan untuk Zonk bawaan petak maupun Beban Peringkat 1. Peluang Hoki
 * tetap 10% dan tidak dihitung di sini.
 */
export function calculateZonkChance({
  baseZonkPct,
  category,
  season,
  isRankOneBurden = false,
  health = 0,
}: ZonkChanceInput): ZonkChanceResult {
  const immune =
    season === SICK_SEASON && health >= IMMUNITY_HEALTH_MIN;

  const vulnerableCategories: readonly TileCategory[] =
    VULNERABLE_CATEGORIES[season];
  const seasonApplied = !immune && vulnerableCategories.includes(category);

  const rankOneApplied = isRankOneBurden;

  const pct = Math.min(
    MAX_ZONK_PCT,
    baseZonkPct +
      (rankOneApplied ? RANK_ONE_BURDEN_PCT : 0) +
      (seasonApplied ? SEASON_VULNERABLE_PCT : 0),
  );

  return { pct, rankOneApplied, seasonApplied, immune, season };
}

/**
 * Level risiko dari Peluang Zonk (API_CONTRACT 3.2).
 *
 * `low` bila <= 15%, `medium` bila 16-34%, `high` bila >= 35%. Petak Emas
 * memakai `risk: null` sehingga fungsi ini tidak dipanggil untuknya.
 */
export function getRiskLevel(pct: number): Risk {
  if (pct <= RISK_LOW_MAX_PCT) {
    return "low";
  }
  if (pct <= RISK_MEDIUM_MAX_PCT) {
    return "medium";
  }
  return "high";
}

/**
 * Tag risiko untuk `TileOption.riskTags` (API_CONTRACT 3.2, urutan skema):
 * `rankOne`, `season`, lalu `immune`. Persentase asli tidak dikirim, hanya
 * level lewat {@link getRiskLevel} dan tag penyebabnya lewat fungsi ini.
 */
export function getRiskTags(result: ZonkChanceResult): RiskTag[] {
  const tags: RiskTag[] = [];

  if (result.rankOneApplied) {
    tags.push({ type: "rankOne", plusPct: RANK_ONE_BURDEN_PCT });
  }

  if (result.seasonApplied) {
    tags.push({
      type: "season",
      season: result.season,
      plusPct: SEASON_VULNERABLE_PCT,
    });
  }

  if (result.immune) {
    tags.push({ type: "immune", reason: IMMUNITY_REASON });
  }

  return tags;
}
