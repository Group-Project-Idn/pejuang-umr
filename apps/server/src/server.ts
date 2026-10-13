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
import type { Clock } from "./game/clock";
import { createHttpHandler } from "./http/router";
import { GameRepository } from "./repositories/game-repository";
import { IdempotencyRepository } from "./repositories/idempotency-repository";
import { RoomRepository } from "./repositories/room-repository";
import { systemClock } from "./game/clock";
import { DEFAULT_ROOM_EMPTY_MS, DEFAULT_ROOM_IDLE_MS } from "./config";
import { RoomJanitor } from "./services/room-janitor";
import {
  FakeReflectionProvider,
  ReflectionService,
  type ReflectionProvider,
} from "./services/reflection";
import { broadcastConnection } from "./services/connection";
import { FixedWindowRateLimiter } from "./services/rate-limit";
import { verifyGuestToken } from "./services/guest-token";
import { ClientEventSchemas, DEV_ROOM_CODE } from "@pejuang/shared";
import { resetAbandonedDevRoom } from "./services/dev-room";
import { registerDevHandlers } from "./socket/register-dev-handlers";
import { registerEmoteHandlers, EMOTE_WINDOW_MS } from "./socket/register-emote-handlers";
import { registerGameHandlers } from "./socket/register-game-handlers";
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
    clock?: Clock;
    socketRateLimit?: { max: number; windowMs: number };
    /** Menggantikan provider dari config (tes). */
    reflectionProvider?: ReflectionProvider | null;
  } = {},
) {
  const rooms = dependencies.rooms ?? new RoomRepository();
  const games = dependencies.games ?? new GameRepository();
  // DEV_TOOLS (sudah ditolak config saat production): room uji UMR-0099 dan event dev:*.
  const devTools = config.devTools === true && process.env.NODE_ENV !== "production";
  if (devTools) rooms.enableDevRoom();
  const idempotency =
    dependencies.idempotency ?? new IdempotencyRepository();
  // Jendela 60 detik untuk aksi game (API_CONTRACT 1.3).
  const gameIdempotency = new IdempotencyRepository(60_000);
  const reflectionProvider =
    dependencies.reflectionProvider !== undefined
      ? dependencies.reflectionProvider
      : config.reflectionProvider === "fake"
        ? new FakeReflectionProvider()
        : null;
  const reflection = new ReflectionService({
    provider: reflectionProvider,
    timeoutMs: config.reflectionTimeoutMs,
  });
  const httpServer = createNodeServer(createHttpHandler(config, rooms));
  const io = new Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(httpServer, {
    cors: { origin: config.webOrigin },
  });

  const janitor = new RoomJanitor(
    io,
    rooms,
    games,
    dependencies.clock ?? systemClock,
    config.roomIdleMs ?? DEFAULT_ROOM_IDLE_MS,
    config.roomEmptyMs ?? DEFAULT_ROOM_EMPTY_MS,
    devTools ? new Set([DEV_ROOM_CODE]) : undefined,
  );
  httpServer.on("close", () => janitor.dispose());

  const activeSockets = new Map<string, string>();
  // Batas emote per pemain (bukan per socket), terpisah dari limiter umum.
  const emoteLimiter = new FixedWindowRateLimiter(1, EMOTE_WINDOW_MS);

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

    // M7: batas per socket untuk semua event C->S. Melebihi batas: ack RATE_LIMITED, koneksi tetap.
    const limiter = new FixedWindowRateLimiter(
      dependencies.socketRateLimit?.max ?? 20,
      dependencies.socketRateLimit?.windowMs ?? 5_000,
    );
    socket.use((packet, next) => {
      if (limiter.consume("socket")) {
        // Aktivitas room: event C->S yang valid dari anggota room. Microtask kedua
        // menangkap pemain yang baru menjadi anggota lewat event ini (create/join).
        const [event, payload] = packet;
        const schema = ClientEventSchemas[event as keyof typeof ClientEventSchemas];
        if (schema?.safeParse(payload).success) {
          janitor.touch(socket.data.playerId);
          queueMicrotask(() => janitor.touch(socket.data.playerId));
        }
        return next();
      }
      const ack = packet[packet.length - 1];
      if (typeof ack === "function") ack({ ok: false, error: "RATE_LIMITED" });
    });

    // Keputusan Terbuka #11: ping:test hanya untuk tes server (koneksi, batas laju).
    if (process.env.NODE_ENV === "test") {
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
    }

    registerRoomHandlers(io, socket, rooms, games, idempotency, {
      countdownMs: dependencies.countdownMs,
      createGameId: dependencies.createGameId,
      clock: dependencies.clock,
      reflection,
      timing: {
        revealStepMs: config.revealStepMs,
        monthPaySeconds: config.monthPaySeconds,
        popupInfoMs: config.popupInfoMs,
        resultPopupMs: config.resultPopupMs,
      },
    });
    registerGameHandlers(io, socket, rooms, games, gameIdempotency);
    if (devTools) registerDevHandlers(io, socket, rooms, games);
    registerEmoteHandlers(
      io,
      socket,
      rooms,
      gameIdempotency,
      emoteLimiter,
      dependencies.clock ?? systemClock,
    );

    socket.on("disconnect", () => {
      if (activeSockets.get(socket.data.playerId) === socket.id) {
        activeSockets.delete(socket.data.playerId);
        const before = rooms.getByPlayer(socket.data.playerId);
        const wasConnected = before?.players.find(
          (player) => player.playerId === socket.data.playerId,
        )?.connected;
        const room = rooms.setConnected(socket.data.playerId, false);
        if (room) {
          io.to(room.code).emit("room:state", room);
          if (wasConnected && room.status === "playing") {
            broadcastConnection(io, games, room.code, socket.data.playerId, false);
          }
          resetAbandonedDevRoom(rooms, games);
        }
      }
    });
  });

  return { httpServer, io, rooms, games, janitor };
}
