export const TOTAL_STEPS = 24;

export function monthOfStep(step: number): number {
  return Math.floor((step + 1) / 2);
}

export function isMonthChangeStep(step: number): boolean {
  return Number.isInteger(step) && step >= 3 && step < TOTAL_STEPS && step % 2 === 1;
}
