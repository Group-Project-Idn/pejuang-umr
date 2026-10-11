import { describe, expect, it } from "vitest";
import { SequenceRandomSource } from "../random";
import { rollOutcome } from "./roll-outcome";

/** Mengubah angka acak r di [0,100) menjadi nilai untuk SequenceRandomSource. */
function roll(value: number) {
  return new SequenceRandomSource([value / 100]);
}

describe("rollOutcome (GDD 4.4 langkah 1 dan 4.5)", () => {
  it("zonkPct 30: r = 29.9 -> zonk", () => {
    expect(rollOutcome(30, roll(29.9))).toBe("zonk");
  });

  it("zonkPct 30: r = 30 -> lucky (batas atas Zonk, Hoki 10%)", () => {
    expect(rollOutcome(30, roll(30))).toBe("lucky");
  });

  it("zonkPct 30: r = 39.9 -> lucky", () => {
    expect(rollOutcome(30, roll(39.9))).toBe("lucky");
  });

  it("zonkPct 30: r = 40 -> safe", () => {
    expect(rollOutcome(30, roll(40))).toBe("safe");
  });

  it("zonkPct 80: r = 95 -> safe", () => {
    expect(rollOutcome(80, roll(95))).toBe("safe");
  });

  it("batas bawah: r = 0 selalu zonk walau zonkPct kecil", () => {
    expect(rollOutcome(1, roll(0))).toBe("zonk");
  });

  it("batas atas: r = 99.999 tetap safe walau zonkPct 80", () => {
    expect(rollOutcome(80, roll(99.999))).toBe("safe");
  });

  it("Hoki tetap 10% walau zonkPct naik: batas zonkPct + 10", () => {
    expect(rollOutcome(80, roll(89.999))).toBe("lucky");
    expect(rollOutcome(80, roll(90))).toBe("safe");
  });
});
