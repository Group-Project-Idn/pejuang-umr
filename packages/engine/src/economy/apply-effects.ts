import type { Effect, PrivateStatus } from "@pejuang/shared";
import { DEBT_STRESS_STEP } from "./constants";

export interface ApplyEffectsResult {
  status: PrivateStatus;
  debtAdded: number;
  debtStress: number;
}

function clampGauge(value: number): number {
  return Math.min(10, Math.max(0, value));
}

/**
 * Jumlah kelipatan Rp5.000.000 yang dilewati saat Hutang naik dari `before`
 * ke `after` (GDD 2.3 v1.12): lebih dari kelipatan, bukan sama dengan.
 */
function multiplesCrossed(before: number, after: number): number {
  if (after <= before) return 0;
  const below = (debt: number) =>
    debt <= 0 ? 0 : Math.floor((debt - 1) / DEBT_STRESS_STEP);
  return below(after) - below(before);
}

/**
 * Menerapkan satu transaksi efek (GDD 2.3 v1.12). Hutang tidak punya batas
 * atas dan kekurangan Kekayaan selalu menjadi Hutang. Hutang hanya berkurang
 * lewat {@link payDebt}, jadi efek `debt` negatif diabaikan.
 */
export function applyEffects(
  status: PrivateStatus,
  effects: readonly Effect[],
): ApplyEffectsResult {
  const total = { wealth: 0, debt: 0, health: 0, stress: 0 };
  for (const effect of effects) total[effect.stat] += effect.delta;

  let debt = status.debt + Math.max(0, total.debt);
  let wealth = status.wealth + total.wealth;
  if (wealth < 0) {
    debt += -wealth;
    wealth = 0;
  }

  const debtAdded = debt - status.debt;
  const debtStress = multiplesCrossed(status.debt, debt);

  return {
    status: {
      ...status,
      wealth,
      debt,
      health: clampGauge(status.health + total.health),
      stress: clampGauge(status.stress + total.stress + debtStress),
    },
    debtAdded,
    debtStress,
  };
}
