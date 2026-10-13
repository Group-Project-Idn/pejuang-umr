import { describe, expect, it } from "vitest";
import { GOLD_TILES } from "./gold-tiles";
import { REALITY_POOLS } from "./reality-pools";
import { TILES } from "./tiles";

describe("katalog data petak", () => {
  it("memuat 12 petak biasa: 3 Kerja, 4 Sosial, 3 Kesehatan, 2 Keuangan", () => {
    expect(TILES).toHaveLength(12);
    const expected = { work: 3, social: 4, health: 3, finance: 2 };
    for (const [category, count] of Object.entries(expected)) {
      expect(TILES.filter((tile) => tile.category === category)).toHaveLength(count);
    }
  });

  it("setiap petak menunjuk pool yang ada, dan pool sesuai kategori", () => {
    const poolIds = REALITY_POOLS.map((pool) => pool.id);
    for (const tile of TILES) {
      expect(poolIds).toContain(tile.realityPool);
      if (tile.id === "online-loan") {
        expect(tile.realityPool).toBe("finance-debt");
      } else {
        expect(tile.realityPool).toBe(tile.category);
      }
    }
  });

  it("memuat 5 pool Realita, masing-masing punya minimal 1 varian per jenis hasil", () => {
    expect(REALITY_POOLS.map((pool) => pool.id).sort()).toEqual([
      "finance",
      "finance-debt",
      "health",
      "social",
      "work",
    ]);
    for (const pool of REALITY_POOLS) {
      for (const outcome of ["zonk", "safe", "lucky"]) {
        expect(
          pool.variants.filter((variant) => variant.outcome === outcome).length,
        ).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it("memuat 2 Petak Emas tanpa Realita", () => {
    expect(GOLD_TILES).toHaveLength(2);
    expect(GOLD_TILES.map((tile) => tile.id).sort()).toEqual([
      "full-scholarship",
      "winning-giveaway",
    ]);
  });
});
