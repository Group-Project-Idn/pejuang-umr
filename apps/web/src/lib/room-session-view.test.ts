import type {
  CalendarEventPayload,
  PrivateStatus,
  Snapshot,
  TurnOptionsPayload,
} from "@pejuang/shared";
import { describe, expect, it } from "vitest";
import {
  applyPrivateStatus,
  applySessionCalendarEvent,
  applySessionGamePatch,
  applySessionPlayerConnection,
  applySessionPublicEvent,
  applySessionSnapshot,
  applySessionTurnOptions,
  applySessionTurnTimer,
  clearAcceptedPrivateAction,
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

  it("calendar event memajukan versi dan menyimpan pending sebelum event berikutnya", () => {
    const initial = applySessionSnapshot(createRoomSessionView(), snapshot(10), 10_000);
    const calendar: CalendarEventPayload = {
      version: 11,
      eventId: "calendar-1",
      name: "Tanggal Tua",
      dateLabel: "Januari · Pekan 1",
      choices: [{ id: "skip", label: "Lewati", effects: [] }],
      deadline: 20_000,
    };
    const withCalendar = applySessionCalendarEvent(initial, calendar);
    const next = applySessionPublicEvent(withCalendar.state, {
      type: "turn:start",
      payload: {
        version: 12,
        turnId: "turn-2",
        playerId: "p1",
        deadline: 30_000,
        turnSeconds: 30,
      },
    });

    expect(withCalendar.needsResume).toBe(false);
    expect(withCalendar.state.me?.pendingCalendar).toBe(calendar);
    expect(next.needsResume).toBe(false);
    expect(next.state.gameView.game?.version).toBe(12);
    expect(next.state.me?.pendingCalendar).toBeNull();
  });

  it("turn:start stale atau duplikat tidak menghapus pending calendar yang lebih baru", () => {
    const incoming = snapshot(12);
    incoming.me.pendingCalendar = {
      version: 12,
      eventId: "calendar-new",
      name: "Tanggal Tua",
      dateLabel: "Januari · Pekan 1",
      choices: [{ id: "skip", label: "Lewati", effects: [] }],
      deadline: 20_000,
    };
    const current = applySessionSnapshot(createRoomSessionView(), incoming, 10_000);
    const turnStart = {
      type: "turn:start" as const,
      payload: {
        version: 12,
        turnId: "turn-old",
        playerId: "p1",
        deadline: 30_000,
        turnSeconds: 30 as const,
      },
    };

    for (const version of [11, 12]) {
      expect(applySessionPublicEvent(current, {
        ...turnStart,
        payload: { ...turnStart.payload, version },
      })).toEqual({ state: current, needsResume: false });
    }
    expect(current.me?.pendingCalendar?.eventId).toBe("calendar-new");

    const next = applySessionPublicEvent(current, {
      ...turnStart,
      payload: { ...turnStart.payload, version: 13, turnId: "turn-new" },
    });
    expect(next.needsResume).toBe(false);
    expect(next.state.me?.pendingCalendar).toBeNull();
  });

  it("opsi turn privat disimpan untuk pemain aktif lalu dibersihkan saat tile dibuka", () => {
    const incoming = snapshot(10);
    incoming.game!.activePlayerId = "p1";
    incoming.me.pendingTurn = null;
    const initial = applySessionSnapshot(createRoomSessionView(), incoming, 10_000);
    const options: TurnOptionsPayload = {
      turnId: "turn-2",
      options: [
        {
          hex: { q: 1, r: 0 },
          category: "work",
          title: "Lembur",
          plan: [{ stat: "wealth", delta: 1_000_000 }],
          risk: "low",
          riskTags: [],
          isGold: false,
        },
      ],
    };

    const withOptions = applySessionTurnOptions(initial, options);
    expect(withOptions.me?.pendingTurn).toBe(options);
    expect(withOptions.privateRevision).toBe(initial.privateRevision + 1);

    const opened = applySessionPublicEvent(withOptions, {
      type: "tile:opened",
      payload: {
        version: 11,
        turnId: "turn-2",
        playerId: "p1",
        from: { q: 0, r: 0 },
        to: { q: 1, r: 0 },
        category: "work",
        title: "Lembur",
        plan: [{ stat: "wealth", delta: 1_000_000 }],
        isGold: false,
        viaJump: false,
        autoPicked: false,
      },
    });
    expect(opened.state.me?.pendingTurn).toBeNull();
  });

  it("opsi turn privat diabaikan bila penerima bukan pemain aktif", () => {
    const initial = applySessionSnapshot(createRoomSessionView(), snapshot(10), 10_000);
    const options: TurnOptionsPayload = { turnId: "turn-2", options: [] };
    expect(applySessionTurnOptions(initial, options)).toBe(initial);
  });

  it("ack sukses hanya membersihkan prompt privat dengan id yang cocok", () => {
    const initial = applySessionSnapshot(createRoomSessionView(), snapshot(10), 10_000);
    expect(clearAcceptedPrivateAction(initial, { kind: "turn", turnId: "lama" })).toBe(initial);

    const clearedTurn = clearAcceptedPrivateAction(initial, {
      kind: "turn",
      turnId: "turn-1",
    });
    expect(clearedTurn.me?.pendingTurn).toBeNull();

    const calendarSnapshot = snapshot(10);
    calendarSnapshot.me.pendingCalendar = {
      version: 10,
      eventId: "event-1",
      name: "Tahun Baru",
      dateLabel: "1 Jan",
      choices: [{ id: "skip", label: "Tidak ikut", effects: [] }],
      deadline: 20_000,
    };
    const withCalendar = applySessionSnapshot(
      createRoomSessionView(),
      calendarSnapshot,
      10_000,
    );
    const clearedCalendar = clearAcceptedPrivateAction(withCalendar, {
      kind: "calendar",
      eventId: "event-1",
    });
    expect(clearedCalendar.me?.pendingCalendar).toBeNull();
  });

  it("calendar event stale tidak mengulang efek dan gap tetap meminta resume", () => {
    const initial = applySessionSnapshot(createRoomSessionView(), snapshot(10), 10_000);
    const payload: CalendarEventPayload = {
      version: 10,
      eventId: "calendar-old",
      name: "Lama",
      dateLabel: "Januari · Pekan 1",
      choices: [{ id: "skip", label: "Lewati", effects: [] }],
      deadline: 20_000,
    };
    expect(applySessionCalendarEvent(initial, payload)).toEqual({
      state: initial,
      needsResume: false,
    });
    expect(applySessionCalendarEvent(initial, { ...payload, version: 12 })).toEqual({
      state: initial,
      needsResume: true,
    });
  });

  it("calendar event tidak membuat pending untuk pemain eliminated atau spectator", () => {
    const payload: CalendarEventPayload = {
      version: 11,
      eventId: "calendar-1",
      name: "Tanggal Tua",
      dateLabel: "Januari · Pekan 1",
      choices: [{ id: "skip", label: "Lewati", effects: [] }],
      deadline: 20_000,
    };
    const eliminatedSnapshot = snapshot(10);
    eliminatedSnapshot.game!.eliminated = ["p1"];
    const eliminated = applySessionCalendarEvent(
      applySessionSnapshot(createRoomSessionView(), eliminatedSnapshot, 10_000),
      payload,
    );
    expect(eliminated.state.gameView.game?.version).toBe(11);
    expect(eliminated.state.me?.pendingCalendar).toBeNull();

    const spectatorSnapshot = snapshot(10);
    spectatorSnapshot.me.isSpectator = true;
    const spectator = applySessionCalendarEvent(
      applySessionSnapshot(createRoomSessionView(), spectatorSnapshot, 10_000),
      payload,
    );
    expect(spectator.state.gameView.game?.version).toBe(11);
    expect(spectator.state.me?.pendingCalendar).toBeNull();
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