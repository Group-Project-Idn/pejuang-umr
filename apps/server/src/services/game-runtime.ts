import {
  answerCalendarEvent,
  chooseHex,
  closeCalendarEvent,
  endRound,
  finishGame,
  resolveInvite,
  sendInvite,
  startRound,
  startTurn,
  timeoutTurn,
  type DomainEvent,
  type GameState,
  type PlayerIdentity,
  type RandomSource,
} from "@pejuang/engine";
import type {
  CalendarEventPayload,
  ErrorCode,
  GameFinishedPayload,
  HexCoord,
  RoomState,
  ServerToClientEvents,
} from "@pejuang/shared";
import type { Server } from "socket.io";
import type {
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
} from "@pejuang/shared";
import type { GameRepository, GameRecord } from "../repositories/game-repository";
import type { RoomRepository } from "../repositories/room-repository";

type GameServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

type RuntimeResult =
  | { ok: true }
  | { ok: false; error: ErrorCode; message?: string };

const CALENDAR_SECONDS = 15;

export class GameRuntime {
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly inviteTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly pausedTurns = new Map<string, { turnId: string; remainingMs: number }>();

  constructor(
    private readonly io: GameServer,
    private readonly games: GameRepository,
    private readonly rooms: RoomRepository,
    private readonly random: RandomSource,
  ) {}

  create(room: RoomState, state: GameState): void {
    this.games.create(room.code, state);
  }

  start(room: RoomState): void {
    this.advance(room);
  }

  clear(roomCode: string): void {
    this.clearTimer(roomCode);
    this.clearInviteTimer(roomCode);
    this.pausedTurns.delete(roomCode);
    this.games.delete(roomCode);
  }

  answerCalendar(
    room: RoomState,
    playerId: string,
    eventId: string,
    choice: "join" | "joinPaylater" | "skip",
  ): RuntimeResult {
    const record = this.games.getRecord(room.code);
    if (!record) return { ok: false, error: "ROOM_NOT_FOUND" };
    const result = answerCalendarEvent(record.state, playerId, eventId, choice);
    if (!result.ok) return { ok: false, error: result.code, message: result.message };
    this.games.update(room.code, (current) => ({ ...current, state: result.state }));
    const living = result.state.public.turnOrder.filter(
      (id) => !result.state.players[id]?.eliminated,
    );
    if (living.every((id) => id in (result.state.pendingCalendarEvent?.answers ?? {}))) {
      this.closeCalendar(room, eventId);
    }
    return { ok: true };
  }

  choose(
    room: RoomState,
    playerId: string,
    turnId: string,
    hex: HexCoord,
  ): RuntimeResult {
    const record = this.games.getRecord(room.code);
    if (!record) return { ok: false, error: "ROOM_NOT_FOUND" };
    const result = chooseHex(record.state, playerId, turnId, hex, this.random);
    if (!result.ok) return { ok: false, error: result.code, message: result.message };
    this.clearTimer(room.code);
    this.commit(room, result.state, result.events);
    this.continueAfterTurn(room, result.nextAction);
    return { ok: true };
  }

  spectate(roomCode: string, playerId: string): RuntimeResult {
    const record = this.games.getRecord(roomCode);
    if (!record) return { ok: false, error: "ROOM_NOT_FOUND" };
    if (!record.state.players[playerId]?.eliminated) {
      return { ok: false, error: "NOT_ELIMINATED" };
    }
    this.games.setSpectator(roomCode, playerId);
    return { ok: true };
  }

  sendInvite(
    room: RoomState,
    fromPlayerId: string,
    cardId: string,
    targetPlayerId: string,
  ): RuntimeResult & { inviteId?: string; deadline?: number } {
    const record = this.games.getRecord(room.code);
    if (!record) return { ok: false, error: "ROOM_NOT_FOUND" };
    if (record.spectatorIds.includes(fromPlayerId)) {
      return { ok: false, error: "NO_INVITE_CARD" };
    }
    const sender = room.players.find((player) => player.playerId === fromPlayerId);
    const result = sendInvite(
      record.state,
      fromPlayerId,
      sender?.name ?? fromPlayerId,
      cardId,
      targetPlayerId,
    );
    if (!result.ok) return { ok: false, error: result.code, message: result.message };
    const deadline = Date.now() + 10_000;
    const events = result.events.map((event) =>
      event.type === "invite:incoming"
        ? { ...event, payload: { ...event.payload, deadline } }
        : event,
    ) as DomainEvent[];
    this.commit(room, result.state, events);
    const inviteId = result.state.pendingInvite!.inviteId;
    if (result.state.public.activePlayerId === targetPlayerId && result.state.pendingTurn) {
      const remainingMs = Math.max(
        0,
        (result.state.public.turnDeadline ?? Date.now()) - Date.now(),
      );
      this.clearTimer(room.code);
      this.pausedTurns.set(room.code, {
        turnId: result.state.pendingTurn.turnId,
        remainingMs,
      });
      this.emitTurnTimer(room, result.state, true, null, remainingMs);
    }
    this.setInviteTimer(room.code, 10_000, () =>
      this.respondInvite(room, targetPlayerId, inviteId, "decline", true),
    );
    return { ok: true, inviteId, deadline };
  }

  respondInvite(
    room: RoomState,
    targetPlayerId: string,
    inviteId: string,
    answer: "join" | "decline",
    autoDeclined = false,
  ): RuntimeResult {
    const record = this.games.getRecord(room.code);
    if (!record) return { ok: false, error: "ROOM_NOT_FOUND" };
    const result = resolveInvite(
      record.state,
      targetPlayerId,
      inviteId,
      answer,
      autoDeclined,
    );
    if (!result.ok) return { ok: false, error: result.code, message: result.message };
    this.clearInviteTimer(room.code);
    this.commit(room, result.state, result.events);
    this.resumePausedTurn(room);
    const committed = this.games.getRecord(room.code);
    if (committed && this.shouldFinishEarly(committed.state)) {
      this.finish(room, committed.state);
    }
    return { ok: true };
  }

  private advance(room: RoomState): void {
    const record = this.games.getRecord(room.code);
    if (!record || record.state.phase === "finished") return;
    if (this.shouldFinishEarly(record.state)) {
      this.finish(room, record.state);
      return;
    }
    if (record.state.phase === "roundStart") {
      const result = startRound(record.state, this.random);
      if (result.state.phase === "calendarEvent") {
        const deadline = Date.now() + CALENDAR_SECONDS * 1_000;
        const events = result.events.map((event) =>
          event.type === "calendar:event"
            ? { ...event, payload: { ...event.payload, deadline } }
            : event,
        ) as DomainEvent[];
        this.commit(room, result.state, events);
        this.scheduleCalendar(room, deadline);
      } else {
        this.commit(room, result.state, result.events);
        this.startNextTurn(room);
      }
      return;
    }
    if (record.state.phase === "turn" && record.state.pendingTurn === null) {
      this.startNextTurn(room);
    }
  }

  private startNextTurn(room: RoomState): void {
    const record = this.games.getRecord(room.code);
    if (!record) return;
    if (this.shouldFinishEarly(record.state)) {
      this.finish(room, record.state);
      return;
    }
    const result = startTurn(record.state, this.random);
    if (result.events.length === 0) {
      const ended = endRound(result.state, this.random);
      this.commit(room, ended.state, ended.events);
      this.advance(room);
      return;
    }
    const deadline = Date.now() + room.turnSeconds * 1_000;
    const events = result.events.map((event) =>
      event.type === "turn:start"
        ? {
            ...event,
            payload: { ...event.payload, deadline, turnSeconds: room.turnSeconds },
          }
        : event,
    ) as DomainEvent[];
    const state = {
      ...result.state,
      public: { ...result.state.public, turnDeadline: deadline, turnPaused: false },
    };
    this.commit(room, state, events);
    const turnId = state.pendingTurn!.turnId;
    this.setTimer(room.code, room.turnSeconds * 1_000, () => {
      const current = this.games.getRecord(room.code);
      if (current?.state.pendingTurn?.turnId !== turnId) return;
      const timedOut = timeoutTurn(current.state, turnId, this.random);
      if (!timedOut.ok) return;
      this.commit(room, timedOut.state, timedOut.events);
      this.continueAfterTurn(room, timedOut.nextAction);
    });
  }

  private continueAfterTurn(room: RoomState, action: "nextTurn" | "endRound"): void {
    if (action === "nextTurn") {
      this.startNextTurn(room);
      return;
    }
    const record = this.games.getRecord(room.code);
    if (!record) return;
    const ended = endRound(record.state, this.random);
    this.commit(room, ended.state, ended.events);
    this.advance(room);
  }

  private scheduleCalendar(room: RoomState, deadline: number): void {
    const record = this.games.getRecord(room.code);
    const eventId = record?.state.pendingCalendarEvent?.eventId;
    if (!record || !eventId) return;
    this.setTimer(room.code, Math.max(0, deadline - Date.now()), () =>
      this.closeCalendar(room, eventId),
    );
  }

  private closeCalendar(room: RoomState, eventId: string): void {
    const record = this.games.getRecord(room.code);
    if (record?.state.pendingCalendarEvent?.eventId !== eventId) return;
    this.clearTimer(room.code);
    const result = closeCalendarEvent(record.state, this.random);
    this.commit(room, result.state, result.events);
    this.startNextTurn(room);
  }

  private finish(room: RoomState, state: GameState): void {
    this.clearTimer(room.code);
    this.clearInviteTimer(room.code);
    const identities: Record<string, PlayerIdentity> = Object.fromEntries(
      room.players
        .filter((player) => player.pawn !== null)
        .map((player) => [player.playerId, { name: player.name, pawn: player.pawn! }]),
    );
    const result = finishGame(state, identities);
    this.commit(room, result.state, result.events);
    const finished = this.rooms.markFinished(room.code);
    if (finished.ok) this.io.to(room.code).emit("room:state", finished.room);
  }

  private shouldFinishEarly(state: GameState): boolean {
    return state.baseTurnOrder.filter((id) => !state.players[id]?.eliminated).length <= 1;
  }

  private commit(room: RoomState, state: GameState, events: DomainEvent[]): void {
    let version = state.public.version;
    let nextState = state;
    let pendingTurn = null as GameRecord["pendingTurn"];
    let pendingCalendar = null as CalendarEventPayload | null;
    let result = null as GameFinishedPayload | null;
    let pendingInvite = null as GameRecord["pendingInvite"];
    const emissions: Array<{ event: DomainEvent; payload: unknown }> = [];

    for (const event of events) {
      const isPublic = event.target.kind === "room";
      const payload = isPublic && "version" in event.payload
        ? { ...event.payload, version: ++version }
        : event.payload;
      if (event.type === "turn:options" || event.type === "turn:dead-end") {
        pendingTurn = payload as GameRecord["pendingTurn"];
      }
      if (event.type === "calendar:event") pendingCalendar = payload as CalendarEventPayload;
      if (event.type === "invite:incoming") pendingInvite = payload as GameRecord["pendingInvite"];
      if (event.type === "game:finished") result = payload as GameFinishedPayload;
      emissions.push({ event, payload });
    }
    nextState = {
      ...nextState,
      public: {
        ...nextState.public,
        version,
        turnDeadline: nextState.pendingTurn ? nextState.public.turnDeadline : null,
      },
    };
    this.games.update(room.code, (current) => ({
      ...current,
      state: nextState,
      pendingTurn: pendingTurn ?? (nextState.pendingTurn ? current.pendingTurn : null),
      pendingCalendar:
        pendingCalendar ?? (nextState.pendingCalendarEvent ? current.pendingCalendar : null),
      pendingInvite:
        pendingInvite ?? (nextState.pendingInvite ? current.pendingInvite : null),
      result: result ?? current.result,
    }));
    for (const { event, payload } of emissions) {
      if (event.target.kind === "room") {
        this.io.to(room.code).emit(event.type, payload as never);
      } else {
        for (const socket of this.io.sockets.sockets.values()) {
          if (socket.data.playerId === event.target.playerId) {
            socket.emit(event.type, payload as never);
          }
        }
      }
    }
  }

  private setTimer(roomCode: string, delay: number, action: () => void): void {
    this.clearTimer(roomCode);
    this.timers.set(roomCode, setTimeout(action, delay));
  }

  private clearTimer(roomCode: string): void {
    const timer = this.timers.get(roomCode);
    if (timer) clearTimeout(timer);
    this.timers.delete(roomCode);
  }

  private emitTurnTimer(
    room: RoomState,
    state: GameState,
    paused: boolean,
    deadline: number | null,
    remainingMs: number,
  ): void {
    const turnId = state.pendingTurn?.turnId;
    if (!turnId) return;
    const version = state.public.version + 1;
    const nextState = {
      ...state,
      public: { ...state.public, version, turnPaused: paused, turnDeadline: deadline },
    };
    this.games.update(room.code, (record) => ({ ...record, state: nextState }));
    this.io.to(room.code).emit("turn:timer", {
      version,
      turnId,
      paused,
      deadline,
      remainingMs,
    });
  }

  private resumePausedTurn(room: RoomState): void {
    const paused = this.pausedTurns.get(room.code);
    if (!paused) return;
    this.pausedTurns.delete(room.code);
    const record = this.games.getRecord(room.code);
    if (record?.state.pendingTurn?.turnId !== paused.turnId) return;
    const deadline = Date.now() + paused.remainingMs;
    this.emitTurnTimer(room, record.state, false, deadline, paused.remainingMs);
    this.setTimer(room.code, paused.remainingMs, () => {
      const current = this.games.getRecord(room.code);
      if (current?.state.pendingTurn?.turnId !== paused.turnId) return;
      const timedOut = timeoutTurn(current.state, paused.turnId, this.random);
      if (!timedOut.ok) return;
      this.commit(room, timedOut.state, timedOut.events);
      this.continueAfterTurn(room, timedOut.nextAction);
    });
  }

  private setInviteTimer(roomCode: string, delay: number, action: () => void): void {
    this.clearInviteTimer(roomCode);
    this.inviteTimers.set(roomCode, setTimeout(action, delay));
  }

  private clearInviteTimer(roomCode: string): void {
    const timer = this.inviteTimers.get(roomCode);
    if (timer) clearTimeout(timer);
    this.inviteTimers.delete(roomCode);
  }
}