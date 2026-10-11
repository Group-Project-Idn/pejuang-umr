import { describe, expect, it } from "vitest";
import {
  DEBT_LIMIT,
  RAW_COLORS,
  scoreToPercent,
  SEMANTIC_TOKENS,
} from "./tokens";

describe("token desain", () => {
  it("memakai satu warna untuk satu makna indikator", () => {
    expect(SEMANTIC_TOKENS.indicatorWealth).toBe(RAW_COLORS.yellow500);
    expect(SEMANTIC_TOKENS.indicatorHealth).toBe(RAW_COLORS.green500);
    expect(SEMANTIC_TOKENS.indicatorStress).toBe(RAW_COLORS.coral500);
  });

  it("mengonversi skor 0-10 menjadi persen bar", () => {
    expect(scoreToPercent(0)).toBe(0);
    expect(scoreToPercent(7)).toBe(70);
    expect(scoreToPercent(12)).toBe(100);
    expect(scoreToPercent(-2)).toBe(0);
  });

  it("memakai batas hutang sesuai GDD", () => {
    expect(DEBT_LIMIT).toBe(25_000_000);
  });
});
