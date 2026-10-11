import { once } from "node:events";
import type { AddressInfo } from "node:net";
import type { ClientToServerEvents, ServerToClientEvents } from "@pejuang/shared";
import { io as createClient, type Socket } from "socket.io-client";
import { afterEach, describe, expect, it } from "vitest";
import { RoomRepository } from "../repositories/room-repository";
import { createGuestToken } from "../services/guest-token";
import { createPejuangServer } from "../server";
import type { Clock } from "./clock";

const secret = "test-secret-with-at-least-thirty-two-characters";
type TestSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
type Received = { type: string; payload: any };

/** Timer palsu yang dikendalikan tes (setara vi.useFakeTimers, tanpa mengganggu socket nyata). */
class ManualClock implements Clock {
  private time = 1_000_000;
  private nextId = 1;
  private timers = new Map<number, { at: number; callback: () => void }>();
  now() {
    return this.time;
  }
  setTimeout(callback: () => void, ms: number) {
    const id = this.nextId++;
    this.timers.set(id, { at: this.time + ms, callback });
    return id;
  }
  clearTimeout(handle: unknown) {
    this.timers.delete(handle as number);
  }
  advance(ms: number) {
    const target = this.time + ms;
    for (;;) {
      const due = [...this.timers.entries()]
        .filter(([, timer]) => timer.at <= target)
        .sort((a, b) => a[1].at - b[1].at)[0];
      if (!due) break;
      this.timers.delete(due[0]);
      this.time = due[1].at;
      due[1].callback();
    }
    this.time = target;
  }
}

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

async function until(condition: () => boolean, label: string) {
  for (let i = 0; i < 200; i += 1) {
    if (condition()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`Timeout menunggu: ${label}`);
}

async function setup() {
  const clock = new ManualClock();
  const rooms = new RoomRepository(() => "UMR-1234");
  const server = createPejuangServer(
    { port: 0, webOrigin: "http://localhost:3000", guestTokenSecret: secret, version: "test", trustProxy: false },
    { rooms, countdownMs: 5, createGameId: () => "game-test", clock },
  );
  openServers.push(server);
  server.httpServer.listen(0);
  await once(server.httpServer, "listening");
  const baseUrl = `http://127.0.0.1:${(server.httpServer.address() as AddressInfo).port}`;

  const players = [] as Array<{ socket: TestSocket; playerId: string; token: string; log: Received[] }>;
  for (const [name, avatar] of [["Host", "avatar-01"], ["Guest", "avatar-02"]] as const) {
    const guest = createGuestToken({ name, avatarId: avatar }, secret);
    const socket: TestSocket = createClient(baseUrl, {
      transports: ["websocket"],
      auth: { token: guest.token },
      reconnection: false,
    });
    openSockets.push(socket);
    const log: Received[] = [];
    socket.onAny((type, payload) => log.push({ type, payload }));
    await new Promise<void>((resolve) => socket.once("connect", resolve));
    players.push({ socket, playerId: guest.identity.playerId, token: guest.token, log });
  }
  const [host, guest] = players as [(typeof players)[0], (typeof players)[0]];
  await host.socket.emitWithAck("room:create", { requestId: rid() });
  await guest.socket.emitWithAck("room:join", { requestId: rid(), roomCode: "UMR-1234" });
  await guest.socket.emitWithAck("room:ready", { requestId: rid(), ready: true });
  await host.socket.emitWithAck("game:start", { requestId: rid() });
  const find = (p: { log: Received[] }, type: string) => p.log.filter((e) => e.type === type);
  await until(() => find(host, "calendar:event").length > 0 && find(guest, "calendar:event").length > 0, "calendar:event");
  return { clock, server, host, guest, find, baseUrl };
}

type Ctx = Awaited<ReturnType<typeof setup>>;

async function answerAll(ctx: Ctx) {
  const event = ctx.find(ctx.host, "calendar:event")[0]!.payload;
  for (const p of [ctx.host, ctx.guest]) {
    const ack = await p.socket.emitWithAck("calendar:answer", {
      requestId: rid(),
      eventId: event.eventId,
      choice: "skip",
    });
    expect(ack).toEqual({ ok: true });
  }
  await until(() => ctx.find(ctx.host, "turn:start").length > 0, "turn:start");
}

describe("alur ronde", () => {
  it("game:started -> calendar:event -> dua jawaban -> turn:start dengan deadline", async () => {
    const ctx = await setup();
    const event = ctx.find(ctx.host, "calendar:event")[0]!.payload;
    expect(event.eventId).toBe("new-year");
    expect(event.deadline).toBe(ctx.clock.now() + 15_000);
    const started = ctx.find(ctx.host, "game:started")[0]!.payload;

    await answerAll(ctx);
    const turn = ctx.find(ctx.host, "turn:start")[0]!.payload;
    expect(turn.playerId).toBe(started.turnOrder[0]);
    expect(turn.deadline).toBe(ctx.clock.now() + 30_000);
    expect(turn.turnSeconds).toBe(30);
  });

  it("waktu giliran habis -> tile:opened autoPicked true", async () => {
    const ctx = await setup();
    await answerAll(ctx);
    ctx.clock.advance(30_000);
    await until(() => ctx.find(ctx.host, "tile:opened").length > 0, "tile:opened");
    expect(ctx.find(ctx.host, "tile:opened")[0]!.payload.autoPicked).toBe(true);
  });

  it("turn:choose oleh pemain yang bukan gilirannya -> NOT_YOUR_TURN", async () => {
    const ctx = await setup();
    await answerAll(ctx);
    const turn = ctx.find(ctx.host, "turn:start")[0]!.payload;
    const other = turn.playerId === ctx.host.playerId ? ctx.guest : ctx.host;
    const ack = await other.socket.emitWithAck("turn:choose", {
      requestId: rid(),
      turnId: turn.turnId,
      hex: { q: 0, r: 0 },
    });
    expect(ack).toMatchObject({ ok: false, error: "NOT_YOUR_TURN" });
  });

  it("turn:jump saat mode normal -> INVALID_PAYLOAD, dan requestId sama dijawab ulang", async () => {
    const ctx = await setup();
    await answerAll(ctx);
    const turn = ctx.find(ctx.host, "turn:start")[0]!.payload;
    const active = turn.playerId === ctx.host.playerId ? ctx.host : ctx.guest;
    const payload = { requestId: rid(), turnId: turn.turnId, hex: { q: 0, r: 0 } };
    const first = await active.socket.emitWithAck("turn:jump", payload);
    expect(first).toMatchObject({ ok: false, error: "INVALID_PAYLOAD" });
    const again = await active.socket.emitWithAck("turn:jump", payload);
    expect(again).toEqual(first);
  });

  it("turn:choose valid memajukan giliran", async () => {
    const ctx = await setup();
    await answerAll(ctx);
    const turn = ctx.find(ctx.host, "turn:start")[0]!.payload;
    const active = turn.playerId === ctx.host.playerId ? ctx.host : ctx.guest;
    await until(() => ctx.find(active, "turn:options").length > 0, "turn:options");
    const hex = ctx.find(active, "turn:options")[0]!.payload.options[0].hex;
    const ack = await active.socket.emitWithAck("turn:choose", {
      requestId: rid(),
      turnId: turn.turnId,
      hex,
    });
    expect(ack).toEqual({ ok: true });
    await until(() => ctx.find(ctx.host, "turn:start").length > 1, "turn:start kedua");
    expect(ctx.find(ctx.host, "turn:start")[1]!.payload.playerId).not.toBe(turn.playerId);
  });

  it("Event Tanggal tanpa jawaban -> setelah 15 detik calendar:result autoChosen true", async () => {
    const ctx = await setup();
    ctx.clock.advance(15_000);
    await until(() => ctx.find(ctx.host, "calendar:result").length > 0, "calendar:result");
    expect(ctx.find(ctx.host, "calendar:result")[0]!.payload.autoChosen).toBe(true);
    await until(() => ctx.find(ctx.host, "turn:start").length > 0, "turn:start");
  });

  it("tanpa aksi pemain game berjalan sampai selesai: room finished dan game:finished terkirim", async () => {
    const ctx = await setup();
    for (let i = 0; i < 500 && !ctx.server.games.get("UMR-1234")!.finished; i += 1) {
      ctx.clock.advance(15_000);
    }
    expect(ctx.server.games.get("UMR-1234")!.finished).toBe(true);
    expect(ctx.server.rooms.get("UMR-1234")!.status).toBe("finished");
    await until(() => ctx.find(ctx.host, "game:finished").length === 1, "game:finished");
    const ranking = ctx.find(ctx.host, "game:finished")[0]!.payload.ranking;
    expect(ranking.map((row: { name: string }) => row.name).sort()).toEqual(["Guest", "Host"]);
  });

  it("pemain putus di tengah giliran lalu resume -> pendingTurn dengan deadline asli", async () => {
    const ctx = await setup();
    await answerAll(ctx);
    const turn = ctx.find(ctx.host, "turn:start")[0]!.payload;
    const active = turn.playerId === ctx.host.playerId ? ctx.host : ctx.guest;
    const other = active === ctx.host ? ctx.guest : ctx.host;
    await until(() => ctx.find(active, "turn:options").length > 0, "turn:options");

    active.socket.disconnect();
    await until(
      () => ctx.find(other, "player:connection").some((e) => e.payload.connected === false),
      "player:connection false",
    );
    expect(ctx.find(other, "player:connection")[0]!.payload.playerId).toBe(active.playerId);

    ctx.clock.advance(10_000);
    const socket: TestSocket = createClient(ctx.baseUrl, {
      transports: ["websocket"],
      auth: { token: active.token },
      reconnection: false,
    });
    openSockets.push(socket);
    await new Promise<void>((resolve) => socket.once("connect", resolve));
    const resumed = await socket.emitWithAck("session:resume", {
      requestId: rid(),
      roomCode: "UMR-1234",
    });
    expect(resumed.ok).toBe(true);
    if (!resumed.ok) return;
    expect(resumed.snapshot.me.pendingTurn?.turnId).toBe(turn.turnId);
    expect(resumed.snapshot.game?.turnDeadline).toBe(turn.deadline);
    expect(resumed.snapshot.game?.activePlayerId).toBe(active.playerId);
    await until(
      () => ctx.find(other, "player:connection").some((e) => e.payload.connected === true),
      "player:connection true",
    );
  });

  it("event ke-21 dalam 5 detik -> RATE_LIMITED tanpa memutus koneksi", async () => {
    const ctx = await setup();
    const guest = createGuestToken({ name: "Spam", avatarId: "avatar-03" }, secret);
    const socket: TestSocket = createClient(ctx.baseUrl, {
      transports: ["websocket"],
      auth: { token: guest.token },
      reconnection: false,
    });
    openSockets.push(socket);
    await new Promise<void>((resolve) => socket.once("connect", resolve));
    const acks = await Promise.all(
      Array.from({ length: 21 }, () => socket.emitWithAck("ping:test", { name: "x" })),
    );
    expect(acks.slice(0, 20).every((ack) => ack.ok)).toBe(true);
    expect(acks[20]).toEqual({ ok: false, error: "RATE_LIMITED" });
    expect(socket.connected).toBe(true);
  });

  it("pemain putus sebelum game:finished lalu resume setelah selesai -> snapshot memuat result", async () => {
    const ctx = await setup();
    ctx.host.socket.disconnect();
    await until(
      () => ctx.find(ctx.guest, "player:connection").some((e) => e.payload.connected === false),
      "player:connection false",
    );
    for (let i = 0; i < 500 && !ctx.server.games.get("UMR-1234")!.finished; i += 1) {
      ctx.clock.advance(15_000);
    }
    expect(ctx.server.games.get("UMR-1234")!.finished).toBe(true);
    await until(() => ctx.find(ctx.guest, "game:finished").length === 1, "game:finished");
    expect(ctx.find(ctx.host, "game:finished")).toHaveLength(0);

    const socket: TestSocket = createClient(ctx.baseUrl, {
      transports: ["websocket"],
      auth: { token: ctx.host.token },
      reconnection: false,
    });
    openSockets.push(socket);
    await new Promise<void>((resolve) => socket.once("connect", resolve));
    const resumed = await socket.emitWithAck("session:resume", {
      requestId: rid(),
      roomCode: "UMR-1234",
    });
    expect(resumed.ok).toBe(true);
    if (!resumed.ok) return;
    const result = resumed.snapshot.result;
    expect(result?.ranking.map((row) => row.playerId).sort()).toEqual(
      [ctx.host.playerId, ctx.guest.playerId].sort(),
    );
    expect(result).toEqual(ctx.find(ctx.guest, "game:finished")[0]!.payload);
    expect(resumed.snapshot.me.pendingTurn).toBeNull();
  });
});
