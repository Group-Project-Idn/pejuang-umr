import { describe, expect, it } from "vitest";
import { REALITY_POOLS, SEASON_ZONKS, TILES } from "../data";
import { SequenceRandomSource } from "../random";
import { resolveReality, type RealityContext } from "./resolve-reality";

const LEMBUR = "side-job-jadi-admin-olshop";
const VITAMIN = "makan-salad-overpriced";

function noBurden(
  season: RealityContext["season"],
  health = 0,
): RealityContext {
  return { season, isRankOneBurden: false, health };
}

function realitiesOf(tileId: string, outcome: string) {
  const tile = TILES.find((candidate) => candidate.id === tileId);
  if (!tile) throw new Error(`petak ${tileId} tidak ada`);
  const pool = REALITY_POOLS.find((candidate) => candidate.id === tile.realityPool);
  if (!pool) throw new Error(`pool ${tile.realityPool} tidak ada`);
  return pool.variants.filter((variant) => variant.outcome === outcome);
}

describe("resolveReality (GDD 4.4)", () => {
  it("Lembur Proyek dipaksa zonk -> varian Zonk Lembur dengan efek apa adanya", () => {
    const result = resolveReality(
      LEMBUR,
      noBurden("dry"),
      new SequenceRandomSource([0.299, 0.1]),
    );

    expect(result.outcome).toBe("zonk");
    expect(result.seasonal).toBe(false);
    expect(result.zonkPct).toBe(30);

    // "Bos marah": stress +3, health -2, dikali pengali Zonk 2 (GDD 4.4 v1.15).
    expect(result.text).toBe("Bos marah");
    expect(result.effects).toEqual([
      { stat: "stress", delta: 6 },
      { stat: "health", delta: -4 },
    ]);
    expect(result.variantId).toBe("overtime-project-zonk-1");
  });

  it("selalu mengambil varian dari jenis hasil yang benar", () => {
    for (const chance of [0.1, 0.4, 0.7]) {
      const result = resolveReality(
        LEMBUR,
        noBurden("dry"),
        new SequenceRandomSource([0.299, chance]),
      );
      expect(result.outcome).toBe("zonk");
      expect(
        realitiesOf(LEMBUR, "zonk").some((v) => v.text === result.text),
      ).toBe(true);
    }
  });

  it("hasil safe dan lucky juga bisa keluar", () => {
    const safe = resolveReality(
      LEMBUR,
      noBurden("dry"),
      new SequenceRandomSource([0.5, 0.1]),
    );
    expect(safe.outcome).toBe("safe");
    expect(safe.effects).toEqual([]);

    const lucky = resolveReality(
      LEMBUR,
      noBurden("dry"),
      new SequenceRandomSource([0.35, 0.1]),
    );
    expect(lucky.outcome).toBe("lucky");
    expect(lucky.effects).toEqual([{ stat: "wealth", delta: 1_000_000 }]);
    expect(lucky.variantId).toBe("overtime-project-lucky-1");
  });

  it("Beban Peringkat 1 menaikkan zonkPct yang dipakai lemparan", () => {
    const result = resolveReality(
      LEMBUR,
      { season: "dry", isRankOneBurden: true, health: 0 },
      new SequenceRandomSource([0.4, 0.1]),
    );
    // 30 + 15 = 45, jadi r = 40 masih zonk.
    expect(result.zonkPct).toBe(45);
    expect(result.outcome).toBe("zonk");
  });
describe("resolveReality - Zonk Musim (GDD 3.4, 4.5)", () => {
  it("hujan + petak work + zonk + acak memilih musim -> seasonal true", () => {
    const result = resolveReality(
      LEMBUR,
      noBurden("rainy"),
      new SequenceRandomSource([0.299, 0.1, 0.1]),
    );

    expect(result.outcome).toBe("zonk");
    expect(result.seasonal).toBe(true);
    expect(result.zonkPct).toBe(40);

    const rainyTitles = SEASON_ZONKS.filter((zonk) => zonk.season === "rainy").map(
      (zonk) => zonk.title,
    );
    expect(rainyTitles).toContain(result.text);

    // "Motor Mogok Terendam Banjir": wealth -500rb, stress +1, dikali pengali Zonk 2 (GDD 4.4 v1.15).
    expect(result.text).toBe("Motor Mogok Terendam Banjir");
    expect(result.effects).toEqual([
      { stat: "wealth", delta: -1_000_000 },
      { stat: "stress", delta: 2 },
    ]);
    expect(result.variantId).toBe("rainy-flooded-motorbike");
  });

  it("acak menolak musim -> pakai varian Zonk bawaan petak", () => {
    const result = resolveReality(
      LEMBUR,
      noBurden("rainy"),
      new SequenceRandomSource([0.299, 0.7, 0.3]),
    );

    expect(result.outcome).toBe("zonk");
    expect(result.seasonal).toBe(false);
    expect(result.variantId).toBe("overtime-project-zonk-3");
    expect(result.text).toBe("Lembur tidak dihitung penuh");
  });

  it("kategori tidak rawan di musim itu -> tidak pernah seasonal", () => {
    const result = resolveReality(
      LEMBUR,
      noBurden("dry"),
      new SequenceRandomSource([0.299, 0.1, 0.1]),
    );
    expect(result.seasonal).toBe(false);
  });

  it("hasil selain zonk -> tidak pernah seasonal", () => {
    const safe = resolveReality(
      LEMBUR,
      noBurden("rainy"),
      new SequenceRandomSource([0.5, 0.1]),
    );
    expect(safe.outcome).toBe("safe");
    expect(safe.seasonal).toBe(false);
  });
});

describe("resolveReality - Imunitas Sakit (GDD 3.4)", () => {
  it("Pancaroba + Kesehatan 8 + petak health -> seasonal selalu false", () => {
    for (const roll of [0.299, 0.05, 0.09, 0.5, 0.95]) {
      for (const chance of [0.1, 0.4, 0.7]) {
        const result = resolveReality(
          VITAMIN,
          { season: "transition", isRankOneBurden: false, health: 8 },
          new SequenceRandomSource([roll, chance, chance]),
        );
        expect(result.seasonal).toBe(false);
        expect(result.zonkPct).toBe(10);
        expect(
          realitiesOf(VITAMIN, result.outcome).some(
            (v) => v.text === result.text,
          ),
        ).toBe(true);
      }
    }
  });

  it("Pancaroba + Kesehatan 7 -> +10 musim tetap berlaku", () => {
    const result = resolveReality(
      VITAMIN,
      { season: "transition", isRankOneBurden: false, health: 7 },
      new SequenceRandomSource([0.19, 0.1, 0.1]),
    );
    expect(result.zonkPct).toBe(20);
    expect(result.outcome).toBe("zonk");
    expect(result.seasonal).toBe(true);
    expect(
      SEASON_ZONKS.filter((zonk) => zonk.season === "transition").map(
        (zonk) => zonk.title,
      ),
    ).toContain(result.text);
  });
});

describe("resolveReality - penjagaan petak tanpa Realita", () => {
  it("melempar error untuk Petak Emas", () => {
    for (const goldId of ["lolos-cpns-jalur-murni", "giveaway-tiket-vip-konser"]) {
      expect(() =>
        resolveReality(goldId, noBurden("dry"), new SequenceRandomSource([0.1])),
      ).toThrow(/tidak punya Realita/);
    }
  });

  it("melempar error untuk petak yang tidak ada", () => {
    expect(() =>
      resolveReality(
        "petak-hantu",
        noBurden("dry"),
        new SequenceRandomSource([0.1]),
      ),
    ).toThrow(/tidak ada di katalog TILES/);
  });
});

});
