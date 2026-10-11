import type { Effect, PrivateStatus } from "@pejuang/shared";
import { DEBT_STRESS_STEP } from "./constants";

export interface ApplyEffectsResult {
  status: PrivateStatus;
  debtAdded: number;
  debtStress: number;
  shortfallWrittenOff: number;
}

function clampGauge(value: number): number {
  return Math.min(10, Math.max(0, value));
}

export function applyEffects(
  status: PrivateStatus,
  effects: readonly Effect[],
): ApplyEffectsResult {
  const total = { wealth: 0, debt: 0, health: 0, stress: 0 };
  for (const effect of effects) total[effect.stat] += effect.delta;

  const limit = status.debtLimit;
  let wealthDelta = total.wealth;
  let debt = status.debt;
  let debtAdded = 0;

  if (total.debt > 0) {
    const added = Math.min(total.debt, limit - debt);
    debt += added;
    debtAdded += added;
    if (total.wealth > 0) wealthDelta = added;
  } else if (total.debt < 0) {
    const paid = Math.min(-total.debt, debt);
    debt -= paid;
    if (total.wealth < 0) wealthDelta = -paid;
  }

  let wealth = status.wealth + wealthDelta;
  let shortfallWrittenOff = 0;
  if (wealth < 0) {
    const shortfall = -wealth;
    const moved = Math.min(shortfall, limit - debt);
    debt += moved;
    debtAdded += moved;
    shortfallWrittenOff = shortfall - moved;
    wealth = 0;
  }

  const debtStress = Math.ceil(debtAdded / DEBT_STRESS_STEP);

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
    shortfallWrittenOff,
  };
}
