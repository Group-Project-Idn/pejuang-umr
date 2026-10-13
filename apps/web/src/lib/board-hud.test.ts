import { describe, expect, it } from "vitest";
import {
  buildScoreRows,
  getSeasonHint,
  isWebGLAvailable,
  NO_WEBGL_MESSAGE,
} from "./board-hud";

describe("papan skor", () => {
  const scores = [
    { playerId: "a", provisionalScore: 41.5, rank: 2, eliminated: false },
    { playerId: "b", provisionalScore: 62.4, rank: 1, eliminated: false },
    { playerId: "c", provisionalScore: 10.2, rank: 3, eliminated: true },
  ];

  it("membulatkan skor, mahkota hanya peringkat 1, urut peringkat", () => {
    const rows = buildScoreRows(scores, "a");
    expect(rows.map((r) => r.playerId)).toEqual(["b", "a", "c"]);
    expect(rows.map((r) => r.scoreText)).toEqual(["62 poin", "42 poin", "10 poin"]);
    expect(rows.map((r) => r.isFirst)).toEqual([true, false, false]);
    expect(rows[2]!.eliminated).toBe(true);
  });

  it("label Jalan hanya pada pemain yang sedang giliran", () => {
    const rows = buildScoreRows(scores, "a");
    expect(rows.filter((r) => r.isTurn).map((r) => r.playerId)).toEqual(["a"]);
    expect(buildScoreRows(scores, null).some((r) => r.isTurn)).toBe(false);
  });
});

describe("keterangan musim", () => {
  it("memakai hint server, cadangan bila belum ada", () => {
    expect(getSeasonHint("transition", "Pancaroba: petak Kesehatan lebih rawan"))
      .toBe("Pancaroba: petak Kesehatan lebih rawan");
    expect(getSeasonHint("transition", null)).toBe("Pancaroba: petak Kesehatan lebih rawan");
  });
});

describe("tanpa WebGL", () => {
  it("pesan sesuai GDD", () => {
    expect(NO_WEBGL_MESSAGE).toBe(
      "Perangkatmu belum mendukung papan 3D. Coba buka di komputer atau browser lain.",
    );
  });

  it("tidak tersedia bila konteks null atau canvas gagal dibuat", () => {
    expect(isWebGLAvailable(() => ({ getContext: () => null }))).toBe(false);
    expect(isWebGLAvailable(() => { throw new Error("no canvas"); })).toBe(false);
  });

  it("tersedia bila konteks webgl bisa dibuat", () => {
    expect(isWebGLAvailable(() => ({ getContext: () => ({}) as never }))).toBe(true);
  });
});
