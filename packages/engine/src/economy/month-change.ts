import type { PrivateStatus } from "@pejuang/shared";
import { applyEffects } from "./apply-effects";
import { resolveBalance, type BalanceParams } from "./balance";
import { DEBT_INTEREST_PCT, SALARY } from "./constants";

export interface MonthSummary {
  month: number;
  salary: number;
  livingCost: number;
  /** Level Stress pasif bulan ini (baris "Tekanan bulanan"); 0 bila tidak ada. */
  passiveStress: number;
  interest: number;
  interestAddedToDebt: number;
  before: PrivateStatus;
  after: PrivateStatus;
}

export interface MonthChangeResult {
  status: PrivateStatus;
  summary: MonthSummary;
}

/**
 * Ganti bulan (GDD 2.4 v1.15): gaji, Biaya Hidup Wajib, bunga Hutang, lalu Tekanan bulanan (Level Stress pasif).
 * Bayar Hutang, Doom Spending, Bangkrut, dan Burnout tidak diproses di sini.
 */
export function processMonthChange(
  status: PrivateStatus,
  month: number,
  balance?: Partial<BalanceParams>,
): MonthChangeResult {
  const { livingCost, passiveStress } = resolveBalance(balance);
  const interest = Math.round((status.debt * DEBT_INTEREST_PCT) / 100);

  const wages = applyEffects(status, [
    { stat: "wealth", delta: SALARY },
    { stat: "wealth", delta: -livingCost },
  ]);
  const interestStep = applyEffects(wages.status, [
    { stat: "wealth", delta: -interest },
    ...(passiveStress > 0 ? [{ stat: "stress" as const, delta: passiveStress }] : []),
  ]);

  return {
    status: interestStep.status,
    summary: {
      month,
      salary: SALARY,
      livingCost,
      passiveStress,
      interest,
      interestAddedToDebt: interestStep.debtAdded,
      before: status,
      after: interestStep.status,
    },
  };
}
