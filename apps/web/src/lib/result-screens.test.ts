import type { PublicGameState, RoomState } from "@pejuang/shared";
import { describe, expect, it } from "vitest";
import {
  canRematch,
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
