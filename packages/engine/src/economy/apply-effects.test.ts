import { describe, expect, it } from "vitest";
import type { PrivateStatus } from "@pejuang/shared";
import { applyEffects } from "./apply-effects";

function makeStatus(
  wealth: number,
  debt: number,
  health: number,
  stress: number,
): PrivateStatus {
  return { wealth, debt, debtLimit: 25_000_000, health, stress };
}

describe("applyEffects (GDD 1.4, 2.2, 2.3)", () => {
  it("Beli Vitamin: Kesehatan dibatasi 10", () => {
    const result = applyEffects(makeStatus(7_500_000, 0, 9, 0), [
      { stat: "wealth", delta: -250_000 },
      { stat: "health", delta: 2 },
    ]);
    expect(result.status).toEqual(makeStatus(7_250_000, 0, 10, 0));
    expect(result.debtAdded).toBe(0);
  });

  it("Pinjol MP dari Hutang 0: Hutang 10jt, Stress 2+2", () => {
    const result = applyEffects(makeStatus(1_000_000, 0, 10, 0), [
      { stat: "wealth", delta: 10_000_000 },
      { stat: "debt", delta: 10_000_000 },
      { stat: "stress", delta: 2 },
    ]);
    expect(result.status).toEqual(makeStatus(11_000_000, 10_000_000, 10, 4));
    expect(result.debtAdded).toBe(10_000_000);
    expect(result.debtStress).toBe(2);
  });

  it("Pinjol MP dari Hutang 20jt: dibatasi limit, Kekayaan hanya +5jt, Stress 2+1", () => {
    const result = applyEffects(makeStatus(1_000_000, 20_000_000, 10, 0), [
      { stat: "wealth", delta: 10_000_000 },
      { stat: "debt", delta: 10_000_000 },
      { stat: "stress", delta: 2 },
    ]);
    expect(result.status).toEqual(makeStatus(6_000_000, 25_000_000, 10, 3));
    expect(result.debtAdded).toBe(5_000_000);
    expect(result.debtStress).toBe(1);
  });

  it("Bayar Hutang MP dari Hutang 1jt: Kekayaan hanya -1jt", () => {
    const result = applyEffects(makeStatus(8_000_000, 1_000_000, 10, 0), [
      { stat: "wealth", delta: -5_000_000 },
      { stat: "debt", delta: -5_000_000 },
    ]);
    expect(result.status).toEqual(makeStatus(7_000_000, 0, 10, 0));
    expect(result.debtAdded).toBe(0);
  });

  it("Kekayaan 300.000 lalu -1.000.000: kekurangan pindah ke Hutang, Stress +1", () => {
    const result = applyEffects(makeStatus(300_000, 0, 10, 0), [
      { stat: "wealth", delta: -1_000_000 },
    ]);
    expect(result.status).toEqual(makeStatus(0, 700_000, 10, 1));
    expect(result.debtAdded).toBe(700_000);
    expect(result.shortfallWrittenOff).toBe(0);
  });

  it("Limit tidak cukup: Hutang berhenti di 25jt, sisa kekurangan dihapus", () => {
    const result = applyEffects(makeStatus(0, 24_500_000, 10, 0), [
      { stat: "wealth", delta: -1_000_000 },
    ]);
    expect(result.status.wealth).toBe(0);
    expect(result.status.debt).toBe(25_000_000);
    expect(result.shortfallWrittenOff).toBe(500_000);
    expect(result.debtStress).toBe(1);
  });

  it("Denda Hutang +1.500.000: Stress +1", () => {
    const result = applyEffects(makeStatus(5_000_000, 0, 10, 0), [
      { stat: "debt", delta: 1_500_000 },
    ]);
    expect(result.status).toEqual(makeStatus(5_000_000, 1_500_000, 10, 1));
    expect(result.debtStress).toBe(1);
  });

  it("tidak memutasi status masukan", () => {
    const input = makeStatus(300_000, 0, 10, 0);
    applyEffects(input, [{ stat: "wealth", delta: -1_000_000 }]);
    expect(input).toEqual(makeStatus(300_000, 0, 10, 0));
  });
});

describe("Bayar Hutang dibatasi Kekayaan (GDD 2.3 #3a)", () => {
  const payDebt = (wealth: number, debt: number) =>
    applyEffects(makeStatus(wealth, debt, 10, 5), [
      { stat: "wealth", delta: -5_000_000 },
      { stat: "debt", delta: -5_000_000 },
      { stat: "stress", delta: -2 },
    ]);

  it("Kekayaan 0, Hutang 5jt: Hutang tetap, Kekayaan 0, Level Stress -2", () => {
    const result = payDebt(0, 5_000_000);
    expect(result.status).toEqual(makeStatus(0, 5_000_000, 10, 3));
    expect(result.debtAdded).toBe(0);
    expect(result.debtStress).toBe(0);
  });

  it("Kekayaan 2jt, Hutang 5jt: Hutang 3jt, Kekayaan 0", () => {
    const result = payDebt(2_000_000, 5_000_000);
    expect(result.status).toEqual(makeStatus(0, 3_000_000, 10, 3));
    expect(result.debtAdded).toBe(0);
  });

  it("Kekayaan 10jt, Hutang 1jt: Hutang 0, Kekayaan 9jt", () => {
    expect(payDebt(10_000_000, 1_000_000).status).toEqual(makeStatus(9_000_000, 0, 10, 3));
  });
});
