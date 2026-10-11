import { describe, expect, it } from "vitest";
import { ScoreRowSchema, type PrivateStatus } from "@pejuang/shared";
import { rankPlayers, toScoreRows, type RankingEntry } from "./ranking";

function makeStatus(
  wealth: number,
  debt: number,
  health: number,
  stress: number,
): PrivateStatus {
  return { wealth, debt, debtLimit: 25_000_000, health, stress };
}

function makeEntry(
  playerId: string,
  status: PrivateStatus,
  eliminated = false,
  eliminatedAtStep: number | null = null,
): RankingEntry {
  return { playerId, status, eliminated, eliminatedAtStep };
}

describe("rankPlayers (GDD 1.2)", () => {
  it("mengurutkan berdasarkan skor dari tinggi ke rendah", () => {
    const ranked = rankPlayers([
      makeEntry("p2", makeStatus(15_000_000, 0, 6, 5)),
      makeEntry("p1", makeStatus(20_000_000, 0, 6, 5)),
      makeEntry("p3", makeStatus(10_000_000, 0, 6, 5)),
    ]);

    expect(ranked.map((player) => player.playerId)).toEqual([
      "p1",
      "p2",
      "p3",
    ]);
    expect(ranked.map((player) => player.rank)).toEqual([1, 2, 3]);
  });

  it("skor sama, Hutang lebih kecil menang", () => {
    const ranked = rankPlayers([
      makeEntry("p1", makeStatus(10_000_000, 2_000_000, 6, 5)), // netWorth 7.000.000
      makeEntry("p2", makeStatus(13_000_000, 4_000_000, 6, 5)), // netWorth 7.000.000
    ]);

    expect(ranked[0]?.playerId).toBe("p1");
    expect(ranked[0]?.score).toBe(7_000_000);
    expect(ranked[1]?.score).toBe(7_000_000);
    expect(ranked.map((player) => player.rank)).toEqual([1, 2]);
  });

  it("skor dan Hutang sama, Level Stress lebih rendah menang", () => {
    const ranked = rankPlayers([
      makeEntry("p1", makeStatus(10_000_000, 2_000_000, 6, 7)),
      makeEntry("p2", makeStatus(10_000_000, 2_000_000, 6, 4)),
    ]);

    expect(ranked[0]?.playerId).toBe("p2");
    expect(ranked.map((player) => player.rank)).toEqual([1, 2]);
  });

  it("kriteria identik dapat rank sama, peringkat berikutnya melompat (1, 1, 3)", () => {
    const ranked = rankPlayers([
      makeEntry("p1", makeStatus(20_000_000, 0, 6, 5)),
      makeEntry("p2", makeStatus(20_000_000, 0, 6, 5)),
      makeEntry("p3", makeStatus(10_000_000, 0, 6, 5)),
    ]);

    expect(ranked.map((player) => player.playerId)).toEqual([
      "p1",
      "p2",
      "p3",
    ]);
    expect(ranked.map((player) => player.rank)).toEqual([1, 1, 3]);
  });

  it("pemain tereliminasi dengan skor tinggi tetap di bawah pemain bertahan", () => {
    const ranked = rankPlayers([
      makeEntry("p1", makeStatus(20_000_000, 0, 6, 5), true, 10),
      makeEntry("p2", makeStatus(5_000_000, 0, 6, 5), false, null),
    ]);

    expect(ranked[0]?.playerId).toBe("p2");
    expect(ranked[0]?.eliminated).toBe(false);
    expect(ranked[1]?.playerId).toBe("p1");
    expect(ranked[1]?.eliminated).toBe(true);
    expect(ranked.map((player) => player.rank)).toEqual([1, 2]);
  });

  it("dua pemain tereliminasi: yang bertahan lebih lama (langkah 18) di atas langkah 10", () => {
    const ranked = rankPlayers([
      makeEntry("p1", makeStatus(20_000_000, 0, 6, 5), true, 10), // skor tinggi, keluar awal
      makeEntry("p2", makeStatus(5_000_000, 0, 6, 5), true, 18), // skor rendah, bertahan lama
    ]);

    expect(ranked[0]?.playerId).toBe("p2");
    expect(ranked[0]?.eliminatedAtStep).toBe(18);
    expect(ranked[1]?.playerId).toBe("p1");
    expect(ranked.map((player) => player.rank)).toEqual([1, 2]);
  });
});

describe("toScoreRows", () => {
  it("menghasilkan baris yang lolos ScoreRowSchema dari @pejuang/shared", () => {
    const rows = toScoreRows([
      makeEntry("p1", makeStatus(27_000_000, 0, 9, 2)),
      makeEntry("p2", makeStatus(8_000_000, 10_000_000, 2, 9), true, 12),
    ]);

    expect(rows).toEqual([
      { playerId: "p1", provisionalScore: 32_400_000, rank: 1, eliminated: false },
      { playerId: "p2", provisionalScore: -10_500_000, rank: 2, eliminated: true },
    ]);

    for (const row of rows) {
      expect(ScoreRowSchema.safeParse(row).success).toBe(true);
    }
  });
});
