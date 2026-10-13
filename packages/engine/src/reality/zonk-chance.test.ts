import { describe, expect, it } from "vitest";
import { RiskTagSchema } from "@pejuang/shared";
import { TILES } from "../data";
import type { Season, TileCategory } from "../data";
import {
  calculateZonkChance,
  getRiskLevel,
  getRiskTags,
} from "./zonk-chance";

function tileByTitle(title: string) {
  const tile = TILES.find((candidate) => candidate.title === title);
  if (!tile) {
    throw new Error(`petak "${title}" tidak ada di TILES`);
  }
  return tile;
}

function chanceOf(
  title: string,
  season: Season,
  options: { isRankOneBurden?: boolean; health?: number } = {},
) {
  const tile = tileByTitle(title);
  return calculateZonkChance({
    baseZonkPct: tile.baseZonkPct,
    category: tile.category as TileCategory,
    season,
    ...options,
  });
}

describe("calculateZonkChance (GDD 4.5)", () => {
  it("Side Job Admin Olshop 30% di kemarau tanpa beban -> 30, medium", () => {
    const result = chanceOf("Side Job Jadi Admin Olshop", "dry");
    expect(result.pct).toBe(30);
    expect(getRiskLevel(result.pct)).toBe("medium");
    expect(getRiskTags(result)).toEqual([]);
  });

  it("Side Job Admin Olshop di musim hujan (kerja rawan) -> 40, high", () => {
    const result = chanceOf("Side Job Jadi Admin Olshop", "rainy");
    expect(result.pct).toBe(40);
    expect(result.seasonApplied).toBe(true);
    expect(result.immune).toBe(false);
    expect(getRiskLevel(result.pct)).toBe("high");
    expect(getRiskTags(result)).toEqual([
      { type: "season", season: "rainy", plusPct: 10 },
    ]);
  });

  it("Nongkrong Blok M 20% di kemarau + Beban Peringkat 1 -> 45, high, dua tag", () => {
    const result = chanceOf("Nongkrong Skena di Blok M", "dry", { isRankOneBurden: true });
    expect(result.pct).toBe(45);
    expect(result.rankOneApplied).toBe(true);
    expect(result.seasonApplied).toBe(true);
    expect(getRiskLevel(result.pct)).toBe("high");
    expect(getRiskTags(result)).toEqual([
      { type: "rankOne", plusPct: 15 },
      { type: "season", season: "dry", plusPct: 10 },
    ]);
  });

  it("Gestun 35% + beban + kemarau (keuangan rawan) -> 60", () => {
    const result = chanceOf("Gestun (Tarik Tunai CC)", "dry", {
      isRankOneBurden: true,
    });
    expect(result.pct).toBe(60);
    expect(getRiskLevel(result.pct)).toBe("high");
  });

  it("batas maksimal 80%: base 70 + 15 + 10 -> 80", () => {
    const result = calculateZonkChance({
      baseZonkPct: 70,
      category: "work",
      season: "rainy",
      isRankOneBurden: true,
    });
    expect(result.pct).toBe(80);
    expect(getRiskLevel(result.pct)).toBe("high");
  });

  it("batas bawah: base 5% tanpa beban dan tanpa musim rawan tetap 5", () => {
    const result = calculateZonkChance({
      baseZonkPct: 5,
      category: "health",
      season: "dry",
    });
    expect(result.pct).toBe(5);
    expect(getRiskLevel(result.pct)).toBe("low");
  });

  it("Mabar ML 10% -> low", () => {
    const result = chanceOf("Mabar ML di Warkop", "rainy");
    expect(result.pct).toBe(10);
    expect(getRiskLevel(result.pct)).toBe("low");
  });
});

describe("Imunitas Sakit (GDD 3.4, 4.5)", () => {
  it("Makan Salad 10% di Pancaroba, Kesehatan 7 -> 20 (kesehatan rawan)", () => {
    const result = chanceOf("Makan Salad Overpriced", "transition", { health: 7 });
    expect(result.pct).toBe(20);
    expect(result.immune).toBe(false);
    expect(getRiskTags(result)).toEqual([
      { type: "season", season: "transition", plusPct: 10 },
    ]);
  });

  it("Makan Salad di Pancaroba, Kesehatan 8 -> 10, immune true, tanpa tag season", () => {
    const result = chanceOf("Makan Salad Overpriced", "transition", { health: 8 });
    expect(result.pct).toBe(10);
    expect(result.immune).toBe(true);
    expect(result.seasonApplied).toBe(false);
    expect(getRiskTags(result)).toEqual([
      { type: "immune", reason: "health>=8" },
    ]);
  });

  it("Kesehatan >= 8 tetap kena Beban Peringkat 1 saat Pancaroba", () => {
    const result = chanceOf("Makan Salad Overpriced", "transition", {
      health: 9,
      isRankOneBurden: true,
    });
    expect(result.pct).toBe(25);
    expect(result.immune).toBe(true);
    expect(result.rankOneApplied).toBe(true);
    expect(getRiskTags(result)).toEqual([
      { type: "rankOne", plusPct: 15 },
      { type: "immune", reason: "health>=8" },
    ]);
  });

  it("kategori selain health tidak pernah immune, meski Pancaroba dan Kesehatan >= 8", () => {
    const result = chanceOf("Side Job Jadi Admin Olshop", "transition", { health: 10 });
    expect(result.immune).toBe(false);
    expect(getRiskTags(result).some((tag) => tag.type === "immune")).toBe(false);
  });

  it("imunitas hanya berlaku di Pancaroba, bukan di musim lain", () => {
    const result = chanceOf("Makan Salad Overpriced", "rainy", { health: 10 });
    expect(result.immune).toBe(false);
    expect(result.pct).toBe(10);
    expect(getRiskTags(result)).toEqual([]);
  });
});

describe("getRiskLevel (API_CONTRACT 3.2)", () => {
  it.each([
    [0, "low"],
    [15, "low"],
    [16, "medium"],
    [34, "medium"],
    [35, "high"],
    [80, "high"],
  ])("%i%% -> %s", (pct, expected) => {
    expect(getRiskLevel(pct)).toBe(expected);
  });
});

describe("getRiskTags (API_CONTRACT 3.2)", () => {
  it("tag selalu sesuai RiskTagSchema kontrak", () => {
    const tags = getRiskTags(
      calculateZonkChance({
        baseZonkPct: 20,
        category: "social",
        season: "dry",
        isRankOneBurden: true,
        health: 5,
      }),
    );
    for (const tag of tags) {
      expect(RiskTagSchema.safeParse(tag).success).toBe(true);
    }
    expect(tags).toHaveLength(2);
  });

  it("tidak ada tag saat tidak ada bonus", () => {
    const result = calculateZonkChance({
      baseZonkPct: 10,
      category: "work",
      season: "dry",
    });
    expect(getRiskTags(result)).toEqual([]);
  });
});
