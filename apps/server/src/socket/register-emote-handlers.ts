import {
  EmoteSendRequestSchema,
  type Ack,
  type ClientToServerEvents,
  type InterServerEvents,
  type ServerToClientEvents,
  type SocketData,
} from "@pejuang/shared";
import type { Server, Socket } from "socket.io";
import type { Clock } from "../game/clock";
import type { IdempotencyRepository } from "../repositories/idempotency-repository";
import type { RoomRepository } from "../repositories/room-repository";
import type { FixedWindowRateLimiter } from "../services/rate-limit";
import { executeWithAck } from "./safe-handler";

/** Batas 1 emote per 3 detik per pemain (API_CONTRACT 14), terpisah dari rate limit umum. */
export const EMOTE_WINDOW_MS = 3_000;

const EMOTE_ID_PATTERN = /^[a-z0-9-]{1,24}$/;

/**
 * emote:send: berlaku di Room dan saat game. Pemain tereliminasi yang masih di room boleh mengirim.
 * emote:shown tidak memakai version karena tidak mengubah state game.
 */
export function registerEmoteHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
  socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
  rooms: RoomRepository,
  idempotency: IdempotencyRepository,
  limiter: FixedWindowRateLimiter,
  clock: Clock,
): void {
  socket.on("emote:send", (payload, unsafeAck) =>
    executeWithAck<object>(unsafeAck, (ack) => {
      const parsed = EmoteSendRequestSchema.safeParse(payload);
      if (!parsed.success || !EMOTE_ID_PATTERN.test(parsed.data.emoteId)) {
        return ack({ ok: false, error: "INVALID_PAYLOAD" });
      }
      const { requestId, emoteId } = parsed.data;
      const playerId = socket.data.playerId;
      const cached = idempotency.get<Ack>(playerId, "emote:send", requestId);
      if (cached) return ack(cached);

      const room = rooms.getByPlayer(playerId);
      if (!room) return ack({ ok: false, error: "NOT_IN_ROOM" });
      if (!limiter.consume(playerId, clock.now())) {
        return ack({ ok: false, error: "RATE_LIMITED" });
      }
      io.to(room.code).emit("emote:shown", { playerId, emoteId, at: clock.now() });
      ack(idempotency.set<Ack>(playerId, "emote:send", requestId, { ok: true }));
    }),
  );
}
