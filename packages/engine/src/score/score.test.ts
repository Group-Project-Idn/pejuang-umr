import { describe, expect, it } from "vitest";
import type { PrivateStatus } from "@pejuang/shared";
import {
  calculateNetWorth,
  calculateWelfareScore,
  getWellnessModifier,
} from "./score";

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

describe("getWellnessModifier (GDD 6.2)", () => {
  it("batas Kesehatan 3 memicu penalti", () => {
    expect(getWellnessModifier(makeStatus(0, 0, 3, 5))).toEqual({
      modifier: "penalty",
      pct: -50,
    });
  });

  it("batas Kesehatan 4 dan Stress 7 tidak memicu apa pun", () => {
    expect(getWellnessModifier(makeStatus(0, 0, 4, 7))).toEqual({
      modifier: "none",
      pct: 0,
    });
  });

  it("batas Kesehatan 8 dan Stress 3 memicu bonus", () => {
    expect(getWellnessModifier(makeStatus(0, 0, 8, 3))).toEqual({
      modifier: "bonus",
      pct: 20,
    });
  });

  it("prioritas 1 menang: Kesehatan 8 tapi Stress 8 tetap penalti", () => {
    expect(getWellnessModifier(makeStatus(0, 0, 8, 8))).toEqual({
      modifier: "penalty",
      pct: -50,
    });
  });
});

describe("calculateWelfareScore - 3 skenario GDD 6.2", () => {
  it("Skenario 1: Hemat & Sehat -> bonus", () => {
    expect(
      calculateWelfareScore(makeStatus(27_000_000, 0, 9, 2)),
    ).toEqual({
      netWorth: 27_000_000,
      modifier: "bonus",
      modifierPct: 20,
      score: 32_400_000,
    });
  });

  it("Skenario 2: Seimbang -> none", () => {
    expect(
      calculateWelfareScore(makeStatus(12_000_000, 5_000_000, 6, 5)),
    ).toEqual({
      netWorth: 4_500_000,
      modifier: "none",
      modifierPct: 0,
      score: 4_500_000,
    });
  });

  it("Skenario 3: Berhutang & Burnout -> penalti, skor turun", () => {
    expect(
      calculateWelfareScore(makeStatus(8_000_000, 10_000_000, 2, 9)),
    ).toEqual({
      netWorth: -7_000_000,
      modifier: "penalty",
      modifierPct: -50,
      score: -10_500_000,
    });
  });

  it("Harta Bersih negatif dengan bonus tetap naik ke arah positif", () => {
    const result = calculateWelfareScore(makeStatus(1_000_000, 2_000_000, 9, 2));
    expect(result.netWorth).toBe(-2_000_000);
    expect(result.modifier).toBe("bonus");
    expect(result.score).toBeGreaterThan(result.netWorth);
    expect(result.score).toBe(-1_600_000);
  });
});
