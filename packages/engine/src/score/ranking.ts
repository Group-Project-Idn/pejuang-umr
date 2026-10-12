import type { PrivateStatus, ScoreRow } from "@pejuang/shared";
import { calculateWelfareScore, type WelfarePoints } from "./score";

/** Selisih skor di bawah ini dianggap sama (galat pembulatan desimal). */
const SCORE_EPSILON = 1e-9;

/** Satu entri pemain yang akan diperingkat (GDD 1.2). */
export interface RankingEntry {
  playerId: string;
  status: PrivateStatus;
  eliminated: boolean;
  eliminatedAtStep: number | null;
  /** Skor yang dibekukan saat eliminasi (GDD 1.2 v1.12); bila kosong dihitung dari status. */
  frozenScore?: number | null;
}

/** Hasil peringkat satu pemain (GDD 1.2, API_CONTRACT 9.5). */
export interface RankedPlayer {
  playerId: string;
  rank: number;
  score: number;
  netWorth: number;
  points: WelfarePoints;
  eliminated: boolean;
  eliminatedAtStep: number | null;
}

interface WorkingEntry extends RankedPlayer {
  debt: number;
  stress: number;
}

/**
 * Perbandingan aturan peringkat GDD 1.2 tanpa pemecah seri playerId.
 * Mengembalikan <0 bila a di atas b, >0 bila a di bawah b, 0 bila seri penuh.
 */
function compareByRankingRules(a: WorkingEntry, b: WorkingEntry): number {
  // a. Pemain bertahan di atas semua pemain tereliminasi.
  if (a.eliminated !== b.eliminated) {
    return a.eliminated ? 1 : -1;
  }
  if (a.eliminated) {
    // c. Antar tereliminasi: yang bertahan lebih lama (langkah lebih besar) di atas.
    const aStep = a.eliminatedAtStep ?? Number.NEGATIVE_INFINITY;
    const bStep = b.eliminatedAtStep ?? Number.NEGATIVE_INFINITY;
    if (aStep !== bStep) {
      return bStep - aStep;
    }
    // Langkah sama: urut menurut skor beku, lalu tie-breaker (GDD 1.2 v1.12).
  }
  // b. Skor tinggi -> Hutang kecil -> Level Stress rendah.
  if (Math.abs(a.score - b.score) > SCORE_EPSILON) {
    return b.score - a.score;
  }
  if (a.debt !== b.debt) {
    return a.debt - b.debt;
  }
  if (a.stress !== b.stress) {
    return a.stress - b.stress;
  }
  return 0;
}

/** Seperti {@link compareByRankingRules} tetapi memecah seri penuh via playerId agar deterministik. */
function compareForSort(a: WorkingEntry, b: WorkingEntry): number {
  const byRankingRules = compareByRankingRules(a, b);
  if (byRankingRules !== 0) {
    return byRankingRules;
  }
  if (a.playerId < b.playerId) {
    return -1;
  }
  if (a.playerId > b.playerId) {
    return 1;
  }
  return 0;
}

/**
 * Mengurutkan pemain sesuai aturan peringkat Multiplayer (GDD 1.2).
 *
 * Fungsi ini tidak menentukan siapa yang tereliminasi dan tidak menghitung
 * Beban Peringkat 1; keduanya ditangani di tempat lain.
 */
export function rankPlayers(
  entries: readonly RankingEntry[],
): RankedPlayer[] {
  const working: WorkingEntry[] = entries.map((entry) => {
    const welfare = calculateWelfareScore(entry.status);
    return {
      playerId: entry.playerId,
      rank: 0,
      score: entry.eliminated ? (entry.frozenScore ?? welfare.score) : welfare.score,
      netWorth: welfare.netWorth,
      points: welfare.points,
      eliminated: entry.eliminated,
      eliminatedAtStep: entry.eliminatedAtStep,
      debt: entry.status.debt,
      stress: entry.status.stress,
    };
  });

  working.sort(compareForSort);

  // Peringkat kompetisi: pemain dengan kriteria identik dapat rank sama,
  // lalu peringkat berikutnya melompat (contoh 1, 1, 3).
  let previousRank = 0;
  working.forEach((entry, index) => {
    const isTied =
      index > 0 && compareByRankingRules(working[index - 1]!, entry) === 0;
    entry.rank = isTied ? previousRank : index + 1;
    previousRank = entry.rank;
  });

  return working.map((entry) => ({
    playerId: entry.playerId,
    rank: entry.rank,
    score: entry.score,
    netWorth: entry.netWorth,
    points: entry.points,
    eliminated: entry.eliminated,
    eliminatedAtStep: entry.eliminatedAtStep,
  }));
}

/** Baris Papan Skor ({@link ScoreRow}) dari hasil {@link rankPlayers}. */
export function toScoreRows(entries: readonly RankingEntry[]): ScoreRow[] {
  return rankPlayers(entries).map((player) => ({
    playerId: player.playerId,
    provisionalScore: player.score,
    rank: player.rank,
    eliminated: player.eliminated,
  }));
}
