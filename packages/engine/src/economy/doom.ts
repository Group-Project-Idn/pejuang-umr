import type { PrivateStatus } from "@pejuang/shared";
import type { RandomSource } from "../random";
import { applyEffects } from "./apply-effects";
import { DOOM_AMOUNTS, DOOM_THRESHOLD } from "./constants";

export interface DoomSpendingResult {
  status: PrivateStatus;
  amount: number;
  triggered: boolean;
}

export function applyDoomSpending(
  status: PrivateStatus,
  random: RandomSource,
): DoomSpendingResult {
  if (status.stress < DOOM_THRESHOLD) {
    return { status, amount: 0, triggered: false };
  }
  const amount = random.pick(DOOM_AMOUNTS);
  const result = applyEffects(status, [
    { stat: "wealth", delta: -amount },
    { stat: "stress", delta: -1 },
  ]);
  return {
    status: result.status,
    amount,
    triggered: true,
  };
}
