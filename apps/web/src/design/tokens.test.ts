import { describe, expect, it } from "vitest";
import {
  DEBT_LIMIT,
  getGaugeTone,
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

  it("Level Stress: aman 0-7, bahaya 8-10", () => {
    expect(getGaugeTone("stres", 0)).toBe("aman");
    expect(getGaugeTone("stres", 7)).toBe("aman");
    expect(getGaugeTone("stres", 8)).toBe("bahaya");
    expect(getGaugeTone("stres", 10)).toBe("bahaya");
  });

  it("Kesehatan: bahaya 0-3, aman 4-10", () => {
    expect(getGaugeTone("kesehatan", 0)).toBe("bahaya");
    expect(getGaugeTone("kesehatan", 3)).toBe("bahaya");
    expect(getGaugeTone("kesehatan", 4)).toBe("aman");
    expect(getGaugeTone("kesehatan", 10)).toBe("aman");
  });

  it("meng-clamp nilai di luar rentang", () => {
    expect(getGaugeTone("stres", 15)).toBe("bahaya");
    expect(getGaugeTone("stres", -3)).toBe("aman");
    expect(getGaugeTone("kesehatan", -5)).toBe("bahaya");
    expect(getGaugeTone("kesehatan", 99)).toBe("aman");
  });
});
