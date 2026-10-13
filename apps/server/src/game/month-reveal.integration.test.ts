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

/** Nilai kecil supaya tes cepat; default produksi diuji di config.test.ts. */
const REVEAL_STEP_MS = 400;
const MONTH_PAY_SECONDS = 5;
const MONTH_SUMMARY_ONLY_MS = 700;
const TICK_MS = 100;

/** ManualClock yang mencatat setiap timer yang dipasang (jeda dan waktu pemasangannya). */
class RecordingClock extends ManualClock {
  readonly scheduled: Array<{ ms: number; at: number }> = [];
  override setTimeout(callback: () => void, ms: number) {
    this.scheduled.push({ ms, at: this.now() });
    return super.setTimeout(callback, ms);
  }
}

function lastIndexWhere<T>(items: readonly T[], match: (item: T) => boolean): number {
  for (let i = items.length - 1; i >= 0; i -= 1) if (match(items[i]!)) return i;
  return -1;
}

function latestTimer(ctx: { clock: RecordingClock }, ms: number) {
  const timer = [...ctx.clock.scheduled].reverse().find((entry) => entry.ms === ms);
  if (!timer) throw new Error(`Timer ${ms}ms tidak ditemukan`);
  return timer;
}

function advanceToTimer(ctx: { clock: RecordingClock }, ms: number, before = 0) {
  const timer = latestTimer(ctx, ms);
  ctx.clock.advance(Math.max(0, timer.at + timer.ms - ctx.clock.now() - before));
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
  for (let i = 0; i < 300; i += 1) {
    if (condition()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`Timeout menunggu: ${label}`);
}

async function setup() {
  const clock = new RecordingClock();
  const server = createPejuangServer(
    {
      port: 0,
      webOrigin: "http://localhost:3000",
      guestTokenSecret: secret,
      version: "test",
      trustProxy: false,
      revealStepMs: REVEAL_STEP_MS,
      monthPaySeconds: MONTH_PAY_SECONDS,
      monthSummaryOnlyMs: MONTH_SUMMARY_ONLY_MS,
    },
    {
      rooms: new RoomRepository(() => "UMR-1234"),
      countdownMs: 5,
      createGameId: () => "game-test",
      clock,
    },
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
  await until(
    () => host.log.some((e) => e.type === "calendar:event") && guest.log.some((e) => e.type === "calendar:event"),
    "calendar:event",
  );
  const session = server.games.get("UMR-1234")!;
  const find = (p: { log: Received[] }, type: string) => p.log.filter((e) => e.type === type);
  return { clock, server, session, host, guest, find, baseUrl };
}

type Ctx = Awaited<ReturnType<typeof setup>>;

/** Menjaga pemain tetap sehat dan bebas Hutang supaya eliminasi acak tidak mengganggu tes. */
function stabilize(ctx: Ctx) {
  const players = { ...ctx.session.state.players };
  for (const [id, player] of Object.entries(players)) {
    if (player.eliminated) continue;
    players[id] = {
      ...player,
      status: {
        ...player.status,
        health: 10,
        stress: 0,
        debt: 0,
        wealth: Math.max(player.status.wealth, 10_000_000),
      },
    };
  }
  ctx.session.state = { ...ctx.session.state, players };
}

/** Memajukan jam per TICK_MS sampai kondisi terpenuhi. Tidak ada bot: semua lewat timeout. */
function drive(ctx: Ctx, condition: () => boolean, label: string) {
  for (let i = 0; i < 20_000; i += 1) {
    if (condition()) return;
    stabilize(ctx);
    ctx.clock.advance(TICK_MS);
  }
  throw new Error(`Jam habis menunggu: ${label}`);
}

/** Berhenti tepat setelah Fase Pembalikan Langkah (step - 1) selesai, sebelum ronde `step` dimulai. */
function driveToBeforeRound(ctx: Ctx, step: number) {
  drive(
    ctx,
    () =>
      ctx.session.state.nextStep === step &&
      ctx.session.state.public.calendar.step === step - 1 &&
      ctx.session.state.phase === "roundStart" &&
      ctx.session.state.public.phase === "reveal",
    `jeda sebelum langkah ${step}`,
  );
}

function driveToMonthChange(ctx: Ctx, step: number) {
  drive(
    ctx,
    () => ctx.session.state.public.calendar.step === step && ctx.session.state.phase === "monthChange",
    `monthChange langkah ${step}`,
  );
}

function setStatus(ctx: Ctx, playerId: string, patch: Record<string, number>) {
  const player = ctx.session.state.players[playerId]!;
  ctx.session.state = {
    ...ctx.session.state,
    players: { ...ctx.session.state.players, [playerId]: { ...player, status: { ...player.status, ...patch } } },
  };
}

/** Langkah 3 (ganti bulan pertama) dengan debtor yang ditentukan; mengembalikan popup yang sedang terbuka. */
async function openMonthChange(ctx: Ctx, debtors: Array<[string, Record<string, number>]>) {
  driveToBeforeRound(ctx, 3);
  // Efek Realita ronde sebelumnya bisa menimbulkan Hutang: mulai dari bersih.
  for (const playerId of [ctx.host.playerId, ctx.guest.playerId]) setStatus(ctx, playerId, { debt: 0 });
  for (const [playerId, patch] of debtors) setStatus(ctx, playerId, patch);
  const remaining = REVEAL_STEP_MS * 2;
  ctx.clock.advance(remaining);
  expect(ctx.session.state.phase).toBe("monthChange");
  await until(
    () => ctx.find(ctx.host, "month:summary").length > 0 && ctx.find(ctx.guest, "month:summary").length > 0,
    "month:summary",
  );
}

const pay = (p: Ctx["host"], month: number, amount: number) =>
  p.socket.emitWithAck("month:pay-debt", { requestId: rid(), month, amount });

describe("Ganti Bulan: month:pay-debt", () => {
  it("bayar sebagian, lunas (Level Stress -2), di luar batas, dan terlambat", async () => {
    const ctx = await setup();
    await openMonthChange(ctx, [
      [ctx.host.playerId, { debt: 4_000_000 }],
      [ctx.guest.playerId, { debt: 3_000_000, stress: 5 }],
    ]);

    const hostSummary = ctx.find(ctx.host, "month:summary")[0]!.payload;
    expect(hostSummary.month).toBe(2);
    expect(hostSummary.payDebt.max).toBe(4_000_000);
    const paymentTimer = latestTimer(ctx, MONTH_PAY_SECONDS * 1000 + 501);
    expect(hostSummary.payDebt.deadline).toBe(paymentTimer.at + MONTH_PAY_SECONDS * 1000);
    expect(ctx.session.state.public.phase).toBe("calendar");

    // Di luar batas: lebih dari max, desimal, negatif -> INVALID_PAYLOAD, popup tetap terbuka.
    expect(await pay(ctx.host, 2, 4_000_001)).toMatchObject({ ok: false, error: "INVALID_PAYLOAD" });
    expect(await pay(ctx.host, 2, 100.5)).toMatchObject({ ok: false, error: "INVALID_PAYLOAD" });
    expect(await pay(ctx.host, 2, -1)).toMatchObject({ ok: false, error: "INVALID_PAYLOAD" });
    // Bulan tidak cocok -> PAYMENT_CLOSED.
    expect(await pay(ctx.host, 3, 1_000)).toMatchObject({ ok: false, error: "PAYMENT_CLOSED" });

    // Bayar sebagian.
    expect(await pay(ctx.host, 2, 1_500_000)).toEqual({
      ok: true,
      paid: 1_500_000,
      debtCleared: false,
      stressDelta: 0,
    });
    await until(
      () => ctx.find(ctx.host, "player:status").some((e) => e.payload.debt === 2_500_000),
      "player:status setelah bayar",
    );
    expect(ctx.session.state.phase).toBe("monthChange");

    // Sudah menjawab -> tidak bisa lagi.
    expect(await pay(ctx.host, 2, 1_000)).toMatchObject({ ok: false, error: "PAYMENT_CLOSED" });

    // Lunas: Level Stress -2, dan karena semua debtor sudah menjawab popup ditutup cepat.
    const turnsBefore = ctx.find(ctx.host, "turn:start").length;
    expect(await pay(ctx.guest, 2, 3_000_000)).toEqual({
      ok: true,
      paid: 3_000_000,
      debtCleared: true,
      stressDelta: -2,
    });
    expect(ctx.session.state.players[ctx.guest.playerId]!.status).toMatchObject({ debt: 0, stress: 3 });
    await until(() => ctx.find(ctx.host, "turn:start").length > turnsBefore, "turn:start setelah popup ditutup");

    // Terlambat: popup sudah ditutup.
    expect(await pay(ctx.guest, 2, 0)).toMatchObject({ ok: false, error: "PAYMENT_CLOSED" });
  });

  it("popup ditutup lebih cepat saat semua debtor menjawab, bukan menunggu MONTH_PAY_SECONDS", async () => {
    const ctx = await setup();
    await openMonthChange(ctx, [[ctx.host.playerId, { debt: 4_000_000 }]]);
    expect(ctx.find(ctx.guest, "month:summary")[0]!.payload.payDebt).toBeNull();

    advanceToTimer(ctx, MONTH_PAY_SECONDS * 1000 + 501, 502);
    expect(ctx.session.state.phase).toBe("monthChange");

    expect(await pay(ctx.host, 2, 0)).toMatchObject({ ok: true, paid: 0 });
    expect(ctx.session.state.phase).not.toBe("monthChange");
    expect(ctx.session.state.phase).toBe("turn");
  });

  it("debtor yang tidak menjawab dianggap bayar 0 setelah MONTH_PAY_SECONDS", async () => {
    const ctx = await setup();
    await openMonthChange(ctx, [[ctx.host.playerId, { debt: 4_000_000 }]]);
    const before = ctx.session.state.players[ctx.host.playerId]!.status;

    advanceToTimer(ctx, MONTH_PAY_SECONDS * 1000 + 501, 502);
    expect(ctx.session.state.phase).toBe("monthChange");
    ctx.clock.advance(1);
    expect(ctx.session.state.phase).toBe("monthChange");
    ctx.clock.advance(501);
    expect(ctx.session.state.phase).toBe("turn");
    expect(ctx.session.state.players[ctx.host.playerId]!.status).toEqual(before);
    expect(await pay(ctx.host, 2, 1_000)).toMatchObject({ ok: false, error: "PAYMENT_CLOSED" });
  });

  it("pembayaran tepat deadline + 500 ms diterima, + 501 ms ditolak", async () => {
    const accepted = await setup();
    await openMonthChange(accepted, [[accepted.host.playerId, { debt: 4_000_000 }]]);
    const deadline = accepted.find(accepted.host, "month:summary")[0]!.payload.payDebt.deadline as number;
    accepted.clock.advance(deadline + 500 - accepted.clock.now());
    expect(await pay(accepted.host, 2, 1_000_000)).toMatchObject({ ok: true, paid: 1_000_000 });
    expect(accepted.session.state.phase).toBe("turn");

    const expired = await setup();
    await openMonthChange(expired, [[expired.host.playerId, { debt: 4_000_000 }]]);
    const expiredDeadline = expired.find(expired.host, "month:summary")[0]!.payload.payDebt.deadline as number;
    expired.clock.advance(expiredDeadline + 501 - expired.clock.now());
    expect(await pay(expired.host, 2, 1_000_000)).toMatchObject({ ok: false, error: "PAYMENT_CLOSED" });
    expect(expired.session.state.players[expired.host.playerId]!.status.debt).toBe(4_000_000);
  });

  it("tanpa debtor: lanjut setelah MONTH_SUMMARY_ONLY_MS", async () => {
    const ctx = await setup();
    await openMonthChange(ctx, []);
    expect(ctx.find(ctx.host, "month:summary")[0]!.payload.payDebt).toBeNull();
    expect(ctx.find(ctx.guest, "month:summary")[0]!.payload.payDebt).toBeNull();

    advanceToTimer(ctx, MONTH_SUMMARY_ONLY_MS, 1);
    expect(ctx.session.state.phase).toBe("monthChange");
    advanceToTimer(ctx, MONTH_SUMMARY_ONLY_MS);
    expect(ctx.session.state.phase).toBe("turn");
    await until(() => ctx.find(ctx.host, "turn:start").length > 0, "turn:start");
  });

  it("reconnect saat popup masih terbuka mendapat pendingMonth dengan deadline asli", async () => {
    const ctx = await setup();
    await openMonthChange(ctx, [[ctx.host.playerId, { debt: 4_000_000 }]]);
    const summary = ctx.find(ctx.host, "month:summary")[0]!.payload;

    ctx.host.socket.disconnect();
    ctx.clock.advance(2_000);
    const socket: TestSocket = createClient(ctx.baseUrl, {
      transports: ["websocket"],
      auth: { token: ctx.host.token },
      reconnection: false,
    });
    openSockets.push(socket);
    await new Promise<void>((resolve) => socket.once("connect", resolve));
    const resumed = await socket.emitWithAck("session:resume", { requestId: rid(), roomCode: "UMR-1234" });
    expect(resumed.ok).toBe(true);
    if (!resumed.ok) return;
    expect(resumed.snapshot.me.pendingMonth).toEqual(summary);
    expect(resumed.snapshot.me.pendingMonth?.payDebt?.deadline).toBe(summary.payDebt.deadline);
    expect(resumed.snapshot.game?.phase).toBe("calendar");

    // Pemain tanpa Hutang tetap melihat ringkasan, tanpa aksi pembayaran.
    const guestResume = await ctx.guest.socket.emitWithAck("session:resume", {
      requestId: rid(),
      roomCode: "UMR-1234",
    });
    expect(guestResume.ok && guestResume.snapshot.me.pendingMonth).toMatchObject({ month: 2, payDebt: null });

    // Popup tertutup setelah deadline; snapshot tak lagi memuat ringkasan.
    advanceToTimer(ctx, MONTH_PAY_SECONDS * 1000 + 501);
    await until(() => ctx.session.state.phase !== "monthChange", "popup tertutup");
    const after = await socket.emitWithAck("session:resume", { requestId: rid(), roomCode: "UMR-1234" });
    expect(after.ok && after.snapshot.me.pendingMonth).toBeNull();
  });

  it("reconnect setelah menjawab tidak membuka slider lagi selama debtor lain belum selesai", async () => {
    const ctx = await setup();
    await openMonthChange(ctx, [
      [ctx.host.playerId, { debt: 4_000_000 }],
      [ctx.guest.playerId, { debt: 2_000_000 }],
    ]);
    expect(await pay(ctx.host, 2, 0)).toMatchObject({ ok: true });
    const resumed = await ctx.host.socket.emitWithAck("session:resume", { requestId: rid(), roomCode: "UMR-1234" });
    expect(resumed.ok && resumed.snapshot.me.pendingMonth).toMatchObject({ month: 2, payDebt: null });
    expect(await pay(ctx.host, 2, 0)).toMatchObject({ ok: false, error: "PAYMENT_CLOSED" });
    const guest = await ctx.guest.socket.emitWithAck("session:resume", { requestId: rid(), roomCode: "UMR-1234" });
    expect(guest.ok && guest.snapshot.me.pendingMonth?.payDebt).toMatchObject({ max: 2_000_000 });
  });

  it("Langkah 9: month:summary lebih dulu, baru calendar:event", async () => {
    const ctx = await setup();
    driveToMonthChange(ctx, 9);
    await until(() => ctx.find(ctx.host, "month:summary").length === 4, "month:summary langkah 9");
    // Popup Ganti Bulan masih terbuka: Event Tanggal belum dikirim.
    const labour = () => ctx.host.log.findIndex((e) => e.type === "calendar:event" && e.payload.eventId === "labour-day");
    expect(labour()).toBe(-1);
    const cardCount = ctx.find(ctx.host, "invite:card").length;
    const goldCount = ctx.find(ctx.host, "gold:spawned").length;

    advanceToTimer(ctx, MONTH_SUMMARY_ONLY_MS);
    await until(() => labour() !== -1, "calendar:event labour-day");
    const summaryIndex = lastIndexWhere(ctx.host.log, (e) => e.type === "month:summary");
    expect(summaryIndex).toBeGreaterThan(-1);
    expect(summaryIndex).toBeLessThan(labour());
    expect(ctx.session.state.phase).toBe("calendarEvent");
    expect(ctx.find(ctx.host, "invite:card")).toHaveLength(cardCount);
    expect(ctx.find(ctx.host, "gold:spawned")).toHaveLength(goldCount);
    const calendarTimer = latestTimer(ctx, 15_000 + 501);
    expect(ctx.find(ctx.host, "calendar:event").at(-1)!.payload.deadline).toBe(calendarTimer.at + 15_000);
    advanceToTimer(ctx, 15_000 + 501);
    await until(() => ctx.find(ctx.host, "invite:card").length > cardCount, "Kartu Ajakan setelah kalender");
    await until(() => ctx.find(ctx.host, "gold:spawned").length > goldCount, "Emas setelah kalender");
    const cardAt = lastIndexWhere(ctx.host.log, (e) => e.type === "invite:card");
    const goldAt = lastIndexWhere(ctx.host.log, (e) => e.type === "gold:spawned");
    const turnAt = lastIndexWhere(ctx.host.log, (e) => e.type === "turn:start");
    expect(labour()).toBeLessThan(cardAt);
    expect(cardAt).toBeLessThan(goldAt);
    expect(goldAt).toBeLessThan(turnAt);
  }, 20_000);
});

describe("Fase Pembalikan", () => {
  it("tidak ada tile:resolved sebelum round:reveal pada ronde yang sama, untuk semua socket", async () => {
    const ctx = await setup();
    driveToBeforeRound(ctx, 6);
    await until(() => ctx.find(ctx.host, "round:reveal").length >= 5, "round:reveal");
    for (const p of [ctx.host, ctx.guest]) {
      const revealed = new Set<number>();
      let opened = 0;
      for (const entry of p.log) {
        if (entry.type === "tile:opened") opened += 1;
        if (entry.type === "round:reveal") revealed.add(entry.payload.round);
        if (entry.type === "tile:resolved") {
          const round = entry.payload.round as number;
          expect(revealed.has(round), `tile:resolved ronde ${round} sebelum round:reveal`).toBe(true);
        }
      }
      expect(opened).toBeGreaterThan(0);
      // Tidak ada tile:resolved di antara tile:opened dan round:reveal ronde itu.
      const resolvedRounds = p.log.filter((e) => e.type === "tile:resolved").map((e) => e.payload.round);
      for (const round of resolvedRounds) {
        const revealAt = p.log.findIndex((e) => e.type === "round:reveal" && e.payload.round === round);
        const resolvedAt = p.log.findIndex((e) => e.type === "tile:resolved" && e.payload.round === round);
        expect(resolvedAt).toBeGreaterThan(revealAt);
      }
    }
    const reveal = ctx.find(ctx.host, "round:reveal")[0]!.payload;
    expect(reveal.order).toHaveLength(2);
    expect(reveal.round).toBe(reveal.step);
  });

  it("pilihan otomatis akibat timeout tetap dibuka sesuai urutan di Fase Pembalikan", async () => {
    const ctx = await setup();
    driveToBeforeRound(ctx, 3);
    await until(() => ctx.find(ctx.host, "round:reveal").length >= 2, "pembalikan langkah 2");
    const entries = ctx.host.log;
    const revealAt = entries.findIndex((event) => event.type === "round:reveal" && event.payload.step === 2);
    const reveal = entries[revealAt]!.payload;
    const opened = entries.filter((event) => event.type === "tile:opened" && event.payload.autoPicked);
    expect(opened).toHaveLength(4); // dua pemain x dua langkah, keduanya habis waktu
    const resolved = entries.slice(revealAt + 1).filter((event) => event.type === "tile:resolved" && event.payload.round === 2);
    expect(resolved.map((event) => event.payload.playerId)).toEqual(reveal.order.map((entry: { playerId: string }) => entry.playerId));
    expect(resolved).toHaveLength(2);
    for (const event of resolved) {
      const openedAt = entries.findIndex((entry) => entry.type === "tile:opened" && entry.payload.turnId === event.payload.turnId);
      expect(openedAt).toBeLessThan(revealAt);
    }
  });

  it("Realita tidak ada di state publik atau event sebelum round:reveal", async () => {
    const ctx = await setup();
    drive(
      ctx,
      () => ctx.session.state.public.calendar.step === 2 && ctx.session.state.phase === "turn" && ctx.session.state.pendingRealities.length === 1,
      "satu pemain sudah memilih di langkah 2",
    );
    const hidden = ctx.session.state.pendingRealities[0]!;
    const publicJson = JSON.stringify(ctx.session.publicState());
    // Teks yang sama bisa sah muncul dari Realita ronde 1 yang sudah dibuka (varian acak sama).
    const alreadyRevealed = new Set(
      ctx.session.publicState().openedHexes.flatMap((entry) => (entry.reality ? [entry.reality.text] : [])),
    );
    const textCollides = alreadyRevealed.has(hidden.text);
    if (!textCollides) expect(publicJson).not.toContain(hidden.text);
    expect(ctx.session.publicState().openedHexes.at(-1)).toMatchObject({ reality: null });
    await until(() => ctx.find(ctx.host, "tile:opened").length >= 1, "tile:opened");
    for (const p of [ctx.host, ctx.guest]) {
      expect(p.log.some((e) => e.type === "tile:resolved" && e.payload.round === 2)).toBe(false);
      if (!textCollides) {
        expect(JSON.stringify(p.log.filter((e) => e.type !== "session:snapshot"))).not.toContain(hidden.text);
      }
    }
  });

  it("ronde berikutnya baru mulai setelah jeda REVEAL_STEP_MS x jumlah pemain", async () => {
    const ctx = await setup();
    driveToBeforeRound(ctx, 4);
    const delay = REVEAL_STEP_MS * 2;
    const timer = ctx.clock.scheduled[lastIndexWhere(ctx.clock.scheduled, (entry) => entry.ms === delay)]!;
    expect(timer).toBeDefined();
    const remaining = timer.at + delay - ctx.clock.now();
    expect(remaining).toBeGreaterThan(0);

    ctx.clock.advance(remaining - 1);
    expect(ctx.session.state.phase).toBe("roundStart");
    expect(ctx.session.state.public.phase).toBe("reveal");
    ctx.clock.advance(1);
    expect(ctx.session.state.phase).not.toBe("roundStart");
    expect(ctx.session.state.public.calendar.step).toBe(4);
  });

  it("snapshot selama jeda Fase Pembalikan: phase reveal dan kalender masih di langkah yang baru selesai", async () => {
    const ctx = await setup();
    driveToBeforeRound(ctx, 4);
    const resume = async () => {
      const socket: TestSocket = createClient(ctx.baseUrl, {
        transports: ["websocket"],
        auth: { token: ctx.guest.token },
        reconnection: false,
      });
      openSockets.push(socket);
      await new Promise<void>((resolve) => socket.once("connect", resolve));
      const resumed = await socket.emitWithAck("session:resume", { requestId: rid(), roomCode: "UMR-1234" });
      if (!resumed.ok) throw new Error("resume gagal");
      return resumed.snapshot;
    };
    const paused = await resume();
    expect(paused.game?.phase).toBe("reveal");
    expect(paused.game?.calendar.step).toBe(3);
    // Langkah baru baru terlihat lewat game:patch calendar di startRound.
    const patchesBefore = ctx.find(ctx.host, "game:patch").filter((e) =>
      e.payload.ops.some((op: { type: string; calendar?: { step: number } }) => op.type === "calendar" && op.calendar?.step === 4),
    ).length;
    expect(patchesBefore).toBe(0);
    ctx.clock.advance(REVEAL_STEP_MS * 2);
    await until(
      () =>
        ctx.find(ctx.host, "game:patch").some((e) =>
          e.payload.ops.some((op: { type: string; calendar?: { step: number } }) => op.type === "calendar" && op.calendar?.step === 4),
        ),
      "game:patch calendar langkah 4",
    );
    expect(ctx.session.state.public.calendar.step).toBe(4);
  });

  it("Langkah 24 tetap menjalankan Fase Pembalikan sebelum game:finished", async () => {
    const ctx = await setup();
    drive(ctx, () => ctx.session.finished, "game selesai");
    await until(
      () => ctx.find(ctx.host, "game:finished").length === 1 && ctx.find(ctx.guest, "game:finished").length === 1,
      "game:finished",
    );
    for (const p of [ctx.host, ctx.guest]) {
      const finishedAt = p.log.findIndex((e) => e.type === "game:finished");
      const lastReveal = lastIndexWhere(p.log, (e) => e.type === "round:reveal");
      expect(lastReveal).toBeGreaterThan(-1);
      expect(lastReveal).toBeLessThan(finishedAt);
      expect(p.log[lastReveal]!.payload.step).toBe(24);
      expect(p.log.some((e) => e.type === "tile:resolved" && e.payload.round === 24)).toBe(true);
    }
    expect(ctx.server.rooms.get("UMR-1234")!.status).toBe("finished");
  }, 30_000);
});
