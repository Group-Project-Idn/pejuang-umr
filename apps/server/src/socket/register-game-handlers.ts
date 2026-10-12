import {
  ClientEventSchemas,
  type Ack,
  type ClientToServerEvents,
  type InterServerEvents,
  type ServerToClientEvents,
  type Snapshot,
  type SocketData,
} from "@pejuang/shared";
import type { Server, Socket } from "socket.io";
import type { GameSession } from "../game/game-session";
import type { GameRepository } from "../repositories/game-repository";
import type { IdempotencyRepository } from "../repositories/idempotency-repository";
import type { RoomRepository } from "../repositories/room-repository";
import { createSnapshot } from "../services/snapshot";
import { executeWithAck } from "./safe-handler";

type GameSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

type GameAction =
  | "calendar:answer"
  | "turn:choose"
  | "turn:jump"
  | "invite:send"
  | "invite:respond"
  | "month:pay-debt";

/** Handler aksi pemain selama game. `idempotency` memakai jendela 60 detik (API_CONTRACT 1.3). */
export function registerGameHandlers(
  _io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
  socket: GameSocket,
  rooms: RoomRepository,
  games: GameRepository,
  idempotency: IdempotencyRepository,
): void {
  const register = (
    event: GameAction,
    run: (session: GameSession, playerId: string, payload: never) => Ack<object>,
  ) => {
    // Tipe handler dibuat longgar karena beberapa event berbagi satu alur yang sama.
    (socket as unknown as { on(e: string, h: (p: unknown, a: unknown) => void): void }).on(
      event,
      (payload, unsafeAck) =>
        executeWithAck<object>(unsafeAck as never, (ack) => {
          const parsed = ClientEventSchemas[event].safeParse(payload);
          if (!parsed.success) return ack({ ok: false, error: "INVALID_PAYLOAD" });
          const data = parsed.data as { requestId: string };
          const playerId = socket.data.playerId;
          const cached = idempotency.get<Ack>(playerId, event, data.requestId);
          if (cached) return ack(cached);

          const room = rooms.getByPlayer(playerId);
          const session = room ? games.get(room.code) : null;
          const response: Ack = session
            ? run(session, playerId, parsed.data as never)
            : { ok: false, error: "INVALID_PAYLOAD" };
          ack(idempotency.set(playerId, event, data.requestId, response));
        }),
    );
  };

  register("calendar:answer", (session, playerId, p: { eventId: string; choice: never }) =>
    session.answerCalendar(playerId, p.eventId, p.choice),
  );
  register("turn:choose", (session, playerId, p: { turnId: string; hex: never }) =>
    session.move(playerId, p.turnId, p.hex, "choose"),
  );
  register("turn:jump", (session, playerId, p: { turnId: string; hex: never }) =>
    session.move(playerId, p.turnId, p.hex, "jump"),
  );

  register("month:pay-debt", (session, playerId, p: { month: number; amount: number }) =>
    session.payMonthDebt(playerId, p.month, p.amount),
  );

  register("invite:send", (session, playerId, p: { cardId: string; targetPlayerId: string }) =>
    session.sendInvite(playerId, p.cardId, p.targetPlayerId),
  );
  register("invite:respond", (session, playerId, p: { inviteId: string; answer: "join" | "decline" }) =>
    session.respondInvite(playerId, p.inviteId, p.answer),
  );

  // Tanpa cache idempotensi: memanggil ulang selalu aman dan snapshot-nya harus segar.
  socket.on("spectate:enter", (payload, unsafeAck) =>
    executeWithAck<{ snapshot: Snapshot }>(unsafeAck, (ack) => {
      if (!ClientEventSchemas["spectate:enter"].safeParse(payload).success) {
        return ack({ ok: false, error: "INVALID_PAYLOAD" });
      }
      const playerId = socket.data.playerId;
      const room = rooms.getByPlayer(playerId);
      if (!room) return ack({ ok: false, error: "NOT_IN_ROOM" });
      const session = games.get(room.code);
      if (!session) return ack({ ok: false, error: "NOT_ELIMINATED" });
      const entered = session.enterSpectate(playerId);
      if (!entered.ok) return ack(entered as never);
      ack({ ok: true, snapshot: createSnapshot(room, playerId, session) });
    }),
  );
}
