import { once } from "node:events";
import type { AddressInfo } from "node:net";
import {
  DEV_ROOM_CODE,
  GameFinishedPayloadSchema,
  type ClientToServerEvents,
  type ServerToClientEvents,
} from "@pejuang/shared";
import { io as createClient, type Socket } from "socket.io-client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ServerConfig } from "../config";
import { RoomRepository } from "../repositories/room-repository";
import { createPejuangServer } from "../server";
import { createGuestToken } from "../services/guest-token";

const secret = "test-secret-with-at-least-thirty-two-characters";
type TestSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
type Received = { type: string; payload: any };

const openServers: Array<ReturnType<typeof createPejuangServer>> = [];
const openSockets: TestSocket[] = [];

afterEach(async () => {
  vi.unstubAllEnvs();
  for (const socket of openSockets.splice(0)) socket.disconnect();
  for (const server of openServers.splice(0)) {
    await new Promise<void>((resolve) => server.io.close(() => resolve()));
  }
});

let counter = 0;
const rid = () => `00000000-0000-4000-8000-${String(++counter).padStart(12, "0")}`;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor(condition: () => boolean, label: string, timeoutMs = 3_000) {
  const startedAt = Date.now();
  while (!condition()) {
    if (Date.now() - startedAt > timeoutMs) throw new Error(`Timeout menunggu ${label}`);
    await sleep(5);
  }
}

async function startServer(overrides: Partial<ServerConfig> = {}, rooms?: RoomRepository) {
  const server = createPejuangServer(
    {
      port: 0,
      webOrigin: "http://localhost:3000",
      guestTokenSecret: secret,
      version: "test",
      trustProxy: false,
      ...overrides,
    },
    {
      rooms,
      countdownMs: 5,
      createGameId: () => "game-dev",
      socketRateLimit: { max: 10_000, windowMs: 5_000 },
    },
  );
  openServers.push(server);
  server.httpServer.listen(0);
  await once(server.httpServer, "listening");
  const baseUrl = `http://127.0.0.1:${(server.httpServer.address() as AddressInfo).port}`;
  return { server, baseUrl };
}

function connect(baseUrl: string, name: string, avatarId: string) {
  const guest = createGuestToken({ name, avatarId }, secret);
  const socket: TestSocket = createClient(baseUrl, {
    transports: ["websocket"],
    auth: { token: guest.token },
    reconnection: false,
  });
  openSockets.push(socket);
  const log: Received[] = [];
  socket.onAny((type, payload) => log.push({ type, payload }));
  return { socket, log, playerId: guest.identity.playerId };
}

async function connected(baseUrl: string, name: string, avatarId: string) {
  const client = connect(baseUrl, name, avatarId);
  await new Promise<void>((resolve) => client.socket.once("connect", resolve));
  return client;
}

/** dev:finish-game bukan bagian dari tipe event produksi, jadi dipanggil lewat emitter longgar. */
type LooseSocket = {
  emitWithAck(event: string, payload: unknown): Promise<any>;
  timeout(ms: number): { emitWithAck(event: string, payload: unknown): Promise<any> };
};
const finishGame = (socket: TestSocket, payload: unknown = { requestId: rid() }) =>
  (socket as unknown as LooseSocket).emitWithAck("dev:finish-game", payload);
const finishGameTimeout = (socket: TestSocket, ms: number) =>
  (socket as unknown as LooseSocket).timeout(ms).emitWithAck("dev:finish-game", { requestId: rid() });

const join = (socket: TestSocket, roomCode: string) =>
  socket.emitWithAck("room:join", { requestId: rid(), roomCode });

/** Dua tamu masuk UMR-0099 (yang pertama host), tamu kedua siap, host memulai game. */
async function startDevGame(baseUrl: string, server: ReturnType<typeof createPejuangServer>) {
  const host = await connected(baseUrl, "Host Dev", "michael");
  const guest = await connected(baseUrl, "Tamu Dev", "raka");
  expect(await join(host.socket, DEV_ROOM_CODE)).toMatchObject({ ok: true });
  expect(await join(guest.socket, DEV_ROOM_CODE)).toMatchObject({ ok: true });
  await guest.socket.emitWithAck("room:ready", { requestId: rid(), ready: true });
  expect(await host.socket.emitWithAck("game:start", { requestId: rid() })).toEqual({ ok: true });
  await waitFor(() => server.rooms.get(DEV_ROOM_CODE)?.status === "playing", "game berjalan");
  return { host, guest };
}

const FORBIDDEN_KEYS = ["decisionLog", "pendingRealities", "goldOrigin", "goldQueue", "roundInvites", "tileId"];

function collectKeys(value: unknown, keys = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    for (const item of value) collectKeys(item, keys);
  } else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      keys.add(key);
      collectKeys(child, keys);
    }
  }
  return keys;
}

describe("room uji UMR-0099 (DEV_TOOLS=true)", () => {
  it("dua tamu masuk, yang pertama host, host menyelesaikan game dan keduanya menerima ranking valid", async () => {
    const { server, baseUrl } = await startServer({ devTools: true });
    const { host, guest } = await startDevGame(baseUrl, server);
    expect(server.rooms.get(DEV_ROOM_CODE)?.hostId).toBe(host.playerId);

    const loggedBefore = host.log.length;
    const ack = await finishGame(host.socket);
    expect(ack).toEqual({ ok: true });

    for (const client of [host, guest]) {
      await waitFor(() => client.log.some((x) => x.type === "game:finished"), "game:finished");
      const finished = client.log.find((x) => x.type === "game:finished")!;
      const parsed = GameFinishedPayloadSchema.parse(finished.payload);
      expect(parsed.ranking).toHaveLength(2);
      expect(parsed.ranking.map((row) => row.rank).sort()).toEqual([1, 2]);
      expect(new Set(parsed.ranking.map((row) => row.playerId))).toEqual(
        new Set([host.playerId, guest.playerId]),
      );
      // Tanpa siaran per langkah: langkah yang dilewati tidak pernah dikirim.
      const stepEvents = client.log
        .slice(loggedBefore)
        .filter((x) => ["round:reveal", "turn:options", "tile:opened", "tile:resolved"].includes(x.type));
      expect(stepEvents).toEqual([]);
      // Refleksi lewat jalur finish() yang sama, hanya milik pemain itu.
      await waitFor(() => client.log.some((x) => x.type === "reflection:ready"), "reflection:ready");
      const reflections = client.log.filter((x) => x.type === "reflection:ready");
      expect(reflections.every((x) => x.payload.playerId === client.playerId)).toBe(true);
    }
    expect(server.rooms.get(DEV_ROOM_CODE)?.status).toBe("finished");
    expect(server.games.get(DEV_ROOM_CODE)?.finished).toBe(true);

    // Privasi: tidak ada isi heksa tertutup / Realita / kunci internal yang terkirim.
    for (const client of [host, guest]) {
      const keys = collectKeys(client.log.map((x) => x.payload));
      for (const forbidden of FORBIDDEN_KEYS) expect(keys.has(forbidden), forbidden).toBe(false);
      const otherId = client === host ? guest.playerId : host.playerId;
      const leaked = client.log.filter(
        (x) =>
          ["calendar:result", "player:status", "month:summary"].includes(x.type) &&
          JSON.stringify(x.payload).includes(otherId),
      );
      expect(leaked).toEqual([]);
    }
  });

  it("non-host ditolak NOT_HOST dan game tetap berjalan; room lain ditolak", async () => {
    const { server, baseUrl } = await startServer({ devTools: true });
    const { host, guest } = await startDevGame(baseUrl, server);
    const ack = await finishGame(guest.socket);
    expect(ack).toMatchObject({ ok: false, error: "NOT_HOST" });
    expect(server.rooms.get(DEV_ROOM_CODE)?.status).toBe("playing");
    expect(host.log.some((x) => x.type === "game:finished")).toBe(false);

    const invalid = await finishGame(host.socket, {});
    expect(invalid).toMatchObject({ ok: false, error: "INVALID_PAYLOAD" });

    const outsider = await connected(baseUrl, "Luar", "sinta");
    expect(
      await finishGame(outsider.socket),
    ).toMatchObject({ ok: false, error: "NOT_IN_ROOM" });

    const owner = await connected(baseUrl, "Pemilik", "icha");
    const created = await owner.socket.emitWithAck("room:create", { requestId: rid() });
    expect(created.ok && created.room.code).not.toBe(DEV_ROOM_CODE);
    expect(
      await finishGame(owner.socket),
    ).toMatchObject({ ok: false, error: "ROOM_NOT_FOUND" });
  });

  it("ditolak saat belum bermain dan setelah game selesai", async () => {
    const { server, baseUrl } = await startServer({ devTools: true });
    const host = await connected(baseUrl, "Host Dev", "michael");
    await join(host.socket, DEV_ROOM_CODE);
    expect(
      await finishGame(host.socket),
    ).toMatchObject({ ok: false, error: "ROOM_LOCKED" });
    expect(server.rooms.get(DEV_ROOM_CODE)?.status).toBe("waiting");
  });

  it("lookup REST UMR-0099 saat kosong: bisa dimasuki", async () => {
    const { baseUrl } = await startServer({ devTools: true });
    const response = await fetch(`${baseUrl}/api/v1/rooms/${DEV_ROOM_CODE}`);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true,
      code: DEV_ROOM_CODE,
      status: "waiting",
      playerCount: 0,
      joinable: true,
    });
  });

  it("kembali ke status menunggu saat semua pemain keluar: pemain berikutnya jadi host", async () => {
    const { server, baseUrl } = await startServer({ devTools: true });
    const first = await connected(baseUrl, "Pertama", "michael");
    await join(first.socket, DEV_ROOM_CODE);
    expect(await first.socket.emitWithAck("room:leave", { requestId: rid() })).toEqual({ ok: true });
    expect(server.rooms.get(DEV_ROOM_CODE)).toBeNull();

    const second = await connected(baseUrl, "Kedua", "raka");
    const joined = await join(second.socket, DEV_ROOM_CODE);
    expect(joined.ok && joined.room).toMatchObject({
      code: DEV_ROOM_CODE,
      status: "waiting",
      hostId: second.playerId,
    });
  });

  it("setelah game selesai dan semua pemain terputus, room kembali menunggu (sesi game dibuang)", async () => {
    const { server, baseUrl } = await startServer({ devTools: true });
    const { host, guest } = await startDevGame(baseUrl, server);
    await finishGame(host.socket);
    await waitFor(() => server.rooms.get(DEV_ROOM_CODE)?.status === "finished", "status finished");
    host.socket.disconnect();
    guest.socket.disconnect();
    await waitFor(() => server.rooms.get(DEV_ROOM_CODE) === null, "room direset");
    expect(server.games.get(DEV_ROOM_CODE)).toBeNull();

    const next = await connected(baseUrl, "Baru", "sinta");
    const joined = await join(next.socket, DEV_ROOM_CODE);
    expect(joined.ok && joined.room).toMatchObject({ status: "waiting", hostId: next.playerId });
  });

  it("janitor tidak menutup UMR-0099, tetapi tetap menutup room biasa", async () => {
    const { server, baseUrl } = await startServer({ devTools: true, roomIdleMs: 1, roomEmptyMs: 1 });
    const dev = await connected(baseUrl, "Dev", "michael");
    await join(dev.socket, DEV_ROOM_CODE);
    const owner = await connected(baseUrl, "Biasa", "raka");
    const created = await owner.socket.emitWithAck("room:create", { requestId: rid() });
    const normalCode = created.ok ? created.room.code : "";
    expect(normalCode).not.toBe("");

    server.janitor.sweep();
    await sleep(20);
    server.janitor.sweep();
    expect(server.rooms.get(normalCode)).toBeNull();
    expect(server.rooms.get(DEV_ROOM_CODE)).not.toBeNull();
  });
});

describe("tanpa alat dev", () => {
  it("DEV_TOOLS=false: UMR-0099 tidak ada dan dev:finish-game tidak terdaftar", async () => {
    const { server, baseUrl } = await startServer({ devTools: false });
    const client = await connected(baseUrl, "Biasa", "michael");
    expect(await join(client.socket, DEV_ROOM_CODE)).toMatchObject({ ok: false, error: "ROOM_NOT_FOUND" });
    expect(server.rooms.get(DEV_ROOM_CODE)).toBeNull();
    const response = await fetch(`${baseUrl}/api/v1/rooms/${DEV_ROOM_CODE}`);
    expect(response.status).toBe(404);
    await expect(
      finishGameTimeout(client.socket, 150),
    ).rejects.toBeDefined();
  });

  it("NODE_ENV=production: event dev tidak terdaftar dan UMR-0099 tidak ada walau devTools true", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { server, baseUrl } = await startServer({ devTools: true });
    const client = await connected(baseUrl, "Biasa", "michael");
    expect(await join(client.socket, DEV_ROOM_CODE)).toMatchObject({ ok: false, error: "ROOM_NOT_FOUND" });
    expect(server.rooms.isDevRoomEnabled()).toBe(false);
    await expect(
      finishGameTimeout(client.socket, 150),
    ).rejects.toBeDefined();
  });

  it("kode UMR-0099 dicadangkan: room biasa tidak pernah memakainya", () => {
    const codes = [DEV_ROOM_CODE, DEV_ROOM_CODE, "UMR-1234"];
    const rooms = new RoomRepository(() => codes.shift()!);
    const identity = { playerId: "p1", name: "Satu", avatarId: "michael" };
    const created = rooms.create(identity);
    expect(created.ok && created.room.code).toBe("UMR-1234");
    expect(rooms.get(DEV_ROOM_CODE)).toBeNull();
  });
});
