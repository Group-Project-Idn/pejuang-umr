import { once } from "node:events";
import type { AddressInfo } from "node:net";
import type { ClientToServerEvents, ServerToClientEvents } from "@pejuang/shared";
import { io as createClient, type Socket } from "socket.io-client";
import { afterEach, describe, expect, it } from "vitest";
import { RoomRepository } from "../repositories/room-repository";
import { createGuestToken } from "../services/guest-token";
import { createPejuangServer } from "../server";
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
const rid = () => `00000000-0000-4000-8000-${String(1000 + ++counter).padStart(12, "0")}`;

async function until(condition: () => boolean, label: string) {
  for (let i = 0; i < 300; i += 1) {
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

/** Room 3 pemain sampai Event Tanggal pertama tampil di semua pemain. */
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

  const players: TestPlayer[] = [];
  for (const [name, avatar] of [["Host", "avatar-01"], ["Dua", "avatar-02"], ["Tiga", "avatar-03"]] as const) {
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
  return { clock, server, baseUrl, host, second, third, find, session };
}

type Ctx = Awaited<ReturnType<typeof setup>>;

/** Menandai pemain tereliminasi langsung di GameState (seperti hasil Bangkrut/Burnout). */
function eliminate(ctx: Ctx, playerId: string) {
  const session = ctx.session();
  const player = session.state.players[playerId]!;
  session.state = {
    ...session.state,
    players: {
      ...session.state.players,
      [playerId]: { ...player, eliminated: true, eliminatedAtStep: 1, eliminatedReason: "burnout" },
    },
    public: { ...session.state.public, eliminated: [...session.state.public.eliminated, playerId] },
  };
}

describe("calendar:answer lewat socket", () => {
  it("event yang salah atau sudah dijawab -> EVENT_CLOSED", async () => {
    const ctx = await setup();
    const event = ctx.find(ctx.host, "calendar:event")[0]!.payload;
    expect(
      await ctx.host.socket.emitWithAck("calendar:answer", { requestId: rid(), eventId: "salah", choice: "skip" }),
    ).toMatchObject({ ok: false, error: "EVENT_CLOSED" });
    expect(
      await ctx.host.socket.emitWithAck("calendar:answer", { requestId: rid(), eventId: event.eventId, choice: "skip" }),
    ).toEqual({ ok: true });
    expect(
      await ctx.host.socket.emitWithAck("calendar:answer", { requestId: rid(), eventId: event.eventId, choice: "join" }),
    ).toMatchObject({ ok: false, error: "EVENT_CLOSED" });
  });
});

describe("snapshot popup kalender", () => {
  it("resume sebelum menjawab memuat pendingCalendar yang sama; setelah menjawab null", async () => {
    const ctx = await setup();
    const event = ctx.find(ctx.second, "calendar:event")[0]!.payload;
    ctx.second.socket.disconnect();
    const socket = await connect(ctx.baseUrl, ctx.second.token);
    const resumed = await socket.emitWithAck("session:resume", { requestId: rid(), roomCode: "UMR-1234" });
    expect(resumed.ok).toBe(true);
    if (!resumed.ok) return;
    expect(resumed.snapshot.me.pendingCalendar).toEqual(event);
    expect(resumed.snapshot.me.isSpectator).toBe(false);

    await socket.emitWithAck("calendar:answer", { requestId: rid(), eventId: event.eventId, choice: "skip" });
    const again = await socket.emitWithAck("session:resume", { requestId: rid(), roomCode: "UMR-1234" });
    expect(again.ok && again.snapshot.me.pendingCalendar).toBeNull();
  });
});

function runToFinish(ctx: Ctx) {
  for (let i = 0; i < 500 && !ctx.session().finished; i += 1) ctx.clock.advance(15_000);
  expect(ctx.session().finished).toBe(true);
}

const leave = (p: TestPlayer) => p.socket.emitWithAck("room:leave", { requestId: rid() });

describe("spectate:enter (deprecated, mode penonton dihapus)", () => {
  it("selalu ditolak: pemain hidup, tereliminasi, dan payload tidak valid", async () => {
    const ctx = await setup();
    const rejected = {
      ok: false,
      error: "INVALID_PAYLOAD",
      message: "Mode penonton sudah dihapus.",
    };
    expect(await ctx.third.socket.emitWithAck("spectate:enter", { requestId: rid() })).toEqual(rejected);
    eliminate(ctx, ctx.third.playerId);
    expect(await ctx.third.socket.emitWithAck("spectate:enter", { requestId: rid() })).toEqual(rejected);
    expect(await ctx.third.socket.emitWithAck("spectate:enter", {} as never)).toEqual(rejected);
    expect(ctx.session().publicState().spectators).toEqual([]);
  });

  it("spectators selalu [], isSpectator selalu false, dan calendar:event tetap diterima semua pemain", async () => {
    const ctx = await setup();
    eliminate(ctx, ctx.third.playerId);
    const snapshotOf = async (p: TestPlayer) => {
      const socket = await connect(ctx.baseUrl, p.token);
      const resumed = await socket.emitWithAck("session:resume", { requestId: rid(), roomCode: "UMR-1234" });
      if (!resumed.ok) throw new Error("resume gagal");
      return resumed.snapshot;
    };
    const eliminated = await snapshotOf(ctx.third);
    expect(eliminated.me.isSpectator).toBe(false);
    expect(eliminated.game?.spectators).toEqual([]);
    expect((await snapshotOf(ctx.host)).me.isSpectator).toBe(false);
  });
});

describe("keluar setelah eliminasi (GDD 9.4 v1.12)", () => {
  it("pemain tereliminasi keluar: hilang dari room:state, game jalan sampai selesai, tetap di ranking", async () => {
    const ctx = await setup();
    const name = "Tiga";
    eliminate(ctx, ctx.third.playerId);
    expect(await leave(ctx.third)).toEqual({ ok: true });

    await until(
      () => ctx.find(ctx.host, "room:state").at(-1)!.payload.players.length === 2,
      "room:state tanpa pemain tereliminasi",
    );
    const state = ctx.find(ctx.host, "room:state").at(-1)!.payload;
    expect(state.players.map((p: { playerId: string }) => p.playerId)).not.toContain(ctx.third.playerId);
    expect(ctx.server.rooms.get("UMR-1234")!.players).toHaveLength(2);

    // Pion dan heksa tetap di state engine; game tetap jalan.
    expect(ctx.session().state.players[ctx.third.playerId]).toBeDefined();
    expect(ctx.session().state.public.pawns.some((p) => p.playerId === ctx.third.playerId)).toBe(true);
    expect(ctx.session().finished).toBe(false);

    runToFinish(ctx);
    await until(() => ctx.find(ctx.host, "game:finished").length === 1, "game:finished");
    const ranking = ctx.find(ctx.host, "game:finished")[0]!.payload.ranking;
    const row = ranking.find((r: { playerId: string }) => r.playerId === ctx.third.playerId);
    expect(row).toMatchObject({ name, eliminated: true });
    expect(row.avatarId).toEqual(expect.any(String));
    expect(ranking).toHaveLength(3);
    // Yang sudah keluar tidak menerima game:finished, dan tidak bisa resume ke room.
    expect(ctx.find(ctx.third, "game:finished")).toHaveLength(0);
    const socket = await connect(ctx.baseUrl, ctx.third.token);
    expect(await socket.emitWithAck("session:resume", { requestId: rid(), roomCode: "UMR-1234" })).toMatchObject({
      ok: false,
      error: "NOT_IN_ROOM",
    });
  });

  it("host tereliminasi yang keluar: peran host pindah", async () => {
    const ctx = await setup();
    eliminate(ctx, ctx.host.playerId);
    expect(await leave(ctx.host)).toEqual({ ok: true });
    const room = ctx.server.rooms.get("UMR-1234")!;
    expect(room.players.map((p) => p.playerId)).not.toContain(ctx.host.playerId);
    expect(room.hostId).not.toBe(ctx.host.playerId);
    expect(room.players.filter((p) => p.isHost).map((p) => p.playerId)).toEqual([room.hostId]);
    expect(ctx.session().finished).toBe(false);
  });

  it("pemain yang belum tereliminasi keluar: tetap terdaftar dan ditandai terputus", async () => {
    const ctx = await setup();
    expect(await leave(ctx.third)).toEqual({ ok: true });
    const room = ctx.server.rooms.get("UMR-1234")!;
    expect(room.players).toHaveLength(3);
    expect(room.players.find((p) => p.playerId === ctx.third.playerId)).toMatchObject({ connected: false });
  });
});

describe("Main Lagi tanpa pemain tereliminasi (GDD 9.5 v1.12)", () => {
  it("pemain tereliminasi yang belum keluar ikut dikeluarkan saat rematch", async () => {
    const ctx = await setup();
    eliminate(ctx, ctx.third.playerId);
    runToFinish(ctx);
    await until(() => ctx.server.rooms.get("UMR-1234")!.status === "finished", "room finished");
    const room = ctx.server.rooms.get("UMR-1234")!;
    const host = [ctx.host, ctx.second].find((p) => p.playerId === room.hostId)!;
    // Game acak bisa mengeliminasi pemain lain juga; yang tersisa = semua yang tidak tereliminasi.
    const eliminated = ctx.session().eliminatedPlayerIds();
    expect(eliminated).toContain(ctx.third.playerId);
    const expected = [ctx.host, ctx.second, ctx.third]
      .map((p) => p.playerId)
      .filter((id) => !eliminated.includes(id));
    const ack = await host.socket.emitWithAck("room:rematch", { requestId: rid() });
    expect(ack.ok).toBe(true);
    if (!ack.ok) return;
    expect(ack.room.status).toBe("waiting");
    expect(ack.room.players.map((p) => p.playerId)).not.toContain(ctx.third.playerId);
    if (expected.length > 0) expect(ack.room.players.map((p) => p.playerId).sort()).toEqual([...expected].sort());
    expect(ack.room.players.every((p) => p.ready === false)).toBe(true);
  });

  it("host tereliminasi lalu game selesai: host pindah ke peringkat bertahan terbaik, yang bisa Main Lagi (D7)", async () => {
    const ctx = await setup();
    eliminate(ctx, ctx.host.playerId);
    runToFinish(ctx);
    await until(() => ctx.server.rooms.get("UMR-1234")!.status === "finished", "room finished");
    const ranking = ctx.session().result!.ranking;
    const survivors = ranking.filter((row) => !row.eliminated).map((row) => row.playerId);
    const room = ctx.server.rooms.get("UMR-1234")!;
    const everyone = [ctx.host, ctx.second, ctx.third];

    if (survivors.length === 0) {
      // Game acak mengeliminasi semua orang: tidak ada kandidat, host tidak berubah.
      expect(room.hostId).toBe(ctx.host.playerId);
      return;
    }
    expect(room.hostId).toBe(survivors[0]);
    expect(room.hostId).not.toBe(ctx.host.playerId);
    expect(room.players.filter((p) => p.isHost).map((p) => p.playerId)).toEqual([survivors[0]]);
    await until(() => ctx.find(ctx.host, "room:state").at(-1)?.payload.hostId === survivors[0], "room:state host baru");

    const caller = everyone.find((p) => p.playerId === room.hostId)!;
    const ack = await caller.socket.emitWithAck("room:rematch", { requestId: rid() });
    expect(ack.ok).toBe(true);
    if (!ack.ok) return;
    expect(ack.room.players.map((p) => p.playerId).sort()).toEqual([...survivors].sort());
    expect(ack.room.players.map((p) => p.playerId)).not.toContain(ctx.host.playerId);
    expect(ack.room.hostId).toBe(survivors[0]);
  });

  it("semua tereliminasi: Main Lagi ditolak NOT_ENOUGH_PLAYERS dan room tidak berubah", async () => {
    const ctx = await setup();
    for (const p of [ctx.host, ctx.second, ctx.third]) eliminate(ctx, p.playerId);
    runToFinish(ctx);
    await until(() => ctx.server.rooms.get("UMR-1234")!.status === "finished", "room finished");
    const before = ctx.server.rooms.get("UMR-1234")!;
    expect(before.hostId).toBe(ctx.host.playerId); // tidak ada kandidat -> host tidak berubah
    expect(await ctx.host.socket.emitWithAck("room:rematch", { requestId: rid() })).toEqual({
      ok: false,
      error: "NOT_ENOUGH_PLAYERS",
    });
    expect(ctx.server.rooms.get("UMR-1234")).toEqual(before);
    expect(ctx.server.games.get("UMR-1234")).not.toBeNull();
  });

  it("yang hidup semuanya putus, host tereliminasi: Main Lagi ditolak NOT_ENOUGH_PLAYERS", async () => {
    const ctx = await setup();
    eliminate(ctx, ctx.host.playerId);
    ctx.second.socket.disconnect();
    ctx.third.socket.disconnect();
    await until(
      () => ctx.find(ctx.host, "player:connection").filter((e) => e.payload.connected === false).length >= 2,
      "dua pemain putus",
    );
    runToFinish(ctx);
    await until(() => ctx.server.rooms.get("UMR-1234")!.status === "finished", "room finished");
    const before = ctx.server.rooms.get("UMR-1234")!;
    expect(before.hostId).toBe(ctx.host.playerId);
    expect(await ctx.host.socket.emitWithAck("room:rematch", { requestId: rid() })).toEqual({
      ok: false,
      error: "NOT_ENOUGH_PLAYERS",
    });
    expect(ctx.server.rooms.get("UMR-1234")).toEqual(before);
  });
});
