import { describe, expect, it } from "vitest";
import { GOLD_TILES } from "./gold-tiles";
import { REALITY_POOLS } from "./reality-pools";
import { TILES } from "./tiles";

const sumOf = (plan: readonly { stat: string; delta: number }[], stat: string) =>
  plan.filter((effect) => effect.stat === stat).reduce((total, e) => total + e.delta, 0);

describe("katalog data petak", () => {
  it("memuat 117 petak biasa: 29 Kerja, 37 Sosial, 29 Kesehatan, 22 Keuangan", () => {
    expect(TILES).toHaveLength(117);
    const expected = { work: 29, social: 37, health: 29, finance: 22 };
    for (const [category, count] of Object.entries(expected)) {
      expect(TILES.filter((tile) => tile.category === category)).toHaveLength(count);
    }
  });

  it("id petak unik, kebab-case, maksimal 3 efek, Zonk dasar 0-80", () => {
    const ids = TILES.map((tile) => tile.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const tile of TILES) {
      expect(tile.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(tile.plan.length).toBeLessThanOrEqual(3);
      expect(tile.baseZonkPct).toBeGreaterThanOrEqual(0);
      expect(tile.baseZonkPct).toBeLessThanOrEqual(80);
    }
  });

  it("setiap petak menunjuk pool yang ada: Keuangan + Hutang positif -> finance-debt, selain itu pool kategorinya", () => {
    const poolIds = REALITY_POOLS.map((pool) => pool.id);
    for (const tile of TILES) {
      expect(poolIds).toContain(tile.realityPool);
      const addsDebt = tile.category === "finance" && sumOf(tile.plan, "debt") > 0;
      expect(tile.realityPool).toBe(addsDebt ? "finance-debt" : tile.category);
    }
    // Bertanda Sosial walau menambah Hutang: tetap pool social.
    expect(TILES.find((tile) => tile.id === "nalangi-split-bill-pake-cc")).toMatchObject({
      category: "social",
      realityPool: "social",
    });
    expect(TILES.filter((tile) => tile.realityPool === "finance-debt")).toHaveLength(7);
  });

  it("aturan harga Level Stress setelah revisi kesulitan (GDD 5.1 v1.14)", () => {
    for (const tile of TILES) {
      const stress = sumOf(tile.plan, "stress");
      const wealth = sumOf(tile.plan, "wealth");
      const health = sumOf(tile.plan, "health");
      expect(stress, tile.id).toBeGreaterThanOrEqual(-2);
      if (stress <= -2) {
        expect(-wealth, tile.id).toBeGreaterThanOrEqual(400_000);
        // Pengecualian topik sensitif: Konsultasi Psikolog tidak dinaikkan Zonk-nya.
        if (tile.id !== "konsultasi-psikolog-halodoc") {
          expect(tile.baseZonkPct, tile.id).toBeGreaterThanOrEqual(20);
        }
      }
      if (wealth < 0 && -wealth <= 250_000) expect(stress, tile.id).toBeGreaterThanOrEqual(-1);
      for (const effect of tile.plan) expect(effect.delta, tile.id).not.toBe(0);
      if (health >= 2 && -wealth <= 150_000) expect(stress, tile.id).toBeGreaterThan(0);
      // Tidak ada kenaikan Kekayaan sekaligus turun Level Stress tanpa harga (Hutang);
      // pengecualian: Nemu Uang Kembalian Jaket yang sengaja kecil.
      if (wealth > 0 && stress < 0 && tile.id !== "nemu-uang-kembalian-jaket") {
        expect(sumOf(tile.plan, "debt"), tile.id).toBeGreaterThan(0);
      }
    }
  });

  it("Konsultasi Psikolog tidak dinaikkan Zonk-nya (topik sensitif)", () => {
    expect(TILES.find((tile) => tile.id === "konsultasi-psikolog-halodoc")).toMatchObject({
      baseZonkPct: 10,
      plan: [
        { stat: "wealth", delta: -500_000 },
        { stat: "stress", delta: -2 },
      ],
    });
  });

  it("statistik katalog cocok dengan revisi: 26 petak Level Stress -2 atau lebih rendah", () => {
    expect(TILES.filter((tile) => sumOf(tile.plan, "stress") <= -2)).toHaveLength(26);
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

  it("memuat 8 Petak Emas tanpa Realita; Level Stress -3 hanya di Petak Emas", () => {
    expect(GOLD_TILES).toHaveLength(8);
    expect(new Set(GOLD_TILES.map((tile) => tile.id)).size).toBe(8);
    for (const tile of GOLD_TILES) {
      expect(tile).not.toHaveProperty("realityPool");
      expect(tile).not.toHaveProperty("baseZonkPct");
      expect(tile.plan.length).toBeLessThanOrEqual(3);
    }
    expect(GOLD_TILES.some((tile) => sumOf(tile.plan, "stress") === -3)).toBe(true);
    expect(GOLD_TILES.find((tile) => tile.id === "bonus-kinerja-2x-gaji")?.plan).toEqual([
      { stat: "wealth", delta: 10_000_000 },
      { stat: "stress", delta: -3 },
    ]);
  });
});
