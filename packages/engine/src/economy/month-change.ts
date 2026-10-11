import type { PrivateStatus } from "@pejuang/shared";
import type { RandomSource } from "../random";
import { applyEffects } from "./apply-effects";
import { applyDoomSpending } from "./doom";
import { DEBT_INTEREST_PCT, LIVING_COST, SALARY } from "./constants";
import { isBurnout, type EliminationReason } from "./elimination";

export interface MonthSummary {
  month: number;
  salary: number;
  livingCost: number;
  interest: number;
  interestAddedToDebt: number;
  doomAmount: number | null;
  before: PrivateStatus;
  after: PrivateStatus;
}

export interface MonthChangeResult {
  status: PrivateStatus;
  summary: MonthSummary;
  eliminated: EliminationReason | null;
}

export function processMonthChange(
  status: PrivateStatus,
  month: number,
  random: RandomSource,
): MonthChangeResult {
  const interest = Math.round((status.debt * DEBT_INTEREST_PCT) / 100);

  const wages = applyEffects(status, [
    { stat: "wealth", delta: SALARY },
    { stat: "wealth", delta: -LIVING_COST },
  ]);
  const interestStep = applyEffects(wages.status, [
    { stat: "wealth", delta: -interest },
  ]);
  const doom = applyDoomSpending(interestStep.status, random);

  const final = doom.status;
  const bankrupt =
    wages.shortfallWrittenOff + interestStep.shortfallWrittenOff + doom.shortfallWrittenOff > 0;
  const eliminated: EliminationReason | null = bankrupt
    ? "bankrupt"
    : isBurnout(final)
      ? "burnout"
      : null;

  return {
    status: final,
    summary: {
      month,
      salary: SALARY,
      livingCost: LIVING_COST,
      interest,
      interestAddedToDebt: interestStep.debtAdded,
      doomAmount: doom.triggered ? doom.amount : null,
      before: status,
      after: final,
    },
    eliminated,
  };
}
