import { describe, expect, it } from "vitest";
import { isMonthChangeStep, monthOfStep } from "./schedule";

describe("jadwal bulan (GDD 2.4 v1.8)", () => {
  it("ganti bulan tepat 11 kali di Langkah 3, 5, ..., 23", () => {
    const steps = Array.from({ length: 24 }, (_, i) => i + 1).filter(isMonthChangeStep);
    expect(steps).toEqual([3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23]);
  });

  it("Langkah 1, genap, dan setelah 24 bukan ganti bulan", () => {
    expect(isMonthChangeStep(1)).toBe(false);
    expect(isMonthChangeStep(2)).toBe(false);
    expect(isMonthChangeStep(24)).toBe(false);
    expect(isMonthChangeStep(25)).toBe(false);
  });

  it("monthOfStep memetakan 2 langkah per bulan", () => {
    expect(monthOfStep(1)).toBe(1);
    expect(monthOfStep(2)).toBe(1);
    expect(monthOfStep(3)).toBe(2);
    expect(monthOfStep(23)).toBe(12);
    expect(monthOfStep(24)).toBe(12);
  });
});
