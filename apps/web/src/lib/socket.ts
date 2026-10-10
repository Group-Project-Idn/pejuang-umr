import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "@pejuang/shared";
import { io, type Socket } from "socket.io-client";
import { getServerUrl } from "./config";

export type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: GameSocket | null = null;
let currentToken: string | null = null;

export function getSocket(token: string): GameSocket {
  if (!socket) {
    socket = io(getServerUrl(), {
      autoConnect: false,
      auth: { token },
    });
    currentToken = token;
  } else if (currentToken !== token) {
    socket.disconnect();
    socket.auth = { token };
    currentToken = token;
  }

  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
  currentToken = null;
}