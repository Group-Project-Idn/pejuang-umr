import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "@pejuang/shared";
import { io, type Socket } from "socket.io-client";
import { getServerUrl } from "./config";

export type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

type ConnectionSocket = Pick<
  GameSocket,
  "connected" | "connect" | "once" | "off"
>;

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

export function connectGameSocket(
  token: string,
  timeoutMs = 5_000,
): Promise<GameSocket> {
  const gameSocket = getSocket(token);
  return waitForSocketConnection(gameSocket, timeoutMs);
}

export function waitForSocketConnection<T extends ConnectionSocket>(
  gameSocket: T,
  timeoutMs = 5_000,
): Promise<T> {
  if (gameSocket.connected) return Promise.resolve(gameSocket);

  return new Promise((resolve, reject) => {
    const cleanup = () => {
      globalThis.clearTimeout(timeout);
      gameSocket.off("connect", onConnect);
      gameSocket.off("connect_error", onConnectError);
    };
    const onConnect = () => {
      cleanup();
      resolve(gameSocket);
    };
    const onConnectError = () => {
      cleanup();
      reject(new Error("HEALTH_CHECK_FAILED"));
    };
    const timeout = globalThis.setTimeout(() => {
      cleanup();
      reject(new Error("HEALTH_CHECK_FAILED"));
    }, timeoutMs);

    gameSocket.once("connect", onConnect);
    gameSocket.once("connect_error", onConnectError);
    gameSocket.connect();
  });
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
  currentToken = null;
}