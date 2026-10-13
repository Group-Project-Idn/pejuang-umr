import type { PrivateStatus } from "@pejuang/shared";
import { DEFAULT_FINANCE_DIVISOR } from "../economy/balance";

/** Poin per komponen Skor Kesejahteraan (GDD 6.2 v1.12), masing-masing 0-100. */
export interface WelfarePoints {
  finance: number;
  health: number;
  calm: number;
}

/** Rincian Skor Kesejahteraan sesuai GDD 6.1, 6.2 dan API_CONTRACT 9.5. */
export interface WelfareScore {
  netWorth: number;
  points: WelfarePoints;
  /** Rata-rata tiga poin, desimal 0-100 (tidak dibulatkan di engine). */
  score: number;
}

/**
 * Harta Bersih (GDD 6.1).
 *
 * Harta Bersih = Kekayaan - (Hutang x 1,5). Hutang dikali 1,5 sebagai penalti
 * "bunga tersembunyi". Dibulatkan dengan Math.round.
 */
export function calculateNetWorth(status: PrivateStatus): number {
  return Math.round(status.wealth - status.debt * 1.5);
}

/**
 * Skor Kesejahteraan Seimbang (GDD 6.2 v1.12).
 *
 * Poin Keuangan   = clamp(50 + Harta Bersih / 500.000, 0, 100)
 * Poin Kesehatan  = Kesehatan x 10
 * Poin Ketenangan = (10 - Level Stress) x 10
 * Skor            = rata-rata ketiganya, disimpan sebagai desimal.
 */
export function calculateWelfareScore(
  status: PrivateStatus,
  financeDivisor: number = DEFAULT_FINANCE_DIVISOR,
): WelfareScore {
  const rawNetWorth = status.wealth - status.debt * 1.5;
  const points: WelfarePoints = {
    finance: Math.min(100, Math.max(0, 50 + rawNetWorth / financeDivisor)),
    health: status.health * 10,
    calm: (10 - status.stress) * 10,
  };
  return {
    netWorth: calculateNetWorth(status),
    points,
    score: (points.finance + points.health + points.calm) / 3,
  };
}
