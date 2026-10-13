import type { GameFinishedPayload } from "@pejuang/shared";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import EliminationScreen from "./EliminationScreen";
import ResultScreen from "./ResultScreen";

const result: GameFinishedPayload = {
  version: 5,
  ranking: [
    { rank: 1, playerId: "p1", name: "Rina", avatarId: "michael", points: { finance: 70, health: 90.4, calm: 80 }, finalScore: 80.6, netWorth: 10_000_000, eliminated: false, eliminatedAtStep: null },
    { rank: 2, playerId: "p2", name: "Budi", avatarId: "raka", points: { finance: 0, health: 0, calm: 0 }, finalScore: 12.4, netWorth: -30_000_000, eliminated: true, eliminatedAtStep: 8 },
  ],
};
const noop = () => undefined;
const renderResult = (isHost: boolean) => renderToStaticMarkup(createElement(ResultScreen, {
  result, reflection: null, isHost, busy: false, message: "", onRematch: noop, onLeave: noop,
}));

describe("ResultScreen", () => {
  it("menampilkan skor bulat, Harta Bersih, tanda tereliminasi, dan refleksi memuat", () => {
    const html = renderResult(true);
    expect(html).toContain(">81<");
    expect(html).toContain(">12<");
    expect(html).not.toContain("80.6");
    expect(html).toContain("-Rp30.000.000");
    expect(html).toContain("Tereliminasi");
    expect(html).toContain("Menyusun refleksimu...");
  });
  it("host melihat Main Lagi", () => {
    const html = renderResult(true);
    expect(html).toContain("Main Lagi");
    expect(html).not.toContain("Menunggu host memulai Main Lagi");
  });
  it("bukan host melihat teks menunggu tanpa tombol Main Lagi", () => {
    const html = renderResult(false);
    expect(html).toContain("Menunggu host memulai Main Lagi");
    expect(html).not.toContain(">Main Lagi<");
    expect(html).toContain("Kembali ke Lobby");
  });
});

describe("EliminationScreen", () => {
  it("menampilkan judul, alasan, ringkasan pribadi, dan tombol keluar", () => {
    const html = renderToStaticMarkup(createElement(EliminationScreen, {
      status: { wealth: 1_000_000, debt: 26_000_000, debtLimit: 25_000_000, health: 4, stress: 6 },
      reason: "bankrupt", reflection: null, busy: false, message: "", onLeave: noop,
    }));
    expect(html).toContain("Hari ini kamu perlu istirahat.");
    expect(html).toContain("Bangkrut");
    expect(html).toContain("Rp26.000.000");
    expect(html).toContain("Level Stress");
    expect(html).toContain("Kembali ke Lobby");
    expect(html).toContain("Menyusun refleksimu...");
  });
});
