import type { Snapshot } from "@pejuang/shared";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import FinalResultsView from "./FinalResultsView";

const result: NonNullable<Snapshot["result"]> = {
  version: 24,
  ranking: [
    {
      rank: 1,
      playerId: "p1",
      name: "Raka Pratama",
      avatarId: "raka",
      points: { finance: 80, health: 70, calm: 60 },
      finalScore: 70,
      netWorth: 21_500_000,
      eliminated: false,
      eliminatedAtStep: null,
    },
    {
      rank: 2,
      playerId: "p2",
      name: "Michael Ali",
      avatarId: "michael",
      points: { finance: 65, health: 75, calm: 55 },
      finalScore: 65,
      netWorth: 8_000_000,
      eliminated: false,
      eliminatedAtStep: null,
    },
    {
      rank: 3,
      playerId: "p3",
      name: "Sinta Maharani",
      avatarId: "sinta",
      points: { finance: 50, health: 60, calm: 70 },
      finalScore: 60,
      netWorth: 4_500_000,
      eliminated: false,
      eliminatedAtStep: null,
    },
    {
      rank: 4,
      playerId: "p4",
      name: "Dimas Saputra",
      avatarId: "icha",
      points: { finance: 20, health: 30, calm: 40 },
      finalScore: 30,
      netWorth: -1_000_000,
      eliminated: true,
      eliminatedAtStep: 17,
    },
  ],
};

const room: NonNullable<Snapshot["room"]> = {
  code: "UMR-1234",
  status: "finished",
  hostId: "p1",
  turnSeconds: 30,
  players: [],
  maxPlayers: 4,
  canStart: false,
  startBlockReason: null,
};

function render(playerId: string) {
  return renderToStaticMarkup(createElement(FinalResultsView, {
    result,
    reflection: null,
    room,
    playerId,
    dateLabel: "31 Desember",
    step: 24,
    pending: false,
    message: "",
    onRematch: vi.fn(),
    onLeave: vi.fn(),
    onMessage: vi.fn(),
  }));
}

describe("FinalResultsView", () => {
  it("menampilkan hasil, podium, skor terperinci, dan pemain tereliminasi", () => {
    const markup = render("p1");

    expect(markup).toContain("Hasil Akhir");
    expect(markup).toContain("Langkah 24/24");
    expect(markup).toContain("Raka Pratama");
    expect(markup).toContain("Keuangan");
    expect(markup).toContain("Kesehatan");
    expect(markup).toContain("Ketenangan");
    expect(markup).toContain("Dimas Saputra");
    expect(markup).toContain("Tereliminasi · Langkah 17");
    expect(markup).toContain("Bagikan hasil");
    expect(markup).not.toContain("Hutang 25.000.000");
  });

  it("menampilkan Main Lagi hanya bagi host", () => {
    expect(render("p1")).toContain("Main Lagi");
    expect(render("p2")).toContain("Menunggu host memulai Main Lagi");
    expect(render("p2")).not.toContain(">↻ Main Lagi</button>");
  });
});
