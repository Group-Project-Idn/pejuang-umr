import type { IncomingMessage, ServerResponse } from "node:http";
import { GuestRequestSchema } from "@pejuang/shared";
import type { ServerConfig } from "../config";
import type { RoomRepository } from "../repositories/room-repository";
import { createGuestToken, verifyGuestToken } from "../services/guest-token";
import { isNameRejected } from "../services/name-filter";
import { FixedWindowRateLimiter } from "../services/rate-limit";
import { readJsonBody } from "./body";
import { sendError, sendJson } from "./response";

const guestRateLimiter = new FixedWindowRateLimiter(10, 60_000);

function getBearerToken(request: IncomingMessage): string | null {
  const authorization = request.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) return null;
  return authorization.slice("Bearer ".length).trim() || null;
}

function getClientIp(request: IncomingMessage): string {
  const forwarded = request.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0]!.trim();
  return request.socket.remoteAddress ?? "unknown";
}

async function handleGuest(
  request: IncomingMessage,
  response: ServerResponse,
  config: ServerConfig,
): Promise<void> {
  if (!guestRateLimiter.consume(getClientIp(request))) {
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

export function createHttpHandler(config: ServerConfig, rooms: RoomRepository) {
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
      await handleGuest(request, response, config);
      return;
    }

    const roomMatch = url.pathname.match(/^\/api\/v1\/rooms\/(UMR-\d{4})$/);
    if (request.method === "GET" && roomMatch) {
      const room = rooms.get(roomMatch[1]!);
      if (!room) {
        sendError(response, 404, "ROOM_NOT_FOUND", "Room tidak ditemukan.");
        return;
      }
      sendJson(response, 200, { ok: true, room });
      return;
    }

    sendJson(response, 404, { ok: false, error: "ROOM_NOT_FOUND" });
  };
}
