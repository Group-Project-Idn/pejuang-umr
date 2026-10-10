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
import { verifyGuestToken } from "./services/guest-token";

export function createPejuangServer(config: ServerConfig) {
  const httpServer = createNodeServer(createHttpHandler(config));
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

    socket.on("ping:test", (payload, ack) => {
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

    socket.on("disconnect", () => {
      if (activeSockets.get(socket.data.playerId) === socket.id) {
        activeSockets.delete(socket.data.playerId);
      }
    });
  });

  return { httpServer, io };
}