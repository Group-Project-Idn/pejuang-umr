import type { PrivateStatus } from "@pejuang/shared";

export type EliminationReason = "bankrupt" | "burnout";

export function isBurnout(status: PrivateStatus): boolean {
  return status.health === 0 || (status.stress === 10 && status.health <= 3);
}
