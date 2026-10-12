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
  frozenScore?: number,
): RankingEntry {
  return { playerId, status, eliminated, eliminatedAtStep, frozenScore };
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
    expect(ranked[0]?.score).toBeCloseTo(58, 9);
    expect(ranked[1]?.score).toBeCloseTo(58, 9);
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

describe("peringkat pemain tereliminasi (GDD 1.2 v1.12)", () => {
  const status = makeStatus(5_000_000, 0, 6, 5);

  it("langkah sama: diurutkan menurut skor beku, bukan status sekarang", () => {
    const ranked = rankPlayers([
      makeEntry("p1", status, true, 10, 40),
      makeEntry("p2", status, true, 10, 70),
      makeEntry("p3", status, true, 10, 55),
    ]);
    expect(ranked.map((p) => p.playerId)).toEqual(["p2", "p3", "p1"]);
    expect(ranked.map((p) => p.rank)).toEqual([1, 2, 3]);
    expect(ranked.map((p) => p.score)).toEqual([70, 55, 40]);
  });

  it("langkah berbeda mengalahkan skor beku; langkah sama memakai skor beku", () => {
    const ranked = rankPlayers([
      makeEntry("p1", status, true, 8, 90),
      makeEntry("p2", status, true, 12, 10),
      makeEntry("p3", status, true, 12, 30),
      makeEntry("alive", status, false, null),
    ]);
    expect(ranked.map((p) => p.playerId)).toEqual(["alive", "p3", "p2", "p1"]);
  });

  it("skor beku sama: tie-breaker Hutang lebih kecil, lalu Level Stress lebih rendah", () => {
    const ranked = rankPlayers([
      makeEntry("p1", makeStatus(0, 3_000_000, 6, 5), true, 10, 50),
      makeEntry("p2", makeStatus(0, 1_000_000, 6, 8), true, 10, 50),
      makeEntry("p3", makeStatus(0, 1_000_000, 6, 4), true, 10, 50),
    ]);
    expect(ranked.map((p) => p.playerId)).toEqual(["p3", "p2", "p1"]);
    expect(ranked.map((p) => p.rank)).toEqual([1, 2, 3]);
  });

  it("seri penuh di antara tereliminasi tetap berperingkat sama (1, 1, 3)", () => {
    const ranked = rankPlayers([
      makeEntry("p1", status, true, 10, 50),
      makeEntry("p2", status, true, 10, 50),
      makeEntry("p3", status, true, 10, 20),
    ]);
    expect(ranked.map((p) => p.rank)).toEqual([1, 1, 3]);
  });

  it("skor beku tidak berubah walau status berubah setelah eliminasi", () => {
    const frozen = calculateWelfareScoreOf(makeStatus(0, 0, 0, 10));
    const [row] = rankPlayers([
      makeEntry("p1", makeStatus(99_000_000, 0, 10, 0), true, 10, frozen),
    ]);
    expect(row?.score).toBe(frozen);
  });

  it("tanpa skor beku, tereliminasi memakai skor dari status", () => {
    const [row] = rankPlayers([makeEntry("p1", makeStatus(10_000_000, 0, 10, 0), true, 10)]);
    expect(row?.score).toBe(90);
  });
});

function calculateWelfareScoreOf(status: PrivateStatus): number {
  return rankPlayers([makeEntry("x", status)])[0]!.score;
}

describe("toScoreRows", () => {
  it("menghasilkan baris yang lolos ScoreRowSchema dari @pejuang/shared", () => {
    const rows = toScoreRows([
      makeEntry("p1", makeStatus(27_000_000, 0, 9, 2)),
      makeEntry("p2", makeStatus(8_000_000, 10_000_000, 2, 9), true, 12),
    ]);

    expect(rows.map((r) => [r.playerId, r.rank, r.eliminated])).toEqual([
      ["p1", 1, false],
      ["p2", 2, true],
    ]);
    expect(rows[0]?.provisionalScore).toBe(90);
    expect(rows[1]?.provisionalScore).toBe(22);

    for (const row of rows) {
      expect(ScoreRowSchema.safeParse(row).success).toBe(true);
    }
  });

  it("Papan Skor memakai skor beku untuk pemain tereliminasi", () => {
    const rows = toScoreRows([
      makeEntry("p1", makeStatus(27_000_000, 0, 9, 2)),
      makeEntry("p2", makeStatus(27_000_000, 0, 9, 2), true, 12, 33.5),
    ]);
    expect(rows.find((r) => r.playerId === "p2")?.provisionalScore).toBe(33.5);
  });
});
