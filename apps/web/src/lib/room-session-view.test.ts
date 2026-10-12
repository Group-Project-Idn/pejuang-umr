import type { PrivateStatus, Snapshot } from "@pejuang/shared";
import { describe, expect, it } from "vitest";
import {
  applyPrivateStatus,
  applySessionGamePatch,
  applySessionPlayerConnection,
  applySessionPublicEvent,
  applySessionSnapshot,
  applySessionTurnTimer,
  createRoomSessionView,
  createSingleFlightGate,
} from "./room-session-view";

function snapshot(version: number): Snapshot {
  return {
    serverTime: 10_000,
    room: {
      code: "UMR-1234",
      status: "playing",
      hostId: "p1",
      turnSeconds: 30,
      players: [
        {
          playerId: "p1",
          name: "Rina",
          avatarId: "avatar-01",
          pawn: "cream-circle",
          connected: true,
          isHost: true,
          ready: true,
          joinedAt: 1,
        },
      ],
      maxPlayers: 4,
      canStart: false,
      startBlockReason: null,
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
      turnOrder: ["p1"],
      activePlayerId: null,
      turnDeadline: null,
      turnPaused: false,
      pawns: [{ playerId: "p1", hex: { q: 0, r: 0 } }],
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
      status: { wealth: 5_000_000, debt: 0, debtLimit: 25_000_000, health: 7, stress: 2 },
      inviteCard: null,
      pendingTurn: { turnId: "turn-1", options: [] },
      pendingCalendar: null,
      pendingInvite: null,
      isSpectator: false,
    },
    result: null,
  };
}

const newerStatus: PrivateStatus = {
  wealth: 7_000_000,
  debt: 0,
  debtLimit: 25_000_000,
  health: 8,
  stress: 1,
};

describe("room session recovery", () => {
  it("mengganti snapshot publik, privat, result, dan clock dalam satu state", () => {
    const incoming = snapshot(4);
    const state = applySessionSnapshot(createRoomSessionView(), incoming, 9_500);
    expect(state.room).toBe(incoming.room);
    expect(state.gameView.game).toBe(incoming.game);
    expect(state.me).toBe(incoming.me);
    expect(state.result).toBeNull();
    expect(state.serverClockOffsetMs).toBe(500);
  });

  it("resume memulihkan pending turn dan calendar dari snapshot", () => {
    const incoming = snapshot(4);
    incoming.me.pendingCalendar = {
      version: 4,
      eventId: "calendar-1",
      name: "Tanggal Tua",
      dateLabel: "Januari · Pekan 1",
      choices: [
        {
          id: "join",
          label: "Berhemat",
          effects: [{ stat: "stress", delta: 1 }],
        },
      ],
      deadline: 20_000,
    };
    const state = applySessionSnapshot(createRoomSessionView(), incoming, 10_000);
    expect(state.me?.pendingTurn?.turnId).toBe("turn-1");
    expect(state.me?.pendingCalendar?.eventId).toBe("calendar-1");
  });

  it("snapshot rematch membersihkan game, result, dan pending popup", () => {
    const playing = applySessionSnapshot(createRoomSessionView(), snapshot(9), 10_000);
    const waiting = snapshot(0);
    waiting.room.status = "waiting";
    waiting.game = null;
    waiting.me.status = null;
    waiting.me.pendingTurn = null;
    waiting.result = null;

    const state = applySessionSnapshot(
      { ...playing, result: { version: 9, ranking: [] } },
      waiting,
      10_000,
    );
    expect(state.gameView.game).toBeNull();
    expect(state.me?.pendingTurn).toBeNull();
    expect(state.result).toBeNull();
  });

  it("snapshot stale tidak menimpa state privat yang lebih baru", () => {
    const initial = applySessionSnapshot(createRoomSessionView(), snapshot(4), 10_000);
    const withStatus = applyPrivateStatus(initial, newerStatus);
    const stale = snapshot(3);
    stale.me.status!.wealth = 1;

    expect(applySessionSnapshot(withStatus, stale, 10_000, initial.privateRevision)).toBe(
      withStatus,
    );
  });

  it("mempertahankan status privat yang tiba selama resume", () => {
    const initial = applySessionSnapshot(createRoomSessionView(), snapshot(4), 10_000);
    const revisionAtRequest = initial.privateRevision;
    const withStatus = applyPrivateStatus(initial, newerStatus);
    const resumed = snapshot(5);
    resumed.me.pendingTurn = { turnId: "turn-resumed", options: [] };

    const state = applySessionSnapshot(withStatus, resumed, 10_000, revisionAtRequest);
    expect(state.gameView.game?.version).toBe(5);
    expect(state.me?.status).toEqual(newerStatus);
    expect(state.me?.pendingTurn?.turnId).toBe("turn-resumed");
  });

  it("event gap meminta resume tanpa menerapkan event yang melompat", () => {
    const initial = applySessionSnapshot(createRoomSessionView(), snapshot(4), 10_000);
    const transition = applySessionPublicEvent(initial, {
      type: "turn:start",
      payload: {
        version: 6,
        turnId: "turn-2",
        playerId: "p1",
        deadline: 20_000,
        turnSeconds: 30,
      },
    });
    expect(transition.needsResume).toBe(true);
    expect(transition.state).toBe(initial);
  });

  it("event stale diabaikan tanpa resume", () => {
    const initial = applySessionSnapshot(createRoomSessionView(), snapshot(4), 10_000);
    const transition = applySessionPublicEvent(initial, {
      type: "turn:start",
      payload: {
        version: 4,
        turnId: "turn-old",
        playerId: "p1",
        deadline: 20_000,
        turnSeconds: 30,
      },
    });
    expect(transition).toEqual({ state: initial, needsResume: false });
  });

  it("player connection memajukan versi publik yang sama", () => {
    const initial = applySessionSnapshot(createRoomSessionView(), snapshot(4), 10_000);
    const transition = applySessionPlayerConnection(initial, {
      version: 5,
      playerId: "p1",
      connected: false,
      at: 11_000,
    });
    expect(transition.needsResume).toBe(false);
    expect(transition.state.room?.players[0]?.connected).toBe(false);
    expect(transition.state.gameView.game?.version).toBe(5);
  });

  it("menjaga satu urutan versi lintas patch, timer, dan event publik", () => {
    const initial = applySessionSnapshot(createRoomSessionView(), snapshot(4), 10_000);
    const patched = applySessionGamePatch(initial, {
      version: 5,
      ops: [{ type: "rankOneBurden", playerIds: ["p1"] }],
    });
    const timed = applySessionTurnTimer(patched.state, {
      version: 6,
      turnId: "turn-1",
      paused: true,
      deadline: null,
      remainingMs: 12_000,
    });
    const started = applySessionPublicEvent(timed.state, {
      type: "turn:start",
      payload: {
        version: 7,
        turnId: "turn-2",
        playerId: "p1",
        deadline: 30_000,
        turnSeconds: 30,
      },
    });
    expect(started.needsResume).toBe(false);
    expect(started.state.gameView.game?.version).toBe(7);
    expect(started.state.gameView.timerRemainingMs).toBeNull();
  });

  it("gate hanya mengizinkan satu resume in-flight", () => {
    const gate = createSingleFlightGate();
    expect(gate.tryStart()).toBe(true);
    expect(gate.tryStart()).toBe(false);
    expect(gate.isActive()).toBe(true);
    expect(gate.finish()).toBe(true);
    expect(gate.tryStart()).toBe(true);
    expect(gate.finish()).toBe(false);
  });
});