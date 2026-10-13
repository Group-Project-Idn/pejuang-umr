import type {
  CalendarEventPayload,
  MonthSummaryPayload,
  PrivateStatus,
  Snapshot,
  TurnOptionsPayload,
} from "@pejuang/shared";
import { describe, expect, it } from "vitest";
import {
  applyCalendarResult,
  applyDoomTriggered,
  applyPrivateStatus,
  applyReflectionReady,
  applyRoomState,
  applySessionCalendarEvent,
  applySessionGamePatch,
  applySessionMonthSummary,
  applySessionPlayerConnection,
  applySessionPublicEvent,
  applySessionSnapshot,
  applySessionTurnOptions,
  clearAcceptedPrivateAction,
  dismissNotice,
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
          avatarId: "michael",
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
      boardRadius: 6,
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
      revealEndsAt: null,
      inviteBusyPlayerIds: [],
      pawns: [{ playerId: "p1", hex: { q: 0, r: 0 } }],
      openedHexes: [],
      gold: null,
      scores: [],
      rankOneBurden: [],
      eliminated: [],
      phase: "turn",
    },
    me: {
      playerId: "p1",
      status: { wealth: 5_000_000, debt: 0, debtLimit: 25_000_000, health: 7, stress: 2 },
      inviteCard: null,
      pendingTurn: { turnId: "turn-1", options: [] },
      pendingCalendar: null,
      pendingInvite: null,
      pendingMonth: null,
      inviteResults: [],
      reflection: null,
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
  it.each([null, { max: 1_000_000, deadline: 25_000 }])(
    "menerima ringkasan bulan setelah pembalikan dan patch kalender tanpa reconnect (payDebt: %j)",
    (payDebt) => {
      const initial = applySessionSnapshot(createRoomSessionView(), snapshot(3), 10_000);
      const revealed = applySessionPublicEvent(initial, {
        type: "round:reveal",
        payload: { version: 4, round: 1, step: 1, order: [], revealEndsAt: 12_000 },
      });
      const calendarPatch = {
        version: 5,
        ops: [{ type: "calendar" as const, calendar: {
          ...initial.gameView.game!.calendar, month: 2, step: 3, round: 3,
        } }],
      };
      const updated = applySessionGamePatch(revealed.state, calendarPatch);
      expect(updated.needsResume).toBe(false);
      expect(updated.state.gameView.game?.phase).toBe("calendar");
      expect(updated.state.gameView.game?.activePlayerId).toBeNull();
      expect(updated.state.gameView.game?.turnDeadline).toBeNull();
      const summary: MonthSummaryPayload = {
        month: 2, salary: 5_730_000, livingCost: 4_600_000,
        interest: 30_000, interestAddedToDebt: 0,
        before: { ...newerStatus, debt: 1_000_000 },
        after: { ...newerStatus, debt: 1_000_000 }, payDebt,
      };
      const shown = applySessionMonthSummary(updated.state, summary);
      expect(shown.me?.pendingMonth).toEqual(summary);
      expect(applySessionMonthSummary(shown, { ...summary, month: 1 })).toBe(shown);
      const started = applySessionPublicEvent(shown, {
        type: "turn:start",
        payload: { version: 6, turnId: "next-turn", playerId: "p1", deadline: 40_000, turnSeconds: 30 },
      }).state;
      expect(started.me?.pendingMonth).toBeNull();
      expect(applySessionGamePatch(started, calendarPatch).state).toBe(started);
      expect(applySessionMonthSummary(started, summary)).toBe(started);
    },
  );

  it("menyimpan ringkasan bulan privat, mengabaikan bulan lama, dan membersihkan pembayaran setelah ack", () => {
    const initial = applySessionSnapshot(createRoomSessionView(), snapshot(3), 10_000);
    const ready = applySessionGamePatch({ ...initial, gameView: { ...initial.gameView, game: { ...initial.gameView.game!, phase: "calendar" } } }, {
      version: 4,
      ops: [{ type: "calendar", calendar: { ...initial.gameView.game!.calendar, month: 2, step: 3 } }],
    }).state;
    const summary: MonthSummaryPayload = {
      month: 2, salary: 5_730_000, livingCost: 4_600_000,
      interest: 30_000, interestAddedToDebt: 0,
      before: { ...newerStatus, debt: 1_000_000 },
      after: { ...newerStatus, debt: 1_000_000, wealth: 8_100_000 },
      payDebt: { max: 1_000_000, deadline: 25_000 },
    };
    expect(applySessionMonthSummary(initial, summary)).toBe(initial);
    const shown = applySessionMonthSummary(ready, summary);
    expect(shown.me?.pendingMonth).toEqual(summary);
    expect(shown.privateRevision).toBe(ready.privateRevision + 1);
    const cleared = clearAcceptedPrivateAction(shown, { kind: "month", month: 2 });
    expect(cleared.me?.pendingMonth).toBeNull();
    expect(clearAcceptedPrivateAction(shown, { kind: "month", month: 3 })).toBe(shown);
    const noDebt = applySessionMonthSummary(ready, { ...summary, payDebt: null });
    expect(noDebt.me?.pendingMonth?.payDebt).toBeNull();
    const resumed = applySessionSnapshot(createRoomSessionView(), {
      ...snapshot(4),
      game: ready.gameView.game,
      me: { ...snapshot(4).me, pendingMonth: summary },
    }, 10_000);
    expect(resumed.me?.pendingMonth).toEqual(summary);
    const turn = applySessionPublicEvent(shown, {
      type: "turn:start",
      payload: { version: 5, turnId: "t2", playerId: "p1", deadline: 26_000, turnSeconds: 30 },
    });
    expect(turn.state.me?.pendingMonth).toBeNull();
    expect(applySessionMonthSummary(turn.state, summary)).toBe(turn.state);
  });

  it("menerima round:reveal di antara tile:opened dan tile:resolved tanpa meminta resume", () => {
    const initial = applySessionSnapshot(createRoomSessionView(), snapshot(3), 10_000);
    const reveal = applySessionPublicEvent(initial, {
      type: "round:reveal",
      payload: { version: 4, round: 1, step: 1, order: [], revealEndsAt: 12_000 },
    });
    expect(reveal.needsResume).toBe(false);
    expect(reveal.state.gameView.game?.phase).toBe("reveal");
    const duplicate = applySessionPublicEvent(reveal.state, {
      type: "round:reveal",
      payload: { version: 4, round: 1, step: 1, order: [], revealEndsAt: 12_000 },
    });
    expect(duplicate.needsResume).toBe(false);
    expect(duplicate.state).toBe(reveal.state);
    const next = applySessionPublicEvent(reveal.state, {
      type: "tile:resolved",
      payload: { version: 5, round: 1, playerId: "p1", hex: { q: 1, r: 0 }, outcome: "safe", text: "Aman", effects: [], seasonal: false },
    });
    expect(next.needsResume).toBe(false);
    expect(next.state.gameView.game?.version).toBe(5);
  });
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

  it("snapshot membawa revealEndsAt dan inviteBusyPlayerIds; patch calendar mengosongkan inviteResults", () => {
    const base = snapshot(3);
    const result = {
      inviteId: "invite-1-p2",
      fromPlayerId: "p2",
      targetPlayerId: "p1",
      answer: "join" as const,
      autoDeclined: false,
      motive: "sincere" as const,
      effectsForYou: [],
    };
    const incoming = {
      ...base,
      game: { ...base.game!, phase: "reveal" as const, revealEndsAt: 15_000, inviteBusyPlayerIds: ["p1"] },
      me: { ...base.me, inviteResults: [result] },
    };
    const initial = applySessionSnapshot(createRoomSessionView(), incoming, 10_000);
    expect(initial.gameView.game).toMatchObject({ revealEndsAt: 15_000, inviteBusyPlayerIds: ["p1"] });
    expect(initial.me?.inviteResults).toEqual([result]);
    const busy = applySessionGamePatch(initial, {
      version: 4,
      ops: [{ type: "inviteBusy", playerIds: [] }, { type: "phase", phase: "calendar" }],
    });
    expect(busy.state.gameView.game).toMatchObject({ inviteBusyPlayerIds: [], phase: "calendar", revealEndsAt: null });
    expect(busy.state.me?.inviteResults).toEqual([result]);
    const nextRound = applySessionGamePatch(busy.state, {
      version: 5,
      ops: [{ type: "calendar", calendar: initial.gameView.game!.calendar }],
    });
    expect(nextRound.state.me?.inviteResults).toEqual([]);
  });

  it("menjaga satu urutan versi lintas patch, timer, dan event publik", () => {
    const initial = applySessionSnapshot(createRoomSessionView(), snapshot(4), 10_000);
    const patched = applySessionGamePatch(initial, {
      version: 5,
      ops: [{ type: "rankOneBurden", playerIds: ["p1"] }],
    });
    const started = applySessionPublicEvent(patched.state, {
      type: "turn:start",
      payload: {
        version: 6,
        turnId: "turn-2",
        playerId: "p1",
        deadline: 30_000,
        turnSeconds: 30,
      },
    });
    expect(started.needsResume).toBe(false);
    expect(started.state.gameView.game).toMatchObject({
      version: 6,
      turnDeadline: 30_000,
    });
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
describe("reflection:ready dan Main Lagi", () => {
  const reflection = { source: "rules" as const, summary: "s", insights: [] };

  it("menyimpan refleksi milik sendiri ke me.reflection", () => {
    const initial = applySessionSnapshot(createRoomSessionView(), snapshot(4), 10_000);
    const gameId = initial.gameView.game!.gameId;
    const next = applyReflectionReady(initial, { gameId, playerId: initial.me!.playerId, reflection });
    expect(next.me?.reflection).toEqual(reflection);
    expect(next.privateRevision).toBe(initial.privateRevision + 1);
  });

  it("mengabaikan refleksi pemain lain atau game lain", () => {
    const initial = applySessionSnapshot(createRoomSessionView(), snapshot(4), 10_000);
    const gameId = initial.gameView.game!.gameId;
    expect(applyReflectionReady(initial, { gameId, playerId: "lain", reflection })).toBe(initial);
    expect(applyReflectionReady(initial, { gameId: "game-lama", playerId: initial.me!.playerId, reflection })).toBe(initial);
    expect(applyReflectionReady(createRoomSessionView(), { gameId, playerId: "p1", reflection }).me).toBeNull();
  });

  it("room kembali waiting menghapus hasil dan refleksi lama", () => {
    const initial = applySessionSnapshot(createRoomSessionView(), snapshot(4), 10_000);
    const finished = {
      ...initial,
      result: { version: 5, ranking: [] },
      me: { ...initial.me!, reflection },
    };
    const next = applyRoomState(finished, { ...initial.room!, status: "waiting" });
    expect(next.result).toBeNull();
    expect(next.me?.reflection).toBeNull();
    expect(applyRoomState(finished, { ...initial.room!, status: "finished" }).result).not.toBeNull();
  });
});

describe("hint musim dan notifikasi Petak Emas", () => {
  const gold = {
    goldId: "g1",
    hex: { q: 1, r: 1 },
    title: "Bonus Proyek",
    plan: [],
    expiresAtStep: 4,
  };
  const start = () => applySessionSnapshot(createRoomSessionView(), snapshot(5), 0);

  it("menyimpan season:changed.hint di state sesi", () => {
    const { state } = applySessionPublicEvent(start(), {
      type: "season:changed",
      payload: {
        version: 6,
        season: "transition",
        vulnerableCategories: ["health"],
        zonkFocus: "sick",
        hint: "Pancaroba: petak Kesehatan lebih rawan",
      },
    });
    expect(state.seasonHint).toBe("Pancaroba: petak Kesehatan lebih rawan");
  });

  it("gold:spawned dan gold:expired menghasilkan pemberitahuan", () => {
    const spawned = applySessionPublicEvent(start(), {
      type: "gold:spawned",
      payload: { version: 6, gold },
    }).state;
    expect(spawned.goldNotice?.text).toBe("Petak Emas muncul! Hilang dalam 3 ronde");
    const expired = applySessionPublicEvent(spawned, {
      type: "gold:expired",
      payload: { version: 7, goldId: "g1", hex: gold.hex },
    }).state;
    expect(expired.goldNotice?.text).toBe("Petak Emas hangus");
    expect(expired.goldNotice!.id).toBeGreaterThan(spawned.goldNotice!.id);
  });
});

describe("pemberitahuan sementara", () => {
  const doom = { amount: 750_000, round: 3, stressAfter: 8 };
  const result = { eventId: "e1", choice: "skip" as const, autoChosen: true, effects: [] };

  it("menyimpan doom:triggered dan calendar:result dengan id unik", () => {
    const next = applyCalendarResult(applyDoomTriggered(createRoomSessionView(), doom), result);
    expect(next.notices).toEqual([
      { id: 1, kind: "doom", payload: doom },
      { id: 2, kind: "calendarResult", payload: result },
    ]);
  });

  it("menghapus pemberitahuan tanpa memakai ulang id", () => {
    const two = applyCalendarResult(applyDoomTriggered(createRoomSessionView(), doom), result);
    const one = dismissNotice(two, 1);
    expect(one.notices.map((notice) => notice.id)).toEqual([2]);
    expect(dismissNotice(one, 99)).toBe(one);
    const none = dismissNotice(one, 2);
    expect(applyDoomTriggered(none, doom).notices[0]!.id).toBe(3);
  });
});
