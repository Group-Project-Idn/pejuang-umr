import { describe, expect, it } from "vitest";
import type { PrivateStatus } from "@pejuang/shared";
import { isBankrupt, isBurnout } from "./elimination";

function makeStatus(health: number, stress: number): PrivateStatus {
  return { wealth: 0, debt: 0, debtLimit: 25_000_000, health, stress };
}

describe("isBurnout (GDD 1.4)", () => {
  it("Kesehatan 0 burnout", () => {
    expect(isBurnout(makeStatus(0, 0))).toBe(true);
  });
  it("Stress 10 dan Kesehatan 3 burnout", () => {
    expect(isBurnout(makeStatus(3, 10))).toBe(true);
  });
  it("Stress 10 dan Kesehatan 4 aman", () => {
    expect(isBurnout(makeStatus(4, 10))).toBe(false);
  });
  it("Stress 9 dan Kesehatan 1 aman", () => {
    expect(isBurnout(makeStatus(1, 9))).toBe(false);
  });
});

describe("isBankrupt (GDD 1.4 v1.12)", () => {
  const withDebt = (debt: number): PrivateStatus => ({
    wealth: 0,
    debt,
    debtLimit: 25_000_000,
    health: 10,
    stress: 0,
  });
  it("Hutang tepat Rp25jt belum Bangkrut", () => {
    expect(isBankrupt(withDebt(25_000_000))).toBe(false);
  });
  it("Hutang lebih dari Rp25jt Bangkrut", () => {
    expect(isBankrupt(withDebt(25_000_001))).toBe(true);
  });
  it("Hutang 0 aman", () => {
    expect(isBankrupt(withDebt(0))).toBe(false);
  });
});
