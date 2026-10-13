import type { Effect, Outcome } from "@pejuang/shared";
import { LIVING_COST } from "./constants";

/** Harta Bersih per 1 poin Keuangan (GDD 6.2 v1.12). */
export const DEFAULT_FINANCE_DIVISOR = 500_000;

/**
 * Parameter keseimbangan yang bisa diubah lewat opsi game (bukan aturan baru).
 * Dipakai simulasi untuk mengukur kesulitan; game sungguhan memakai {@link DEFAULT_BALANCE}
 * karena `GameState.balance` kosong.
 */
export interface BalanceParams {
  /** Biaya Hidup Wajib per Ganti Bulan (Rupiah). */
  livingCost: number;
  /** Level Stress pasif per Ganti Bulan: 0 atau 1. */
  passiveStress: 0 | 1;
  /** Pembagi Harta Bersih untuk Poin Keuangan. */
  financeDivisor: number;
  /** Pengali ukuran efek Realita bila hasilnya Zonk. */
  zonkMultiplier: number;
  /** Pengali ukuran efek semua Realita (Zonk, Aman, Hoki). */
  realityScale: number;
}

/** Aturan resmi GDD v1.15 (hasil BALANCE_REPORT.md). */
export const DEFAULT_BALANCE: BalanceParams = {
  livingCost: LIVING_COST,
  passiveStress: 1,
  financeDivisor: DEFAULT_FINANCE_DIVISOR,
  zonkMultiplier: 2,
  realityScale: 1,
};

/** Aturan GDD v1.14, disimpan supaya simulasi bisa dibandingkan dengan aturan lama. */
export const BALANCE_V1_14: BalanceParams = {
  livingCost: 4_600_000,
  passiveStress: 0,
  financeDivisor: DEFAULT_FINANCE_DIVISOR,
  zonkMultiplier: 1,
  realityScale: 1,
};

export function resolveBalance(partial?: Partial<BalanceParams>): BalanceParams {
  return { ...DEFAULT_BALANCE, ...partial };
}

const WEALTH_ROUNDING = 50_000;

function scaleDelta(effect: Effect, factor: number): number {
  const scaled = effect.delta * factor;
  if (effect.stat === "wealth" || effect.stat === "debt") {
    return Math.round(scaled / WEALTH_ROUNDING) * WEALTH_ROUNDING;
  }
  // Kesehatan dan Level Stress: bulat, dan efek yang ada tidak hilang jadi 0.
  const rounded = Math.round(scaled);
  return rounded === 0 && effect.delta !== 0 ? Math.sign(effect.delta) : rounded;
}

/**
 * Memperbesar atau memperkecil efek Realita (hanya untuk simulasi keseimbangan).
 * Faktor = realityScale, dikali zonkMultiplier bila hasilnya Zonk. Faktor 1 mengembalikan
 * array yang sama.
 */
export function scaleRealityEffects(
  effects: readonly Effect[],
  outcome: Outcome,
  balance?: Partial<BalanceParams>,
): Effect[] {
  const params = resolveBalance(balance);
  const factor = params.realityScale * (outcome === "zonk" ? params.zonkMultiplier : 1);
  if (factor === 1) return effects as Effect[];
  return effects.map((effect) => ({ ...effect, delta: scaleDelta(effect, factor) }));
}
