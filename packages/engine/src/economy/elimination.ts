import type { PrivateStatus } from "@pejuang/shared";
import { DEBT_LIMIT } from "./constants";

export type EliminationReason = "bankrupt" | "burnout";

/** GDD 1.4 v1.12: Bangkrut bila Hutang lebih dari Rp25.000.000. */
export function isBankrupt(status: PrivateStatus): boolean {
  return status.debt > DEBT_LIMIT;
}

export function isBurnout(status: PrivateStatus): boolean {
  return status.health === 0 || (status.stress === 10 && status.health <= 3);
}
