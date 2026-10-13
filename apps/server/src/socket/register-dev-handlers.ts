import {
  DEV_ROOM_CODE,
  DevEventSchemas,
  type ClientToServerEvents,
  type InterServerEvents,
  type ServerToClientEvents,
  type SocketData,
} from "@pejuang/shared";
import type { Server, Socket } from "socket.io";
import type { GameRepository } from "../repositories/game-repository";
import type { RoomRepository } from "../repositories/room-repository";
import { executeWithAck } from "./safe-handler";

type DevSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

/**
 * Event dev (GDD v1.14). Hanya dipanggil server bila DEV_TOOLS=true; di luar itu event ini tidak
 * terdaftar sama sekali. `dev:finish-game`: host di room UMR-0099 saat game berjalan.
 */
export function registerDevHandlers(
  _io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
  socket: DevSocket,
  rooms: RoomRepository,
  games: GameRepository,
): void {
  (socket as unknown as { on(e: string, h: (p: unknown, a: unknown) => void): void }).on(
    "dev:finish-game",
    (payload, unsafeAck) =>
      executeWithAck<object>(unsafeAck as never, (ack) => {
        if (!DevEventSchemas["dev:finish-game"].safeParse(payload).success) {
          return ack({ ok: false, error: "INVALID_PAYLOAD" });
        }
        const room = rooms.getByPlayer(socket.data.playerId);
        if (!room) return ack({ ok: false, error: "NOT_IN_ROOM" });
        if (room.code !== DEV_ROOM_CODE) return ack({ ok: false, error: "ROOM_NOT_FOUND" });
        if (room.hostId !== socket.data.playerId) return ack({ ok: false, error: "NOT_HOST" });
        const session = games.get(room.code);
        if (room.status !== "playing" || !session) return ack({ ok: false, error: "ROOM_LOCKED" });
        if (session.finished) return ack({ ok: false, error: "GAME_FINISHED" });
        session.fastForwardToFinish();
        ack({ ok: true });
      }),
  );
}
