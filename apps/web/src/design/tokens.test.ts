import { describe, expect, it } from "vitest";
import {
  RADIUS,
  RAW_COLORS,
  SEMANTIC_COLORS,
  SPACING,
  TYPE_SCALE,
  resolveSemanticColor,
  scoreToPercent,
} from "./tokens";

const HEX_PATTERN = /^#[0-9a-f]{6}$/;

describe("token warna", () => {
  it("semua warna mentah berupa hex valid", () => {
    for (const value of Object.values(RAW_COLORS)) {
      expect(value).toMatch(HEX_PATTERN);
    }
  });

  it("setiap token makna menunjuk ke warna mentah yang ada", () => {
    for (const [name, raw] of Object.entries(SEMANTIC_COLORS)) {
      expect(RAW_COLORS[raw], name).toMatch(HEX_PATTERN);
      expect(resolveSemanticColor(name as keyof typeof SEMANTIC_COLORS)).toBe(
        RAW_COLORS[raw],
      );
    }
  });
});

describe("token bentuk dan jarak", () => {
  it("radius mengikuti skala guide", () => {
    expect(RADIUS).toEqual({ sm: 8, md: 16, lg: 24, full: 9999 });
  });

  it("spacing kelipatan grid 4px", () => {
    for (const value of Object.values(SPACING)) {
      expect(value % 4).toBe(0);
    }
  });

  it("skala tipografi memakai nilai tengah rentang guide", () => {
    expect(TYPE_SCALE.display.size).toBeGreaterThanOrEqual(40);
    expect(TYPE_SCALE.display.size).toBeLessThanOrEqual(56);
    expect(TYPE_SCALE.headline.size).toBeGreaterThanOrEqual(24);
    expect(TYPE_SCALE.headline.size).toBeLessThanOrEqual(32);
    expect(TYPE_SCALE.label.size).toBeGreaterThanOrEqual(12);
    expect(TYPE_SCALE.label.size).toBeLessThanOrEqual(13);
  });
});

describe("scoreToPercent", () => {
  it("mengubah skor 0-10 menjadi persen", () => {
    expect(scoreToPercent(0)).toBe(0);
    expect(scoreToPercent(7)).toBe(70);
    expect(scoreToPercent(10)).toBe(100);
  });

  it("menjepit nilai di luar rentang", () => {
    expect(scoreToPercent(-3)).toBe(0);
    expect(scoreToPercent(12)).toBe(100);
  });
});
