import { once } from "node:events";
import type { AddressInfo } from "node:net";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "@pejuang/shared";
import { io as createClient, type Socket } from "socket.io-client";
import { afterEach, describe, expect, it } from "vitest";
import { createGuestToken, verifyGuestToken } from "./services/guest-token";
import { createPejuangServer } from "./server";

const secret = "test-secret-with-at-least-thirty-two-characters";
const openServers: Array<ReturnType<typeof createPejuangServer>> = [];
const openSockets: Array<Socket<ServerToClientEvents, ClientToServerEvents>> = [];

function waitForSocketEvent<T>(
  socket: Socket<ServerToClientEvents, ClientToServerEvents>,
  event: "connect" | "connect_error",
): Promise<T> {
  return new Promise((resolve) => socket.once(event, resolve as never));
}

afterEach(async () => {
  for (const socket of openSockets.splice(0)) socket.disconnect();
  for (const server of openServers.splice(0)) {
    await new Promise<void>((resolve) => server.io.close(() => resolve()));
  }
});

async function startServer() {
  const server = createPejuangServer({
    port: 0,
    webOrigin: "http://localhost:3000",
    guestTokenSecret: secret,
    version: "test",
  });
  openServers.push(server);
  server.httpServer.listen(0);
  await once(server.httpServer, "listening");
  const address = server.httpServer.address() as AddressInfo;
  return { baseUrl: `http://127.0.0.1:${address.port}` };
}

describe("server foundation", () => {
  it("membuat dan memverifikasi guest token", () => {
    const created = createGuestToken(
      { name: "Raka", avatarId: "avatar-01" },
      secret,
      1_000,
    );
    expect(verifyGuestToken(created.token, secret, 2_000)).toMatchObject({
      playerId: created.identity.playerId,
      name: "Raka",
    });
    expect(verifyGuestToken(`${created.token}rusak`, secret, 2_000)).toBeNull();
    expect(verifyGuestToken(created.token, secret, created.expiresAt)).toBeNull();
  });

  it("menyediakan health endpoint sesuai contract", async () => {
    const { baseUrl } = await startServer();
    const response = await fetch(`${baseUrl}/health`, {
      headers: { origin: "http://localhost:3000" },
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe(
      "http://localhost:3000",
    );
    await expect(response.json()).resolves.toMatchObject({
      status: "ok",
      version: "test",
    });
  });

  it("membuat guest dan mempertahankan playerId saat update", async () => {
    const { baseUrl } = await startServer();
    const firstResponse = await fetch(`${baseUrl}/api/v1/guest`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Raka", avatarId: "avatar-01" }),
    });
    const first = (await firstResponse.json()) as {
      playerId: string;
      token: string;
    };
    expect(firstResponse.status).toBe(201);

    const updateResponse = await fetch(`${baseUrl}/api/v1/guest`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${first.token}`,
      },
      body: JSON.stringify({ name: "Raka Baru", avatarId: "avatar-02" }),
    });
    const updated = (await updateResponse.json()) as { playerId: string };
    expect(updateResponse.status).toBe(201);
    expect(updated.playerId).toBe(first.playerId);
  });

  it("menolak socket tanpa token dan menerima socket bertoken", async () => {
    const { baseUrl } = await startServer();
    const unauthorized: Socket<ServerToClientEvents, ClientToServerEvents> =
      createClient(baseUrl, {
      transports: ["websocket"],
      reconnection: false,
      });
    openSockets.push(unauthorized);
    const connectError = await waitForSocketEvent<Error>(
      unauthorized,
      "connect_error",
    );
    expect(connectError.message).toBe("UNAUTHORIZED");

    const guest = createGuestToken(
      { name: "Sinta", avatarId: "avatar-03" },
      secret,
    );
    const authorized: Socket<ServerToClientEvents, ClientToServerEvents> =
      createClient(baseUrl, {
      transports: ["websocket"],
      auth: { token: guest.token },
      reconnection: false,
      });
    openSockets.push(authorized);
    await waitForSocketEvent<void>(authorized, "connect");

    const response = await authorized.timeout(1_000).emitWithAck("ping:test", {
      name: "Pejuang UMR",
    });
    expect(response).toEqual({
      ok: true,
      message: "Halo Pejuang UMR, server menerima pesanmu",
    });
  });
});

describe("guest endpoint validation", () => {
  it("menolak nama 1 karakter dengan INVALID_PAYLOAD", async () => {
    const { baseUrl } = await startServer();
    const response = await fetch(`${baseUrl}/api/v1/guest`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "A", avatarId: "avatar-01" }),
    });
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: "INVALID_PAYLOAD",
    });
  });

  it("menolak karakter terlarang pada nama dengan INVALID_PAYLOAD", async () => {
    const { baseUrl } = await startServer();
    const response = await fetch(`${baseUrl}/api/v1/guest`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Raka@123", avatarId: "avatar-01" }),
    });
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: "INVALID_PAYLOAD",
    });
  });

  it("menolak kata kasar dengan NAME_REJECTED", async () => {
    const { baseUrl } = await startServer();
    const response = await fetch(`${baseUrl}/api/v1/guest`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "bangsat", avatarId: "avatar-01" }),
    });
    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: "NAME_REJECTED",
    });
  });

  it("membatasi 10 request per menit per IP dan mengembalikan RATE_LIMITED pada request ke-11", async () => {
    const { baseUrl } = await startServer();
    const statuses: number[] = [];
    for (let index = 0; index < 11; index += 1) {
      const response = await fetch(`${baseUrl}/api/v1/guest`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: `Pejuang${index}`,
          avatarId: "avatar-01",
        }),
      });
      statuses.push(response.status);
    }
    expect(statuses.slice(0, 10).every((status) => status === 201)).toBe(true);
    expect(statuses[10]).toBe(429);
  });

  it("menolak token palsu pada Authorization dengan UNAUTHORIZED", async () => {
    const { baseUrl } = await startServer();
    const response = await fetch(`${baseUrl}/api/v1/guest`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer token.palsu.123",
      },
      body: JSON.stringify({ name: "Raka", avatarId: "avatar-01" }),
    });
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: "UNAUTHORIZED",
    });
  });

  it("menolak token kedaluwarsa pada Authorization dengan UNAUTHORIZED", async () => {
    const { baseUrl } = await startServer();
    const expired = createGuestToken(
      { name: "Raka", avatarId: "avatar-01" },
      secret,
      Date.now() - 8 * 24 * 60 * 60 * 1000,
    );
    const response = await fetch(`${baseUrl}/api/v1/guest`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${expired.token}`,
      },
      body: JSON.stringify({ name: "Raka Baru", avatarId: "avatar-02" }),
    });
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: "UNAUTHORIZED",
    });
  });

  it("mengembalikan kontrak 201 lengkap saat sesi dibuat", async () => {
    const { baseUrl } = await startServer();
    const response = await fetch(`${baseUrl}/api/v1/guest`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Raka", avatarId: "avatar-01" }),
    });
    expect(response.status).toBe(201);
    const body = (await response.json()) as {
      ok: boolean;
      playerId: string;
      name: string;
      avatarId: string;
      token: string;
      expiresAt: number;
    };
    expect(body.ok).toBe(true);
    expect(body.name).toBe("Raka");
    expect(body.avatarId).toBe("avatar-01");
    expect(typeof body.playerId).toBe("string");
    expect(body.playerId.length).toBeGreaterThan(0);
    expect(typeof body.token).toBe("string");
    expect(body.expiresAt).toBeGreaterThan(Date.now());
  });
});

describe("socket handshake auth", () => {
  it("menolak token palsu saat handshake dengan connect_error UNAUTHORIZED", async () => {
    const { baseUrl } = await startServer();
    const socket: Socket<ServerToClientEvents, ClientToServerEvents> =
      createClient(baseUrl, {
        transports: ["websocket"],
        auth: { token: "token.palsu.123" },
        reconnection: false,
      });
    openSockets.push(socket);
    const connectError = await waitForSocketEvent<Error>(
      socket,
      "connect_error",
    );
    expect(connectError.message).toBe("UNAUTHORIZED");
  });

  it("menolak token kedaluwarsa saat handshake dengan connect_error UNAUTHORIZED", async () => {
    const { baseUrl } = await startServer();
    const expired = createGuestToken(
      { name: "Sinta", avatarId: "avatar-03" },
      secret,
      Date.now() - 8 * 24 * 60 * 60 * 1000,
    );
    const socket: Socket<ServerToClientEvents, ClientToServerEvents> =
      createClient(baseUrl, {
        transports: ["websocket"],
        auth: { token: expired.token },
        reconnection: false,
      });
    openSockets.push(socket);
    const connectError = await waitForSocketEvent<Error>(
      socket,
      "connect_error",
    );
    expect(connectError.message).toBe("UNAUTHORIZED");
  });
});