import type { PrivateStatus } from "@pejuang/shared";

export interface PayDebtResult {
  status: PrivateStatus;
  paid: number;
  debtCleared: boolean;
  stressDelta: 0 | -2;
}

const DEBT_CLEARED_STRESS = -2;

/**
 * Bayar Hutang lewat slider Ganti Bulan (GDD 2.3 #3 dan 2.4 v1.12).
 * Nominal dibatasi 0 sampai min(Kekayaan, Hutang). Hutang lunas (dari lebih
 * dari 0 menjadi 0) memberi Level Stress -2.
 */
export function payDebt(status: PrivateStatus, amount: number): PayDebtResult {
  const max = Math.min(status.wealth, status.debt);
  const requested = Number.isFinite(amount) ? Math.floor(amount) : 0;
  const paid = Math.min(max, Math.max(0, requested));
  const debt = status.debt - paid;
  const debtCleared = status.debt > 0 && debt === 0;
  const stressDelta = debtCleared ? DEBT_CLEARED_STRESS : 0;
  return {
    status: {
      ...status,
      wealth: status.wealth - paid,
      debt,
      stress: Math.min(10, Math.max(0, status.stress + stressDelta)),
    },
    paid,
    debtCleared,
    stressDelta,
  };
}
