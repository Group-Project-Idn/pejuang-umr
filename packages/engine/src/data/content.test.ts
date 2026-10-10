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

describe("katalog data konten", () => {
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
    const harbolnas = CALENDAR_EVENTS.find(
      (event) => event.id === "harbolnas",
    );
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

  it("efek motif Ajakan mengikuti tabel Motif dan hasilnya", () => {
    expect(INVITE_MOTIVE_EFFECTS.sincere.join.planAppliesToTarget).toBe(true);
    expect(INVITE_MOTIVE_EFFECTS.sincere.decline.declineWealthPenalty).toBe(
      -3_000_000,
    );
    expect(
      INVITE_MOTIVE_EFFECTS.commission.join.senderExtra,
    ).toContainEqual({ stat: "wealth", delta: 3_000_000 });
    expect(INVITE_MOTIVE_EFFECTS.trap.join.planAppliesToTarget).toBe(false);
    expect(INVITE_MOTIVE_EFFECTS.trap.join.targetExtra).toContainEqual({
      stat: "wealth",
      delta: -2_000_000,
    });
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
