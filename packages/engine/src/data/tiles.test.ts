import { describe, expect, it } from "vitest";
import { GOLD_TILES } from "./gold-tiles";
import { TILES } from "./tiles";

describe("katalog data petak", () => {
  it("memuat 12 petak biasa dengan 3 petak per kategori", () => {
    expect(TILES).toHaveLength(12);
    for (const category of ["work", "social", "health", "finance"]) {
      expect(TILES.filter((tile) => tile.category === category)).toHaveLength(3);
    }
  });

  it("setiap petak punya tepat 6 Realita: 3 zonk, 2 safe, 1 lucky", () => {
    for (const tile of TILES) {
      expect(tile.realities).toHaveLength(6);
      expect(
        tile.realities.filter((reality) => reality.outcome === "zonk"),
      ).toHaveLength(3);
      expect(
        tile.realities.filter((reality) => reality.outcome === "safe"),
      ).toHaveLength(2);
      expect(
        tile.realities.filter((reality) => reality.outcome === "lucky"),
      ).toHaveLength(1);
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
