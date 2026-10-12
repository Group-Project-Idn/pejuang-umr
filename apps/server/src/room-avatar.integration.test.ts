import { once } from "node:events";
import type { AddressInfo } from "node:net";
import type { ClientToServerEvents, RoomState, ServerToClientEvents } from "@pejuang/shared";
import { io as createClient, type Socket } from "socket.io-client";
import { afterEach, describe, expect, it } from "vitest";
import { ManualClock } from "./game/test-clock";
import { RoomRepository } from "./repositories/room-repository";
import { createGuestToken } from "./services/guest-token";
import { createPejuangServer } from "./server";

const secret = "test-secret-with-at-least-thirty-two-characters";
type TestSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
type Guest = { socket: TestSocket; playerId: string; token: string; states: RoomState[] };

const openServers: Array<ReturnType<typeof createPejuangServer>> = [];
const openSockets: TestSocket[] = [];

afterEach(async () => {
  for (const socket of openSockets.splice(0)) socket.disconnect();
  for (const server of openServers.splice(0)) {
    await new Promise<void>((resolve) => server.io.close(() => resolve()));
  }
});

let counter = 0;
const rid = () => `00000000-0000-4000-8000-${String(9000 + ++counter).padStart(12, "0")}`;

async function startServer() {
  const clock = new ManualClock();
  const server = createPejuangServer(
    { port: 0, webOrigin: "http://localhost:3000", guestTokenSecret: secret, version: "test", trustProxy: false },
    { rooms: new RoomRepository(() => "UMR-1234"), countdownMs: 5, createGameId: () => "game-test", clock },
  );
  openServers.push(server);
  server.httpServer.listen(0);
  await once(server.httpServer, "listening");
  return { server, clock, baseUrl: `http://127.0.0.1:${(server.httpServer.address() as AddressInfo).port}` };
}

async function connectGuest(baseUrl: string, name: string, avatarId: string): Promise<Guest> {
  const guest = createGuestToken({ name, avatarId }, secret);
  const socket: TestSocket = createClient(baseUrl, {
    transports: ["websocket"],
    auth: { token: guest.token },
    reconnection: false,
  });
  openSockets.push(socket);
  const states: RoomState[] = [];
  socket.on("room:state", (state) => states.push(state));
  await new Promise<void>((resolve) => socket.once("connect", resolve));
  return { socket, playerId: guest.identity.playerId, token: guest.token, states };
}

const roomOf = (server: ReturnType<typeof createPejuangServer>) => server.rooms.get("UMR-1234")!;
const playerIn = (room: RoomState, id: string) => room.players.find((p) => p.playerId === id)!;

describe("POST /api/v1/guest dengan karakter", () => {
  it("menolak avatarId yang bukan karakter dan menerima keempat karakter", async () => {
    const { baseUrl } = await startServer();
    const post = (avatarId: string) =>
      fetch(`${baseUrl}/api/v1/guest`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Raka", avatarId }),
      });
    expect((await post("avatar-01")).status).toBe(400);
    expect((await post("zzz")).status).toBe(400);
    for (const id of ["michael", "raka", "sinta", "icha"]) {
      // Batas rate-limit 10/menit cukup untuk 4 + 2 permintaan.
      expect((await post(id)).status).toBe(201);
    }
  });
});

describe("karakter di room (GDD 9.3 v1.12)", () => {
  it("memakai karakter profil; yang sudah dipakai atau tidak sah mendapat karakter kosong pertama", async () => {
    const { baseUrl, server } = await startServer();
    const host = await connectGuest(baseUrl, "Host", "raka");
    const same = await connectGuest(baseUrl, "Sama", "raka");
    const legacy = await connectGuest(baseUrl, "Lama", "avatar-01");
    const fourth = await connectGuest(baseUrl, "Empat", "michael");

    await host.socket.emitWithAck("room:create", { requestId: rid() });
    for (const guest of [same, legacy, fourth]) {
      expect(await guest.socket.emitWithAck("room:join", { requestId: rid(), roomCode: "UMR-1234" })).toMatchObject({
        ok: true,
      });
    }
    const room = roomOf(server);
    expect(playerIn(room, host.playerId).avatarId).toBe("raka");
    expect(playerIn(room, same.playerId).avatarId).toBe("michael"); // raka dipakai -> kosong pertama
    expect(playerIn(room, legacy.playerId).avatarId).toBe("sinta"); // tidak sah -> kosong pertama
    expect(playerIn(room, fourth.playerId).avatarId).toBe("icha"); // michael dipakai -> kosong pertama
    expect(new Set(room.players.map((p) => p.avatarId)).size).toBe(4);
    expect(new Set(room.players.map((p) => p.pawn)).size).toBe(4);
  });

  it("room:avatar berhasil, AVATAR_TAKEN, NOT_IN_ROOM, dan mengirim room:state", async () => {
    const { baseUrl, server } = await startServer();
    const host = await connectGuest(baseUrl, "Host", "michael");
    const guest = await connectGuest(baseUrl, "Tamu", "raka");
    const outsider = await connectGuest(baseUrl, "Luar", "sinta");

    expect(await outsider.socket.emitWithAck("room:avatar", { requestId: rid(), avatarId: "icha" })).toEqual({
      ok: false,
      error: "NOT_IN_ROOM",
    });
    await host.socket.emitWithAck("room:create", { requestId: rid() });
    await guest.socket.emitWithAck("room:join", { requestId: rid(), roomCode: "UMR-1234" });
    await guest.socket.emitWithAck("room:ready", { requestId: rid(), ready: true });

    expect(await guest.socket.emitWithAck("room:avatar", { requestId: rid(), avatarId: "michael" })).toEqual({
      ok: false,
      error: "AVATAR_TAKEN",
    });
    const before = host.states.length;
    const requestId = rid();
    expect(await guest.socket.emitWithAck("room:avatar", { requestId, avatarId: "icha" })).toEqual({ ok: true });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(host.states.length).toBeGreaterThan(before);
    const changed = playerIn(host.states.at(-1)!, guest.playerId);
    expect(changed.avatarId).toBe("icha");
    expect(changed.ready).toBe(false); // mengganti karakter membatalkan Siap, seperti room:pawn
    expect(changed.pawn).toBe(playerIn(roomOf(server), guest.playerId).pawn);

    // Idempotent: requestId sama tidak menimbulkan room:state kedua.
    const count = host.states.length;
    expect(await guest.socket.emitWithAck("room:avatar", { requestId, avatarId: "icha" })).toEqual({ ok: true });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(host.states.length).toBe(count);

    // Karakter lama bebas dipakai pemain lain.
    expect(await host.socket.emitWithAck("room:avatar", { requestId: rid(), avatarId: "raka" })).toEqual({ ok: true });
    // Payload tidak sah.
    expect(await guest.socket.emitWithAck("room:avatar", { requestId: rid(), avatarId: "zzz" as never })).toEqual({
      ok: false,
      error: "INVALID_PAYLOAD",
    });
  });

  it("room:avatar ditolak ROOM_LOCKED setelah game dimulai", async () => {
    const { baseUrl, server } = await startServer();
    const host = await connectGuest(baseUrl, "Host", "michael");
    const guest = await connectGuest(baseUrl, "Tamu", "raka");
    await host.socket.emitWithAck("room:create", { requestId: rid() });
    await guest.socket.emitWithAck("room:join", { requestId: rid(), roomCode: "UMR-1234" });
    await guest.socket.emitWithAck("room:ready", { requestId: rid(), ready: true });
    await host.socket.emitWithAck("game:start", { requestId: rid() });
    expect(await guest.socket.emitWithAck("room:avatar", { requestId: rid(), avatarId: "icha" })).toEqual({
      ok: false,
      error: "ROOM_LOCKED",
    });
    expect(roomOf(server).players.map((p) => p.avatarId).sort()).toEqual(["michael", "raka"]);
  });

  it("room:pawn dan room:avatar tetap konsisten (karakter dan pion berganti bersama, tetap unik)", async () => {
    const { baseUrl, server } = await startServer();
    const host = await connectGuest(baseUrl, "Host", "michael");
    const guest = await connectGuest(baseUrl, "Tamu", "raka");
    await host.socket.emitWithAck("room:create", { requestId: rid() });
    await guest.socket.emitWithAck("room:join", { requestId: rid(), roomCode: "UMR-1234" });

    // Urutan karakter michael, raka, sinta, icha dipetakan ke cream-circle, iceblue-square, mint-triangle, salmon-diamond.
    expect(playerIn(roomOf(server), host.playerId)).toMatchObject({ avatarId: "michael", pawn: "cream-circle" });
    expect(playerIn(roomOf(server), guest.playerId)).toMatchObject({ avatarId: "raka", pawn: "iceblue-square" });

    // room:pawn mengganti karakter juga.
    expect(await guest.socket.emitWithAck("room:pawn", { requestId: rid(), pawn: "salmon-diamond" })).toEqual({ ok: true });
    expect(playerIn(roomOf(server), guest.playerId)).toMatchObject({ avatarId: "icha", pawn: "salmon-diamond" });
    // Pion yang dipakai tetap PAWN_TAKEN.
    expect(await guest.socket.emitWithAck("room:pawn", { requestId: rid(), pawn: "cream-circle" })).toEqual({
      ok: false,
      error: "PAWN_TAKEN",
    });
    // room:avatar mengganti pion juga.
    expect(await host.socket.emitWithAck("room:avatar", { requestId: rid(), avatarId: "sinta" })).toEqual({ ok: true });
    expect(playerIn(roomOf(server), host.playerId)).toMatchObject({ avatarId: "sinta", pawn: "mint-triangle" });
    // Karakter yang baru dilepas bisa dipakai pemain lain lewat kedua jalur.
    expect(await guest.socket.emitWithAck("room:avatar", { requestId: rid(), avatarId: "michael" })).toEqual({ ok: true });
    expect(playerIn(roomOf(server), guest.playerId)).toMatchObject({ avatarId: "michael", pawn: "cream-circle" });
    const room = roomOf(server);
    expect(new Set(room.players.map((p) => p.avatarId)).size).toBe(2);
    expect(new Set(room.players.map((p) => p.pawn)).size).toBe(2);
  });

  it("game:finished.ranking[].avatarId terisi dari karakter room (bukan profil tamu)", async () => {
    const { baseUrl, server, clock } = await startServer();
    const host = await connectGuest(baseUrl, "Host", "raka");
    const guest = await connectGuest(baseUrl, "Tamu", "raka"); // bentrok -> michael
    const finished: Array<{ playerId: string; avatarId?: string }> = [];
    host.socket.on("game:finished", (payload) => finished.push(...payload.ranking));
    await host.socket.emitWithAck("room:create", { requestId: rid() });
    await guest.socket.emitWithAck("room:join", { requestId: rid(), roomCode: "UMR-1234" });
    await guest.socket.emitWithAck("room:ready", { requestId: rid(), ready: true });
    await host.socket.emitWithAck("game:start", { requestId: rid() });
    for (let i = 0; i < 60; i += 1) await new Promise((resolve) => setTimeout(resolve, 10));
    for (let i = 0; i < 500 && !server.games.get("UMR-1234")?.finished; i += 1) clock.advance(15_000);
    for (let i = 0; i < 100 && finished.length === 0; i += 1) await new Promise((resolve) => setTimeout(resolve, 10));
    expect(finished).toHaveLength(2);
    expect(finished.find((row) => row.playerId === host.playerId)?.avatarId).toBe("raka");
    expect(finished.find((row) => row.playerId === guest.playerId)?.avatarId).toBe("michael");
  });
});
