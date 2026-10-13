import { describe, expect, it } from "vitest";
import { TileOptionSchema, type HexCoord } from "@pejuang/shared";
import { buildTileOption, type RealityContext } from "./tile-option";

const HEX: HexCoord = { q: 2, r: -1 };

function context(season: RealityContext["season"]): RealityContext {
  return { season, isRankOneBurden: false, health: 5 };
}

const FORBIDDEN_FIELDS = ["outcome", "realities", "realityPool", "zonkPct", "variantId"];

describe("buildTileOption - petak biasa (API_CONTRACT 3.2)", () => {
  it("Side Job Admin Olshop: plan apa adanya", () => {
    const option = buildTileOption(HEX, "side-job-jadi-admin-olshop", context("dry"));

    expect(option.hex).toEqual(HEX);
    expect(option.category).toBe("work");
    expect(option.title).toBe("Side Job Jadi Admin Olshop");
    expect(option.plan).toEqual([
      { stat: "wealth", delta: 600_000 },
      { stat: "health", delta: -1 },
      { stat: "stress", delta: 1 },
    ]);
    expect(option.isGold).toBe(false);
    expect(option.risk).toBe("medium");
    expect(option.riskTags).toEqual([]);
  });

  it("lolos TileOptionSchema", () => {
    const option = buildTileOption(HEX, "side-job-jadi-admin-olshop", context("dry"));
    expect(TileOptionSchema.safeParse(option).success).toBe(true);
  });

  it("JSON hasil tidak membocorkan isi heksa rahasia", () => {
    const option = buildTileOption(HEX, "side-job-jadi-admin-olshop", context("rainy"));
    const json = JSON.stringify(option);

    expect(json).not.toContain("Bos marah");
    for (const field of FORBIDDEN_FIELDS) {
      expect(option).not.toHaveProperty(field);
      expect(json).not.toContain(field);
    }
  });

  it("risk dan riskTags mengikuti musim dan beban pemain yang melihat", () => {
    const rainy = buildTileOption(HEX, "side-job-jadi-admin-olshop", context("rainy"));
    expect(rainy.risk).toBe("high");
    expect(rainy.riskTags).toEqual([
      { type: "season", season: "rainy", plusPct: 10 },
    ]);

    const burdened = buildTileOption(HEX, "side-job-jadi-admin-olshop", {
      season: "rainy",
      isRankOneBurden: true,
      health: 5,
    });
    expect(burdened.risk).toBe("high");
    expect(burdened.riskTags).toEqual([
      { type: "rankOne", plusPct: 15 },
      { type: "season", season: "rainy", plusPct: 10 },
    ]);
  });

  it("melempar error untuk petak yang tidak ada", () => {
    expect(() =>
      buildTileOption(HEX, "petak-hantu", context("dry")),
    ).toThrow(/tidak ada di katalog TILES/);
  });
});

describe("buildTileOption - Petak Emas (GDD 4.7)", () => {
  it("Lolos CPNS Jalur Murni: plan apa adanya, isGold true, risk null", () => {
    const option = buildTileOption(HEX, "lolos-cpns-jalur-murni", context("dry"));

    expect(option.category).toBe("gold");
    expect(option.title).toBe("Lolos CPNS Jalur Murni");
    expect(option.plan).toEqual([
      { stat: "wealth", delta: 5_000_000 },
      { stat: "stress", delta: -3 },
    ]);
    expect(option.risk).toBeNull();
    expect(option.riskTags).toEqual([]);
    expect(option.isGold).toBe(true);
    expect(TileOptionSchema.safeParse(option).success).toBe(true);
  });

  it("Giveaway Tiket VIP Konser juga tanpa Realita dan tanpa risiko", () => {
    const option = buildTileOption(HEX, "giveaway-tiket-vip-konser", context("rainy"));
    expect(option.plan).toEqual([
      { stat: "wealth", delta: 3_000_000 },
      { stat: "stress", delta: -3 },
    ]);
    expect(option.isGold).toBe(true);
    expect(option.risk).toBeNull();
    expect(JSON.stringify(option)).not.toContain("realities");
  });
});
