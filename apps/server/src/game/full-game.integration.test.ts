import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { TILES } from "@pejuang/engine/src/data";
import type { ClientToServerEvents, ServerToClientEvents } from "@pejuang/shared";
import { io as createClient, type Socket } from "socket.io-client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RoomRepository } from "../repositories/room-repository";
import { createPejuangServer } from "../server";
import { createGuestToken } from "../services/guest-token";
import type { Clock } from "./clock";

/** Merekam event engine apa adanya (sebelum validasi/penyaringan dispatcher) sebagai kebenaran dasar. */
const tap = vi.hoisted(() => ({
  events: [] as Array<{ type: string; target: { kind: string; playerId?: string }; payload: unknown }>,
}));
vi.mock("./event-dispatcher", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./event-dispatcher")>();
  return {
    ...actual,
    dispatch: (io: never, session: never, events: Array<(typeof tap.events)[number]>) => {
      for (const event of events) {
        tap.events.push({ type: event.type, target: event.target, payload: event.payload });
      }
      return actual.dispatch(io, session, events as never);
    },
  };
});

const secret = "test-secret-with-at-least-thirty-two-characters";
type TestSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
type Received = { type: string; payload: any };

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
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Kunci objek (bukan nilai string) yang hanya boleh ada di event privat pemilik. */
const PRIVATE_STAT_KEYS = new Set(["wealth", "debt", "debtLimit", "health", "stress"]);
const STAT_ALLOWED_TYPES = new Set(["player:status", "month:summary", "session:snapshot"]);

function collectKeys(value: unknown, keys = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    for (const item of value) collectKeys(item, keys);
  } else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      keys.add(key);
      collectKeys(child, keys);
    }
  }
  return keys;
}

/** Urutan deterministik (tanpa Math.random): peluang kirim Ajakan 3 dari 4 kartu, jawaban bergantian. */
const SEND_PATTERN = [true, true, false, true];
/** Ack semua invite:send bot, untuk memastikan tidak ada INVITE_LIMIT atau INVITE_NOT_ALLOWED. */
const inviteAcks: Array<{ ok: boolean; error?: string }> = [];

const MOTIVE_ALLOWED_TYPES = new Set(["invite:card", "invite:resolved"]);

describe("game penuh 3 bot", () => {
  it("berjalan sampai game:finished tanpa kebocoran dan tanpa lompatan version", async () => {
    const startedAt = Date.now();
    tap.events.length = 0;
    inviteAcks.length = 0;
    const clock = new ManualClock();
    const server = createPejuangServer(
      { port: 0, webOrigin: "http://localhost:3000", guestTokenSecret: secret, version: "test", trustProxy: false },
      {
        rooms: new RoomRepository(() => "UMR-4321"),
        countdownMs: 5,
        createGameId: () => "game-full",
        clock,
        // Bot jauh lebih cepat dari manusia; batas default diuji di tes lain.
        socketRateLimit: { max: 10_000, windowMs: 5_000 },
      },
    );
    openServers.push(server);
    server.httpServer.listen(0);
    await once(server.httpServer, "listening");
    const baseUrl = `http://127.0.0.1:${(server.httpServer.address() as AddressInfo).port}`;

    // Bot ke-3 (indeks 2) tidak pernah menjawab Event Tanggal dan tidak pernah memilih heksa,
    // sehingga timeout Event Tanggal dan timeoutTurn ikut teruji.
    const bots: Array<{ socket: TestSocket; playerId: string; name: string; log: Received[] }> = [];
    for (const [index, name] of ["Host", "Bot Dua", "Bot Tiga"].entries()) {
      const guest = createGuestToken({ name, avatarId: `avatar-0${index + 1}` }, secret);
      const socket: TestSocket = createClient(baseUrl, {
        transports: ["websocket"],
        auth: { token: guest.token },
        reconnection: false,
      });
      openSockets.push(socket);
      const log: Received[] = [];
      let calendarChoiceIndex = index;
      socket.onAny((type, payload) => log.push({ type, payload }));
      const bot = { socket, playerId: guest.identity.playerId, name, log };
      socket.on("calendar:event", (event) => {
        if (index === 2) return;
        const choice = event.choices[calendarChoiceIndex % event.choices.length]!;
        calendarChoiceIndex += 1;
        void socket.emitWithAck("calendar:answer", {
          requestId: rid(),
          eventId: event.eventId,
          choice: choice.id,
        });
      });
      // Bot menyimpan kartu; mengajak bot lain hanya di Fase Pilihan gilirannya sendiri, sebelum memilih
      // heksa (bergantian bot aktif dan bot pasif).
      let heldCard: { cardId: string } | null = null;
      let cardsSeen = 0;
      socket.on("invite:card", ({ card }) => {
        heldCard = card ?? null;
      });
      // Target menjawab bergantian Ikut/Tolak; bot pasif tidak pernah menjawab (timeout 15 detik).
      let incomingSeen = 0;
      socket.on("invite:incoming", (payload) => {
        if (index === 2) return;
        const answer = incomingSeen++ % 2 === 0 ? "join" : "decline";
        void socket.emitWithAck("invite:respond", { requestId: rid(), inviteId: payload.inviteId, answer });
      });
      socket.on("turn:options", async (payload) => {
        if (index === 2) return;
        const card = heldCard;
        if (card) {
          heldCard = null;
          const k = cardsSeen++;
          const target = bots[(index + 1 + (k % 2)) % 3];
          if (SEND_PATTERN[k % SEND_PATTERN.length] && target) {
            const ack = await socket.emitWithAck("invite:send", {
              requestId: rid(),
              turnId: payload.turnId,
              cardId: card.cardId,
              targetPlayerId: target.playerId,
            });
            inviteAcks.push(ack as { ok: boolean; error?: string });
          }
        }
        await socket.emitWithAck("turn:choose", {
          requestId: rid(),
          turnId: payload.turnId,
          hex: payload.options[0]!.hex,
        });
      });
      socket.on("turn:dead-end", (payload) => {
        if (index === 2) return;
        void socket.emitWithAck("turn:jump", {
          requestId: rid(),
          turnId: payload.turnId,
          hex: payload.options[0]!.hex,
        });
      });
      await new Promise<void>((resolve) => socket.once("connect", resolve));
      bots.push(bot);
    }

    const [host, ...guests] = bots as [(typeof bots)[0], ...typeof bots];
    expect(await host.socket.emitWithAck("room:create", { requestId: rid() })).toMatchObject({ ok: true });
    for (const guest of guests) {
      expect(
        await guest.socket.emitWithAck("room:join", { requestId: rid(), roomCode: "UMR-4321" }),
      ).toMatchObject({ ok: true });
      expect(
        await guest.socket.emitWithAck("room:ready", { requestId: rid(), ready: true }),
      ).toEqual({ ok: true });
    }
    expect(await host.socket.emitWithAck("game:start", { requestId: rid() })).toEqual({ ok: true });

    // Penggerak waktu: bila tidak ada pesan baru (menunggu bot yang tidak menjawab), majukan jam.
    const total = () => bots.reduce((sum, bot) => sum + bot.log.length, 0);
    const finished = () => bots.every((bot) => bot.log.some((entry) => entry.type === "game:finished"));
    while (!finished()) {
      if (Date.now() - startedAt > 17_000) throw new Error("Game tidak selesai tepat waktu");
      const before = total();
      await sleep(25);
      if (total() === before) clock.advance(15_000);
    }
    await sleep(50);

    const session = server.games.get("UMR-4321")!;
    const allIds = bots.map((bot) => bot.playerId);

    // 1. Semua klien menerima game:finished dengan ranking lengkap.
    for (const bot of bots) {
      const results = bot.log.filter((entry) => entry.type === "game:finished");
      expect(results).toHaveLength(1);
      expect(results[0]!.payload.ranking.map((row: { playerId: string }) => row.playerId).sort()).toEqual(
        [...allIds].sort(),
      );
    }
    expect(server.rooms.get("UMR-4321")!.status).toBe("finished");
    // Event Tanggal tanpa jawaban Bot Tiga ditutup oleh timeout.
    expect(
      bots[2]!.log.some((e) => e.type === "calendar:result" && e.payload.autoChosen === true),
    ).toBe(true);

    // Bot pasif tetap di ranking dan gilirannya dipilihkan otomatis oleh timeoutTurn.
    const idle = bots[2]!;
    expect(
      bots[0]!.log.some((e) => e.type === "game:finished" && e.payload.ranking.some((r: { playerId: string }) => r.playerId === idle.playerId)),
    ).toBe(true);
    expect(
      idle.log.some(
        (e) => e.type === "tile:opened" && e.payload.playerId === idle.playerId && e.payload.autoPicked === true,
      ),
    ).toBe(true);
    expect(idle.log.some((e) => e.type === "turn:options" || e.type === "turn:dead-end")).toBe(true);

    // 2. version event room naik tepat 1, tanpa lompatan, per klien.
    for (const bot of bots) {
      const versions = bot.log
        .filter((entry) => typeof entry.payload?.version === "number" && !entry.type.startsWith("session:"))
        .map((entry) => entry.payload.version as number);
      expect(versions.length).toBeGreaterThan(10);
      expect(versions).toEqual(versions.map((_, index) => index + 1));
    }

    // 3. Event privat hanya diterima pemiliknya (dibandingkan dengan event engine apa adanya).
    const privateTypes = ["turn:options", "turn:dead-end", "player:status", "month:summary", "calendar:result"];
    for (const bot of bots) {
      for (const type of privateTypes) {
        const received = bot.log.filter((entry) => entry.type === type).map((entry) => entry.payload);
        const expected = tap.events
          .filter((event) => event.type === type && event.target.playerId === bot.playerId)
          .map((event) => event.payload);
        expect(received.length, `${type} untuk ${bot.name}`).toBe(expected.length);
        if (type === "player:status") expect(received).toEqual(expected);
        if (type === "turn:options" || type === "turn:dead-end") {
          for (const payload of received) expect(payload.turnId).toContain(bot.playerId);
        }
      }
    }

    // 4. Tidak ada field status milik orang lain, field motive, atau id petak yang belum dibuka.
    // Klien tidak pernah menerima id petak sama sekali (hanya judul); setelah 24 langkah semua id
    // sudah terbuka di suatu heksa, jadi seluruh daftar TILES diperiksa, termasuk yang belum terbuka.
    const hiddenTileIds = TILES.map((tile) => tile.id);
    expect(hiddenTileIds.length).toBeGreaterThan(0);
    for (const bot of bots) {
      for (const entry of bot.log) {
        // `points` di game:finished (Poin Keuangan/Kesehatan/Ketenangan) adalah komponen skor publik
        // (v1.12), bukan status privat, jadi dikecualikan dari pemeriksaan kunci status.
        const keys = collectKeys(
          entry.type === "game:finished"
            ? {
                ...entry.payload,
                ranking: entry.payload.ranking.map(({ points: _points, ...rest }: any) => rest),
              }
            : entry.payload,
        );
        // Motif hanya milik pemilik kartu (invite:card) dan hasil Ajakan per pemain (invite:resolved).
        if (!MOTIVE_ALLOWED_TYPES.has(entry.type)) {
          expect(keys.has("motive"), `motive di ${entry.type}`).toBe(false);
        }
        if ([...keys].some((key) => PRIVATE_STAT_KEYS.has(key))) {
          expect(STAT_ALLOWED_TYPES.has(entry.type), `field status di ${entry.type}`).toBe(true);
        }
        const json = JSON.stringify(entry.payload);
        for (const id of hiddenTileIds) {
          expect(json.includes(`"${id}"`), `id petak ${id} bocor di ${entry.type}`).toBe(false);
        }
      }
    }
    // Snapshot awal hanya memuat status pemilik.
    for (const bot of bots) {
      for (const entry of bot.log.filter((e) => e.type === "session:snapshot")) {
        expect(entry.payload.me.playerId).toBe(bot.playerId);
      }
    }

    // 5. Ajakan: pemain ketiga tidak pernah menerima Ajakan orang lain, dan motif hanya ada di pesan miliknya.
    const resolvedAll = bots.flatMap((bot) => bot.log.filter((e) => e.type === "invite:resolved"));
    expect(resolvedAll.length).toBeGreaterThan(0);
    for (const bot of bots) {
      for (const e of bot.log.filter((x) => x.type === "invite:incoming")) {
        expect(e.payload.fromPlayerId).not.toBe(bot.playerId);
        expect(e.payload.fromName).not.toBe(e.payload.fromPlayerId);
        expect(e.payload.deadline).toBeGreaterThan(0);
        expect(JSON.stringify(e.payload)).not.toContain("motive");
      }
      for (const e of bot.log.filter((x) => x.type === "invite:resolved")) {
        expect([e.payload.fromPlayerId, e.payload.targetPlayerId]).toContain(bot.playerId);
      }
      for (const e of bot.log.filter((x) => x.type === "game:patch")) {
        expect(JSON.stringify(e.payload)).not.toContain("motive");
      }
    }
    // Bot pasif tidak menjawab: Ajakan ke dia habis waktu.
    expect(resolvedAll.some((e) => e.payload.autoDeclined === true)).toBe(true);

    // Ajakan v1.12: dikirim di giliran sendiri, jadi tidak ada penolakan INVITE_NOT_ALLOWED/INVITE_LIMIT.
    expect(inviteAcks.length).toBeGreaterThan(0);
    expect(inviteAcks.some((ack) => ack.ok)).toBe(true);
    for (const ack of inviteAcks) {
      expect(["INVITE_LIMIT", "INVITE_NOT_ALLOWED"]).not.toContain(ack.error);
    }
    expect(JSON.stringify(bots.map((bot) => bot.log))).not.toContain("INVITE_LIMIT");
    // invite:resolved selalu datang setelah round:reveal ronde yang sama.
    for (const bot of bots) {
      let revealed = false;
      for (const entry of bot.log) {
        if (entry.type === "round:reveal") revealed = true;
        if (entry.type === "invite:resolved") expect(revealed).toBe(true);
      }
    }

    // GDD 4.8: Ajakan tidak pernah menjeda Timer Giliran.
    expect(bots.flatMap((bot) => bot.log).filter((entry) => entry.type === "turn:timer")).toHaveLength(0);

    expect(Date.now() - startedAt).toBeLessThan(20_000);
  }, 20_000);
});
