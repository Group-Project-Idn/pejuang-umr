import type { PrivateStatus } from "@pejuang/shared";
import { applyEffects } from "./apply-effects";
import { DEBT_INTEREST_PCT, LIVING_COST, SALARY } from "./constants";

export interface MonthSummary {
  month: number;
  salary: number;
  livingCost: number;
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
 * Ganti bulan (GDD 2.4 v1.12): gaji, Biaya Hidup Wajib, lalu bunga Hutang.
 * Bayar Hutang, Doom Spending, Bangkrut, dan Burnout tidak diproses di sini.
 */
export function processMonthChange(
  status: PrivateStatus,
  month: number,
): MonthChangeResult {
  const interest = Math.round((status.debt * DEBT_INTEREST_PCT) / 100);

  const wages = applyEffects(status, [
    { stat: "wealth", delta: SALARY },
    { stat: "wealth", delta: -LIVING_COST },
  ]);
  const interestStep = applyEffects(wages.status, [
    { stat: "wealth", delta: -interest },
  ]);

  return {
    status: interestStep.status,
    summary: {
      month,
      salary: SALARY,
      livingCost: LIVING_COST,
      interest,
      interestAddedToDebt: interestStep.debtAdded,
      before: status,
      after: interestStep.status,
    },
  };
}
