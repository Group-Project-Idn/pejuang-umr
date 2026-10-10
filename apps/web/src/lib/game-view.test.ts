import type { Snapshot } from "@pejuang/shared";
import { describe, expect, it } from "vitest";
import { acceptSnapshot } from "./game-view";

function snapshot(version: number): Snapshot {
  return {
    serverTime: version,
    room: {
      code: "UMR-1234",
      status: "playing",
      hostId: "p1",
      turnSeconds: 30,
      players: [],
      maxPlayers: 4,
      canStart: false,
      startBlockReason: "NEED_MIN_PLAYERS",
    },
    game: {
      version,
      gameId: "game-1",
      boardRadius: 4,
      calendar: {
        step: 1,
        totalSteps: 24,
        round: 1,
        month: 1,
        dateLabel: "Januari · Pekan 1",
        season: "rainy",
        nextEvent: null,
      },
      turnOrder: [],
      activePlayerId: null,
      turnDeadline: null,
      turnPaused: false,
      pawns: [],
      openedHexes: [],
      deadHexes: [],
      gold: null,
      scores: [],
      rankOneBurden: [],
      eliminated: [],
      spectators: [],
    },
    me: {
      playerId: "p1",
      status: null,
      inviteCard: null,
      pendingTurn: null,
      pendingCalendar: null,
      pendingInvite: null,
      isSpectator: false,
    },
    result: null,
  };
}

describe("acceptSnapshot", () => {
  it("mengabaikan snapshot dengan version game yang lebih lama", () => {
    const current = snapshot(3);
    expect(acceptSnapshot(current, snapshot(2))).toBe(current);
    expect(acceptSnapshot(current, snapshot(4)).game?.version).toBe(4);
  });
});