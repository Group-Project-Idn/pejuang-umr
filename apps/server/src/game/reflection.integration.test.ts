import { once } from "node:events";
import type { AddressInfo } from "node:net";
import type { ClientToServerEvents, ServerToClientEvents } from "@pejuang/shared";
import { io as createClient, type Socket } from "socket.io-client";
import { afterEach, describe, expect, it } from "vitest";
import { RoomRepository } from "../repositories/room-repository";
import { createPejuangServer } from "../server";
import { createGuestToken } from "../services/guest-token";
import { FakeReflectionProvider, type ReflectionProvider } from "../services/reflection";
import { ManualClock } from "./test-clock";

const secret = "test-secret-with-at-least-thirty-two-characters";
type TestSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
type Received = { type: string; payload: any };
type TestPlayer = { socket: TestSocket; playerId: string; token: string; log: Received[] };

const openServers: Array<ReturnType<typeof createPejuangServer>> = [];
const openSockets: TestSocket[] = [];

afterEach(async () => {
  for (const socket of openSockets.splice(0)) socket.disconnect();
  for (const server of openServers.splice(0)) {
    await new Promise<void>((resolve) => server.io.close(() => resolve()));
  }
});

let counter = 0;
const rid = () => `00000000-0000-4000-8000-${String(20_000 + ++counter).padStart(12, "0")}`;

async function until(condition: () => boolean, label: string, tries = 300) {
  for (let i = 0; i < tries; i += 1) {
    if (condition()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`Timeout menunggu: ${label}`);
}

async function connect(baseUrl: string, token: string, log: Received[] = []) {
  const socket: TestSocket = createClient(baseUrl, {
    transports: ["websocket"],
    auth: { token },
    reconnection: false,
  });
  openSockets.push(socket);
  socket.onAny((type, payload) => log.push({ type, payload }));
  await new Promise<void>((resolve) => socket.once("connect", resolve));
  return socket;
}

/** Room 3 pemain sampai Event Tanggal pertama tampil. */
async function setup(provider: ReflectionProvider | null, timeoutMs = 15_000) {
  const clock = new ManualClock();
  const server = createPejuangServer(
    {
      port: 0,
      webOrigin: "http://localhost:3000",
      guestTokenSecret: secret,
      version: "test",
      trustProxy: false,
      reflectionTimeoutMs: timeoutMs,
    },
    {
      rooms: new RoomRepository(() => "UMR-1234"),
      countdownMs: 5,
      createGameId: () => "game-test",
      clock,
      reflectionProvider: provider,
    },
  );
  openServers.push(server);
  server.httpServer.listen(0);
  await once(server.httpServer, "listening");
  const baseUrl = `http://127.0.0.1:${(server.httpServer.address() as AddressInfo).port}`;
  const players: TestPlayer[] = [];
  for (const [name, avatar] of [["Host", "michael"], ["Dua", "raka"], ["Tiga", "sinta"]] as const) {
    const guest = createGuestToken({ name, avatarId: avatar }, secret);
    const log: Received[] = [];
    const socket = await connect(baseUrl, guest.token, log);
    players.push({ socket, playerId: guest.identity.playerId, token: guest.token, log });
  }
  const [host, second, third] = players as [TestPlayer, TestPlayer, TestPlayer];
  await host.socket.emitWithAck("room:create", { requestId: rid() });
  for (const guest of [second, third]) {
    await guest.socket.emitWithAck("room:join", { requestId: rid(), roomCode: "UMR-1234" });
    await guest.socket.emitWithAck("room:ready", { requestId: rid(), ready: true });
  }
  await host.socket.emitWithAck("game:start", { requestId: rid() });
  const find = (p: { log: Received[] }, type: string) => p.log.filter((e) => e.type === type);
  await until(() => players.every((p) => find(p, "calendar:event").length > 0), "calendar:event");
  const session = () => server.games.get("UMR-1234")!;
  return { clock, server, baseUrl, players, host, second, third, find, session };
}

type Ctx = Awaited<ReturnType<typeof setup>>;

/** Membuat `playerId` Bangkrut (Hutang di atas Rp25 juta; tak bisa turun di ronde 1) supaya pasti tereliminasi. */
function makeBankrupt(ctx: Ctx, playerId: string) {
  const session = ctx.session();
  const player = session.state.players[playerId]!;
  session.state = {
    ...session.state,
    players: {
      ...session.state.players,
      [playerId]: { ...player, status: { ...player.status, debt: 40_000_000 } },
    },
  };
}

function advanceUntil(ctx: Ctx, condition: () => boolean, label: string) {
  for (let i = 0; i < 2_000 && !condition(); i += 1) ctx.clock.advance(1_000);
  if (!condition()) throw new Error(`Jam habis menunggu: ${label}`);
}

function runToFinish(ctx: Ctx) {
  advanceUntil(ctx, () => ctx.session().finished, "game selesai");
}

const readyOf = (ctx: Ctx, p: TestPlayer) => ctx.find(p, "reflection:ready");

describe("reflection:ready dengan provider none (cadangan aturan)", () => {
  it("pemain tereliminasi langsung mendapat refleksi rules; semua pemain mendapat refleksi di akhir game", async () => {
    const ctx = await setup(null);
    makeBankrupt(ctx, ctx.third.playerId);
    advanceUntil(ctx, () => ctx.session().state.players[ctx.third.playerId]!.eliminated, "eliminasi");
    await until(() => readyOf(ctx, ctx.third).length === 1, "refleksi pemain tereliminasi");
    const first = readyOf(ctx, ctx.third)[0]!.payload;
    expect(first).toMatchObject({ gameId: "game-test", playerId: ctx.third.playerId });
    expect(first.reflection.source).toBe("rules");
    expect(first.reflection.insights.length).toBeGreaterThanOrEqual(1);
    expect(ctx.session().finished).toBe(false); // game berjalan terus

    runToFinish(ctx);
    for (const p of ctx.players) {
      await until(() => readyOf(ctx, p).length >= 1, `refleksi akhir ${p.playerId}`);
      expect(readyOf(ctx, p)).toHaveLength(1); // maksimal satu per pemain per game
      expect(readyOf(ctx, p)[0]!.payload.reflection.source).toBe("rules");
    }
    // Pemain tereliminasi tidak mendapat refleksi kedua.
    expect(readyOf(ctx, ctx.third)).toHaveLength(1);
  });

  it("reflection:ready tidak pernah diterima pemain lain", async () => {
    const ctx = await setup(null);
    makeBankrupt(ctx, ctx.third.playerId);
    runToFinish(ctx);
    for (const p of ctx.players) await until(() => readyOf(ctx, p).length === 1, "refleksi");
    for (const p of ctx.players) {
      for (const e of readyOf(ctx, p)) expect(e.payload.playerId).toBe(p.playerId);
    }
  });

  it("reconnect setelah refleksi siap: snapshot memuat me.reflection; sebelum siap null", async () => {
    const ctx = await setup(null);
    const before = await connect(ctx.baseUrl, ctx.second.token);
    const early = await before.emitWithAck("session:resume", { requestId: rid(), roomCode: "UMR-1234" });
    expect(early.ok && early.snapshot.me.reflection).toBeNull();

    makeBankrupt(ctx, ctx.third.playerId);
    advanceUntil(ctx, () => ctx.session().state.players[ctx.third.playerId]!.eliminated, "eliminasi");
    await until(() => readyOf(ctx, ctx.third).length === 1, "refleksi");
    const reflection = readyOf(ctx, ctx.third)[0]!.payload.reflection;
    const socket = await connect(ctx.baseUrl, ctx.third.token);
    const resumed = await socket.emitWithAck("session:resume", { requestId: rid(), roomCode: "UMR-1234" });
    expect(resumed.ok).toBe(true);
    if (!resumed.ok) return;
    expect(resumed.snapshot.me.reflection).toEqual(reflection);
    // Pemain lain tidak melihat refleksi orang lain di snapshot-nya.
    const other = await connect(ctx.baseUrl, ctx.host.token);
    const otherSnapshot = await other.emitWithAck("session:resume", { requestId: rid(), roomCode: "UMR-1234" });
    expect(otherSnapshot.ok && otherSnapshot.snapshot.me.reflection).toBeNull();
  });
});

describe("reflection:ready dengan provider palsu", () => {
  it("berhasil: source ai", async () => {
    const provider = new FakeReflectionProvider("success");
    const ctx = await setup(provider);
    makeBankrupt(ctx, ctx.third.playerId);
    advanceUntil(ctx, () => ctx.session().state.players[ctx.third.playerId]!.eliminated, "eliminasi");
    await until(() => readyOf(ctx, ctx.third).length === 1, "refleksi ai");
    expect(readyOf(ctx, ctx.third)[0]!.payload.reflection.source).toBe("ai");
    // Provider hanya menerima data pemain itu sendiri.
    expect(provider.calls).toHaveLength(1);
    expect(JSON.stringify(provider.calls)).not.toContain(ctx.host.playerId);
    expect(JSON.stringify(provider.calls)).not.toContain(ctx.second.playerId);
    expect(provider.calls[0]!.eliminated).toMatchObject({ reason: "bankrupt" });
  });

  for (const mode of ["fail", "invalid", "slow"] as const) {
    it(`${mode}: jatuh ke source rules`, async () => {
      const provider = new FakeReflectionProvider(mode, 60_000);
      const ctx = await setup(provider, 50);
      makeBankrupt(ctx, ctx.third.playerId);
      advanceUntil(ctx, () => ctx.session().state.players[ctx.third.playerId]!.eliminated, "eliminasi");
      await until(() => readyOf(ctx, ctx.third).length === 1, `refleksi ${mode}`);
      expect(readyOf(ctx, ctx.third)[0]!.payload.reflection.source).toBe("rules");
      expect(provider.calls.length).toBeGreaterThanOrEqual(1);
    });
  }

  it("game loop tidak tertahan provider lambat: ronde berikutnya tetap berjalan sesuai jadwal", async () => {
    const provider = new FakeReflectionProvider("slow", 60_000);
    const ctx = await setup(provider, 20_000);
    makeBankrupt(ctx, ctx.third.playerId);
    advanceUntil(ctx, () => ctx.session().state.players[ctx.third.playerId]!.eliminated, "eliminasi");
    await until(() => provider.calls.length === 1, "provider dipanggil");
    const stepAtElimination = ctx.session().state.public.calendar.step;
    // Refleksi masih menunggu provider, tetapi game maju beberapa ronde.
    advanceUntil(ctx, () => ctx.session().state.public.calendar.step >= stepAtElimination + 3, "ronde maju");
    expect(readyOf(ctx, ctx.third)).toHaveLength(0);
    expect(ctx.session().finished).toBe(false);
  });

  it("sesi ditutup sebelum hasil siap: hasil dibuang", async () => {
    const provider = new FakeReflectionProvider("success");
    const slowSuccess = provider.generate.bind(provider);
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    provider.generate = async (input, signal) => {
      await gate;
      return slowSuccess(input, signal);
    };
    const ctx = await setup(provider);
    makeBankrupt(ctx, ctx.third.playerId);
    advanceUntil(ctx, () => ctx.session().state.players[ctx.third.playerId]!.eliminated, "eliminasi");
    await until(() => provider.calls.length === 0 || true, "tick");
    const session = ctx.session();
    session.dispose(); // room/game ditutup
    release();
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(readyOf(ctx, ctx.third)).toHaveLength(0);
    expect(session.reflectionFor(ctx.third.playerId)).toBeNull();
  });
});
