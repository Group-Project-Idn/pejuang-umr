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

function giveCard(ctx: Ctx, playerId: string, motive: "sincere" | "commission" | "trap") {
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

const send = (from: TestPlayer, cardId: string, to: TestPlayer) =>
  from.socket.emitWithAck("invite:send", { requestId: rid(), cardId, targetPlayerId: to.playerId });
const respond = (p: TestPlayer, inviteId: string, answer: "join" | "decline") =>
  p.socket.emitWithAck("invite:respond", { requestId: rid(), inviteId, answer });

describe("invite lewat socket", () => {
  it("Ikut -> resolved ke pengirim dan target; pemain ketiga tidak menerima apa pun", async () => {
    const ctx = await setup();
    const { active, others } = await startTurns(ctx);
    const [sender, third] = others;
    const cardId = giveCard(ctx, sender.playerId, "commission");
    const before = ctx.clock.now();
    const ack = await send(sender, cardId, active);
    expect(ack).toMatchObject({ ok: true, deadline: before + 15_000 });
    if (!ack.ok) return;
    await until(() => ctx.find(active, "invite:incoming").length > 0, "invite:incoming");
    expect(ctx.find(active, "invite:incoming")[0]!.payload).toMatchObject({
      fromPlayerId: sender.playerId,
      fromName: sender === ctx.host ? "Host" : sender === ctx.second ? "Dua" : "Tiga",
      deadline: before + 15_000,
    });
    expect(await respond(active, ack.inviteId, "join")).toEqual({ ok: true });
    await until(() => ctx.find(sender, "invite:resolved").length > 0, "resolved pengirim");
    await until(() => ctx.find(active, "invite:resolved").length > 0, "resolved target");
    expect(ctx.find(third, "invite:incoming")).toHaveLength(0);
    expect(ctx.find(third, "invite:resolved")).toHaveLength(0);
    expect(third.log.filter((e) => e.type.startsWith("invite:") && e.type !== "invite:card")).toHaveLength(0);
  });

  it("target diam 15 detik -> autoDeclined true", async () => {
    const ctx = await setup();
    const { active, others } = await startTurns(ctx);
    const sender = others[0];
    const cardId = giveCard(ctx, sender.playerId, "commission");
    const ack = await send(sender, cardId, others[1]);
    expect(ack.ok).toBe(true);
    void active;
    ctx.clock.advance(15_000);
    await until(() => ctx.find(sender, "invite:resolved").length > 0, "resolved");
    expect(ctx.find(sender, "invite:resolved")[0]!.payload).toMatchObject({ answer: "decline", autoDeclined: true });
  });

  it("Ajakan ke pemain aktif tidak menjeda timer giliran", async () => {
    const ctx = await setup();
    const { active, others } = await startTurns(ctx);
    const sender = others[0];
    ctx.clock.advance(10_000); // sisa 20 detik dari 30
    const cardId = giveCard(ctx, sender.playerId, "commission");
    const ack = await send(sender, cardId, active);
    if (!ack.ok) throw new Error("send gagal");
    const deadline = ctx.session().publicState().turnDeadline;
    expect(deadline).toBe(ctx.clock.now() + 20_000);
    expect(ctx.find(sender, "turn:timer")).toHaveLength(0);
    ctx.clock.advance(15_000);
    await until(() => ctx.find(sender, "invite:resolved").length > 0, "invite:resolved");
    expect(ctx.find(sender, "invite:resolved").at(-1)!.payload).toMatchObject({
      answer: "decline",
      autoDeclined: true,
    });
    expect(ctx.session().publicState().turnDeadline).toBe(deadline);
    expect(ctx.find(sender, "turn:timer")).toHaveLength(0);
    expect(ctx.find(sender, "tile:opened")).toHaveLength(0);
    ctx.clock.advance(5_000);
    await until(() => ctx.find(sender, "tile:opened").length > 0, "tile:opened");
    expect(ctx.find(sender, "tile:opened")[0]!.payload.autoPicked).toBe(true);
  });

  it("pemain aktif tetap bisa memilih heksa saat Ajakan menunggu", async () => {
    const ctx = await setup();
    const { active, others } = await startTurns(ctx);
    const sender = others[0];
    const cardId = giveCard(ctx, sender.playerId, "commission");
    const ack = await send(sender, cardId, active);
    if (!ack.ok) throw new Error("send gagal");
    const options = ctx.find(active, "turn:options")[0]!.payload;
    const chosen = await active.socket.emitWithAck("turn:choose", {
      requestId: rid(),
      turnId: options.turnId,
      hex: options.options[0].hex,
    });
    expect(chosen).toEqual({ ok: true });
  });

  it("Ajakan kedua di ronde yang sama -> INVITE_LIMIT", async () => {
    const ctx = await setup();
    const { others } = await startTurns(ctx);
    const [a, b] = others;
    const cardA = giveCard(ctx, a.playerId, "trap");
    const cardB = giveCard(ctx, b.playerId, "trap");
    expect((await send(a, cardA, b)).ok).toBe(true);
    expect(await send(b, cardB, a)).toMatchObject({ ok: false, error: "INVITE_LIMIT" });
  });

  it("Tulus ditolak -> hanya game:patch inviteSincereDeclined (id pemain) yang terlihat pemain ketiga", async () => {
    const ctx = await setup();
    const { active, others } = await startTurns(ctx);
    const [sender, third] = others;
    const cardId = giveCard(ctx, sender.playerId, "sincere");
    const ack = await send(sender, cardId, active);
    if (!ack.ok) throw new Error("send gagal");
    await respond(active, ack.inviteId, "decline");
    await until(
      () => ctx.find(third, "game:patch").some((e) => JSON.stringify(e.payload).includes("inviteSincereDeclined")),
      "patch tulus",
    );
    const patch = ctx.find(third, "game:patch").find((e) => JSON.stringify(e.payload).includes("inviteSincereDeclined"))!;
    expect(patch.payload.ops.find((o: any) => o.type === "inviteSincereDeclined")).toEqual({
      type: "inviteSincereDeclined",
      fromPlayerId: sender.playerId,
      targetPlayerId: active.playerId,
    });
    expect(ctx.find(third, "invite:resolved")).toHaveLength(0);
    const seen = third.log.filter((e) => e.type.startsWith("invite:") && e.type !== "invite:card");
    expect(seen).toHaveLength(0);
    expect(JSON.stringify(patch.payload)).not.toContain("motive");
  });

  it("target yang sedang giliran Burnout -> giliran berpindah dan timer lama dibersihkan", async () => {
    const ctx = await setup();
    const { active, others } = await startTurns(ctx);
    const sender = others[0];
    const withTurnTimer = ctx.clock.pending; // timer janitor + timer giliran
    setStatus(ctx, active.playerId, { health: 3, stress: 9 });
    const cardId = giveCard(ctx, sender.playerId, "trap");
    const ack = await send(sender, cardId, active);
    if (!ack.ok) throw new Error("send gagal");
    const turnsBefore = ctx.find(sender, "turn:start").length;
    await respond(active, ack.inviteId, "join");
    await until(() => ctx.find(sender, "turn:start").length > turnsBefore, "giliran berikutnya");
    const next = ctx.find(sender, "turn:start").at(-1)!.payload;
    expect(next.playerId).not.toBe(active.playerId);
    expect(ctx.find(sender, "turn:timer")).toHaveLength(0);
    expect(ctx.session().state.players[active.playerId]!.eliminated).toBe(true);
    // Hanya timer giliran pemain berikutnya; tidak ada timer Ajakan/giliran lama yang tertinggal.
    expect(ctx.clock.pending).toBe(withTurnTimer);
  });

  it("game selesai karena Burnout -> game:finished dan semua timer bersih", async () => {
    const ctx = await setup();
    const { active, others } = await startTurns(ctx);
    const [sender, third] = others;
    const janitorOnly = ctx.clock.pending - 1;
    eliminateNow(ctx, third.playerId);
    setStatus(ctx, active.playerId, { health: 3, stress: 9 });
    const cardId = giveCard(ctx, sender.playerId, "trap");
    const ack = await send(sender, cardId, active);
    if (!ack.ok) throw new Error("send gagal");
    await respond(active, ack.inviteId, "join");
    await until(() => ctx.find(sender, "game:finished").length > 0, "game:finished");
    expect(ctx.session().finished).toBe(true);
    expect(ctx.clock.pending).toBe(janitorOnly);
  });

  it("room ditutup saat Ajakan menunggu -> timer ikut bersih", async () => {
    const ctx = await setup();
    const { active, others } = await startTurns(ctx);
    const sender = others[0];
    const janitorOnly = ctx.clock.pending - 1;
    const cardId = giveCard(ctx, sender.playerId, "commission");
    await send(sender, cardId, active);
    expect(ctx.clock.pending).toBe(janitorOnly + 2); // timer giliran tetap berjalan bersama timer Ajakan
    ctx.session().dispose();
    expect(ctx.clock.pending).toBe(janitorOnly);
  });
});

function eliminateNow(ctx: Ctx, playerId: string) {
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
