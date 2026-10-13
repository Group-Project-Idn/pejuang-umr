import type {
  CalendarEventPayload,
  DeadEndPayload,
  MonthSummaryPayload,
  PrivateStatus,
  PublicGameState,
  RoomState,
  Snapshot,
  TurnOptionsPayload,
} from "@pejuang/shared";
import {
  applyGamePatch,
  applyPlayerConnection,
  applyPublicGameEvent,
  type GamePatch,
  type PlayerConnection,
  type PublicGameEvent,
  type RealtimeGameView,
} from "./game-view";

export type RoomSessionView = {
  room: RoomState | null;
  gameView: RealtimeGameView;
  me: Snapshot["me"] | null;
  result: Snapshot["result"];
  serverClockOffsetMs: number;
  privateRevision: number;
};

export type SessionTransition = {
  state: RoomSessionView;
  needsResume: boolean;
};

export function createRoomSessionView(): RoomSessionView {
  return {
    room: null,
    gameView: { game: null },
    me: null,
    result: null,
    serverClockOffsetMs: 0,
    privateRevision: 0,
  };
}

function isOlderSnapshot(
  current: PublicGameState | null,
  incoming: PublicGameState | null,
): boolean {
  return Boolean(
    current &&
      incoming &&
      current.gameId === incoming.gameId &&
      current.version > incoming.version,
  );
}

/**
 * Snapshot mengganti state room, publik, privat, result, dan clock dalam satu transisi.
 * Status privat yang datang sesudah request resume dipertahankan untuk snapshot game sama.
 */
export function applySessionSnapshot(
  current: RoomSessionView,
  incoming: Snapshot,
  receivedAt: number,
  privateRevisionAtRequest?: number,
): RoomSessionView {
  if (isOlderSnapshot(current.gameView.game, incoming.game)) return current;

  const sameGame = Boolean(
    current.gameView.game &&
      incoming.game &&
      current.gameView.game.gameId === incoming.game.gameId,
  );
  const preserveNewerStatus = Boolean(
    sameGame &&
      privateRevisionAtRequest !== undefined &&
      current.privateRevision !== privateRevisionAtRequest,
  );

  return {
    room: incoming.room,
    gameView: { game: incoming.game },
    me: preserveNewerStatus
      ? {
          ...incoming.me,
          status: current.me?.status ?? incoming.me.status,
          pendingMonth: current.me?.pendingMonth ?? null,
        }
      : incoming.me,
    result: incoming.result,
    serverClockOffsetMs: incoming.serverTime - receivedAt,
    privateRevision: preserveNewerStatus
      ? current.privateRevision
      : current.privateRevision + 1,
  };
}

export function applyRoomState(
  current: RoomSessionView,
  room: RoomState,
): RoomSessionView {
  return { ...current, room };
}

export function applyPrivateStatus(
  current: RoomSessionView,
  status: PrivateStatus,
): RoomSessionView {
  if (!current.me) return current;
  return {
    ...current,
    me: { ...current.me, status },
    privateRevision: current.privateRevision + 1,
  };
}

/** Menyimpan opsi privat hanya untuk pemilik socket yang menerimanya. */
export function applySessionTurnOptions(
  current: RoomSessionView,
  payload: TurnOptionsPayload | DeadEndPayload,
): RoomSessionView {
  if (!current.me) return current;
  if (current.gameView.game?.activePlayerId !== current.me.playerId) return current;
  return {
    ...current,
    me: { ...current.me, pendingTurn: payload },
    privateRevision: current.privateRevision + 1,
  };
}

/** Menutup prompt privat setelah server menerima aksi yang sesuai. */
export function clearAcceptedPrivateAction(
  current: RoomSessionView,
  action: { kind: "turn"; turnId: string } | { kind: "calendar"; eventId: string } | { kind: "month"; month: number },
): RoomSessionView {
  if (!current.me) return current;
  if (
    action.kind === "turn" &&
    current.me.pendingTurn?.turnId === action.turnId
  ) {
    return {
      ...current,
      me: { ...current.me, pendingTurn: null },
      privateRevision: current.privateRevision + 1,
    };
  }
  if (
    action.kind === "month" &&
    current.me.pendingMonth?.month === action.month
  ) {
    return {
      ...current,
      me: { ...current.me, pendingMonth: null },
      privateRevision: current.privateRevision + 1,
    };
  }
  if (
    action.kind === "calendar" &&
    current.me.pendingCalendar?.eventId === action.eventId
  ) {
    return {
      ...current,
      me: { ...current.me, pendingCalendar: null },
      privateRevision: current.privateRevision + 1,
    };
  }
  return current;
}

function versionTransition(
  current: RoomSessionView,
  version: number,
  apply: (state: RoomSessionView) => RoomSessionView,
): SessionTransition {
  const currentGame = current.gameView.game;
  if (!currentGame) return { state: current, needsResume: true };
  if (version <= currentGame.version) {
    return { state: current, needsResume: false };
  }
  if (version !== currentGame.version + 1) {
    return { state: current, needsResume: true };
  }
  return { state: apply(current), needsResume: false };
}

function clearPrivatePending(
  me: Snapshot["me"] | null,
  clearStatus = false,
): Snapshot["me"] | null {
  return me
    ? {
        ...me,
        status: clearStatus ? null : me.status,
        inviteCard: null,
        pendingTurn: null,
        pendingCalendar: null,
        pendingMonth: null,
        pendingInvite: null,
      }
    : null;
}

export function applySessionPublicEvent(
  current: RoomSessionView,
  event: PublicGameEvent,
  receivedAt = Date.now(),
): SessionTransition {
  if (
    event.type === "game:started" &&
    current.gameView.game?.gameId !== event.payload.gameId
  ) {
    return {
      state: {
        ...current,
        gameView: {
          game: applyPublicGameEvent(current.gameView.game, event),
        },
        me: clearPrivatePending(current.me, true),
        result: null,
        serverClockOffsetMs: event.payload.serverTime - receivedAt,
        privateRevision: current.privateRevision + 1,
      },
      needsResume: false,
    };
  }

  return versionTransition(current, event.payload.version, (state) => {
    const nextGame = applyPublicGameEvent(state.gameView.game, event);
    const finished = event.type === "game:finished";
    const clearCalendar = event.type === "turn:start";
    const clearMonth = event.type === "turn:start";
    const clearTurn =
      event.type === "tile:opened" &&
      state.me?.pendingTurn?.turnId === event.payload.turnId;
    const nextMe = finished
      ? clearPrivatePending(state.me)
      : state.me && (clearCalendar || clearTurn || clearMonth)
        ? {
            ...state.me,
            pendingCalendar: clearCalendar ? null : state.me.pendingCalendar,
            pendingTurn: clearTurn ? null : state.me.pendingTurn,
            pendingMonth: clearMonth ? null : state.me.pendingMonth,
          }
        : state.me;
    return {
      ...state,
      gameView: { game: nextGame },
      me: nextMe,
      result: finished ? event.payload : state.result,
      privateRevision: finished || clearCalendar || clearTurn || clearMonth
        ? state.privateRevision + 1
        : state.privateRevision,
    };
  });
}

export function applySessionGamePatch(
  current: RoomSessionView,
  patch: GamePatch,
): SessionTransition {
  return versionTransition(current, patch.version, (state) => ({
    ...state,
    gameView: {
      ...state.gameView,
      game: applyGamePatch(state.gameView.game, patch),
    },
  }));
}

export function applySessionCalendarEvent(
  current: RoomSessionView,
  payload: CalendarEventPayload,
): SessionTransition {
  return versionTransition(current, payload.version, (state) => {
    const game = state.gameView.game!;
    const playerId = state.me?.playerId;
    const canAnswer = Boolean(
      state.me &&
        playerId &&
        !game.eliminated.includes(playerId),
    );
    return {
      ...state,
      gameView: {
        ...state.gameView,
        game: { ...game, version: payload.version },
      },
      me: state.me
        ? { ...state.me, pendingCalendar: canAnswer ? payload : null, pendingMonth: null }
        : null,
    };
  });
}

/** Ringkasan privat Ganti Bulan; tanpa versi, tidak boleh menimpa fase berikutnya. */
export function applySessionMonthSummary(
  current: RoomSessionView,
  payload: MonthSummaryPayload,
): RoomSessionView {
  const game = current.gameView.game;
  if (!current.me || !game || game.calendar.month !== payload.month || game.phase !== "calendar" || current.me.isSpectator || current.me.pendingCalendar) return current;
  return {
    ...current,
    me: { ...current.me, pendingMonth: payload, pendingCalendar: null },
    privateRevision: current.privateRevision + 1,
  };
}

export function applySessionPlayerConnection(
  current: RoomSessionView,
  payload: PlayerConnection,
): SessionTransition {
  if (!current.room) return { state: current, needsResume: false };
  if (payload.version === undefined || !current.gameView.game) {
    return {
      state: {
        ...current,
        room: applyPlayerConnection(current.room, payload),
      },
      needsResume: false,
    };
  }
  return versionTransition(current, payload.version, (state) => ({
    ...state,
    room: applyPlayerConnection(state.room!, payload),
    gameView: {
      ...state.gameView,
      game: { ...state.gameView.game!, version: payload.version! },
    },
  }));
}

export function createSingleFlightGate() {
  let active = false;
  let pending = false;
  return {
    tryStart() {
      if (active) {
        pending = true;
        return false;
      }
      active = true;
      return true;
    },
    finish() {
      active = false;
      const shouldRetry = pending;
      pending = false;
      return shouldRetry;
    },
    isActive() {
      return active;
    },
  };
}