import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { CALENDAR_EVENTS } from "./calendar-events";
import { GOLD_TILES } from "./gold-tiles";
import {
  INVITE_MOTIVE_EFFECTS,
  INVITE_MOTIVE_WEIGHTS,
  INVITE_PLANS,
} from "./invite-plans";
import { SEASON_ZONKS } from "./season-zonks";
import { TILES } from "./tiles";
import { SEASON_BY_MONTH } from "./schema";

const FORBIDDEN_IMPORT = "@pejuang/engine";
const webSrcDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "..",
  "apps",
  "web",
  "src",
);

function listSourceFiles(dir: string): string[] {
  return readdirSync(dir)
    .map((entry) => join(dir, entry))
    .flatMap((entry) =>
      statSync(entry).isDirectory() ? listSourceFiles(entry) : [entry],
    );
}

describe("katalog data konten", () => {
  it("memuat 12 petak biasa: 3 Kerja, 4 Sosial, 3 Kesehatan, 2 Keuangan", () => {
    expect(TILES).toHaveLength(12);
    const expected = { work: 3, social: 4, health: 3, finance: 2 };
    for (const [category, count] of Object.entries(expected)) {
      expect(TILES.filter((tile) => tile.category === category)).toHaveLength(
        count,
      );
    }
  });

  it("memuat tepat 2 Petak Emas", () => {
    expect(GOLD_TILES).toHaveLength(2);
  });

  it("setiap petak punya 6 Realita: 3 zonk, 2 safe, 1 lucky (total 72)", () => {
    let totalRealities = 0;
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
      totalRealities += tile.realities.length;
    }
    expect(totalRealities).toBe(72);
  });

  it("semua id unik di seluruh konten", () => {
    const ids = [
      ...TILES.map((tile) => tile.id),
      ...TILES.flatMap((tile) => tile.realities.map((reality) => reality.id)),
      ...GOLD_TILES.map((tile) => tile.id),
      ...CALENDAR_EVENTS.map((event) => event.id),
      ...SEASON_ZONKS.map((zonk) => zonk.id),
      ...INVITE_PLANS.map((plan) => plan.id),
    ];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("setiap plan dan effects punya maksimal 3 efek", () => {
    const allEffectLists: Array<readonly { stat: string; delta: number }[]> = [
      ...TILES.map((tile) => tile.plan),
      ...TILES.flatMap((tile) =>
        tile.realities.map((reality) => reality.effects),
      ),
      ...GOLD_TILES.map((tile) => tile.plan),
      ...CALENDAR_EVENTS.flatMap((event) =>
        [event.choices.join, event.choices.skip, event.choices.joinPaylater]
          .filter((choice) => choice !== undefined)
          .flatMap((choice) => [
            choice.effects,
            ...(choice.chance ? [choice.chance.effects] : []),
          ]),
      ),
      ...SEASON_ZONKS.map((zonk) => zonk.effects),
      ...INVITE_PLANS.map((plan) => plan.effects),
    ];
    expect(allEffectLists.length).toBeGreaterThan(0);
    for (const effects of allEffectLists) {
      expect(effects.length).toBeLessThanOrEqual(3);
    }
  });

  it("baseZonkPct setiap petak di antara 0 dan 80", () => {
    for (const tile of TILES) {
      expect(tile.baseZonkPct).toBeGreaterThanOrEqual(0);
      expect(tile.baseZonkPct).toBeLessThanOrEqual(80);
    }
  });

  it("memuat 6 Event Tanggal pada langkah Multi 1, 6, 9, 12, 16, 21", () => {
    expect(CALENDAR_EVENTS).toHaveLength(6);
    expect(CALENDAR_EVENTS.map((event) => event.multiplayerStep)).toEqual([
      1, 6, 9, 12, 16, 21,
    ]);
  });

  it("THR Lebaran +2.500.000 diterima di kedua pilihan", () => {
    const lebaran = CALENDAR_EVENTS.find((event) => event.id === "lebaran-thr");
    expect(lebaran?.choices.join.effects).toContainEqual({
      stat: "wealth",
      delta: 2_500_000,
    });
    expect(lebaran?.choices.skip.effects).toContainEqual({
      stat: "wealth",
      delta: 2_500_000,
    });
  });

  it("17 Agustus punya chance 25% menang lomba pada pilihan join", () => {
    const agustus = CALENDAR_EVENTS.find(
      (event) => event.id === "independence-day",
    );
    expect(agustus?.choices.join.chance).toEqual({
      pct: 25,
      effects: [{ stat: "wealth", delta: 750_000 }],
      text: "Menang lomba",
    });
  });

  it("Harbolnas punya join dan joinPaylater dengan chance 30% barang tidak sesuai", () => {
    const harbolnas = CALENDAR_EVENTS.find((event) => event.id === "harbolnas");
    expect(harbolnas?.choices.join.effects).toContainEqual({
      stat: "wealth",
      delta: -1_500_000,
    });
    expect(harbolnas?.choices.joinPaylater?.effects).toContainEqual({
      stat: "debt",
      delta: 1_500_000,
    });
    for (const choice of [
      harbolnas?.choices.join,
      harbolnas?.choices.joinPaylater,
    ]) {
      expect(choice?.chance).toEqual({
        pct: 30,
        effects: [{ stat: "stress", delta: 1 }],
        text: "Barang tidak sesuai",
      });
    }
  });

  it("memuat 9 Zonk Musim, 3 per musim", () => {
    expect(SEASON_ZONKS).toHaveLength(9);
    for (const season of ["rainy", "dry", "transition"] as const) {
      expect(
        SEASON_ZONKS.filter((zonk) => zonk.season === season),
      ).toHaveLength(3);
    }
  });

  it("memuat 4 Rencana Ajakan dengan bobot motif 50/25/25", () => {
    expect(INVITE_PLANS).toHaveLength(4);
    expect(INVITE_MOTIVE_WEIGHTS).toEqual({
      sincere: 50,
      commission: 25,
      trap: 25,
    });
  });

  it("bobot motif berjumlah 100", () => {
    expect(
      Object.values(INVITE_MOTIVE_WEIGHTS).reduce(
        (sum, weight) => sum + weight,
        0,
      ),
    ).toBe(100);
  });

  it("SEASON_BY_MONTH: Des/Jan/Feb rainy, Jun-Agu dry, sisanya transition", () => {
    expect(SEASON_BY_MONTH[12]).toBe("rainy");
    expect(SEASON_BY_MONTH[1]).toBe("rainy");
    expect(SEASON_BY_MONTH[2]).toBe("rainy");
    for (const month of [6, 7, 8] as const) {
      expect(SEASON_BY_MONTH[month]).toBe("dry");
    }
    for (const month of [3, 4, 5, 9, 10, 11] as const) {
      expect(SEASON_BY_MONTH[month]).toBe("transition");
    }
    expect(Object.keys(SEASON_BY_MONTH)).toHaveLength(12);
  });

  it("efek motif Ajakan mengikuti tabel Motif dan hasilnya", () => {
    expect(INVITE_MOTIVE_EFFECTS.sincere.join.planAppliesToTarget).toBe(true);
    expect(INVITE_MOTIVE_EFFECTS.sincere.decline.declineWealthPenalty).toBe(
      -3_000_000,
    );
    expect(INVITE_MOTIVE_EFFECTS.commission.join.senderExtra).toContainEqual({
      stat: "wealth",
      delta: 3_000_000,
    });
    expect(INVITE_MOTIVE_EFFECTS.trap.join.planAppliesToTarget).toBe(false);
    expect(INVITE_MOTIVE_EFFECTS.trap.join.targetExtra).toContainEqual({
      stat: "wealth",
      delta: -2_000_000,
    });
  });

  it("pembukaan motif Ajakan sesuai GDD 4.8", () => {
    const joinReveal = {
      sincere: "target" as const,
      commission: "target" as const,
      trap: "target" as const,
    };
    for (const motive of Object.keys(INVITE_MOTIVE_EFFECTS) as Array<
      keyof typeof INVITE_MOTIVE_EFFECTS
    >) {
      expect(INVITE_MOTIVE_EFFECTS[motive].join.revealMotiveTo).toBe(
        joinReveal[motive],
      );
    }
    expect(INVITE_MOTIVE_EFFECTS.sincere.decline.revealMotiveTo).toBe(
      "everyone",
    );
    for (const motive of ["commission", "trap"] as const) {
      expect(INVITE_MOTIVE_EFFECTS[motive].decline.revealMotiveTo).toBe("none");
    }
  });

  it("mendaftarkan semua katalog di index data", async () => {
    const data = await import("./index");
    expect(data.CALENDAR_EVENTS).toHaveLength(6);
    expect(data.SEASON_ZONKS).toHaveLength(9);
    expect(data.INVITE_PLANS).toHaveLength(4);
    expect(data.TILES).toHaveLength(12);
    expect(data.GOLD_TILES).toHaveLength(2);
  });
});

describe("nilai konten 1x (GDD 1.3 v1.12)", () => {
  it("Lembur Proyek: Rencana wealth +2.500.000 apa adanya", () => {
    const lembur = TILES.find((tile) => tile.id === "overtime-project");
    expect(lembur?.plan).toEqual([{ stat: "wealth", delta: 2_500_000 }]);
  });

  it("'Bos marah': stress +3, health -2 apa adanya", () => {
    const bosMarah = TILES.flatMap((tile) => tile.realities).find(
      (reality) => reality.text === "Bos marah",
    );
    expect(bosMarah?.effects).toEqual([
      { stat: "stress", delta: 3 },
      { stat: "health", delta: -2 },
    ]);
  });

  it("tidak ada efek debt bernilai negatif di konten", () => {
    const effects = [
      ...TILES.flatMap((tile) => [
        ...tile.plan,
        ...tile.realities.flatMap((reality) => reality.effects),
      ]),
      ...GOLD_TILES.flatMap((tile) => tile.plan),
      ...SEASON_ZONKS.flatMap((zonk) => zonk.effects),
      ...CALENDAR_EVENTS.flatMap((event) =>
        Object.values(event.choices).flatMap((choice) => [
          ...choice.effects,
          ...(choice.chance?.effects ?? []),
        ]),
      ),
    ];
    expect(effects.filter((e) => e.stat === "debt" && e.delta < 0)).toEqual([]);
  });

  it("petak Jalan-jalan (day-trip) sesuai GDD 5.1 dan 5.2", () => {
    expect(TILES.find((tile) => tile.id === "paying-debt")).toBeUndefined();
    const trip = TILES.find((tile) => tile.id === "day-trip");
    expect(trip).toMatchObject({
      category: "social",
      title: "Jalan-jalan",
      baseZonkPct: 20,
      plan: [
        { stat: "wealth", delta: -1_000_000 },
        { stat: "health", delta: 1 },
        { stat: "stress", delta: -2 },
      ],
    });
    expect(trip?.realities.map((r) => [r.outcome, r.text, r.effects])).toEqual([
      ["zonk", "Macet parah di jalan", [{ stat: "stress", delta: 2 }]],
      [
        "zonk",
        "Harga tiket dan makan di tempat wisata mahal",
        [{ stat: "wealth", delta: -500_000 }],
      ],
      [
        "zonk",
        "Kehujanan di jalan pulang",
        [
          { stat: "health", delta: -1 },
          { stat: "stress", delta: 1 },
        ],
      ],
      ["safe", "Jalan-jalan sesuai rencana", []],
      ["safe", "Pulang capek tapi senang", []],
      ["lucky", "Dapat promo tiket", [{ stat: "wealth", delta: 250_000 }]],
    ]);
  });

  it("Zonk Musim memakai id dan fokus GDD 3.4 v1.12", () => {
    expect(SEASON_ZONKS.map((zonk) => zonk.id)).toEqual([
      "rainy-flooded-motorbike",
      "rainy-leaky-room",
      "rainy-ojol-surge",
      "dry-electricity-bill",
      "dry-pam-water-outage",
      "dry-dusty-motorbike",
      "transition-fever",
      "transition-flu-cough",
      "transition-feverish-day",
    ]);
    const focusOf = (season: string) => [
      ...new Set(
        SEASON_ZONKS.filter((z) => z.season === season).map((z) => z.focus),
      ),
    ];
    expect(focusOf("rainy")).toEqual(["Banjir dan Kehujanan"]);
    expect(focusOf("dry")).toEqual(["Panas dan Polusi"]);
    expect(focusOf("transition")).toEqual(["Sakit"]);
  });

  it("Kondangan Teman: join Kekayaan -250.000, Level Stress -1", () => {
    const wedding = CALENDAR_EVENTS.find((event) => event.id === "wedding");
    expect(wedding?.choices.join.effects).toEqual([
      { stat: "wealth", delta: -250_000 },
      { stat: "stress", delta: -1 },
    ]);
  });
});

describe("batas impor web", () => {
  it("tidak ada file di apps/web/src yang menyebut @pejuang/engine", () => {
    const offenders = listSourceFiles(webSrcDir).filter((file) =>
      readFileSync(file, "utf8").includes(FORBIDDEN_IMPORT),
    );
    expect(offenders.map((file) => relative(webSrcDir, file))).toEqual([]);
  });
});
