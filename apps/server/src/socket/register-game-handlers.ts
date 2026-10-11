import {
  CalendarAnswerRequestSchema,
  EmoteSendRequestSchema,
  InviteRespondRequestSchema,
  InviteSendRequestSchema,
  SpectateEnterRequestSchema,
  TurnChooseRequestSchema,
  TurnJumpRequestSchema,
  type Ack,
  type ClientToServerEvents,
  type InterServerEvents,
  type ServerToClientEvents,
  type SocketData,
} from "@pejuang/shared";
import type { Socket } from "socket.io";
import type { GameRepository } from "../repositories/game-repository";
import type { IdempotencyRepository } from "../repositories/idempotency-repository";
import type { RoomRepository } from "../repositories/room-repository";
import type { GameRuntime } from "../services/game-runtime";
import { createSnapshot } from "../services/snapshot";
import { executeWithAck } from "./safe-handler";

type GameSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

function invalidPayload(): Ack {
  return { ok: false, error: "INVALID_PAYLOAD" };
}

function runIdempotent<T extends object = object>(
  repository: IdempotencyRepository,
  playerId: string,
  event: string,
  requestId: string,
  action: () => Ack<T>,
): Ack<T> {
  const cached = repository.get<Ack<T>>(playerId, event, requestId);
  return cached ?? repository.set(playerId, event, requestId, action());
}

export function registerGameHandlers(
  socket: GameSocket,
  rooms: RoomRepository,
  games: GameRepository,
  idempotency: IdempotencyRepository,
  runtime: GameRuntime,
): void {
  let lastEmoteAt = 0;
  const allowedEmotes = new Set(["laugh", "cheer", "shock", "sad"]);
  socket.on("calendar:answer", (payload, unsafeAck) => executeWithAck(unsafeAck, (ack) => {
    const parsed = CalendarAnswerRequestSchema.safeParse(payload);
    if (!parsed.success) return ack(invalidPayload());
    const response = runIdempotent<object>(
      idempotency,
      socket.data.playerId,
      "calendar:answer",
      parsed.data.requestId,
      () => {
        const room = rooms.getByPlayer(socket.data.playerId);
        if (!room || room.status !== "playing") return { ok: false, error: "NOT_IN_ROOM" };
        const result = runtime.answerCalendar(
          room,
          socket.data.playerId,
          parsed.data.eventId,
          parsed.data.choice,
        );
        return result.ok ? { ok: true } : { ok: false, error: result.error, message: result.message };
      },
    );
    ack(response);
  }));

  const registerMove = (
    event: "turn:choose" | "turn:jump",
    schema: typeof TurnChooseRequestSchema,
  ) => {
    socket.on(event, (payload, unsafeAck) => executeWithAck(unsafeAck, (ack) => {
      const parsed = schema.safeParse(payload);
      if (!parsed.success) return ack(invalidPayload());
      const response = runIdempotent<object>(
        idempotency,
        socket.data.playerId,
        event,
        parsed.data.requestId,
        () => {
          const room = rooms.getByPlayer(socket.data.playerId);
          if (!room || room.status !== "playing") return { ok: false, error: "NOT_IN_ROOM" };
          const record = games.getRecord(room.code);
          if (
            !record?.state.pendingTurn ||
            (event === "turn:jump") !== (record.state.pendingTurn.mode === "deadEnd")
          ) {
            return { ok: false, error: "INVALID_TILE" };
          }
          const result = runtime.choose(
            room,
            socket.data.playerId,
            parsed.data.turnId,
            parsed.data.hex,
          );
          return result.ok ? { ok: true } : { ok: false, error: result.error, message: result.message };
        },
      );
      ack(response);
    }));
  };
  registerMove("turn:choose", TurnChooseRequestSchema);
  registerMove("turn:jump", TurnJumpRequestSchema);

  socket.on("invite:send", (payload, unsafeAck) => executeWithAck<{ inviteId: string; deadline: number }>(unsafeAck, (ack) => {
    const parsed = InviteSendRequestSchema.safeParse(payload);
    if (!parsed.success) return ack({ ok: false, error: "INVALID_PAYLOAD" });
    const response = runIdempotent<{ inviteId: string; deadline: number }>(
      idempotency,
      socket.data.playerId,
      "invite:send",
      parsed.data.requestId,
      () => {
        const room = rooms.getByPlayer(socket.data.playerId);
        if (!room || room.status !== "playing") return { ok: false, error: "NOT_IN_ROOM" };
        const result = runtime.sendInvite(
          room,
          socket.data.playerId,
          parsed.data.cardId,
          parsed.data.targetPlayerId,
        );
        return result.ok
          ? { ok: true, inviteId: result.inviteId!, deadline: result.deadline! }
          : { ok: false, error: result.error, message: result.message };
      },
    );
    ack(response);
  }));

  socket.on("invite:respond", (payload, unsafeAck) => executeWithAck(unsafeAck, (ack) => {
    const parsed = InviteRespondRequestSchema.safeParse(payload);
    if (!parsed.success) return ack(invalidPayload());
    const response = runIdempotent<object>(
      idempotency,
      socket.data.playerId,
      "invite:respond",
      parsed.data.requestId,
      () => {
        const room = rooms.getByPlayer(socket.data.playerId);
        if (!room || room.status !== "playing") return { ok: false, error: "NOT_IN_ROOM" };
        const result = runtime.respondInvite(
          room,
          socket.data.playerId,
          parsed.data.inviteId,
          parsed.data.answer,
        );
        return result.ok ? { ok: true } : { ok: false, error: result.error, message: result.message };
      },
    );
    ack(response);
  }));

  socket.on("spectate:enter", (payload, unsafeAck) => executeWithAck<{ snapshot: ReturnType<typeof createSnapshot> }>(unsafeAck, (ack) => {
    const parsed = SpectateEnterRequestSchema.safeParse(payload);
    if (!parsed.success) return ack({ ok: false, error: "INVALID_PAYLOAD" });
    const room = rooms.getByPlayer(socket.data.playerId);
    if (!room || room.status !== "playing") return ack({ ok: false, error: "NOT_IN_ROOM" });
    const result = runtime.spectate(room.code, socket.data.playerId);
    if (!result.ok) return ack({ ok: false, error: result.error, message: result.message });
    ack({
      ok: true,
      snapshot: createSnapshot(
        room,
        socket.data.playerId,
        games.getRecord(room.code),
      ),
    });
  }));

  socket.on("emote:send", (payload, unsafeAck) => executeWithAck(unsafeAck, (ack) => {
    const parsed = EmoteSendRequestSchema.safeParse(payload);
    if (!parsed.success || !allowedEmotes.has(parsed.data.emoteId)) {
      return ack(invalidPayload());
    }
    const response = runIdempotent<object>(
      idempotency,
      socket.data.playerId,
      "emote:send",
      parsed.data.requestId,
      () => {
        const room = rooms.getByPlayer(socket.data.playerId);
        if (!room) return { ok: false, error: "NOT_IN_ROOM" };
        const now = Date.now();
        if (now - lastEmoteAt < 1_000) return { ok: false, error: "RATE_LIMITED" };
        lastEmoteAt = now;
        const shown = { playerId: socket.data.playerId, emoteId: parsed.data.emoteId, at: now };
        socket.emit("emote:shown", shown);
        socket.to(room.code).emit("emote:shown", shown);
        return { ok: true };
      },
    );
    ack(response);
  }));
}