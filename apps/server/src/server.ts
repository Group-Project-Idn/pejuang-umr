import { createServer as createNodeServer } from "node:http";
import {
  PingSchema,
  type ClientToServerEvents,
  type InterServerEvents,
  type ServerToClientEvents,
  type SocketData,
} from "@pejuang/shared";
import { Server } from "socket.io";
import type { ServerConfig } from "./config";
import { createHttpHandler } from "./http/router";
import { GameRepository } from "./repositories/game-repository";
import { IdempotencyRepository } from "./repositories/idempotency-repository";
import { RoomRepository } from "./repositories/room-repository";
import { verifyGuestToken } from "./services/guest-token";
import { registerRoomHandlers } from "./socket/register-room-handlers";
import { executeWithAck } from "./socket/safe-handler";

export function createPejuangServer(
  config: ServerConfig,
  dependencies: {
    rooms?: RoomRepository;
    games?: GameRepository;
    idempotency?: IdempotencyRepository;
    countdownMs?: number;
    createGameId?: () => string;
  } = {},
) {
  const rooms = dependencies.rooms ?? new RoomRepository();
  const games = dependencies.games ?? new GameRepository();
  const idempotency =
    dependencies.idempotency ?? new IdempotencyRepository();
  const httpServer = createNodeServer(createHttpHandler(config, rooms));
  const io = new Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(httpServer, {
    cors: { origin: config.webOrigin },
  });

  const activeSockets = new Map<string, string>();

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (typeof token !== "string") {
      next(new Error("UNAUTHORIZED"));
      return;
    }

    const identity = verifyGuestToken(token, config.guestTokenSecret);
    if (!identity) {
      next(new Error("UNAUTHORIZED"));
      return;
    }

    socket.data = {
      playerId: identity.playerId,
      name: identity.name,
      avatarId: identity.avatarId,
    };
    next();
  });

  io.on("connection", (socket) => {
    const previousSocketId = activeSockets.get(socket.data.playerId);
    if (previousSocketId && previousSocketId !== socket.id) {
      io.sockets.sockets.get(previousSocketId)?.disconnect(true);
    }
    activeSockets.set(socket.data.playerId, socket.id);

    const currentRoom = rooms.setConnected(socket.data.playerId, true);
    if (currentRoom) {
      void socket.join(currentRoom.code);
      io.to(currentRoom.code).emit("room:state", currentRoom);
    }

    socket.on("ping:test", (payload, unsafeAck) => {
      executeWithAck<{ message: string }>(unsafeAck, (ack) => {
        const parsed = PingSchema.safeParse(payload);
        if (!parsed.success) {
          ack({ ok: false, error: "INVALID_PAYLOAD" });
          return;
        }
        ack({
          ok: true,
          message: `Halo ${parsed.data.name}, server menerima pesanmu`,
        });
      });
    });

    registerRoomHandlers(io, socket, rooms, games, idempotency, {
      countdownMs: dependencies.countdownMs,
      createGameId: dependencies.createGameId,
    });

    socket.on("disconnect", () => {
      if (activeSockets.get(socket.data.playerId) === socket.id) {
        activeSockets.delete(socket.data.playerId);
        const room = rooms.setConnected(socket.data.playerId, false);
        if (room) io.to(room.code).emit("room:state", room);
      }
    });
  });

  return { httpServer, io, rooms, games };
}
