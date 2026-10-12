import { describe, expect, it } from "vitest";
import type { PrivateStatus } from "@pejuang/shared";
import { INITIAL_STATUS } from "../economy/constants";
import { calculateNetWorth, calculateWelfareScore } from "./score";

function makeStatus(
  wealth: number,
  debt: number,
  health: number,
  stress: number,
): PrivateStatus {
  return { wealth, debt, debtLimit: 25_000_000, health, stress };
}

describe("calculateNetWorth (GDD 6.1)", () => {
  it("mengurangi hutang yang dikali 1,5", () => {
    expect(
      calculateNetWorth(makeStatus(12_000_000, 5_000_000, 6, 5)),
    ).toBe(4_500_000);
  });

  it("menjadi negatif saat hutang besar", () => {
    expect(
      calculateNetWorth(makeStatus(8_000_000, 10_000_000, 2, 9)),
    ).toBe(-7_000_000);
  });

  it("mengembalikan kekayaan apa adanya saat tanpa hutang", () => {
    expect(calculateNetWorth(makeStatus(27_000_000, 0, 9, 2))).toBe(
      27_000_000,
    );
  });
});

describe("calculateWelfareScore - Skor Kesejahteraan Seimbang (GDD 6.2 v1.12)", () => {
  it("Skenario 1: Hemat & Sehat -> 90 (Poin Keuangan dibatasi 100)", () => {
    const result = calculateWelfareScore(makeStatus(27_000_000, 0, 9, 2));
    expect(result.netWorth).toBe(27_000_000);
    expect(result.points).toEqual({ finance: 100, health: 90, calm: 80 });
    expect(result.score).toBe(90);
  });

  it("Skenario 2: Seimbang -> 56,333...", () => {
    const result = calculateWelfareScore(makeStatus(12_000_000, 5_000_000, 6, 5));
    expect(result.netWorth).toBe(4_500_000);
    expect(result.points).toEqual({ finance: 59, health: 60, calm: 50 });
    expect(result.score).toBeCloseTo(56.3333333, 6);
    expect(Number.isInteger(result.score)).toBe(false);
  });

  it("Skenario 3: Berhutang & Burnout -> 22", () => {
    const result = calculateWelfareScore(makeStatus(8_000_000, 10_000_000, 2, 9));
    expect(result.netWorth).toBe(-7_000_000);
    expect(result.points).toEqual({ finance: 36, health: 20, calm: 10 });
    expect(result.score).toBe(22);
  });

  it("Harta Bersih Rp10.000.000, Kesehatan 10, Level Stress 0 -> 90", () => {
    expect(calculateWelfareScore(makeStatus(10_000_000, 0, 10, 0)).score).toBe(90);
  });

  it("skor awal (Kekayaan 7.500.000, tanpa Hutang, Kesehatan 10, Stress 0) -> 88,333...", () => {
    const result = calculateWelfareScore(INITIAL_STATUS);
    expect(result.points.finance).toBeCloseTo(65, 9);
    expect(result.score).toBeCloseTo(88.3333333, 6);
  });

  it("Poin Keuangan dibatasi 0 sampai 100", () => {
    expect(calculateWelfareScore(makeStatus(100_000_000, 0, 10, 0)).points.finance).toBe(100);
    expect(calculateWelfareScore(makeStatus(0, 100_000_000, 10, 0)).points.finance).toBe(0);
    expect(calculateWelfareScore(makeStatus(25_000_000, 0, 10, 0)).points.finance).toBe(100);
    expect(calculateWelfareScore(makeStatus(0, 50_000_000 / 3, 10, 0)).points.finance).toBeCloseTo(0, 6);
  });

  it("skor tidak dibulatkan dan tetap di rentang 0-100", () => {
    const worst = calculateWelfareScore(makeStatus(0, 99_000_000, 0, 10));
    expect(worst.score).toBe(0);
    const best = calculateWelfareScore(makeStatus(99_000_000, 0, 10, 0));
    expect(best.score).toBe(100);
    expect(calculateWelfareScore(makeStatus(7_500_001, 0, 10, 0)).score).not.toBe(
      calculateWelfareScore(makeStatus(7_500_000, 0, 10, 0)).score,
    );
  });

  it("tidak ada modifier lama pada hasil", () => {
    const result = calculateWelfareScore(makeStatus(1_000_000, 2_000_000, 9, 2));
    expect(result).not.toHaveProperty("modifier");
    expect(result).not.toHaveProperty("modifierPct");
  });
});
