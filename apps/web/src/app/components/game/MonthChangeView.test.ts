import { describe, expect, it } from "vitest";
import { getMonthPaymentSeconds } from "./MonthChangeView";

describe("timer Ganti Bulan", () => {
  it("menggunakan jam server dan berhenti pada tenggat", () => {
    expect(getMonthPaymentSeconds(15_000, 0)).toBe(15);
    expect(getMonthPaymentSeconds(15_000, 14_001)).toBe(1);
    expect(getMonthPaymentSeconds(15_000, 15_000)).toBe(0);
    expect(getMonthPaymentSeconds(15_000, 16_000)).toBe(0);
  });
});