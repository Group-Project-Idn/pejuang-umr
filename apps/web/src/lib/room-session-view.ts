import type {
  CalendarEventPayload,
  DeadEndPayload,
  InviteCard,
  InviteIncomingPayload,
  InviteResolvedPayload,
  MonthSummaryPayload,
  PrivateStatus,
  PublicGameState,
  ReflectionReadyPayload,
  RoomState,
  ServerToClientEvents,
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
  /** Keterangan musim dari season:changed; tidak ada di snapshot. */
  seasonHint: string | null;
  /** Pemberitahuan Petak Emas terbaru; id naik tiap pemberitahuan baru. */
  goldNotice: { id: number; text: string } | null;
  /** Pemberitahuan sementara (overlay Doom, hasil Event Tanggal); dihapus lewat dismissNotice. */
  notices: TransientNotice[];
  /** Pencacah id pemberitahuan; tidak turun sehingga id tidak dipakai ulang. */
  noticeSeq: number;
};

export type DoomTriggeredPayload = Parameters<ServerToClientEvents["doom:triggered"]>[0];
export type CalendarResultPayload = Parameters<ServerToClientEvents["calendar:result"]>[0];

export type TransientNotice =
  | { id: number; kind: "doom"; payload: DoomTriggeredPayload }
  | { id: number; kind: "calendarResult"; payload: CalendarResultPayload };

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
    seasonHint: null,
    goldNotice: null,
    notices: [],
    noticeSeq: 0,
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
          reflection: current.me?.reflection ?? incoming.me.reflection,
          pendingMonth: current.me?.pendingMonth ?? null,
        }
      : incoming.me,
    result: incoming.result,
    serverClockOffsetMs: incoming.serverTime - receivedAt,
    privateRevision: preserveNewerStatus
      ? current.privateRevision
      : current.privateRevision + 1,
    seasonHint: sameGame ? current.seasonHint : null,
    goldNotice: sameGame ? current.goldNotice : null,
    notices: sameGame ? current.notices : [],
    noticeSeq: current.noticeSeq,
  };
}

export function applyRoomState(
  current: RoomSessionView,
  room: RoomState,
): RoomSessionView {
  // Main Lagi: room kembali ke lobi, hasil dan refleksi game lama tidak boleh tersisa.
  if (room.status === "waiting" || room.status === "countdown") {
    return {
      ...current,
      room,
      result: null,
      me: current.me ? { ...current.me, reflection: null } : null,
    };
  }
  return { ...current, room };
}

/** Refleksi AI hanya disimpan untuk pemilik socket dan game yang sedang tampil. */
export function applyReflectionReady(
  current: RoomSessionView,
  payload: ReflectionReadyPayload,
): RoomSessionView {
  if (!current.me || current.me.playerId !== payload.playerId) return current;
  const game = current.gameView.game;
  if (game && game.gameId !== payload.gameId) return current;
  return {
    ...current,
    me: { ...current.me, reflection: payload.reflection },
    privateRevision: current.privateRevision + 1,
  };
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
  action:
    | { kind: "turn"; turnId: string }
    | { kind: "calendar"; eventId: string }
    | { kind: "month"; month: number }
    | { kind: "inviteCard"; cardId: string }
    | { kind: "invite"; inviteId: string },
): RoomSessionView {
  if (!current.me) return current;
  if (action.kind === "inviteCard" && current.me.inviteCard?.cardId === action.cardId) {
    return {
      ...current,
      me: { ...current.me, inviteCard: null },
      privateRevision: current.privateRevision + 1,
    };
  }
  if (action.kind === "invite" && current.me.pendingInvite?.inviteId === action.inviteId) {
    return {
      ...current,
      me: { ...current.me, pendingInvite: null },
      privateRevision: current.privateRevision + 1,
    };
  }
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

/** Kartu Ajakan milik pemain ini; kartu lama hangus saat kartu baru (atau null) datang. */
export function applyInviteCard(
  current: RoomSessionView,
  payload: { card: InviteCard | null },
): RoomSessionView {
  if (!current.me) return current;
  return {
    ...current,
    me: { ...current.me, inviteCard: payload.card },
    privateRevision: current.privateRevision + 1,
  };
}

/** Popup Ajakan hanya untuk target; payload yang bukan untuk pemain ini diabaikan. */
export function applyInviteIncoming(
  current: RoomSessionView,
  payload: InviteIncomingPayload,
): RoomSessionView {
  if (!current.me || payload.fromPlayerId === current.me.playerId) return current;
  return {
    ...current,
    me: { ...current.me, pendingInvite: payload },
    privateRevision: current.privateRevision + 1,
  };
}

/**
 * Hasil Fase Pembalikan (dengan motif) disimpan hanya bila pemain ini pengirim atau target,
 * tanpa duplikat per inviteId. Popup target untuk Ajakan itu ditutup.
 */
export function applyInviteResolved(
  current: RoomSessionView,
  payload: InviteResolvedPayload,
): RoomSessionView {
  const me = current.me;
  if (!me) return current;
  if (payload.fromPlayerId !== me.playerId && payload.targetPlayerId !== me.playerId) return current;
  const known = me.inviteResults.some((result) => result.inviteId === payload.inviteId);
  return {
    ...current,
    me: {
      ...me,
      inviteResults: known ? me.inviteResults : [...me.inviteResults, payload],
      pendingInvite: me.pendingInvite?.inviteId === payload.inviteId ? null : me.pendingInvite,
    },
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
        pendingMonth: null,
        pendingInvite: null,
        inviteResults: [],
      }
    : null;
}

export const GOLD_SPAWNED_NOTICE = "Petak Emas muncul! Hilang dalam 3 ronde";
export const GOLD_EXPIRED_NOTICE = "Petak Emas hangus";

function goldNoticeFor(
  state: RoomSessionView,
  event: PublicGameEvent,
): RoomSessionView["goldNotice"] {
  const id = (state.goldNotice?.id ?? 0) + 1;
  if (event.type === "gold:spawned") return { id, text: GOLD_SPAWNED_NOTICE };
  if (
    event.type === "gold:expired" &&
    state.gameView.game?.gold?.goldId === event.payload.goldId
  ) {
    return { id, text: GOLD_EXPIRED_NOTICE };
  }
  return state.goldNotice;
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
        seasonHint: null,
        goldNotice: null,
        notices: [],
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
      seasonHint: event.type === "season:changed"
        ? event.payload.hint
        : state.seasonHint,
      goldNotice: goldNoticeFor(state, event),
    };
  });
}

export function applySessionGamePatch(
  current: RoomSessionView,
  patch: GamePatch,
): SessionTransition {
  // Ronde berikutnya dimulai (op calendar): hasil Ajakan Fase Pembalikan lalu dikosongkan.
  const newRound = patch.ops.some((op) => op.type === "calendar");
  return versionTransition(current, patch.version, (state) => ({
    ...state,
    gameView: {
      ...state.gameView,
      game: applyGamePatch(state.gameView.game, patch),
    },
    me:
      newRound && state.me && state.me.inviteResults.length > 0
        ? { ...state.me, inviteResults: [] }
        : state.me,
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
  if (!current.me || !game || game.calendar.month !== payload.month || game.phase !== "calendar" || game.eliminated.includes(current.me.playerId) || current.me.pendingCalendar) return current;
  return {
    ...current,
    me: { ...current.me, pendingMonth: payload, pendingCalendar: null },
    privateRevision: current.privateRevision + 1,
  };
}

function addNotice(
  current: RoomSessionView,
  notice:
    | { kind: "doom"; payload: DoomTriggeredPayload }
    | { kind: "calendarResult"; payload: CalendarResultPayload },
): RoomSessionView {
  const id = current.noticeSeq + 1;
  return {
    ...current,
    notices: [...current.notices, { id, ...notice }],
    noticeSeq: id,
  };
}

export function applyDoomTriggered(
  current: RoomSessionView,
  payload: DoomTriggeredPayload,
): RoomSessionView {
  return addNotice(current, { kind: "doom", payload });
}

export function applyCalendarResult(
  current: RoomSessionView,
  payload: CalendarResultPayload,
): RoomSessionView {
  return addNotice(current, { kind: "calendarResult", payload });
}

export function dismissNotice(current: RoomSessionView, id: number): RoomSessionView {
  if (!current.notices.some((notice) => notice.id === id)) return current;
  return { ...current, notices: current.notices.filter((notice) => notice.id !== id) };
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