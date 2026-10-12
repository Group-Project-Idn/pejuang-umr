import {
  CalendarEventPayloadSchema,
  CalendarResultPayloadSchema,
  DeadEndPayloadSchema,
  DoomTriggeredPayloadSchema,
  GameFinishedPayloadSchema,
  GamePatchPayloadSchema,
  GoldExpiredPayloadSchema,
  GoldSpawnedPayloadSchema,
  InviteCardPushPayloadSchema,
  InviteIncomingPayloadSchema,
  InviteResolvedPayloadSchema,
  MonthSummaryPayloadSchema,
  PlayerEliminatedPayloadSchema,
  PrivateStatusSchema,
  RoundRevealPayloadSchema,
  SeasonChangedPayloadSchema,
  TileOpenedPayloadSchema,
  TileResolvedPayloadSchema,
  TurnOptionsPayloadSchema,
  TurnStartPayloadSchema,
  type ClientToServerEvents,
  type InterServerEvents,
  type ServerToClientEvents,
  type SocketData,
} from "@pejuang/shared";
import type { DomainEvent } from "@pejuang/engine";
import type { Server } from "socket.io";
import type { GameSession } from "./game-session";

type GameServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

interface PayloadSchema {
  safeParse(data: unknown): { success: true; data: unknown } | { success: false };
}

/** Skema payload per nama event S→C. Event baru dari engine cukup ditambahkan di sini. */
const PAYLOAD_SCHEMAS: Partial<Record<keyof ServerToClientEvents, PayloadSchema>> = {
  "game:patch": GamePatchPayloadSchema,
  "game:finished": GameFinishedPayloadSchema,
  "season:changed": SeasonChangedPayloadSchema,
  "month:summary": MonthSummaryPayloadSchema,
  "doom:triggered": DoomTriggeredPayloadSchema,
  "player:eliminated": PlayerEliminatedPayloadSchema,
  "player:status": PrivateStatusSchema,
  "calendar:event": CalendarEventPayloadSchema,
  "calendar:result": CalendarResultPayloadSchema,
  "turn:start": TurnStartPayloadSchema,
  "turn:options": TurnOptionsPayloadSchema,
  "turn:dead-end": DeadEndPayloadSchema,
  "tile:opened": TileOpenedPayloadSchema,
  "tile:resolved": TileResolvedPayloadSchema,
  "round:reveal": RoundRevealPayloadSchema,
  "gold:spawned": GoldSpawnedPayloadSchema,
  "gold:expired": GoldExpiredPayloadSchema,
  "invite:card": InviteCardPushPayloadSchema,
  "invite:incoming": InviteIncomingPayloadSchema,
  "invite:resolved": InviteResolvedPayloadSchema,
};

/** Event room yang tidak dikirim ke penonton: ia tidak ikut bermain (GDD 9.4). */
const HIDDEN_FROM_SPECTATORS = new Set<string>(["calendar:event"]);

interface Emitter {
  emit(event: string, payload: unknown): unknown;
}

/**
 * Meneruskan event engine ke klien. Room: diberi version berurutan lalu dikirim ke channel room.
 * Pemain: hanya ke socket miliknya (bila putus, ia mendapat snapshot saat resume).
 * Payload yang gagal validasi tidak dikirim.
 */
export function dispatch(
  io: GameServer,
  session: GameSession,
  events: readonly DomainEvent[],
): void {
  for (const event of events) {
    const schema = PAYLOAD_SCHEMAS[event.type];
    if (!schema) {
      console.error(`[event-dispatcher] event tanpa skema, tidak dikirim: ${event.type}`);
      continue;
    }
    const raw =
      event.target.kind === "room"
        ? { ...(event.payload as object), version: session.nextVersion() }
        : event.payload;
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      console.error(`[event-dispatcher] payload ${event.type} gagal validasi, tidak dikirim`);
      continue;
    }
    session.recordEvent(event, parsed.data);
    if (event.target.kind === "room") {
      if (HIDDEN_FROM_SPECTATORS.has(event.type)) {
        for (const socket of io.sockets.sockets.values()) {
          if (socket.rooms.has(session.roomCode) && !session.isSpectator(socket.data.playerId)) {
            (socket as unknown as Emitter).emit(event.type, parsed.data);
          }
        }
      } else {
        (io.to(session.roomCode) as unknown as Emitter).emit(event.type, parsed.data);
      }
      continue;
    }
    const { playerId } = event.target;
    for (const socket of io.sockets.sockets.values()) {
      if (socket.data.playerId === playerId) {
        (socket as unknown as Emitter).emit(event.type, parsed.data);
      }
    }
  }
}
