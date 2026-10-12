import type { IncomingMessage, ServerResponse } from "node:http";
import {
  GuestRequestSchema,
  RoomCodeSchema,
  type RoomLookupResponse,
} from "@pejuang/shared";
import type { ServerConfig } from "../config";
import type { RoomRepository } from "../repositories/room-repository";
import { createGuestToken, verifyGuestToken } from "../services/guest-token";
import { isNameRejected } from "../services/name-filter";
import { FixedWindowRateLimiter } from "../services/rate-limit";
import { readJsonBody } from "./body";
import { sendError, sendJson } from "./response";

function getBearerToken(request: IncomingMessage): string | null {
  const authorization = request.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) return null;
  return authorization.slice("Bearer ".length).trim() || null;
}

function getClientIp(request: IncomingMessage, trustProxy: boolean): string {
  if (trustProxy) {
    const forwarded = request.headers["x-forwarded-for"];
    if (typeof forwarded === "string") {
      const first = forwarded.split(",")[0]?.trim();
      if (first) return first;
    }
  }
  return request.socket.remoteAddress ?? "unknown";
}

async function handleGuest(
  request: IncomingMessage,
  response: ServerResponse,
  config: ServerConfig,
  rooms: RoomRepository,
  rateLimiter: FixedWindowRateLimiter,
): Promise<void> {
  if (!rateLimiter.consume(getClientIp(request, config.trustProxy))) {
    sendError(response, 429, "RATE_LIMITED", "Pelan-pelan dulu, coba sebentar lagi.");
    return;
  }

  let rawBody: unknown;
  try {
    rawBody = await readJsonBody(request);
  } catch {
    sendError(response, 400, "INVALID_PAYLOAD", "Ada yang salah. Coba lagi.");
    return;
  }

  const parsed = GuestRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    sendError(response, 400, "INVALID_PAYLOAD", "Ada yang salah. Coba lagi.");
    return;
  }

  if (isNameRejected(parsed.data.name)) {
    sendError(response, 422, "NAME_REJECTED", "Nama ini tidak bisa dipakai.");
    return;
  }

  const bearerToken = getBearerToken(request);
  const existingIdentity = bearerToken
    ? verifyGuestToken(bearerToken, config.guestTokenSecret)
    : null;

  if (bearerToken && !existingIdentity) {
    sendError(response, 401, "UNAUTHORIZED", "Sesi habis. Masuk sebagai tamu lagi.");
    return;
  }

  // Ubah nama hanya di Lobby (API_CONTRACT §4.1). Token valid yang pemainnya
  // masih tercatat di Room atau game tidak boleh ganti nama.
  if (existingIdentity && rooms.getByPlayer(existingIdentity.playerId)) {
    sendError(response, 409, "ALREADY_IN_ROOM", "Ubah nama hanya bisa di Lobby.");
    return;
  }

  const created = createGuestToken(
    {
      playerId: existingIdentity?.playerId,
      name: parsed.data.name,
      avatarId: parsed.data.avatarId,
    },
    config.guestTokenSecret,
  );

  sendJson(response, 201, {
    ok: true,
    ...created.identity,
    token: created.token,
    expiresAt: created.expiresAt,
  });
}

function handleRoomLookup(
  request: IncomingMessage,
  response: ServerResponse,
  config: ServerConfig,
  rooms: RoomRepository,
  code: string,
): void {
  const normalized = code.toUpperCase();
  if (!RoomCodeSchema.safeParse(normalized).success) {
    sendError(response, 400, "INVALID_PAYLOAD", "Kode room tidak valid.");
    return;
  }

  const room = rooms.get(normalized);
  if (!room) {
    sendError(response, 404, "ROOM_NOT_FOUND", "Kode room tidak ketemu.");
    return;
  }

  const playerCount = room.players.length;
  const joinable = room.status === "waiting" && playerCount < room.maxPlayers;
  const reason = room.status !== "waiting"
    ? "ROOM_LOCKED"
    : playerCount >= room.maxPlayers
      ? "ROOM_FULL"
      : null;

  const bearerToken = getBearerToken(request);
  const identity = bearerToken
    ? verifyGuestToken(bearerToken, config.guestTokenSecret)
    : null;

  const body: RoomLookupResponse = {
    ok: true,
    code: room.code,
    status: room.status,
    playerCount,
    maxPlayers: room.maxPlayers,
    joinable,
    reason,
    ...(identity
      ? {
          isMember: room.players.some(
            (player) => player.playerId === identity.playerId,
          ),
        }
      : {}),
  };

  sendJson(response, 200, body);
}

export function createHttpHandler(config: ServerConfig, rooms: RoomRepository) {
  const rateLimiter = new FixedWindowRateLimiter(10, 60_000);
  return async (request: IncomingMessage, response: ServerResponse) => {
    const url = new URL(request.url ?? "/", "http://localhost");
    const origin = request.headers.origin;
    if (origin === config.webOrigin) {
      response.setHeader("access-control-allow-origin", origin);
      response.setHeader("vary", "Origin");
      response.setHeader(
        "access-control-allow-headers",
        "authorization, content-type",
      );
      response.setHeader("access-control-allow-methods", "GET, POST, OPTIONS");
    }

    if (request.method === "OPTIONS") {
      response.writeHead(204);
      response.end();
      return;
    }

    if (request.method === "GET" && url.pathname === "/health") {
      sendJson(response, 200, {
        status: "ok",
        uptime: process.uptime(),
        version: config.version,
        serverTime: Date.now(),
      });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/v1/guest") {
      await handleGuest(request, response, config, rooms, rateLimiter);
      return;
    }

    const roomMatch = url.pathname.match(/^\/api\/v1\/rooms\/([^/]+)$/);
    if (request.method === "GET" && roomMatch) {
      handleRoomLookup(request, response, config, rooms, roomMatch[1]!);
      return;
    }

    sendError(response, 404, "INVALID_PAYLOAD", "Rute tidak dikenal.");
  };
}
