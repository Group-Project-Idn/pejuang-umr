import type { PublicGameState, RoomState } from "@pejuang/shared";
import { describe, expect, it } from "vitest";
import {
  buildResultRows,
  buildResultHeader,
  buildShareText,
  canRematch,
  getEliminatedLabel,
  getPodiumOrder,
  shareResultText,
  formatScore,
  getEliminationReason,
  getRematchMessage,
  selectRoomScreen,
} from "./result-screens";

const room = (status: RoomState["status"], hostId = "p1"): RoomState => ({
  code: "UMR-1234", status, hostId, turnSeconds: 30, players: [], maxPlayers: 4,
  canStart: false, startBlockReason: null,
});
const game = (eliminated: string[]) => ({ eliminated }) as unknown as PublicGameState;
const result = { version: 9, ranking: [] };

describe("selectRoomScreen", () => {
  it("playing → game", () => {
    expect(selectRoomScreen({ room: room("playing"), game: game([]), result: null, playerId: "p1" })).toBe("game");
  });
  it("playing dan pemain sendiri tereliminasi → elimination", () => {
    expect(selectRoomScreen({ room: room("playing"), game: game(["p1"]), result: null, playerId: "p1" })).toBe("elimination");
    expect(selectRoomScreen({ room: room("playing"), game: game(["p2"]), result: null, playerId: "p1" })).toBe("game");
  });
  it("finished atau result terisi → result, meski tereliminasi", () => {
    expect(selectRoomScreen({ room: room("finished"), game: game(["p1"]), result: null, playerId: "p1" })).toBe("result");
    expect(selectRoomScreen({ room: room("playing"), game: game([]), result, playerId: "p1" })).toBe("result");
  });
  it("kembali waiting setelah Main Lagi → waiting walau sisa state lama ada", () => {
    expect(selectRoomScreen({ room: room("waiting"), game: game(["p1"]), result, playerId: "p1" })).toBe("waiting");
    expect(selectRoomScreen({ room: null, game: null, result: null, playerId: "p1" })).toBe("waiting");
  });
});

describe("Main Lagi", () => {
  it("hanya hostId terbaru yang boleh", () => {
    expect(canRematch(room("finished", "p2"), "p2")).toBe(true);
    expect(canRematch(room("finished", "p2"), "p1")).toBe(false);
    expect(canRematch(null, "p1")).toBe(false);
  });
  it("memetakan error ke teks UI", () => {
    expect(getRematchMessage({ ok: false, error: "NOT_ENOUGH_PLAYERS" })).toBe("Tidak ada pemain yang bisa main lagi. Kembali ke Lobby.");
    expect(getRematchMessage({ ok: false, error: "NOT_HOST" })).toBe("Hanya host yang bisa melakukan ini.");
  });
});

describe("skor dan alasan eliminasi", () => {
  it("membulatkan skor ke bilangan bulat", () => {
    expect(formatScore(88.4)).toBe(88);
    expect(formatScore(55.5)).toBe(56);
  });
  it("membaca alasan dari eliminationReasons publik", () => {
    const game = {
      eliminationReasons: [{ playerId: "p1", reason: "bankrupt" }, { playerId: "p2", reason: "burnout" }],
    } as PublicGameState;
    expect(getEliminationReason(game, "p1")).toBe("bankrupt");
    expect(getEliminationReason(game, "p2")).toBe("burnout");
    expect(getEliminationReason(game, "p3")).toBeNull();
    expect(getEliminationReason(null, "p1")).toBeNull();
    expect(getEliminationReason(game, null)).toBeNull();
  });
});

const entry = (rank: number, playerId: string, finalScore: number, eliminated = false) => ({
  rank, playerId, name: playerId.toUpperCase(), avatarId: "michael" as const,
  points: { finance: 10.4, health: 50.5, calm: 99.6 }, finalScore, netWorth: 5_000_000 - rank,
  eliminated, eliminatedAtStep: eliminated ? 8 : null,
});
const status = { wealth: 9_000_000, debt: 2_000_000, debtLimit: 25_000_000 as const, health: 5, stress: 5 };

describe("buildResultRows", () => {
  const rows = buildResultRows({
    ranking: [entry(2, "p2", 40.5), entry(1, "p1", 80.4), entry(3, "p3", 3.2, true)],
    reasons: [{ playerId: "p3", reason: "burnout" }],
    selfId: "p2",
    status,
  });
  it("mengurutkan peringkat dan membulatkan skor", () => {
    expect(rows.map((r) => r.playerId)).toEqual(["p1", "p2", "p3"]);
    expect(rows.map((r) => r.score)).toEqual([80, 41, 3]);
    expect(rows[0].details.points).toEqual({ finance: 10, health: 51, calm: 100 });
  });
  it("Kekayaan dan Hutang hanya untuk diri sendiri", () => {
    expect(rows[1].details.own).toEqual({ wealth: 9_000_000, debt: 2_000_000 });
    expect(rows[0].details.own).toBeNull();
    expect(rows[2].details.own).toBeNull();
  });
  it("tanpa status pribadi, diri sendiri tidak punya rincian Kekayaan", () => {
    const none = buildResultRows({ ranking: [entry(1, "p1", 50)], reasons: [], selfId: "p1", status: null });
    expect(none[0].details.own).toBeNull();
  });
  it("label tereliminasi memakai alasan", () => {
    expect(rows[2].eliminatedLabel).toBe("Tereliminasi: Burnout Total");
    expect(rows[0].eliminatedLabel).toBeNull();
    expect(getEliminatedLabel("bankrupt")).toBe("Tereliminasi: Bangkrut");
    expect(getEliminatedLabel(null)).toBe("Tereliminasi");
  });
});

describe("podium dan bagikan", () => {
  it("urutan podium 2, 1, 3", () => {
    expect(getPodiumOrder([1, 2, 3])).toEqual([2, 1, 3]);
    expect(getPodiumOrder([1, 2])).toEqual([2, 1]);
    expect(getPodiumOrder([1])).toEqual([1]);
  });
  it("teks bagikan memuat skor bulat tanpa Rupiah", () => {
    const text = buildShareText(buildResultRows({
      ranking: [entry(1, "p1", 80.4)], reasons: [], selfId: null, status: null,
    }));
    expect(text).toContain("1. P1: 80/100");
    expect(text).not.toContain("Rp");
  });
  it("memakai navigator.share, lalu clipboard sebagai cadangan", async () => {
    const share = async () => undefined;
    expect(await shareResultText("x", { share })).toBe("shared");
    const writeText = async () => undefined;
    expect(await shareResultText("x", { clipboard: { writeText } })).toBe("copied");
    const failShare = async () => { throw new Error("x"); };
    expect(await shareResultText("x", { share: failShare, clipboard: { writeText } })).toBe("copied");
    expect(await shareResultText("x", {})).toBe("failed");
  });
});

describe("buildResultHeader", () => {
  it("selesai normal memakai tanggal kalender dan langkah terakhir", () => {
    expect(buildResultHeader({ step: 24, totalSteps: 24, dateLabel: "31 Desember" })).toEqual({
      chip: "31 Desember | Langkah 24/24", stamp: "Selesai", early: false,
    });
  });
  it("selesai lebih awal memakai langkah nyata", () => {
    expect(buildResultHeader({ step: 9, totalSteps: 24, dateLabel: "15 Mei" })).toEqual({
      chip: "Selesai lebih awal | Langkah 9/24", stamp: "Berakhir", early: true,
    });
  });
  it("tanpa kalender: tanpa chip", () => {
    expect(buildResultHeader(null).chip).toBe("");
  });
});
