import type { PrivateStatus } from "@pejuang/shared";

/** Jenis modifier kesejahteraan sesuai GDD 6.2 dan API_CONTRACT 9.5. */
export type WellnessModifierKind = "penalty" | "bonus" | "none";

/** Persentase modifier sesuai GDD 6.2: penalti -50, bonus +20, netral 0. */
export type ModifierPct = -50 | 20 | 0;

/** Hasil {@link getWellnessModifier}. */
export interface WellnessModifier {
  modifier: WellnessModifierKind;
  pct: ModifierPct;
}

/** Rincian Skor Kesejahteraan sesuai GDD 6.1, 6.2 dan API_CONTRACT 9.5. */
export interface WelfareScore {
  netWorth: number;
  modifier: WellnessModifierKind;
  modifierPct: ModifierPct;
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
 * Wellness Modifier (GDD 6.2). Hanya satu efek berlaku, dengan prioritas
 * tertinggi menang.
 *
 * 1. Kesehatan 0-3 ATAU Level Stress 8-10 -> penalty -50.
 * 2. Kesehatan 8-10 DAN Level Stress 0-3 -> bonus +20.
 * 3. Selain itu -> none 0.
 */
export function getWellnessModifier(status: PrivateStatus): WellnessModifier {
  if (status.health <= 3 || status.stress >= 8) {
    return { modifier: "penalty", pct: -50 };
  }
  if (status.health >= 8 && status.stress <= 3) {
    return { modifier: "bonus", pct: 20 };
  }
  return { modifier: "none", pct: 0 };
}

/**
 * Skor Kesejahteraan akhir (GDD 6.1 dan 6.2).
 *
 * Skor Akhir = Harta Bersih + (|Harta Bersih| x Persentase Modifier).
 * Memakai nilai absolut memastikan penalti selalu memperburuk skor dan bonus
 * selalu meningkatkan skor, juga saat Harta Bersih negatif.
 */
export function calculateWelfareScore(status: PrivateStatus): WelfareScore {
  const netWorth = calculateNetWorth(status);
  const { modifier, pct } = getWellnessModifier(status);
  const score = netWorth + Math.round(Math.abs(netWorth) * pct / 100);
  return { netWorth, modifier, modifierPct: pct, score };
}
