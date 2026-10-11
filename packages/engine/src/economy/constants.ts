import type { PrivateStatus } from "@pejuang/shared";

export const DEBT_LIMIT = 25_000_000 as const;
export const SALARY = 5_730_000;
export const LIVING_COST = 4_600_000;
export const DEBT_INTEREST_PCT = 10;
export const DEBT_STRESS_STEP = 5_000_000;
export const DOOM_THRESHOLD = 9;
export const DOOM_AMOUNTS: readonly number[] = [750_000, 1_000_000, 1_250_000, 1_500_000];

export const INITIAL_STATUS: PrivateStatus = {
  wealth: 7_500_000,
  debt: 0,
  debtLimit: DEBT_LIMIT,
  health: 10,
  stress: 0,
};
