import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from "@pejuang/shared";
import type { Server } from "socket.io";
import type { GameRepository } from "../repositories/game-repository";

/** Menyiarkan player:connection; selama game berjalan membawa version berurutan. */
export function broadcastConnection(
  io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
  games: GameRepository,
  roomCode: string,
  playerId: string,
  connected: boolean,
): void {
  const session = games.get(roomCode);
  io.to(roomCode).emit("player:connection", {
    ...(session ? { version: session.nextVersion() } : {}),
    playerId,
    connected,
    at: Date.now(),
  });
}
