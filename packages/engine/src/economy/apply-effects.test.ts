import { describe, expect, it } from "vitest";
import type { PrivateStatus } from "@pejuang/shared";
import { applyEffects } from "./apply-effects";
import { payDebt } from "./pay-debt";

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

  it("Pinjol dari Hutang 0 ke 10jt: Hutang 10jt, Stress 2+1 (melewati Rp5jt)", () => {
    const result = applyEffects(makeStatus(1_000_000, 0, 10, 0), [
      { stat: "wealth", delta: 10_000_000 },
      { stat: "debt", delta: 10_000_000 },
      { stat: "stress", delta: 2 },
    ]);
    expect(result.status).toEqual(makeStatus(11_000_000, 10_000_000, 10, 3));
    expect(result.debtAdded).toBe(10_000_000);
    expect(result.debtStress).toBe(1);
  });

  it("Pinjol dari Hutang 20jt: tanpa batas atas, Hutang 30jt, Stress +2 (melewati Rp20jt dan Rp25jt)", () => {
    const result = applyEffects(makeStatus(1_000_000, 20_000_000, 10, 0), [
      { stat: "wealth", delta: 10_000_000 },
      { stat: "debt", delta: 10_000_000 },
    ]);
    expect(result.status).toEqual(makeStatus(11_000_000, 30_000_000, 10, 2));
    expect(result.debtAdded).toBe(10_000_000);
    expect(result.debtStress).toBe(2);
  });

  it("efek debt negatif diabaikan: Hutang hanya turun lewat payDebt", () => {
    const result = applyEffects(makeStatus(8_000_000, 1_000_000, 10, 0), [
      { stat: "wealth", delta: -500_000 },
      { stat: "debt", delta: -5_000_000 },
    ]);
    expect(result.status).toEqual(makeStatus(7_500_000, 1_000_000, 10, 0));
    expect(result.debtAdded).toBe(0);
  });

  it("Kekayaan 300.000 lalu -1.000.000: kekurangan pindah ke Hutang, Stress tidak naik di bawah Rp5jt", () => {
    const result = applyEffects(makeStatus(300_000, 0, 10, 0), [
      { stat: "wealth", delta: -1_000_000 },
    ]);
    expect(result.status).toEqual(makeStatus(0, 700_000, 10, 0));
    expect(result.debtAdded).toBe(700_000);
    expect(result.debtStress).toBe(0);
  });

  it("contoh GDD 2.3: Kekayaan 300rb, Hutang 4,8jt, biaya 1jt -> Hutang 5,5jt, Stress +1", () => {
    const result = applyEffects(makeStatus(300_000, 4_800_000, 10, 0), [
      { stat: "wealth", delta: -1_000_000 },
    ]);
    expect(result.status).toEqual(makeStatus(0, 5_500_000, 10, 1));
  });

  it("kekurangan melewati Rp25jt tetap menjadi Hutang (tanpa penghapusan)", () => {
    const result = applyEffects(makeStatus(0, 24_500_000, 10, 0), [
      { stat: "wealth", delta: -1_000_000 },
    ]);
    expect(result.status.wealth).toBe(0);
    expect(result.status.debt).toBe(25_500_000);
    expect(result.debtAdded).toBe(1_000_000);
    expect(result.debtStress).toBe(1);
  });

  it("Denda Hutang +1.500.000 dari 4.800.000: Stress +1", () => {
    const result = applyEffects(makeStatus(5_000_000, 4_800_000, 10, 0), [
      { stat: "debt", delta: 1_500_000 },
    ]);
    expect(result.status).toEqual(makeStatus(5_000_000, 6_300_000, 10, 1));
    expect(result.debtStress).toBe(1);
  });

  it("tidak memutasi status masukan", () => {
    const input = makeStatus(300_000, 0, 10, 0);
    applyEffects(input, [{ stat: "wealth", delta: -1_000_000 }]);
    expect(input).toEqual(makeStatus(300_000, 0, 10, 0));
  });
});

describe("Stress Hutang: kelipatan Rp5.000.000 yang dilewati (GDD 2.3 v1.12)", () => {
  const borrow = (before: number, delta: number) =>
    applyEffects(makeStatus(0, before, 10, 0), [{ stat: "debt", delta }]);

  it("0 -> 5.000.000: +0 (tepat di kelipatan belum dihitung)", () => {
    expect(borrow(0, 5_000_000).debtStress).toBe(0);
    expect(borrow(0, 5_000_000).status.stress).toBe(0);
  });

  it("0 -> 5.000.001: +1", () => {
    expect(borrow(0, 5_000_001).debtStress).toBe(1);
    expect(borrow(0, 5_000_001).status.stress).toBe(1);
  });

  it("4.500.000 -> 10.500.000: +2", () => {
    expect(borrow(4_500_000, 6_000_000).debtStress).toBe(2);
    expect(borrow(4_500_000, 6_000_000).status.stress).toBe(2);
  });

  it("5.000.000 -> 5.000.001: +1 (sudah di kelipatan lalu melewatinya)", () => {
    expect(borrow(5_000_000, 1).debtStress).toBe(1);
  });

  it("Hutang 9jt turun ke 4jt (payDebt), lalu naik ke 6jt: +1", () => {
    const paid = payDebt(makeStatus(5_000_000, 9_000_000, 10, 0), 5_000_000).status;
    expect(paid.debt).toBe(4_000_000);
    const result = applyEffects(paid, [{ stat: "debt", delta: 2_000_000 }]);
    expect(result.status.debt).toBe(6_000_000);
    expect(result.debtStress).toBe(1);
  });

  it("Level Stress tetap dibatasi 10", () => {
    const result = applyEffects(makeStatus(0, 0, 10, 9), [
      { stat: "debt", delta: 12_000_000 },
    ]);
    expect(result.status.stress).toBe(10);
  });
});

describe("payDebt (GDD 2.3 #3, 2.4 v1.12)", () => {
  it("dibatasi min(Kekayaan, Hutang): Kekayaan 2jt, Hutang 5jt, bayar 9jt -> bayar 2jt", () => {
    const result = payDebt(makeStatus(2_000_000, 5_000_000, 10, 5), 9_000_000);
    expect(result.paid).toBe(2_000_000);
    expect(result.status).toEqual(makeStatus(0, 3_000_000, 10, 5));
    expect(result.debtCleared).toBe(false);
    expect(result.stressDelta).toBe(0);
  });

  it("lunas: Hutang 1jt dibayar, Level Stress -2", () => {
    const result = payDebt(makeStatus(10_000_000, 1_000_000, 10, 5), 1_000_000);
    expect(result.status).toEqual(makeStatus(9_000_000, 0, 10, 3));
    expect(result.debtCleared).toBe(true);
    expect(result.stressDelta).toBe(-2);
  });

  it("Rp0 atau negatif: tidak ada perubahan", () => {
    const status = makeStatus(5_000_000, 3_000_000, 10, 5);
    expect(payDebt(status, 0).status).toEqual(status);
    expect(payDebt(status, -100).paid).toBe(0);
    expect(payDebt(status, Number.NaN).paid).toBe(0);
  });

  it("Hutang 0: tidak lunas baru, Level Stress tidak berubah", () => {
    const result = payDebt(makeStatus(5_000_000, 0, 10, 5), 1_000_000);
    expect(result.paid).toBe(0);
    expect(result.debtCleared).toBe(false);
    expect(result.status.stress).toBe(5);
  });

  it("Level Stress tidak di bawah 0 saat lunas", () => {
    const result = payDebt(makeStatus(5_000_000, 1_000_000, 10, 1), 1_000_000);
    expect(result.status.stress).toBe(0);
  });

  it("tidak memutasi status masukan", () => {
    const input = makeStatus(5_000_000, 3_000_000, 10, 5);
    payDebt(input, 3_000_000);
    expect(input).toEqual(makeStatus(5_000_000, 3_000_000, 10, 5));
  });
});
