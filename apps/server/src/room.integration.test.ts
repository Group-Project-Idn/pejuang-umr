import { once } from "node:events";
import type { AddressInfo } from "node:net";
import type {
  ClientToServerEvents,
  RoomState,
  ServerToClientEvents,
} from "@pejuang/shared";
import { io as createClient, type Socket } from "socket.io-client";
import { afterEach, describe, expect, it } from "vitest";
import { RoomRepository } from "./repositories/room-repository";
import { createGuestToken } from "./services/guest-token";
import { createPejuangServer } from "./server";

const secret = "test-secret-with-at-least-thirty-two-characters";
const requestIds = [
  "00000000-0000-4000-8000-000000000001",
  "00000000-0000-4000-8000-000000000002",
  "00000000-0000-4000-8000-000000000003",
  "00000000-0000-4000-8000-000000000004",
  "00000000-0000-4000-8000-000000000005",
  "00000000-0000-4000-8000-000000000006",
  "00000000-0000-4000-8000-000000000007",
  "00000000-0000-4000-8000-000000000008",
];

type TestSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const openServers: Array<ReturnType<typeof createPejuangServer>> = [];
const openSockets: TestSocket[] = [];

function waitForConnect(socket: TestSocket): Promise<void> {
  return new Promise((resolve) => socket.once("connect", resolve));
}

afterEach(async () => {
  for (const socket of openSockets.splice(0)) socket.disconnect();
  for (const server of openServers.splice(0)) {
    await new Promise<void>((resolve) => server.io.close(() => resolve()));
  }
});

async function startServer() {
  const rooms = new RoomRepository(() => "UMR-1234");
  const server = createPejuangServer(
    {
      port: 0,
      webOrigin: "http://localhost:3000",
      guestTokenSecret: secret,
      version: "test",
    },
    { rooms, countdownMs: 5, createGameId: () => "game-test" },
  );
  openServers.push(server);
  server.httpServer.listen(0);
  await once(server.httpServer, "listening");
  const address = server.httpServer.address() as AddressInfo;
  return { server, baseUrl: `http://127.0.0.1:${address.port}` };
}

async function connectGuest(
  baseUrl: string,
  name: string,
  avatarId: string,
  playerId?: string,
): Promise<{ socket: TestSocket; playerId: string }> {
  const guest = createGuestToken({ name, avatarId, playerId }, secret);
  const socket: TestSocket = createClient(baseUrl, {
    transports: ["websocket"],
    auth: { token: guest.token },
    reconnection: false,
  });
  openSockets.push(socket);
  await waitForConnect(socket);
  return { socket, playerId: guest.identity.playerId };
}

function player(room: RoomState, playerId: string) {
  return room.players.find((candidate) => candidate.playerId === playerId)!;
}

describe("room lifecycle", () => {
  it("membuat, join, dan membaca room melalui REST", async () => {
    const { baseUrl } = await startServer();
    const host = await connectGuest(baseUrl, "Host", "avatar-01");
    const guest = await connectGuest(baseUrl, "Guest", "avatar-02");

    const created = await host.socket.emitWithAck("room:create", {
      requestId: requestIds[0]!,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.room).toMatchObject({
      code: "UMR-1234",
      hostId: host.playerId,
      canStart: false,
      startBlockReason: "NEED_MIN_PLAYERS",
    });

    const joined = await guest.socket.emitWithAck("room:join", {
      requestId: requestIds[1]!,
      roomCode: created.room.code,
    });
    expect(joined.ok).toBe(true);
    if (!joined.ok) return;
    expect(joined.room.players).toHaveLength(2);
    expect(joined.room.startBlockReason).toBe("WAITING_READY");

    const response = await fetch(`${baseUrl}/api/v1/rooms/UMR-1234`);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      room: { code: "UMR-1234", players: expect.any(Array) },
    });
  });

  it("menegakkan pawn unik, host authorization, dan ready state", async () => {
    const { baseUrl, server } = await startServer();
    const host = await connectGuest(baseUrl, "Host", "avatar-01");
    const guest = await connectGuest(baseUrl, "Guest", "avatar-02");

    await host.socket.emitWithAck("room:create", {
      requestId: requestIds[0]!,
    });
    await guest.socket.emitWithAck("room:join", {
      requestId: requestIds[1]!,
      roomCode: "UMR-1234",
    });

    const nonHostTimer = await guest.socket.emitWithAck("room:timer", {
      requestId: requestIds[2]!,
      turnSeconds: 60,
    });
    expect(nonHostTimer).toEqual({ ok: false, error: "NOT_HOST" });

    const hostPawn = await host.socket.emitWithAck("room:pawn", {
      requestId: requestIds[3]!,
      pawn: "cream-circle",
    });
    expect(hostPawn).toEqual({ ok: true });

    const duplicatePawn = await guest.socket.emitWithAck("room:pawn", {
      requestId: requestIds[4]!,
      pawn: "cream-circle",
    });
    expect(duplicatePawn).toEqual({ ok: false, error: "PAWN_TAKEN" });

    await guest.socket.emitWithAck("room:pawn", {
      requestId: requestIds[5]!,
      pawn: "iceblue-square",
    });
    await host.socket.emitWithAck("room:ready", {
      requestId: requestIds[6]!,
      ready: true,
    });
    await guest.socket.emitWithAck("room:ready", {
      requestId: requestIds[7]!,
      ready: true,
    });

    expect(server.rooms.get("UMR-1234")).toMatchObject({
      canStart: true,
      startBlockReason: null,
      players: [
        expect.objectContaining({ pawn: "cream-circle", ready: true }),
        expect.objectContaining({ pawn: "iceblue-square", ready: true }),
      ],
    });
  });

  it("mengembalikan response idempotent tanpa mutation kedua", async () => {
    const { baseUrl, server } = await startServer();
    const host = await connectGuest(baseUrl, "Host", "avatar-01");
    const requestId = requestIds[0]!;

    const first = await host.socket.emitWithAck("room:create", { requestId });
    const second = await host.socket.emitWithAck("room:create", { requestId });

    expect(first).toEqual(second);
    expect(server.rooms.get("UMR-1234")?.players).toHaveLength(1);
  });

  it("mempertahankan member saat disconnect dan memulihkan snapshot", async () => {
    const { baseUrl, server } = await startServer();
    const host = await connectGuest(baseUrl, "Host", "avatar-01");
    const created = await host.socket.emitWithAck("room:create", {
      requestId: requestIds[0]!,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    host.socket.disconnect();
    await new Promise((resolve) => setTimeout(resolve, 20));
    const disconnectedRoom = server.rooms.get(created.room.code)!;
    expect(player(disconnectedRoom, host.playerId).connected).toBe(false);

    const replacement = await connectGuest(
      baseUrl,
      "Host",
      "avatar-01",
      host.playerId,
    );

    const resumed = await replacement.socket.emitWithAck("session:resume", {
      requestId: requestIds[1]!,
      roomCode: created.room.code,
    });
    expect(resumed.ok).toBe(true);
    if (!resumed.ok) return;
    expect(resumed.snapshot.me.playerId).toBe(host.playerId);
    expect(resumed.snapshot.game).toBeNull();
    expect(player(resumed.snapshot.room, host.playerId).connected).toBe(true);
  });

  it("memindahkan host ketika host meninggalkan room", async () => {
    const { baseUrl, server } = await startServer();
    const host = await connectGuest(baseUrl, "Host", "avatar-01");
    const guest = await connectGuest(baseUrl, "Guest", "avatar-02");
    await host.socket.emitWithAck("room:create", {
      requestId: requestIds[0]!,
    });
    await guest.socket.emitWithAck("room:join", {
      requestId: requestIds[1]!,
      roomCode: "UMR-1234",
    });

    const left = await host.socket.emitWithAck("room:leave", {
      requestId: requestIds[2]!,
    });
    expect(left).toEqual({ ok: true });
    expect(server.rooms.get("UMR-1234")).toMatchObject({
      hostId: guest.playerId,
      players: [expect.objectContaining({ playerId: guest.playerId, isHost: true })],
    });
  });

  it("menolak pemain kelima ketika room penuh", async () => {
    const { baseUrl } = await startServer();
    const players = await Promise.all(
      [1, 2, 3, 4, 5].map((index) =>
        connectGuest(baseUrl, `Pemain ${index}`, `avatar-0${index}`),
      ),
    );
    await players[0]!.socket.emitWithAck("room:create", {
      requestId: requestIds[0]!,
    });
    for (let index = 1; index < 4; index += 1) {
      const joined = await players[index]!.socket.emitWithAck("room:join", {
        requestId: requestIds[index]!,
        roomCode: "UMR-1234",
      });
      expect(joined.ok).toBe(true);
    }
    const rejected = await players[4]!.socket.emitWithAck("room:join", {
      requestId: requestIds[4]!,
      roomCode: "UMR-1234",
    });
    expect(rejected).toEqual({ ok: false, error: "ROOM_FULL" });
  });

  it("memvalidasi host dan readiness sebelum start", async () => {
    const { baseUrl } = await startServer();
    const host = await connectGuest(baseUrl, "Host", "avatar-01");
    const guest = await connectGuest(baseUrl, "Guest", "avatar-02");
    await host.socket.emitWithAck("room:create", {
      requestId: requestIds[0]!,
    });
    await guest.socket.emitWithAck("room:join", {
      requestId: requestIds[1]!,
      roomCode: "UMR-1234",
    });

    const nonHostKick = await guest.socket.emitWithAck("room:kick", {
      requestId: requestIds[2]!,
      targetPlayerId: host.playerId,
    });
    expect(nonHostKick).toEqual({ ok: false, error: "NOT_HOST" });
    const nonHostStart = await guest.socket.emitWithAck("game:start", {
      requestId: requestIds[3]!,
    });
    expect(nonHostStart).toEqual({ ok: false, error: "NOT_HOST" });
    const notReady = await host.socket.emitWithAck("game:start", {
      requestId: requestIds[4]!,
    });
    expect(notReady).toEqual({ ok: false, error: "PLAYERS_NOT_READY" });
  });

  it("memulai game authoritative dan mengirim payload sama ke semua client", async () => {
    const { baseUrl, server } = await startServer();
    const host = await connectGuest(baseUrl, "Host", "avatar-01");
    const guest = await connectGuest(baseUrl, "Guest", "avatar-02");
    await host.socket.emitWithAck("room:create", {
      requestId: requestIds[0]!,
    });
    await guest.socket.emitWithAck("room:join", {
      requestId: requestIds[1]!,
      roomCode: "UMR-1234",
    });
    await host.socket.emitWithAck("room:pawn", {
      requestId: requestIds[2]!,
      pawn: "cream-circle",
    });
    await guest.socket.emitWithAck("room:pawn", {
      requestId: requestIds[3]!,
      pawn: "iceblue-square",
    });
    await host.socket.emitWithAck("room:ready", {
      requestId: requestIds[4]!,
      ready: true,
    });
    await guest.socket.emitWithAck("room:ready", {
      requestId: requestIds[5]!,
      ready: true,
    });

    const hostStarted = new Promise<Parameters<ServerToClientEvents["game:started"]>[0]>(
      (resolve) => host.socket.once("game:started", resolve),
    );
    const guestStarted = new Promise<Parameters<ServerToClientEvents["game:started"]>[0]>(
      (resolve) => guest.socket.once("game:started", resolve),
    );
    const ack = await host.socket.emitWithAck("game:start", {
      requestId: requestIds[6]!,
    });
    expect(ack).toEqual({ ok: true });
    const [hostPayload, guestPayload] = await Promise.all([
      hostStarted,
      guestStarted,
    ]);
    expect(hostPayload).toEqual(guestPayload);
    expect(hostPayload).toMatchObject({
      gameId: "game-test",
      boardRadius: 4,
      turnSeconds: 30,
    });
    expect(new Set(hostPayload.startPositions.map(({ hex }) => `${hex.q}:${hex.r}`)).size).toBe(2);
    expect(server.rooms.get("UMR-1234")?.status).toBe("playing");
    expect(server.games.get("UMR-1234")?.gameId).toBe("game-test");
  });
});
