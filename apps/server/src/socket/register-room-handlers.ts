import {
  RoomCreateRequestSchema,
  RoomJoinRequestSchema,
  RoomKickRequestSchema,
  RoomLeaveRequestSchema,
  RoomPawnRequestSchema,
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
  createInitialGameState,
  type RandomSource,
} from "@pejuang/engine";
import { randomUUID } from "node:crypto";
import type { Server, Socket } from "socket.io";
import type { GameRepository } from "../repositories/game-repository";
import type { IdempotencyRepository } from "../repositories/idempotency-repository";
import type { RoomRepository } from "../repositories/room-repository";
import { createSnapshot } from "../services/snapshot";

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
  } = {},
): void {
  const countdownMs = options.countdownMs ?? 3_000;
  const random = options.random ?? new MathRandomSource();
  const createGameId = options.createGameId ?? randomUUID;
  socket.on("room:create", (payload, ack) => {
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
  });

  socket.on("room:join", (payload, ack) => {
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
  });

  socket.on("room:leave", (payload, ack) => {
    const parsed = RoomLeaveRequestSchema.safeParse(payload);
    if (!parsed.success) return ack(invalidPayload());
    const roomBefore = rooms.getByPlayer(socket.data.playerId);
    const result = runIdempotent<EmptyResult>(
      idempotency,
      socket.data.playerId,
      "room:leave",
      parsed.data.requestId,
      () => {
        const mutation = rooms.leave(socket.data.playerId);
        return mutation.ok ? { ok: true } : mutation;
      },
    );
    if (result.response.ok && !result.replayed && roomBefore) {
      void socket.leave(roomBefore.code);
      const remaining = rooms.get(roomBefore.code);
      if (remaining) emitRoomState(io, remaining);
    }
    ack(result.response);
  });

  socket.on("room:ready", (payload, ack) => {
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
  });

  socket.on("room:pawn", (payload, ack) => {
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
  });

  socket.on("room:timer", (payload, ack) => {
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
  });

  socket.on("room:kick", (payload, ack) => {
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
  });

  socket.on("game:start", (payload, ack) => {
    const parsed = RoomCreateRequestSchema.safeParse(payload);
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
        const playingRoom = rooms.markPlaying(room.code);
        if (!playingRoom) return;
        const game = games.set(
          room.code,
          createInitialGameState(
            playingRoom.players.map((player) => player.playerId),
            createGameId(),
            random,
          ),
        );
        emitRoomState(io, playingRoom);
        io.to(room.code).emit("game:started", {
          version: game.version,
          serverTime: Date.now(),
          gameId: game.gameId,
          boardRadius: game.boardRadius,
          turnSeconds: playingRoom.turnSeconds,
          turnOrder: game.turnOrder,
          startPositions: game.pawns,
          calendar: game.calendar,
        });
        for (const candidate of io.sockets.sockets.values()) {
          if (candidate.rooms.has(room.code)) {
            candidate.emit(
              "session:snapshot",
              createSnapshot(
                playingRoom,
                candidate.data.playerId,
                game,
              ),
            );
          }
        }
      }, countdownMs);
    }
    ack(result.response);
  });

  socket.on("session:resume", (payload, ack) => {
    const parsed = SessionResumeRequestSchema.safeParse(payload);
    if (!parsed.success) {
      return ack(invalidPayload<{ snapshot: ReturnType<typeof createSnapshot> }>());
    }
    const room = rooms.get(parsed.data.roomCode);
    if (
      !room ||
      !room.players.some((player) => player.playerId === socket.data.playerId)
    ) {
      return ack({ ok: false, error: "ROOM_NOT_FOUND" });
    }

    rooms.setConnected(socket.data.playerId, true);
    const connectedRoom = rooms.get(parsed.data.roomCode)!;
    void socket.join(connectedRoom.code);
    emitRoomState(io, connectedRoom);
    ack({
      ok: true,
      snapshot: createSnapshot(
        connectedRoom,
        socket.data.playerId,
        games.get(connectedRoom.code),
      ),
    });
  });
}
