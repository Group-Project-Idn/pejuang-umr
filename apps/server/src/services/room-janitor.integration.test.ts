import { once } from "node:events";
import type { AddressInfo } from "node:net";
import type { ClientToServerEvents, ServerToClientEvents } from "@pejuang/shared";
import { io as createClient, type Socket } from "socket.io-client";
import { afterEach, describe, expect, it } from "vitest";
import { ManualClock } from "../game/test-clock";
import { RoomRepository } from "../repositories/room-repository";
import { createPejuangServer } from "../server";
import { createGuestToken } from "./guest-token";

const secret = "test-secret-with-at-least-thirty-two-characters";
type TestSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const openServers: Array<ReturnType<typeof createPejuangServer>> = [];
const openSockets: TestSocket[] = [];

afterEach(async () => {
  for (const socket of openSockets.splice(0)) socket.disconnect();
  for (const server of openServers.splice(0)) {
    await new Promise<void>((resolve) => server.io.close(() => resolve()));
  }
});

let counter = 0;
const rid = () => `00000000-0000-4000-8000-${String(++counter).padStart(12, "0")}`;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function until(condition: () => boolean, label: string) {
  for (let i = 0; i < 200; i += 1) {
    if (condition()) return;
    await sleep(10);
  }
  throw new Error(`Timeout menunggu: ${label}`);
}

async function setup(roomIdleMs: number, roomEmptyMs: number) {
  const clock = new ManualClock();
  const server = createPejuangServer(
    {
      port: 0,
      webOrigin: "http://localhost:3000",
      guestTokenSecret: secret,
      version: "test",
      trustProxy: false,
      roomIdleMs,
      roomEmptyMs,
    },
    { rooms: new RoomRepository(() => "UMR-1234"), countdownMs: 5, clock, socketRateLimit: { max: 1000, windowMs: 5000 } },
  );
  openServers.push(server);
  server.httpServer.listen(0);
  await once(server.httpServer, "listening");
  const baseUrl = `http://127.0.0.1:${(server.httpServer.address() as AddressInfo).port}`;

  const players = [];
  for (const [name, avatar] of [["Host", "avatar-01"], ["Guest", "avatar-02"]] as const) {
    const guest = createGuestToken({ name, avatarId: avatar }, secret);
    const socket: TestSocket = createClient(baseUrl, {
      transports: ["websocket"],
      auth: { token: guest.token },
      reconnection: false,
    });
    openSockets.push(socket);
    const errors: Array<Parameters<ServerToClientEvents["error"]>[0]> = [];
    socket.on("error", (payload) => errors.push(payload));
    await new Promise<void>((resolve) => socket.once("connect", resolve));
    players.push({ socket, playerId: guest.identity.playerId, errors });
  }
  const [host, guest] = players as [(typeof players)[0], (typeof players)[0]];
  await host.socket.emitWithAck("room:create", { requestId: rid() });
  await guest.socket.emitWithAck("room:join", { requestId: rid(), roomCode: "UMR-1234" });
  return { clock, server, host, guest };
}

const CLOSED = { code: "ROOM_NOT_FOUND", message: "Room ditutup karena tidak aktif.", fatal: true };

describe("penutupan room tidak aktif (M11)", () => {
  it("waiting tanpa aktivitas ditutup, aktivitas anggota mengulang hitungan, tanpa timer tersisa", async () => {
    const { clock, server, host, guest } = await setup(1000, 400);
    expect(clock.pending).toBe(1);

    clock.advance(800);
    expect(server.rooms.get("UMR-1234")).not.toBeNull();
    // Event valid dari anggota = aktivitas.
    await guest.socket.emitWithAck("room:ready", { requestId: rid(), ready: true });
    clock.advance(800);
    expect(server.rooms.get("UMR-1234")).not.toBeNull();

    clock.advance(400);
    expect(server.rooms.get("UMR-1234")).toBeNull();
    await until(() => host.errors.length > 0 && guest.errors.length > 0, "error fatal");
    expect(host.errors[0]).toEqual(CLOSED);
    expect(guest.errors[0]).toEqual(CLOSED);
    expect(server.rooms.getByPlayer(host.playerId)).toBeNull();
    expect(clock.pending).toBe(0);
  });

  it("semua anggota putus 2 menit (waiting) -> room dihapus", async () => {
    const { clock, server, host, guest } = await setup(100_000, 400);
    host.socket.disconnect();
    guest.socket.disconnect();
    await until(
      () => server.rooms.get("UMR-1234")!.players.every((p) => !p.connected),
      "semua putus",
    );
    clock.advance(200);
    expect(server.rooms.get("UMR-1234")).not.toBeNull();
    clock.advance(1000);
    expect(server.rooms.get("UMR-1234")).toBeNull();
    expect(clock.pending).toBe(0);
  });

  it("finished tanpa aktivitas ditutup", async () => {
    const { clock, server, host, guest } = await setup(100_000, 40_000);
    await guest.socket.emitWithAck("room:ready", { requestId: rid(), ready: true });
    await host.socket.emitWithAck("game:start", { requestId: rid() });
    await until(() => server.games.get("UMR-1234") !== null && server.rooms.get("UMR-1234")!.status === "playing", "playing");
    await sleep(30);
    // Tanpa aksi pemain game selesai lewat timer; room playing tidak ditutup karena idle.
    for (let i = 0; i < 500 && !server.games.get("UMR-1234")!.finished; i += 1) clock.advance(15_000);
    expect(server.games.get("UMR-1234")!.finished).toBe(true);
    expect(server.rooms.get("UMR-1234")!.status).toBe("finished");

    clock.advance(120_000);
    expect(server.rooms.get("UMR-1234")).toBeNull();
    await until(() => host.errors.some((e) => e.message === CLOSED.message), "error fatal");
    expect(server.games.get("UMR-1234")).toBeNull();
    expect(clock.pending).toBe(0);
  });

  it("playing tidak ditutup karena idle; semua putus selama idle -> room, sesi, dan timer dibersihkan", async () => {
    const { clock, server, host, guest } = await setup(1000, 400);
    await guest.socket.emitWithAck("room:ready", { requestId: rid(), ready: true });
    await host.socket.emitWithAck("game:start", { requestId: rid() });
    await until(() => server.rooms.get("UMR-1234")!.status === "playing", "playing");
    await sleep(30);

    clock.advance(5_000);
    expect(server.rooms.get("UMR-1234")!.status).toBe("playing");
    expect(server.games.get("UMR-1234")).not.toBeNull();
    // Ada timer Event Tanggal milik sesi + timer sapuan.
    expect(clock.pending).toBeGreaterThanOrEqual(2);

    host.socket.disconnect();
    guest.socket.disconnect();
    await until(
      () => server.rooms.get("UMR-1234")!.players.every((p) => !p.connected),
      "semua putus",
    );
    clock.advance(500);
    expect(server.rooms.get("UMR-1234")).not.toBeNull();
    clock.advance(1_000);
    expect(server.rooms.get("UMR-1234")).toBeNull();
    expect(server.games.get("UMR-1234")).toBeNull();
    expect(clock.pending).toBe(0);
  });
});
