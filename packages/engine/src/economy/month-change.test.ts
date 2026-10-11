import { describe, expect, it } from "vitest";
import type { PrivateStatus } from "@pejuang/shared";
import { SequenceRandomSource } from "../random";
import { DOOM_AMOUNTS } from "./constants";
import { processMonthChange } from "./month-change";

function makeStatus(
  wealth: number,
  debt: number,
  health = 10,
  stress = 0,
): PrivateStatus {
  return { wealth, debt, debtLimit: 25_000_000, health, stress };
}

const random = () => new SequenceRandomSource([0]);

describe("processMonthChange (GDD 2.4)", () => {
  it("bulan normal tanpa Hutang: Kekayaan +1.130.000", () => {
    const result = processMonthChange(makeStatus(7_500_000, 0), 2, random());
    expect(result.status).toEqual(makeStatus(8_630_000, 0));
    expect(result.eliminated).toBeNull();
    expect(result.summary).toEqual({
      month: 2,
      salary: 5_730_000,
      livingCost: 4_600_000,
      interest: 0,
      interestAddedToDebt: 0,
      doomAmount: null,
      before: makeStatus(7_500_000, 0),
      after: makeStatus(8_630_000, 0),
    });
  });

  it("Hutang 10jt, Kekayaan cukup: bunga 1jt dibayar dari Kekayaan", () => {
    const result = processMonthChange(makeStatus(5_000_000, 10_000_000), 3, random());
    expect(result.summary.interest).toBe(1_000_000);
    expect(result.summary.interestAddedToDebt).toBe(0);
    expect(result.status).toEqual(makeStatus(5_130_000, 10_000_000));
  });

  it("Hutang 10jt, Kekayaan 0: gaji bersih menutup bunga", () => {
    const result = processMonthChange(makeStatus(0, 10_000_000), 3, random());
    expect(result.status).toEqual(makeStatus(130_000, 10_000_000));
    expect(result.summary.interestAddedToDebt).toBe(0);
  });

  it("bunga melebihi gaji bersih: kekurangan masuk pokok Hutang, Stress naik", () => {
    const result = processMonthChange(makeStatus(0, 20_000_000), 4, random());
    expect(result.summary.interest).toBe(2_000_000);
    expect(result.summary.interestAddedToDebt).toBe(870_000);
    expect(result.status).toEqual(makeStatus(0, 20_870_000, 10, 1));
    expect(result.eliminated).toBeNull();
  });

  it("bunga dibulatkan ke Rupiah terdekat", () => {
    const result = processMonthChange(makeStatus(5_000_000, 1_234_565), 3, random());
    expect(result.summary.interest).toBe(123_457);
  });

  it("Bangkrut: kekurangan tidak tertutup limit Hutang", () => {
    const result = processMonthChange(makeStatus(0, 24_000_000), 5, random());
    expect(result.status.wealth).toBe(0);
    expect(result.status.debt).toBe(25_000_000);
    expect(result.eliminated).toBe("bankrupt");
  });

  it("Doom Spending terpicu saat Stress 9", () => {
    const result = processMonthChange(makeStatus(5_000_000, 0, 10, 9), 6, random());
    expect(DOOM_AMOUNTS).toContain(result.summary.doomAmount);
    expect(result.summary.doomAmount).toBe(750_000);
    expect(result.status).toEqual(makeStatus(5_380_000, 0, 10, 8));
  });

  it("Stress 8: doomAmount null", () => {
    const result = processMonthChange(makeStatus(5_000_000, 0, 10, 8), 6, random());
    expect(result.summary.doomAmount).toBeNull();
    expect(result.status.stress).toBe(8);
  });

  it("Burnout: Kesehatan 0", () => {
    expect(processMonthChange(makeStatus(5_000_000, 0, 0, 0), 7, random()).eliminated).toBe("burnout");
  });

  it("Stress 10 dan Kesehatan 3: Doom menurunkan Stress ke 9 sebelum cek, jadi lolos", () => {
    expect(processMonthChange(makeStatus(5_000_000, 0, 3, 10), 7, random()).eliminated).toBeNull();
  });

  it("Stress 10 dan Kesehatan 4 tidak tereliminasi", () => {
    expect(processMonthChange(makeStatus(5_000_000, 0, 4, 10), 7, random()).eliminated).toBeNull();
  });
});
