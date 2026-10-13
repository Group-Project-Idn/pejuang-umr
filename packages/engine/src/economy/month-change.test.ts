import { describe, expect, it } from "vitest";
import type { PrivateStatus } from "@pejuang/shared";
import { DEBT_INTEREST_PCT } from "./constants";
import { processMonthChange } from "./month-change";

function makeStatus(
  wealth: number,
  debt: number,
  health = 10,
  stress = 0,
): PrivateStatus {
  return { wealth, debt, debtLimit: 25_000_000, health, stress };
}

describe("processMonthChange (GDD 2.4 v1.15)", () => {
  it("bunga Hutang 3%", () => {
    expect(DEBT_INTEREST_PCT).toBe(3);
  });

  it("bulan normal tanpa Hutang: Kekayaan +530.000 dan Tekanan bulanan Level Stress +1", () => {
    const result = processMonthChange(makeStatus(7_500_000, 0), 2);
    expect(result.status).toEqual(makeStatus(8_030_000, 0, 10, 1));
    expect(result.summary).toEqual({
      month: 2,
      salary: 5_730_000,
      livingCost: 5_200_000,
      passiveStress: 1,
      interest: 0,
      interestAddedToDebt: 0,
      before: makeStatus(7_500_000, 0),
      after: makeStatus(8_030_000, 0, 10, 1),
    });
  });

  it("Hutang 10jt, Kekayaan cukup: bunga 300rb dibayar dari Kekayaan", () => {
    const result = processMonthChange(makeStatus(5_000_000, 10_000_000), 3);
    expect(result.summary.interest).toBe(300_000);
    expect(result.summary.interestAddedToDebt).toBe(0);
    expect(result.status).toEqual(makeStatus(5_230_000, 10_000_000, 10, 1));
  });

  it("Hutang 10jt, Kekayaan 0: gaji bersih menutup bunga", () => {
    const result = processMonthChange(makeStatus(0, 10_000_000), 3);
    expect(result.status).toEqual(makeStatus(230_000, 10_000_000, 10, 1));
    expect(result.summary.interestAddedToDebt).toBe(0);
  });

  it("bunga melebihi gaji bersih: kekurangan masuk pokok Hutang, Stress naik bila melewati kelipatan, ditambah Tekanan bulanan", () => {
    const result = processMonthChange(makeStatus(0, 50_000_000), 4);
    expect(result.summary.interest).toBe(1_500_000);
    expect(result.summary.interestAddedToDebt).toBe(970_000);
    expect(result.status).toEqual(makeStatus(0, 50_970_000, 10, 2));
  });

  it("Level Stress pasif 0 lewat opsi: Tekanan bulanan tidak dikenakan", () => {
    const result = processMonthChange(makeStatus(7_500_000, 0), 2, { passiveStress: 0 });
    expect(result.status).toEqual(makeStatus(8_030_000, 0));
    expect(result.summary.passiveStress).toBe(0);
  });

  it("bunga dibulatkan ke Rupiah terdekat", () => {
    const result = processMonthChange(makeStatus(5_000_000, 1_234_565), 3);
    expect(result.summary.interest).toBe(37_037);
  });

  it("tidak memproses Doom Spending: Stress 9 hanya naik oleh Tekanan bulanan", () => {
    const result = processMonthChange(makeStatus(5_000_000, 0, 10, 9), 6);
    expect(result.status).toEqual(makeStatus(5_530_000, 0, 10, 10));
  });

  it("tidak mengeliminasi: Hutang di atas Rp25jt dan Kesehatan 0 hanya mengubah status", () => {
    const result = processMonthChange(makeStatus(0, 30_000_000, 0, 10), 7);
    expect(result).not.toHaveProperty("eliminated");
    expect(result.status.health).toBe(0);
    expect(result.status.debt).toBeGreaterThan(25_000_000);
  });
});
