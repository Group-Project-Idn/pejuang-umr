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

async function startServer(countdownMs = 5) {
  const rooms = new RoomRepository(() => "UMR-1234");
  const server = createPejuangServer(
    {
      port: 0,
      webOrigin: "http://localhost:3000",
      guestTokenSecret: secret,
      version: "test",
      trustProxy: false,
    },
    { rooms, countdownMs, createGameId: () => "game-test" },
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
    const body = (await response.json()) as {
      ok: boolean;
      code: string;
      status: string;
      playerCount: number;
      maxPlayers: number;
      joinable: boolean;
      reason: string | null;
      isMember?: boolean;
      players?: unknown;
      room?: unknown;
    };
    expect(body).toMatchObject({
      ok: true,
      code: "UMR-1234",
      status: "waiting",
      playerCount: 2,
      maxPlayers: 4,
      joinable: true,
      reason: null,
    });
    // Tanpa token: tidak ada isMember, dan tidak ada kebocoran daftar pemain.
    expect(body).not.toHaveProperty("isMember");
    expect(body).not.toHaveProperty("players");
    expect(body).not.toHaveProperty("room");
  });

  it("menegakkan pawn unik, otorisasi host, dan readiness tamu", async () => {
    const { baseUrl, server } = await startServer();
    const host = await connectGuest(baseUrl, "Host", "avatar-01");
    const guest = await connectGuest(baseUrl, "Guest", "avatar-02");

    const created = await host.socket.emitWithAck("room:create", {
      requestId: requestIds[0]!,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    // Host langsung mendapat pion pertama yang kosong tanpa perlu memilih.
    expect(player(created.room, host.playerId).pawn).toBe("cream-circle");

    const joined = await guest.socket.emitWithAck("room:join", {
      requestId: requestIds[1]!,
      roomCode: "UMR-1234",
    });
    expect(joined.ok).toBe(true);
    if (!joined.ok) return;
    // Tamu mendapat pasangan kosong berikutnya secara otomatis.
    expect(player(joined.room, guest.playerId).pawn).toBe("iceblue-square");

    const nonHostTimer = await guest.socket.emitWithAck("room:timer", {
      requestId: requestIds[2]!,
      turnSeconds: 15,
    });
    expect(nonHostTimer).toEqual({ ok: false, error: "NOT_HOST" });

    const duplicatePawn = await guest.socket.emitWithAck("room:pawn", {
      requestId: requestIds[3]!,
      pawn: "cream-circle",
    });
    expect(duplicatePawn).toEqual({ ok: false, error: "PAWN_TAKEN" });

    // room:pawn masih bisa menukar ke pion yang kosong.
    const swapPawn = await guest.socket.emitWithAck("room:pawn", {
      requestId: requestIds[4]!,
      pawn: "salmon-diamond",
    });
    expect(swapPawn).toEqual({ ok: true });

    // Host tidak perlu siap; event dari host ditolak.
    const hostReady = await host.socket.emitWithAck("room:ready", {
      requestId: requestIds[5]!,
      ready: true,
    });
    expect(hostReady).toEqual({ ok: false, error: "INVALID_PAYLOAD" });

    const guestReady = await guest.socket.emitWithAck("room:ready", {
      requestId: requestIds[6]!,
      ready: true,
    });
    expect(guestReady).toEqual({ ok: true });

    expect(server.rooms.get("UMR-1234")).toMatchObject({
      canStart: true,
      startBlockReason: null,
      players: [
        expect.objectContaining({
          pawn: "cream-circle",
          isHost: true,
          ready: false,
        }),
        expect.objectContaining({
          pawn: "salmon-diamond",
          isHost: false,
          ready: true,
        }),
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
    // Pion otomatis terpasang; host tidak perlu siap. Cukup tamu siap.
    await guest.socket.emitWithAck("room:ready", {
      requestId: requestIds[2]!,
      ready: true,
    });
    expect(await host.socket.emitWithAck("room:timer", {
      requestId: requestIds[4]!,
      turnSeconds: 15,
    })).toEqual({ ok: true });

    const hostStarted = new Promise<Parameters<ServerToClientEvents["game:started"]>[0]>(
      (resolve) => host.socket.once("game:started", resolve),
    );
    const guestStarted = new Promise<Parameters<ServerToClientEvents["game:started"]>[0]>(
      (resolve) => guest.socket.once("game:started", resolve),
    );
    const ack = await host.socket.emitWithAck("game:start", {
      requestId: requestIds[3]!,
    });
    expect(ack).toEqual({ ok: true });
    const [hostPayload, guestPayload] = await Promise.all([
      hostStarted,
      guestStarted,
    ]);
    expect(hostPayload).toEqual(guestPayload);
    expect(hostPayload).toMatchObject({
      gameId: "game-test",
      boardRadius: 6,
      turnSeconds: 15,
    });
    expect(new Set(hostPayload.startPositions.map(({ hex }) => `${hex.q}:${hex.r}`)).size).toBe(2);
    expect(server.rooms.get("UMR-1234")?.status).toBe("playing");
    expect(server.games.get("UMR-1234")?.state.public.gameId).toBe("game-test");
  });

  it("tetap hidup ketika client mengirim event tanpa ack callback", async () => {
    const { baseUrl, server } = await startServer();
    const host = await connectGuest(baseUrl, "Host", "avatar-01");
    const unsafeSocket = host.socket as unknown as {
      emit: (event: string, ...args: unknown[]) => void;
    };

    for (const [event, payload] of [
      ["ping:test", {}],
      ["room:join", {}],
      ["room:leave", {}],
      ["room:ready", {}],
      ["room:pawn", {}],
      ["room:timer", {}],
      ["room:kick", {}],
      ["game:start", {}],
      ["session:resume", {}],
    ] as const) {
      unsafeSocket.emit(event, payload);
    }
    unsafeSocket.emit("room:create", { requestId: requestIds[0]! });
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(server.rooms.get("UMR-1234")?.hostId).toBe(host.playerId);
    const ping = await host.socket.timeout(1_000).emitWithAck("ping:test", {
      name: "Server masih hidup",
    });
    expect(ping.ok).toBe(true);
  });

  it("mengunci leave dan kick selama countdown", async () => {
    const { baseUrl, server } = await startServer(50);
    const host = await connectGuest(baseUrl, "Host", "avatar-01");
    const guest = await connectGuest(baseUrl, "Guest", "avatar-02");
    await host.socket.emitWithAck("room:create", {
      requestId: requestIds[0]!,
    });
    await guest.socket.emitWithAck("room:join", {
      requestId: requestIds[1]!,
      roomCode: "UMR-1234",
    });
    // Pion otomatis terpasang; host tidak perlu siap. Cukup tamu siap.
    await guest.socket.emitWithAck("room:ready", {
      requestId: requestIds[2]!,
      ready: true,
    });

    const started = new Promise<Parameters<ServerToClientEvents["game:started"]>[0]>(
      (resolve) => host.socket.once("game:started", resolve),
    );
    await host.socket.emitWithAck("game:start", {
      requestId: requestIds[3]!,
    });
    const leave = await guest.socket.emitWithAck("room:leave", {
      requestId: requestIds[4]!,
    });
    const kick = await host.socket.emitWithAck("room:kick", {
      requestId: "00000000-0000-4000-8000-000000000009",
      targetPlayerId: guest.playerId,
    });
    const hostLeave = await host.socket.emitWithAck("room:leave", {
      requestId: "00000000-0000-4000-8000-000000000010",
    });

    expect(leave).toEqual({ ok: false, error: "ROOM_LOCKED" });
    expect(kick).toEqual({ ok: false, error: "ROOM_LOCKED" });
    expect(hostLeave).toEqual({ ok: false, error: "ROOM_LOCKED" });
    await expect(started).resolves.toMatchObject({ gameId: "game-test" });
    expect(server.rooms.get("UMR-1234")?.players).toHaveLength(2);
    expect(server.games.get("UMR-1234")?.state.public.pawns).toHaveLength(2);
  });

  it("mengizinkan host mulai begitu satu tamu siap", async () => {
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

    const guestReady = await guest.socket.emitWithAck("room:ready", {
      requestId: requestIds[2]!,
      ready: true,
    });
    expect(guestReady).toEqual({ ok: true });

    // Host tidak perlu Siap; satu tamu Siap sudah cukup untuk canStart.
    expect(server.rooms.get("UMR-1234")).toMatchObject({
      canStart: true,
      startBlockReason: null,
    });
  });

  it("menolak room:ready dari host dengan INVALID_PAYLOAD", async () => {
    const { baseUrl } = await startServer();
    const host = await connectGuest(baseUrl, "Host", "avatar-01");

    await host.socket.emitWithAck("room:create", {
      requestId: requestIds[0]!,
    });
    const hostReady = await host.socket.emitWithAck("room:ready", {
      requestId: requestIds[1]!,
      ready: true,
    });
    expect(hostReady).toEqual({ ok: false, error: "INVALID_PAYLOAD" });
  });

  it("memberi pion berurutan sesuai daftar saat 4 pemain masuk", async () => {
    const { baseUrl, server } = await startServer();
    const players = await Promise.all(
      [1, 2, 3, 4].map((index) =>
        connectGuest(baseUrl, `Pemain ${index}`, `avatar-0${index}`),
      ),
    );

    const created = await players[0]!.socket.emitWithAck("room:create", {
      requestId: requestIds[0]!,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(player(created.room, players[0]!.playerId).pawn).toBe("cream-circle");

    for (let index = 1; index < 4; index += 1) {
      const joined = await players[index]!.socket.emitWithAck("room:join", {
        requestId: requestIds[index]!,
        roomCode: "UMR-1234",
      });
      expect(joined.ok).toBe(true);
      if (!joined.ok) return;
      expect(joined.room.players.map((member) => member.pawn)).toEqual([
        "cream-circle",
        "iceblue-square",
        "mint-triangle",
        "salmon-diamond",
      ].slice(0, index + 1));
    }

    expect(server.rooms.get("UMR-1234")?.players.map((member) => member.pawn)).toEqual([
      "cream-circle",
      "iceblue-square",
      "mint-triangle",
      "salmon-diamond",
    ]);
  });

  it("memberi pion yang dibebaskan saat pemain kedua keluar lalu pemain baru masuk", async () => {
    const { baseUrl, server } = await startServer();
    const host = await connectGuest(baseUrl, "Host", "avatar-01");
    const second = await connectGuest(baseUrl, "Kedua", "avatar-02");
    const replacement = await connectGuest(baseUrl, "Pengganti", "avatar-03");

    await host.socket.emitWithAck("room:create", {
      requestId: requestIds[0]!,
    });
    const secondJoined = await second.socket.emitWithAck("room:join", {
      requestId: requestIds[1]!,
      roomCode: "UMR-1234",
    });
    expect(secondJoined.ok).toBe(true);
    if (!secondJoined.ok) return;
    expect(player(secondJoined.room, second.playerId).pawn).toBe("iceblue-square");

    const left = await second.socket.emitWithAck("room:leave", {
      requestId: requestIds[2]!,
    });
    expect(left).toEqual({ ok: true });

    const replacementJoined = await replacement.socket.emitWithAck("room:join", {
      requestId: requestIds[3]!,
      roomCode: "UMR-1234",
    });
    expect(replacementJoined.ok).toBe(true);
    if (!replacementJoined.ok) return;
    // iceblue-square dibebaskan oleh pemain kedua, jadi dipakai ulang.
    expect(player(replacementJoined.room, replacement.playerId).pawn).toBe(
      "iceblue-square",
    );
    expect(server.rooms.get("UMR-1234")?.players).toHaveLength(2);
  });

  it("M5: session:resume ke room ada tapi bukan anggotanya dijawab NOT_IN_ROOM", async () => {
    const { baseUrl, server } = await startServer();
    const host = await connectGuest(baseUrl, "Host", "avatar-01");
    const outsider = await connectGuest(baseUrl, "Bukan Anggota", "avatar-02");
    await host.socket.emitWithAck("room:create", {
      requestId: requestIds[0]!,
    });

    // Room ada, tapi pemain ini tidak terdaftar -> NOT_IN_ROOM (bukan ROOM_NOT_FOUND).
    const resumed = await outsider.socket.emitWithAck("session:resume", {
      requestId: requestIds[1]!,
      roomCode: "UMR-1234",
    });
    expect(resumed).toEqual({ ok: false, error: "NOT_IN_ROOM" });

    // Room yang tidak ada tetap ROOM_NOT_FOUND.
    const missing = await outsider.socket.emitWithAck("session:resume", {
      requestId: requestIds[2]!,
      roomCode: "UMR-9999",
    });
    expect(missing).toEqual({ ok: false, error: "ROOM_NOT_FOUND" });
    expect(server.rooms.get("UMR-1234")?.hostId).toBe(host.playerId);
  });

  it("M8: game:start menolak payload berlebih dengan INVALID_PAYLOAD (skema strict)", async () => {
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
    await guest.socket.emitWithAck("room:ready", {
      requestId: requestIds[2]!,
      ready: true,
    });

    // GameStartRequestSchema strict: field asing harus ditolak.
    const rejected = await host.socket.timeout(1_000).emitWithAck(
      "game:start",
      { requestId: requestIds[3]!, roomCode: "UMR-1234" } as never,
    );
    expect(rejected).toEqual({ ok: false, error: "INVALID_PAYLOAD" });

    // Payload bersih tetap diterima.
    const accepted = await host.socket.emitWithAck("game:start", {
      requestId: requestIds[4]!,
    });
    expect(accepted).toEqual({ ok: true });
  });

  it("M10: room:leave saat game berjalan tidak ditolak, pemain tetap terdaftar", async () => {
    const { baseUrl, server } = await startServer(20);
    const host = await connectGuest(baseUrl, "Host", "avatar-01");
    const guest = await connectGuest(baseUrl, "Guest", "avatar-02");
    await host.socket.emitWithAck("room:create", {
      requestId: requestIds[0]!,
    });
    await guest.socket.emitWithAck("room:join", {
      requestId: requestIds[1]!,
      roomCode: "UMR-1234",
    });
    await guest.socket.emitWithAck("room:ready", {
      requestId: requestIds[2]!,
      ready: true,
    });

    const started = new Promise<Parameters<ServerToClientEvents["game:started"]>[0]>(
      (resolve) => host.socket.once("game:started", resolve),
    );
    await host.socket.emitWithAck("game:start", {
      requestId: requestIds[3]!,
    });
    await started;
    expect(server.rooms.get("UMR-1234")?.status).toBe("playing");

    // Pemain lain (host) menerima player:connection connected:false.
    const connection = new Promise<
      Parameters<ServerToClientEvents["player:connection"]>[0]
    >((resolve) => host.socket.once("player:connection", resolve));

    // Guest menekan Keluar saat game berjalan: ack ok, tidak ROOM_LOCKED.
    const leave = await guest.socket.emitWithAck("room:leave", {
      requestId: requestIds[4]!,
    });
    expect(leave).toEqual({ ok: true });

    await expect(connection).resolves.toMatchObject({
      playerId: guest.playerId,
      connected: false,
    });

    // Pemain tetap tercatat di room dan game dengan connected false.
    const room = server.rooms.get("UMR-1234")!;
    expect(room.status).toBe("playing");
    expect(player(room, guest.playerId).connected).toBe(false);
    expect(server.games.get("UMR-1234")?.state.public.pawns).toHaveLength(2);

    // Pemain bisa kembali lewat session:resume.
    const resumed = await guest.socket.emitWithAck("session:resume", {
      requestId: requestIds[5]!,
      roomCode: "UMR-1234",
    });
    expect(resumed.ok).toBe(true);
    if (!resumed.ok) return;
    expect(player(resumed.snapshot.room, guest.playerId).connected).toBe(true);
  });

  it("M10: room:leave saat waiting tetap mengeluarkan pemain", async () => {
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

    const left = await guest.socket.emitWithAck("room:leave", {
      requestId: requestIds[2]!,
    });
    expect(left).toEqual({ ok: true });
    // Saat waiting, pemain benar-benar dikeluarkan dari room.
    expect(server.rooms.get("UMR-1234")?.players).toHaveLength(1);
  });
});

describe("sesi game", () => {
  it("menyimpan GameState lengkap, mengirim player:status milik masing-masing, dan mengisi snapshot", async () => {
    const { baseUrl, server } = await startServer();
    const host = await connectGuest(baseUrl, "Host", "avatar-01");
    const guest = await connectGuest(baseUrl, "Guest", "avatar-02");
    await host.socket.emitWithAck("room:create", { requestId: requestIds[0]! });
    await guest.socket.emitWithAck("room:join", {
      requestId: requestIds[1]!,
      roomCode: "UMR-1234",
    });
    await guest.socket.emitWithAck("room:ready", {
      requestId: requestIds[2]!,
      ready: true,
    });

    const collect = (socket: TestSocket) => {
      const statuses: Array<Parameters<ServerToClientEvents["player:status"]>[0]> = [];
      socket.on("player:status", (payload) => statuses.push(payload));
      const started = new Promise<Parameters<ServerToClientEvents["game:started"]>[0]>(
        (resolve) => socket.once("game:started", resolve),
      );
      return { statuses, started };
    };
    const hostEvents = collect(host.socket);
    const guestEvents = collect(guest.socket);

    await host.socket.emitWithAck("game:start", { requestId: requestIds[3]! });
    const [hostStarted] = await Promise.all([hostEvents.started, guestEvents.started]);
    // Beri waktu event player:status yang dikirim tepat setelah game:started.
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(hostStarted.version).toBe(1);
    expect(hostEvents.statuses).toHaveLength(1);
    expect(guestEvents.statuses).toHaveLength(1);
    const state = server.games.get("UMR-1234")!.state;
    expect(hostEvents.statuses[0]).toEqual(state.players[host.playerId]!.status);
    expect(guestEvents.statuses[0]).toEqual(state.players[guest.playerId]!.status);
    expect(Object.keys(state.board.tiles).length).toBeGreaterThan(0);
    expect(Object.keys(state.players).sort()).toEqual([host.playerId, guest.playerId].sort());

    const resumed = await guest.socket.emitWithAck("session:resume", {
      requestId: requestIds[4]!,
      roomCode: "UMR-1234",
    });
    expect(resumed.ok).toBe(true);
    if (!resumed.ok) return;
    expect(resumed.snapshot.me.status).toEqual(state.players[guest.playerId]!.status);
    expect(resumed.snapshot.game?.gameId).toBe("game-test");
    expect(JSON.stringify(resumed.snapshot)).not.toContain('"board"');
  });
});

describe("room:kick", () => {
  it("host mengeluarkan tamu: room:kicked, keluar channel, pion kosong, error sesuai kontrak", async () => {
    const { baseUrl, server } = await startServer();
    const host = await connectGuest(baseUrl, "Host", "avatar-01");
    const guest = await connectGuest(baseUrl, "Guest", "avatar-02");
    const third = await connectGuest(baseUrl, "Third", "avatar-03");
    await host.socket.emitWithAck("room:create", { requestId: requestIds[0]! });
    await guest.socket.emitWithAck("room:join", { requestId: requestIds[1]!, roomCode: "UMR-1234" });
    const guestPawn = player(server.rooms.get("UMR-1234")!, guest.playerId).pawn;

    expect(
      await host.socket.emitWithAck("room:kick", { requestId: requestIds[2]!, targetPlayerId: host.playerId }),
    ).toEqual({ ok: false, error: "INVALID_TARGET" });
    expect(
      await host.socket.emitWithAck("room:kick", { requestId: requestIds[3]!, targetPlayerId: third.playerId }),
    ).toEqual({ ok: false, error: "INVALID_TARGET" });

    const kicked = new Promise<{ roomCode: string }>((resolve) => guest.socket.once("room:kicked", resolve));
    const hostState = new Promise<RoomState>((resolve) => host.socket.once("room:state", resolve));
    const guestStates: RoomState[] = [];
    guest.socket.on("room:state", (state) => guestStates.push(state));
    expect(
      await host.socket.emitWithAck("room:kick", { requestId: requestIds[4]!, targetPlayerId: guest.playerId }),
    ).toEqual({ ok: true });
    await expect(kicked).resolves.toEqual({ roomCode: "UMR-1234" });
    expect((await hostState).players.map((p) => p.playerId)).toEqual([host.playerId]);
    expect(server.rooms.getByPlayer(guest.playerId)).toBeNull();

    // Guest sudah keluar dari channel: perubahan room berikutnya tidak sampai ke dia.
    const joined = await third.socket.emitWithAck("room:join", { requestId: requestIds[5]!, roomCode: "UMR-1234" });
    expect(joined.ok).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(guestStates).toHaveLength(0);
    // Pion yang dilepas dipakai pemain berikutnya.
    expect(player(server.rooms.get("UMR-1234")!, third.playerId).pawn).toBe(guestPawn);
  });
});
