import type { Snapshot } from "@pejuang/shared";
import { describe, expect, it } from "vitest";
import {
  acceptSnapshot,
  applyGamePatch,
  applyRealtimeTurnTimer,
  applyTurnTimer,
  getTurnSecondsLeft,
} from "./game-view";

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

  it("menerapkan patch game yang lebih baru dan menolak patch stale", () => {
    const game = snapshot(3).game!;
    const patched = applyGamePatch(game, {
      version: 4,
      ops: [
        {
          type: "scores",
          scores: [
            {
              playerId: "p1",
              provisionalScore: 12,
              rank: 1,
              eliminated: false,
            },
          ],
        },
        {
          type: "rankOneBurden",
          playerIds: ["p1"],
        },
      ],
    });
    expect(patched?.version).toBe(4);
    expect(patched?.scores[0]?.provisionalScore).toBe(12);
    expect(patched?.rankOneBurden).toEqual(["p1"]);
    expect(applyGamePatch(patched, { version: 3, ops: [] })).toBe(patched);
  });

  it("menerapkan timer authoritative tanpa menurunkan version", () => {
    const game = snapshot(3).game!;
    const timer = applyTurnTimer(game, {
      version: 4,
      turnId: "turn-1",
      paused: true,
      deadline: null,
      remainingMs: 12_500,
    });
    expect(timer).toMatchObject({
      version: 4,
      turnPaused: true,
      turnDeadline: null,
    });
    expect(
      applyTurnTimer(timer, {
        version: 2,
        turnId: "turn-old",
        paused: false,
        deadline: 1,
        remainingMs: 0,
      }),
    ).toBe(timer);
  });

  it("menolak remaining time dari event timer yang stale", () => {
    const current = {
      game: snapshot(4).game,
      timerRemainingMs: 20_000,
    };
    expect(
      applyRealtimeTurnTimer(current, {
        version: 3,
        turnId: "turn-old",
        paused: true,
        deadline: null,
        remainingMs: 5_000,
      }),
    ).toBe(current);
  });

  it("menghitung timer dari clock server dan membekukan remaining time saat pause", () => {
    expect(
      getTurnSecondsLeft({
        localNow: 1_000,
        serverClockOffsetMs: 4_000,
        deadline: 15_000,
        paused: false,
        remainingMs: null,
      }),
    ).toBe(10);
    expect(
      getTurnSecondsLeft({
        localNow: 99_000,
        serverClockOffsetMs: 4_000,
        deadline: null,
        paused: true,
        remainingMs: 12_500,
      }),
    ).toBe(13);
  });
});
