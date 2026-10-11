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

describe("spectate:enter", () => {
  it("pemain yang masih hidup -> NOT_ELIMINATED dan bukan penonton", async () => {
    const ctx = await setup();
    const ack = await ctx.third.socket.emitWithAck("spectate:enter", { requestId: rid() });
    expect(ack).toMatchObject({ ok: false, error: "NOT_ELIMINATED" });
    expect(ctx.session().publicState().spectators).toEqual([]);
  });

  it("payload tidak valid -> INVALID_PAYLOAD", async () => {
    const ctx = await setup();
    const ack = await ctx.third.socket.emitWithAck("spectate:enter", {} as never);
    expect(ack).toMatchObject({ ok: false, error: "INVALID_PAYLOAD" });
  });

  it("pemain tereliminasi -> snapshot hanya berisi status sendiri, tanpa data privat lawan", async () => {
    const ctx = await setup();
    eliminate(ctx, ctx.third.playerId);
    const ack = await ctx.third.socket.emitWithAck("spectate:enter", { requestId: rid() });
    expect(ack.ok).toBe(true);
    if (!ack.ok) return;
    const { snapshot } = ack;
    expect(snapshot.me.playerId).toBe(ctx.third.playerId);
    expect(snapshot.me.isSpectator).toBe(true);
    expect(snapshot.game?.spectators).toEqual([ctx.third.playerId]);
    expect(snapshot.me.status).toEqual(ctx.session().state.players[ctx.third.playerId]!.status);

    // Status privat lawan tidak ikut: hanya `me.status` yang punya kunci status.
    const privateKeys = ["wealth", "debt", "debtLimit", "health", "stress"];
    const withoutMe = JSON.stringify({ ...snapshot, me: { ...snapshot.me, status: null } });
    for (const key of privateKeys) expect(withoutMe).not.toContain(`"${key}":`);
    expect(JSON.stringify(snapshot)).not.toContain('"board"');
    expect(snapshot.me.pendingTurn).toBeNull();
    expect(snapshot.me.pendingCalendar).toBeNull();
  });

  it("penonton tetap menerima event room tetapi tidak calendar:event berikutnya", async () => {
    const ctx = await setup();
    eliminate(ctx, ctx.third.playerId);
    expect(await ctx.third.socket.emitWithAck("spectate:enter", { requestId: rid() })).toMatchObject({ ok: true });
    const spectatorEventsBefore = ctx.third.log.length;

    // Maju sampai Event Tanggal berikutnya (Langkah 6) muncul untuk pemain yang bermain.
    // Loop memakai state sesi (bukan log socket) karena pengiriman event bersifat async.
    const inSecondEvent = () =>
      ctx.session().state.public.calendar.step >= 6 && ctx.session().state.phase === "calendarEvent";
    for (let i = 0; i < 2000 && !inSecondEvent() && !ctx.session().finished; i += 1) {
      ctx.clock.advance(1_000);
    }
    expect(ctx.session().finished).toBe(false);
    await until(() => ctx.find(ctx.host, "calendar:event").length === 2, "calendar:event kedua (host)");
    await until(() => ctx.find(ctx.second, "calendar:event").length === 2, "calendar:event kedua (pemain)");

    expect(ctx.find(ctx.third, "calendar:event")).toHaveLength(1);
    const after = ctx.third.log.slice(spectatorEventsBefore);
    expect(after.some((e) => e.type === "turn:start" || e.type === "season:changed")).toBe(true);
    expect(after.some((e) => e.type === "turn:options" || e.type === "invite:incoming")).toBe(false);
  });

  it("penonton yang putus lalu resume tetap penonton", async () => {
    const ctx = await setup();
    eliminate(ctx, ctx.third.playerId);
    await ctx.third.socket.emitWithAck("spectate:enter", { requestId: rid() });
    ctx.third.socket.disconnect();
    await until(
      () => ctx.find(ctx.host, "player:connection").some((e) => e.payload.connected === false),
      "player:connection false",
    );

    const socket = await connect(ctx.baseUrl, ctx.third.token);
    const resumed = await socket.emitWithAck("session:resume", { requestId: rid(), roomCode: "UMR-1234" });
    expect(resumed.ok).toBe(true);
    if (!resumed.ok) return;
    expect(resumed.snapshot.me.isSpectator).toBe(true);
    expect(resumed.snapshot.game?.spectators).toEqual([ctx.third.playerId]);
  });
});
