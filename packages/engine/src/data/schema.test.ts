import { describe, expect, it } from "vitest";
import {
  CalendarEventDefinitionSchema,
  GoldTileDefinitionSchema,
  InvitePlanDefinitionSchema,
  RealityVariantSchema,
  SEASON_BY_MONTH,
  SeasonZonkDefinitionSchema,
  TileDefinitionSchema,
  VULNERABLE_CATEGORIES,
} from "./schema";

describe("skema data konten", () => {
  it("SEASON_BY_MONTH dan VULNERABLE_CATEGORIES mengikuti GDD 3.4", () => {
    expect(SEASON_BY_MONTH[1]).toBe("rainy");
    expect(SEASON_BY_MONTH[2]).toBe("rainy");
    expect(SEASON_BY_MONTH[12]).toBe("rainy");
    expect(SEASON_BY_MONTH[6]).toBe("dry");
    expect(SEASON_BY_MONTH[8]).toBe("dry");
    expect(SEASON_BY_MONTH[3]).toBe("transition");
    expect(SEASON_BY_MONTH[11]).toBe("transition");
    expect(Object.keys(SEASON_BY_MONTH)).toHaveLength(12);

    expect(VULNERABLE_CATEGORIES.rainy).toEqual(["work"]);
    expect(VULNERABLE_CATEGORIES.dry).toEqual(["finance", "social"]);
    expect(VULNERABLE_CATEGORIES.transition).toEqual(["health"]);
  });

  it("TileDefinitionSchema menerima tile yang valid", () => {
    const tile = {
      id: "overtime-project",
      category: "work",
      title: "Lembur Proyek",
      plan: [{ stat: "wealth", delta: 1_500_000 }],
      baseZonkPct: 30,
      realities: Array.from({ length: 6 }, (_, index) => ({
        id: `overtime-reality-${index}`,
        outcome: index < 3 ? "zonk" : index < 5 ? "safe" : "lucky",
        text: "Realita datang tanpa permisi.",
        effects: [{ stat: "stress", delta: 1 }],
      })),
    };
    expect(TileDefinitionSchema.safeParse(tile).success).toBe(true);
    for (const outcome of ["zonk", "safe", "lucky"]) {
      expect(TileDefinitionSchema.safeParse({
        ...tile,
        realities: tile.realities.map((reality) => ({ ...reality, outcome })),
      }).success).toBe(false);
    }
  });

  it("TileDefinitionSchema menolak baseZonkPct di luar 0-80 dan realities ≠ 6", () => {
    const tile = {
      id: "overtime-project",
      category: "work",
      title: "Lembur Proyek",
      plan: [],
      baseZonkPct: 30,
      realities: Array.from({ length: 6 }, (_, index) => ({
        id: `r-${index}`,
        outcome: index < 3 ? "zonk" : index < 5 ? "safe" : "lucky",
        text: "Aman.",
        effects: [],
      })),
    };
    expect(
      TileDefinitionSchema.safeParse({ ...tile, baseZonkPct: 81 }).success,
    ).toBe(false);
    expect(
      TileDefinitionSchema.safeParse({ ...tile, baseZonkPct: -1 }).success,
    ).toBe(false);
    expect(
      TileDefinitionSchema.safeParse({
        ...tile,
        realities: tile.realities.slice(0, 5),
      }).success,
    ).toBe(false);
  });

  it("TileDefinitionSchema menolak id non-kebab-case dan kategori gold", () => {
    const tile = {
      id: "OvertimeProject",
      category: "work",
      title: "Lembur",
      plan: [],
      baseZonkPct: 10,
      realities: [],
    };
    expect(TileDefinitionSchema.safeParse(tile).success).toBe(false);
    expect(
      TileDefinitionSchema.safeParse({ ...tile, id: "overtime", category: "gold" })
        .success,
    ).toBe(false);
  });

  it("RealityVariantSchema membatasi maksimal 3 efek", () => {
    const reality = {
      id: "flood-mud",
      outcome: "zonk",
      text: "Motor kena lumpur banjir.",
      effects: [
        { stat: "wealth", delta: -250_000 },
        { stat: "stress", delta: 1 },
      ],
    };
    expect(RealityVariantSchema.safeParse(reality).success).toBe(true);
    expect(
      RealityVariantSchema.safeParse({
        ...reality,
        effects: [...reality.effects, { stat: "health", delta: -1 }, { stat: "stress", delta: 1 }],
      }).success,
    ).toBe(false);
  });

  it("GoldTileDefinitionSchema dan InvitePlanDefinitionSchema menerima data valid", () => {
    expect(
      GoldTileDefinitionSchema.safeParse({
        id: "full-scholarship",
        title: "Beasiswa Penuh",
        plan: [{ stat: "wealth", delta: 3_000_000 }],
      }).success,
    ).toBe(true);
    expect(
      InvitePlanDefinitionSchema.safeParse({
        id: "morningRun",
        title: "Lari Pagi",
        effects: [{ stat: "stress", delta: -1 }],
      }).success,
    ).toBe(true);
    expect(
      InvitePlanDefinitionSchema.safeParse({ id: "hangout2", title: "X", effects: [] })
        .success,
    ).toBe(false);
  });

  it("CalendarEventDefinitionSchema menerima choice opsional dan chance", () => {
    const event = {
      id: "harbolnas",
      name: "Harbolnas 11.11",
      dateLabel: "11 Nov",
      multiplayerStep: 21,
      choices: {
        join: {
          effects: [
            { stat: "wealth", delta: -1_500_000 },
            { stat: "stress", delta: -3 },
          ],
          chance: {
            pct: 30,
            effects: [{ stat: "stress", delta: 1 }],
            text: "Barang tidak sesuai.",
          },
        },
        skip: { effects: [] },
        joinPaylater: { effects: [{ stat: "debt", delta: 1_500_000 }] },
      },
    };
    expect(CalendarEventDefinitionSchema.safeParse(event).success).toBe(true);
    expect(
      CalendarEventDefinitionSchema.safeParse({
        ...event,
        choices: { ...event.choices, joinPaylater: undefined },
      }).success,
    ).toBe(true);
    expect(
      CalendarEventDefinitionSchema.safeParse({
        ...event,
        choices: { join: event.choices.join },
      }).success,
    ).toBe(false);
  });

  it("SeasonZonkDefinitionSchema menerima kartu zonk musim yang valid", () => {
    expect(
      SeasonZonkDefinitionSchema.safeParse({
        id: "rainy-engine-mud",
        season: "rainy",
        focus: "Cuci Kendaraan",
        title: "Motor Kena Lumpur Banjir",
        effects: [
          { stat: "wealth", delta: -250_000 },
          { stat: "stress", delta: 1 },
        ],
      }).success,
    ).toBe(true);
    expect(
      SeasonZonkDefinitionSchema.safeParse({
        id: "x",
        season: "summer",
        focus: "Fokus",
        title: "Judul",
        effects: [],
      }).success,
    ).toBe(false);
  });
});
