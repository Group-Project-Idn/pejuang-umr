import { describe, expect, it } from "vitest";
import type { PrivateStatus } from "@pejuang/shared";
import { SequenceRandomSource } from "../random";
import { DOOM_AMOUNTS } from "./constants";
import { applyDoomSpending } from "./doom";

function makeStatus(wealth: number, debt: number, stress: number): PrivateStatus {
  return { wealth, debt, debtLimit: 25_000_000, health: 10, stress };
}

describe("applyDoomSpending (GDD 2.5)", () => {
  it("Stress 9: Kekayaan berkurang salah satu nominal, Stress turun 1", () => {
    const result = applyDoomSpending(makeStatus(5_000_000, 0, 9), new SequenceRandomSource([0]));
    expect(result.triggered).toBe(true);
    expect(DOOM_AMOUNTS).toContain(result.amount);
    expect(result.amount).toBe(750_000);
    expect(result.status).toEqual(makeStatus(4_250_000, 0, 8));
  });

  it("nilai acak tertinggi memilih nominal terbesar", () => {
    const result = applyDoomSpending(makeStatus(5_000_000, 0, 10), new SequenceRandomSource([0.99]));
    expect(result.amount).toBe(1_500_000);
    expect(result.status.stress).toBe(9);
  });

  it("Stress 8: tidak terpicu, status tidak berubah", () => {
    const status = makeStatus(5_000_000, 0, 8);
    const result = applyDoomSpending(status, new SequenceRandomSource([0]));
    expect(result.triggered).toBe(false);
    expect(result.status).toBe(status);
  });

  it("kekurangan Kekayaan menjadi Hutang", () => {
    const result = applyDoomSpending(makeStatus(250_000, 0, 9), new SequenceRandomSource([0]));
    expect(result.status.wealth).toBe(0);
    expect(result.status.debt).toBe(500_000);
    expect(result.shortfallWrittenOff).toBe(0);
  });
});
