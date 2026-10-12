import { once } from "node:events";
import type { AddressInfo } from "node:net";
import type { ClientToServerEvents, ServerToClientEvents } from "@pejuang/shared";
import { io as createClient, type Socket } from "socket.io-client";
import { afterEach, describe, expect, it, vi } from "vitest";
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
const rid = () => `00000000-0000-4000-8000-${String(5000 + ++counter).padStart(12, "0")}`;

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
type Plan = "hangout";

const HANGOUT = [
  { stat: "wealth", delta: -1_000_000 },
  { stat: "stress", delta: -3 },
] as const;

function giveCard(ctx: Ctx, playerId: string, motive: "sincere" | "commission") {
  const session = ctx.session();
  const player = session.state.players[playerId]!;
  const card = {
    cardId: `card-${playerId}`,
    plan: "hangout" as Plan,
    planEffects: [...HANGOUT],
    motive,
    expiresAtMonth: 3,
  };
  session.state = {
    ...session.state,
    players: { ...session.state.players, [playerId]: { ...player, inviteCard: card } },
  };
  return card.cardId;
}

function setStatus(ctx: Ctx, playerId: string, patch: Record<string, number>) {
  const session = ctx.session();
  const player = session.state.players[playerId]!;
  session.state = {
    ...session.state,
    players: {
      ...session.state.players,
      [playerId]: { ...player, status: { ...player.status, ...patch } },
    },
  };
}

/** Semua pemain menjawab Event Tanggal sampai giliran pertama berjalan. */
async function startTurns(ctx: Ctx) {
  const event = ctx.find(ctx.host, "calendar:event")[0]!.payload;
  for (const p of [ctx.host, ctx.second, ctx.third]) {
    await p.socket.emitWithAck("calendar:answer", { requestId: rid(), eventId: event.eventId, choice: "skip" });
  }
  await until(() => ctx.find(ctx.host, "turn:start").length > 0, "turn:start");
  const activeId = ctx.session().state.public.activePlayerId!;
  const all = [ctx.host, ctx.second, ctx.third];
  const active = all.find((p) => p.playerId === activeId)!;
  const others = all.filter((p) => p !== active);
  return { active, others: others as [TestPlayer, TestPlayer] };
}

const send = (from: TestPlayer, cardId: string, to: TestPlayer, turnId?: string) =>
  from.socket.emitWithAck("invite:send", {
    requestId: rid(),
    cardId,
    targetPlayerId: to.playerId,
    ...(turnId ? { turnId } : {}),
  });
const respond = (p: TestPlayer, inviteId: string, answer: "join" | "decline") =>
  p.socket.emitWithAck("invite:respond", { requestId: rid(), inviteId, answer });

/** Urutan giliran ronde ini sebagai TestPlayer: [pertama, kedua, terakhir]. */
function orderOf(ctx: Ctx): [TestPlayer, TestPlayer, TestPlayer] {
  const all = [ctx.host, ctx.second, ctx.third];
  return ctx.session().state.public.turnOrder.map(
    (id) => all.find((p) => p.playerId === id)!,
  ) as [TestPlayer, TestPlayer, TestPlayer];
}

/** Pemain aktif memilih heksa pertama dari turn:options terakhirnya. */
async function chooseFor(ctx: Ctx, player: TestPlayer) {
  await until(() => ctx.find(player, "turn:options").length > 0, "turn:options");
  const options = ctx.find(player, "turn:options").at(-1)!.payload;
  const ack = await player.socket.emitWithAck("turn:choose", {
    requestId: rid(),
    turnId: options.turnId,
    hex: options.options[0].hex,
  });
  expect(ack).toEqual({ ok: true });
}

async function waitTurnOf(ctx: Ctx, player: TestPlayer) {
  await until(() => ctx.session().state.public.activePlayerId === player.playerId, "giliran berikutnya");
  await until(() => ctx.find(player, "turn:options").length > 0, "turn:options");
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 60));

// Banyak langkah berurutan lewat socket nyata; beri ruang saat mesin sibuk (suite berjalan paralel).
describe("invite lewat socket (GDD 4.8 v1.12)", { timeout: 20_000 }, () => {
  it("di luar giliran sendiri ditolak INVITE_NOT_ALLOWED; setelah turn:choose juga ditolak", async () => {
    const ctx = await setup();
    const { active, others } = await startTurns(ctx);
    const outsider = others[0];
    const outsiderCard = giveCard(ctx, outsider.playerId, "commission");
    expect(await send(outsider, outsiderCard, active)).toMatchObject({
      ok: false,
      error: "INVITE_NOT_ALLOWED",
    });

    const activeCard = giveCard(ctx, active.playerId, "commission");
    await chooseFor(ctx, active);
    expect(await send(active, activeCard, outsider)).toMatchObject({
      ok: false,
      error: "INVITE_NOT_ALLOWED",
    });
  });

  it("kartu salah -> NO_INVITE_CARD, diri sendiri -> INVALID_TARGET, turnId lama -> INVITE_NOT_ALLOWED", async () => {
    const ctx = await setup();
    const { active, others } = await startTurns(ctx);
    const cardId = giveCard(ctx, active.playerId, "sincere");
    expect(await send(active, "bukan-kartu", others[0])).toMatchObject({ ok: false, error: "NO_INVITE_CARD" });
    expect(await send(active, cardId, active)).toMatchObject({ ok: false, error: "INVALID_TARGET" });
    expect(await send(active, cardId, others[0], "turn-lama")).toMatchObject({
      ok: false,
      error: "INVITE_NOT_ALLOWED",
    });
  });

  it("kirim di giliran sendiri: target menerima incoming tanpa motif; jawaban tidak menimbulkan efek", async () => {
    const ctx = await setup();
    const { active, others } = await startTurns(ctx);
    const [target, third] = others;
    const cardId = giveCard(ctx, active.playerId, "commission");
    const before = ctx.clock.now();
    const turnId = ctx.find(active, "turn:options")[0]!.payload.turnId;
    const ack = await send(active, cardId, target, turnId);
    expect(ack).toMatchObject({ ok: true, deadline: before + 15_000 });
    if (!ack.ok) return;
    await until(() => ctx.find(target, "invite:incoming").length > 0, "invite:incoming");
    const incoming = ctx.find(target, "invite:incoming")[0]!.payload;
    expect(incoming).toMatchObject({ fromPlayerId: active.playerId, deadline: before + 15_000 });
    expect(JSON.stringify(incoming)).not.toContain("motive");
    expect(ctx.find(third, "invite:incoming")).toHaveLength(0);

    const statusBefore = JSON.stringify(ctx.session().state.players[target.playerId]!.status);
    expect(await respond(target, ack.inviteId, "join")).toEqual({ ok: true });
    await tick();
    expect(JSON.stringify(ctx.session().state.players[target.playerId]!.status)).toBe(statusBefore);
    for (const p of [active, target, third]) {
      expect(ctx.find(p, "invite:resolved")).toHaveLength(0);
    }
    // Giliran pengirim tetap berjalan: ia masih bisa memilih heksa.
    await chooseFor(ctx, active);
  });

  it("dua Ajakan dari dua pengirim berbeda dalam satu ronde; target sibuk ditolak INVALID_TARGET", async () => {
    const ctx = await setup();
    await startTurns(ctx);
    const [first, second, last] = orderOf(ctx);
    const firstCard = giveCard(ctx, first.playerId, "sincere");
    const secondCard = giveCard(ctx, second.playerId, "commission");

    const a = await send(first, firstCard, last);
    expect(a.ok).toBe(true);
    if (!a.ok) return;
    await chooseFor(ctx, first);
    await waitTurnOf(ctx, second);

    // Target `last` masih punya Ajakan terbuka.
    expect(await send(second, secondCard, last)).toMatchObject({ ok: false, error: "INVALID_TARGET" });
    expect(await respond(last, a.inviteId, "decline")).toEqual({ ok: true });
    const b = await send(second, secondCard, last);
    expect(b.ok).toBe(true);
    expect(ctx.session().state.roundInvites).toHaveLength(2);
  });

  it("pemain terakhir mengirim lalu langsung memilih heksa: round:reveal menunggu jawaban", async () => {
    const ctx = await setup();
    await startTurns(ctx);
    const [first, second, last] = orderOf(ctx);
    await chooseFor(ctx, first);
    await waitTurnOf(ctx, second);
    await chooseFor(ctx, second);
    await waitTurnOf(ctx, last);

    const cardId = giveCard(ctx, last.playerId, "sincere");
    const ack = await send(last, cardId, first);
    if (!ack.ok) throw new Error("send gagal");
    await chooseFor(ctx, last);
    await tick();
    expect(ctx.find(last, "round:reveal")).toHaveLength(0);

    expect(await respond(first, ack.inviteId, "join")).toEqual({ ok: true });
    await until(() => ctx.find(last, "round:reveal").length > 0, "round:reveal");

    // invite:resolved hanya ke pengirim dan target, dan setelah round:reveal.
    await until(() => ctx.find(first, "invite:resolved").length > 0, "resolved target");
    await until(() => ctx.find(last, "invite:resolved").length > 0, "resolved pengirim");
    const indexOf = (p: TestPlayer, type: string) => p.log.findIndex((e) => e.type === type);
    expect(indexOf(first, "invite:resolved")).toBeGreaterThan(indexOf(first, "round:reveal"));
    expect(indexOf(last, "invite:resolved")).toBeGreaterThan(indexOf(last, "round:reveal"));
    expect(ctx.find(first, "invite:resolved")[0]!.payload).toMatchObject({ answer: "join", motive: "sincere" });
    expect(ctx.find(last, "invite:resolved")[0]!.payload).toMatchObject({ motive: "sincere" });
    expect(ctx.find(second, "invite:resolved")).toHaveLength(0);
    expect(ctx.find(second, "invite:incoming")).toHaveLength(0);
  });

  it("menerima jawaban tepat pada grace 500 ms dan menolak sesudahnya", async () => {
    const accepted = await setup();
    const acceptedTurn = await startTurns(accepted);
    const acceptedCard = giveCard(accepted, acceptedTurn.active.playerId, "commission");
    const acceptedAck = await send(acceptedTurn.active, acceptedCard, acceptedTurn.others[0]);
    if (!acceptedAck.ok) throw new Error("send gagal");
    accepted.clock.advance(15_500);
    expect(await respond(acceptedTurn.others[0], acceptedAck.inviteId, "join")).toEqual({ ok: true });

    const expired = await setup();
    const expiredTurn = await startTurns(expired);
    const expiredCard = giveCard(expired, expiredTurn.active.playerId, "commission");
    const expiredAck = await send(expiredTurn.active, expiredCard, expiredTurn.others[0]);
    if (!expiredAck.ok) throw new Error("send gagal");
    expired.clock.advance(15_501);
    expect(await respond(expiredTurn.others[0], expiredAck.inviteId, "join")).toMatchObject({
      ok: false,
      error: "INVITE_EXPIRED",
    });
  });

  it("reconnect saat Ajakan masih terbuka mendapat pendingInvite dengan deadline asli", async () => {
    const ctx = await setup();
    await startTurns(ctx);
    const [first, second, last] = orderOf(ctx);
    await chooseFor(ctx, first);
    await waitTurnOf(ctx, second);
    await chooseFor(ctx, second);
    await waitTurnOf(ctx, last);

    const cardId = giveCard(ctx, last.playerId, "sincere");
    const ack = await send(last, cardId, first);
    if (!ack.ok) throw new Error("send gagal");
    await until(() => ctx.find(first, "invite:incoming").length > 0, "invite:incoming");
    const original = ctx.find(first, "invite:incoming")[0]!.payload;

    const reconnected = await connect(ctx.baseUrl, first.token);
    const resumed = await reconnected.emitWithAck("session:resume", { requestId: rid(), roomCode: "UMR-1234" });
    expect(resumed.ok).toBe(true);
    if (resumed.ok) {
      expect(resumed.snapshot.me.pendingInvite).toEqual(original);
      expect(resumed.snapshot.me.pendingInvite?.deadline).toBe(ack.deadline);
    }
    // Pemain yang bukan target tidak mendapat pendingInvite.
    const lastResumed = await connect(ctx.baseUrl, last.token);
    const lastSnapshot = await lastResumed.emitWithAck("session:resume", { requestId: rid(), roomCode: "UMR-1234" });
    expect(lastSnapshot.ok && lastSnapshot.snapshot.me.pendingInvite).toBeNull();

    // Setelah dijawab, snapshot tidak lagi memuat pendingInvite.
    expect(
      await reconnected.emitWithAck("invite:respond", { requestId: rid(), inviteId: ack.inviteId, answer: "join" }),
    ).toEqual({ ok: true });
    const after = await reconnected.emitWithAck("session:resume", { requestId: rid(), roomCode: "UMR-1234" });
    expect(after.ok && after.snapshot.me.pendingInvite).toBeNull();
  });

  it("Ajakan tidak dijawab 15 detik -> Tolak otomatis dan Fase Pembalikan jalan", async () => {
    const ctx = await setup();
    await startTurns(ctx);
    const [first, second, last] = orderOf(ctx);
    await chooseFor(ctx, first);
    await waitTurnOf(ctx, second);
    await chooseFor(ctx, second);
    await waitTurnOf(ctx, last);

    const cardId = giveCard(ctx, last.playerId, "commission");
    const ack = await send(last, cardId, second);
    if (!ack.ok) throw new Error("send gagal");
    await chooseFor(ctx, last);
    await tick();
    expect(ctx.find(last, "round:reveal")).toHaveLength(0);
    ctx.clock.advance(15_000); // deadline lewat, masih dalam grace 500 ms
    await tick();
    expect(ctx.find(last, "round:reveal")).toHaveLength(0);
    ctx.clock.advance(501);
    await until(() => ctx.find(last, "round:reveal").length > 0, "round:reveal");
    await until(() => ctx.find(last, "invite:resolved").length > 0, "invite:resolved");
    expect(ctx.find(last, "invite:resolved")[0]!.payload).toMatchObject({
      answer: "decline",
      autoDeclined: true,
      motive: "commission",
    });
    expect(ctx.find(first, "invite:resolved")).toHaveLength(0);
  });

  it("tanpa Ajakan terbuka, Fase Pembalikan langsung jalan setelah pemain terakhir memilih", async () => {
    const ctx = await setup();
    await startTurns(ctx);
    const [first, second, last] = orderOf(ctx);
    await chooseFor(ctx, first);
    await waitTurnOf(ctx, second);
    await chooseFor(ctx, second);
    await waitTurnOf(ctx, last);
    await chooseFor(ctx, last);
    await until(() => ctx.find(last, "round:reveal").length > 0, "round:reveal");
    expect(ctx.find(last, "turn:timer")).toHaveLength(0);
  });

  it("room ditutup saat Ajakan menunggu -> semua timer ikut bersih", async () => {
    const ctx = await setup();
    const { active, others } = await startTurns(ctx);
    const janitorOnly = ctx.clock.pending - 1;
    const cardId = giveCard(ctx, active.playerId, "commission");
    const ack = await send(active, cardId, others[0]);
    expect(ack.ok).toBe(true);
    expect(ctx.clock.pending).toBe(janitorOnly + 2); // timer giliran + timer Ajakan
    ctx.session().dispose();
    expect(ctx.clock.pending).toBe(janitorOnly);
  });
});

describe("jalur snapshot divalidasi seperti dispatcher", { timeout: 20_000 }, () => {
  async function resumeAs(ctx: Ctx, p: TestPlayer) {
    const socket = await connect(ctx.baseUrl, p.token);
    const resumed = await socket.emitWithAck("session:resume", { requestId: rid(), roomCode: "UMR-1234" });
    if (!resumed.ok) throw new Error("resume gagal");
    return resumed.snapshot;
  }

  it("payload invite:incoming dengan field motive tidak pernah muncul di snapshot (null + log tanpa isi)", async () => {
    const ctx = await setup();
    const { active, others } = await startTurns(ctx);
    const target = others[0];
    const ack = await send(active, giveCard(ctx, active.playerId, "commission"), target);
    if (!ack.ok) throw new Error("send gagal");
    // Simulasikan bug: payload yang disimpan untuk snapshot memuat motif.
    const open = (ctx.session() as unknown as { openInvites: Map<string, { payload: Record<string, unknown> }> }).openInvites;
    open.get(ack.inviteId)!.payload.motive = "commission";

    const errors = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const snapshot = await resumeAs(ctx, target);
    expect(snapshot.me.pendingInvite).toBeNull();
    // Kartu milik target sendiri (me.inviteCard) sah memuat motifnya; selebihnya tidak boleh.
    const rest = JSON.stringify({ ...snapshot, me: { ...snapshot.me, inviteCard: null } });
    expect(rest).not.toContain("motive");
    expect(rest).not.toContain("commission");
    const logged = errors.mock.calls.map((call) => call.join(" ")).join("\n");
    expect(logged).toContain("pendingInvite");
    expect(logged).not.toContain("commission");
    expect(logged).not.toContain(ack.inviteId);
    errors.mockRestore();
  });

  it("payload valid tetap sampai ke snapshot (pendingInvite dan pendingTurn)", async () => {
    const ctx = await setup();
    const { active, others } = await startTurns(ctx);
    const ack = await send(active, giveCard(ctx, active.playerId, "sincere"), others[0]);
    if (!ack.ok) throw new Error("send gagal");
    expect((await resumeAs(ctx, others[0])).me.pendingInvite?.inviteId).toBe(ack.inviteId);
    expect((await resumeAs(ctx, active)).me.pendingTurn?.turnId).toContain(active.playerId);
  });

  it("pendingTurn, pendingCalendar, pendingMonth, dan reflection yang rusak menjadi null", async () => {
    const ctx = await setup();
    const internals = ctx.session() as unknown as {
      lastCalendar: unknown;
      lastTurn: { playerId: string; payload: unknown } | null;
      lastMonth: Map<string, unknown>;
      reflections: Map<string, unknown>;
    };
    const target = ctx.second;
    internals.lastCalendar = { ...(internals.lastCalendar as object), choices: "bukan array" };
    const errors = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect((await resumeAs(ctx, target)).me.pendingCalendar).toBeNull();

    const session = ctx.session();
    const player = session.state.players[target.playerId]!;
    session.state = {
      ...session.state,
      phase: "monthChange",
      pendingMonth: { month: 2, debtorIds: [target.playerId], answers: {} },
      pendingTurn: { turnId: `turn-1-${target.playerId}`, playerId: target.playerId, mode: "normal", options: [] },
    };
    internals.lastMonth.set(target.playerId, { month: 99 });
    internals.lastTurn = { playerId: target.playerId, payload: { turnId: `turn-1-${target.playerId}`, options: "rusak" } };
    internals.reflections.set(target.playerId, { source: "ai", summary: 1, insights: [] });
    const snapshot = await resumeAs(ctx, target);
    expect(snapshot.me.pendingMonth).toBeNull();
    expect(snapshot.me.pendingTurn).toBeNull();
    expect(snapshot.me.reflection).toBeNull();
    expect(player).toBeDefined();
    const logged = errors.mock.calls.map((call) => call.join(" ")).join("\n");
    for (const label of ["pendingCalendar", "pendingMonth", "pendingTurn", "reflection"]) {
      expect(logged).toContain(label);
    }
    expect(logged).not.toContain("bukan array");
    expect(logged).not.toContain("rusak");
    errors.mockRestore();
  });
});
