import {
  GameStartRequestSchema,
  RoomCreateRequestSchema,
  RoomJoinRequestSchema,
  RoomKickRequestSchema,
  RoomLeaveRequestSchema,
  RoomPawnRequestSchema,
  RoomRematchRequestSchema,
  RoomReadyRequestSchema,
  RoomTimerRequestSchema,
  SessionResumeRequestSchema,
  type Ack,
  type ClientToServerEvents,
  type InterServerEvents,
  type RoomState,
  type ServerToClientEvents,
  type SocketData,
} from "@pejuang/shared";
import {
  MathRandomSource,
  createGame,
  toPublicState,
  type RandomSource,
} from "@pejuang/engine";
import { randomUUID } from "node:crypto";
import type { Server, Socket } from "socket.io";
import { broadcastConnection } from "../services/connection";
import { systemClock, type Clock } from "../game/clock";
import { dispatch } from "../game/event-dispatcher";
import { GameSession, identitiesFromRoom, type SessionTiming } from "../game/game-session";
import type { GameRepository } from "../repositories/game-repository";
import type { IdempotencyRepository } from "../repositories/idempotency-repository";
import type { RoomRepository } from "../repositories/room-repository";
import { createSnapshot } from "../services/snapshot";
import { executeWithAck } from "./safe-handler";

type GameServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

type GameSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

type EmptyResult = object;
type RoomResult = { room: RoomState };

function runIdempotent<T extends object>(
  repository: IdempotencyRepository,
  playerId: string,
  event: string,
  requestId: string,
  action: () => Ack<T>,
): { response: Ack<T>; replayed: boolean } {
  const cached = repository.get<Ack<T>>(playerId, event, requestId);
  if (cached) return { response: cached, replayed: true };
  return {
    response: repository.set(playerId, event, requestId, action()),
    replayed: false,
  };
}

function invalidPayload<T extends object = EmptyResult>(): Ack<T> {
  return { ok: false, error: "INVALID_PAYLOAD" };
}

function emitRoomState(io: GameServer, room: RoomState): void {
  io.to(room.code).emit("room:state", room);
}

export function registerRoomHandlers(
  io: GameServer,
  socket: GameSocket,
  rooms: RoomRepository,
  games: GameRepository,
  idempotency: IdempotencyRepository,
  options: {
    countdownMs?: number;
    random?: RandomSource;
    createGameId?: () => string;
    clock?: Clock;
    timing?: Partial<SessionTiming>;
  } = {},
): void {
  const countdownMs = options.countdownMs ?? 3_000;
  const random = options.random ?? new MathRandomSource();
  const createGameId = options.createGameId ?? randomUUID;
  const clock = options.clock ?? systemClock;
  /** Menghapus sesi game room beserta semua timer-nya. */
  const closeGame = (roomCode: string): void => {
    games.get(roomCode)?.dispose();
    games.delete(roomCode);
  };

  socket.on("room:create", (payload, unsafeAck) => executeWithAck<RoomResult>(unsafeAck, (ack) => {
    const parsed = RoomCreateRequestSchema.safeParse(payload);
    if (!parsed.success) return ack(invalidPayload<RoomResult>());
    const result = runIdempotent<RoomResult>(
      idempotency,
      socket.data.playerId,
      "room:create",
      parsed.data.requestId,
      () => rooms.create(socket.data),
    );
    if (result.response.ok && !result.replayed) {
      void socket.join(result.response.room.code);
      emitRoomState(io, result.response.room);
    }
    ack(result.response);
  }));

  socket.on("room:join", (payload, unsafeAck) => executeWithAck<RoomResult>(unsafeAck, (ack) => {
    const parsed = RoomJoinRequestSchema.safeParse(payload);
    if (!parsed.success) return ack(invalidPayload<RoomResult>());
    const result = runIdempotent<RoomResult>(
      idempotency,
      socket.data.playerId,
      "room:join",
      parsed.data.requestId,
      () => rooms.join(parsed.data.roomCode, socket.data),
    );
    if (result.response.ok && !result.replayed) {
      void socket.join(result.response.room.code);
      emitRoomState(io, result.response.room);
    }
    ack(result.response);
  }));

  socket.on("room:leave", (payload, unsafeAck) => executeWithAck<EmptyResult>(unsafeAck, (ack) => {
    const parsed = RoomLeaveRequestSchema.safeParse(payload);
    if (!parsed.success) return ack(invalidPayload());
    const roomBefore = rooms.getByPlayer(socket.data.playerId);
    // Keluar saat game berjalan (GDD 9.4 v1.10) diperlakukan seperti koneksi
    // putus: pemain tetap terdaftar dan hanya ditandai terputus.
    const playing = roomBefore?.status === "playing";
    const wasFinished = roomBefore?.status === "finished";
    const result = runIdempotent<EmptyResult>(
      idempotency,
      socket.data.playerId,
      "room:leave",
      parsed.data.requestId,
      () => {
        const mutation = playing
          ? rooms.markDisconnected(socket.data.playerId)
          : rooms.leave(socket.data.playerId);
        return mutation.ok ? { ok: true } : mutation;
      },
    );
    if (result.response.ok && !result.replayed && roomBefore) {
      void socket.leave(roomBefore.code);
      if (playing) {
        broadcastConnection(io, games, roomBefore.code, socket.data.playerId, false);
      } else {
        const remaining = rooms.get(roomBefore.code);
        if (remaining) emitRoomState(io, remaining);
        // Room selesai yang kosong ditutup bersama sesi game-nya.
        else if (wasFinished) closeGame(roomBefore.code);
      }
    }
    ack(result.response);
  }));

  socket.on("room:rematch", (payload, unsafeAck) => executeWithAck<RoomResult>(unsafeAck, (ack) => {
    const parsed = RoomRematchRequestSchema.safeParse(payload);
    if (!parsed.success) return ack(invalidPayload<RoomResult>());
    const roomBefore = rooms.getByPlayer(socket.data.playerId);
    let removed: string[] = [];
    const result = runIdempotent<RoomResult>(
      idempotency,
      socket.data.playerId,
      "room:rematch",
      parsed.data.requestId,
      () => {
        const mutation = rooms.rematch(socket.data.playerId);
        if (!mutation.ok) return mutation;
        removed = mutation.removed ?? [];
        return { ok: true, room: mutation.room };
      },
    );
    if (result.response.ok && !result.replayed && roomBefore) {
      closeGame(roomBefore.code);
      for (const candidate of io.sockets.sockets.values()) {
        if (removed.includes(candidate.data.playerId)) void candidate.leave(roomBefore.code);
      }
      emitRoomState(io, result.response.room);
    }
    ack(result.response);
  }));

  socket.on("room:ready", (payload, unsafeAck) => executeWithAck<EmptyResult>(unsafeAck, (ack) => {
    const parsed = RoomReadyRequestSchema.safeParse(payload);
    if (!parsed.success) return ack(invalidPayload());
    const result = runIdempotent<EmptyResult>(
      idempotency,
      socket.data.playerId,
      "room:ready",
      parsed.data.requestId,
      () => {
        const mutation = rooms.setReady(socket.data.playerId, parsed.data.ready);
        return mutation.ok ? { ok: true } : mutation;
      },
    );
    if (result.response.ok && !result.replayed) {
      const room = rooms.getByPlayer(socket.data.playerId);
      if (room) emitRoomState(io, room);
    }
    ack(result.response);
  }));

  socket.on("room:pawn", (payload, unsafeAck) => executeWithAck<EmptyResult>(unsafeAck, (ack) => {
    const parsed = RoomPawnRequestSchema.safeParse(payload);
    if (!parsed.success) return ack(invalidPayload());
    const result = runIdempotent<EmptyResult>(
      idempotency,
      socket.data.playerId,
      "room:pawn",
      parsed.data.requestId,
      () => {
        const mutation = rooms.setPawn(socket.data.playerId, parsed.data.pawn);
        return mutation.ok ? { ok: true } : mutation;
      },
    );
    if (result.response.ok && !result.replayed) {
      const room = rooms.getByPlayer(socket.data.playerId);
      if (room) emitRoomState(io, room);
    }
    ack(result.response);
  }));

  socket.on("room:timer", (payload, unsafeAck) => executeWithAck<EmptyResult>(unsafeAck, (ack) => {
    const parsed = RoomTimerRequestSchema.safeParse(payload);
    if (!parsed.success) return ack(invalidPayload());
    const result = runIdempotent<EmptyResult>(
      idempotency,
      socket.data.playerId,
      "room:timer",
      parsed.data.requestId,
      () => {
        const mutation = rooms.setTimer(
          socket.data.playerId,
          parsed.data.turnSeconds,
        );
        return mutation.ok ? { ok: true } : mutation;
      },
    );
    if (result.response.ok && !result.replayed) {
      const room = rooms.getByPlayer(socket.data.playerId);
      if (room) emitRoomState(io, room);
    }
    ack(result.response);
  }));

  socket.on("room:kick", (payload, unsafeAck) => executeWithAck<EmptyResult>(unsafeAck, (ack) => {
    const parsed = RoomKickRequestSchema.safeParse(payload);
    if (!parsed.success) return ack(invalidPayload());
    const roomBefore = rooms.getByPlayer(socket.data.playerId);
    const result = runIdempotent<EmptyResult>(
      idempotency,
      socket.data.playerId,
      "room:kick",
      parsed.data.requestId,
      () => {
        const mutation = rooms.kick(
          socket.data.playerId,
          parsed.data.targetPlayerId,
        );
        return mutation.ok ? { ok: true } : mutation;
      },
    );
    if (result.response.ok && !result.replayed && roomBefore) {
      for (const candidate of io.sockets.sockets.values()) {
        if (candidate.data.playerId === parsed.data.targetPlayerId) {
          candidate.emit("room:kicked", { roomCode: roomBefore.code });
          void candidate.leave(roomBefore.code);
        }
      }
      const room = rooms.get(roomBefore.code);
      if (room) emitRoomState(io, room);
    }
    ack(result.response);
  }));

  socket.on("game:start", (payload, unsafeAck) => executeWithAck<EmptyResult>(unsafeAck, (ack) => {
    const parsed = GameStartRequestSchema.safeParse(payload);
    if (!parsed.success) return ack(invalidPayload());
    const result = runIdempotent<EmptyResult>(
      idempotency,
      socket.data.playerId,
      "game:start",
      parsed.data.requestId,
      () => {
        const mutation = rooms.beginCountdown(socket.data.playerId);
        return mutation.ok ? { ok: true } : mutation;
      },
    );
    if (result.response.ok && !result.replayed) {
      const room = rooms.getByPlayer(socket.data.playerId)!;
      emitRoomState(io, room);
      io.to(room.code).emit("room:countdown", {
        deadline: Date.now() + countdownMs,
        seconds: 3,
      });
      setTimeout(() => {
        try {
          const countdownRoom = rooms.get(room.code);
          if (!countdownRoom || countdownRoom.status !== "countdown") return;
          const created = createGame(
            countdownRoom.players.map((player) => player.playerId),
            createGameId(),
            random,
          );
          const transition = rooms.markPlaying(room.code);
          if (!transition.ok) {
            io.to(room.code).emit("error", {
              code: transition.error,
              message: "Game gagal dimulai karena state room berubah.",
              fatal: false,
            });
            return;
          }
          const playingRoom = transition.room;
          const session: GameSession = games.set(
            room.code,
            new GameSession(
              room.code,
              created.state,
              random,
              playingRoom.turnSeconds,
              identitiesFromRoom(playingRoom.players),
              {
                clock,
                timing: options.timing,
                send: (events) => dispatch(io, session, events),
                onFinished: () => {
                  const finished = rooms.markFinished(room.code);
                  if (finished.ok) emitRoomState(io, finished.room);
                },
              },
            ),
          );
          const game = toPublicState(session.state);
          emitRoomState(io, playingRoom);
          io.to(room.code).emit("game:started", {
            version: session.nextVersion(),
            serverTime: Date.now(),
            gameId: game.gameId,
            boardRadius: game.boardRadius,
            turnSeconds: playingRoom.turnSeconds,
            turnOrder: game.turnOrder,
            startPositions: game.pawns,
            calendar: game.calendar,
          });
          dispatch(io, session, created.events);
          for (const candidate of io.sockets.sockets.values()) {
            if (candidate.rooms.has(room.code)) {
              candidate.emit(
                "session:snapshot",
                createSnapshot(
                  playingRoom,
                  candidate.data.playerId,
                  session,
                ),
              );
            }
          }
          session.start();
        } catch {
          io.to(room.code).emit("error", {
            code: "INTERNAL",
            message: "Game gagal dimulai. Silakan coba lagi.",
            fatal: false,
          });
        }
      }, countdownMs);
    }
    ack(result.response);
  }));

  socket.on("session:resume", (payload, unsafeAck) => executeWithAck<{ snapshot: ReturnType<typeof createSnapshot> }>(unsafeAck, (ack) => {
    const parsed = SessionResumeRequestSchema.safeParse(payload);
    if (!parsed.success) {
      return ack(invalidPayload<{ snapshot: ReturnType<typeof createSnapshot> }>());
    }
    const room = rooms.get(parsed.data.roomCode);
    if (!room) {
      return ack({ ok: false, error: "ROOM_NOT_FOUND" });
    }
    if (!room.players.some((player) => player.playerId === socket.data.playerId)) {
      return ack({ ok: false, error: "NOT_IN_ROOM" });
    }

    rooms.setConnected(socket.data.playerId, true);
    const connectedRoom = rooms.get(parsed.data.roomCode)!;
    void socket.join(connectedRoom.code);
    emitRoomState(io, connectedRoom);
    broadcastConnection(io, games, connectedRoom.code, socket.data.playerId, true);
    ack({
      ok: true,
      snapshot: createSnapshot(
        connectedRoom,
        socket.data.playerId,
        games.get(connectedRoom.code),
      ),
    });
  }));
}
