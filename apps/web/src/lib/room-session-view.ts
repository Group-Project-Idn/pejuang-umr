import type {
  CalendarEventPayload,
  PrivateStatus,
  PublicGameState,
  RoomState,
  Snapshot,
} from "@pejuang/shared";
import {
  applyGamePatch,
  applyPlayerConnection,
  applyPublicGameEvent,
  applyRealtimeTurnTimer,
  type GamePatch,
  type PlayerConnection,
  type PublicGameEvent,
  type RealtimeGameView,
  type TurnTimer,
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
    gameView: { game: null, timerRemainingMs: null },
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
    gameView: { game: incoming.game, timerRemainingMs: null },
    me: preserveNewerStatus
      ? { ...incoming.me, status: current.me?.status ?? incoming.me.status }
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
          timerRemainingMs: null,
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
    return {
      ...state,
      gameView: {
        game: nextGame,
        timerRemainingMs:
          event.type === "turn:start" || finished
            ? null
            : state.gameView.timerRemainingMs,
      },
      me: finished ? clearPrivatePending(state.me) : state.me,
      result: finished ? event.payload : state.result,
      privateRevision: finished
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

export function applySessionTurnTimer(
  current: RoomSessionView,
  timer: TurnTimer,
): SessionTransition {
  return versionTransition(current, timer.version, (state) => ({
    ...state,
    gameView: applyRealtimeTurnTimer(state.gameView, timer),
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
        !state.me.isSpectator &&
        !game.eliminated.includes(playerId) &&
        !game.spectators.includes(playerId),
    );
    return {
      ...state,
      gameView: {
        ...state.gameView,
        game: { ...game, version: payload.version },
      },
      me: state.me
        ? { ...state.me, pendingCalendar: canAnswer ? payload : null }
        : null,
    };
  });
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