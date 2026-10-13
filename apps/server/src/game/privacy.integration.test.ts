import { once } from "node:events";
import type { AddressInfo } from "node:net";
import type { ClientToServerEvents, ServerToClientEvents, Snapshot } from "@pejuang/shared";
import { io as createClient, type Socket } from "socket.io-client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RoomRepository } from "../repositories/room-repository";
import { createPejuangServer } from "../server";
import { createGuestToken } from "../services/guest-token";
import { createSnapshot } from "../services/snapshot";
import { ManualClock } from "./test-clock";

/** Merekam event persis seperti yang dihasilkan sesi (kebenaran dasar penerima). */
const tap = vi.hoisted(() => ({
  events: [] as Array<{ type: string; target: { kind: string; playerId?: string }; payload: any }>,
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
type Bot = { socket: TestSocket; playerId: string; name: string; log: Received[] };

const openServers: Array<ReturnType<typeof createPejuangServer>> = [];
const openSockets: TestSocket[] = [];

afterEach(async () => {
  for (const socket of openSockets.splice(0)) socket.disconnect();
  for (const server of openServers.splice(0)) {
    await new Promise<void>((resolve) => server.io.close(() => resolve()));
  }
});

let counter = 0;
const rid = () => `00000000-0000-4000-8000-${String(40_000 + ++counter).padStart(12, "0")}`;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const STAT_KEYS = new Set(["wealth", "debt", "debtLimit", "health", "stress"]);
const FORBIDDEN_KEYS = ["decisionLog", "pendingRealities", "goldOrigin", "goldQueue", "roundInvites", "tileId"];
const PRIVATE_TYPES = [
  "player:status",
  "month:summary",
  "doom:triggered",
  "invite:card",
  "turn:options",
  "turn:dead-end",
  "calendar:result",
  "invite:incoming",
  "invite:resolved",
  "reflection:ready",
];

/** Mengumpulkan semua nama kunci, melewati subpohon yang diizinkan. */
function collectKeys(value: unknown, skip: (key: string) => boolean = () => false, keys = new Set<string>()) {
  if (Array.isArray(value)) {
    for (const item of value) collectKeys(item, skip, keys);
  } else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      keys.add(key);
      if (!skip(key)) collectKeys(child, skip, keys);
    }
  }
  return keys;
}

interface SnapshotSample {
  playerId: string;
  step: number;
  snapshot: Snapshot;
  hiddenTexts: string[];
  revealedTexts: string[];
  /** Realita ronde ini belum dibuka. */
  beforeReveal: boolean;
}

async function playFullGame() {
  tap.events.length = 0;
  const startedAt = Date.now();
  const clock = new ManualClock();
  const server = createPejuangServer(
    { port: 0, webOrigin: "http://localhost:3000", guestTokenSecret: secret, version: "test", trustProxy: false },
    {
      rooms: new RoomRepository(() => "UMR-7777"),
      countdownMs: 5,
      createGameId: () => "game-privacy",
      clock,
      socketRateLimit: { max: 10_000, windowMs: 5_000 },
      reflectionProvider: null, // provider "none": cadangan aturan
    },
  );
  openServers.push(server);
  server.httpServer.listen(0);
  await once(server.httpServer, "listening");
  const baseUrl = `http://127.0.0.1:${(server.httpServer.address() as AddressInfo).port}`;

  const bots: Bot[] = [];
  const names = ["Host", "Bot Dua", "Bot Tiga", "Bot Empat"];
  const characters = ["michael", "raka", "sinta", "icha"];
  for (const [index, name] of names.entries()) {
    const guest = createGuestToken({ name, avatarId: characters[index]! }, secret);
    const socket: TestSocket = createClient(baseUrl, {
      transports: ["websocket"],
      auth: { token: guest.token },
      reconnection: false,
    });
    openSockets.push(socket);
    const log: Received[] = [];
    socket.onAny((type, payload) => log.push({ type, payload }));
    const bot: Bot = { socket, playerId: guest.identity.playerId, name, log };
    // Bot terakhir pasif: tidak pernah menjawab apa pun (semua lewat timeout).
    const passive = index === 3;
    let heldCard: { cardId: string } | null = null;
    let cardsSeen = 0;
    let incomingSeen = 0;
    socket.on("invite:card", ({ card }) => {
      heldCard = card ?? null;
    });
    socket.on("calendar:event", (event) => {
      if (passive) return;
      void socket.emitWithAck("calendar:answer", {
        requestId: rid(),
        eventId: event.eventId,
        choice: event.choices[index % event.choices.length]!.id,
      });
    });
    socket.on("invite:incoming", (payload) => {
      if (passive) return;
      const answer = incomingSeen++ % 2 === 0 ? "join" : "decline";
      void socket.emitWithAck("invite:respond", { requestId: rid(), inviteId: payload.inviteId, answer });
    });
    socket.on("turn:options", async (payload) => {
      if (passive) return;
      const card = heldCard;
      if (card) {
        heldCard = null;
        const k = cardsSeen++;
        const target = bots[(index + 1 + (k % 3)) % 4];
        if (target && k % 4 !== 2) {
          await socket.emitWithAck("invite:send", {
            requestId: rid(),
            turnId: payload.turnId,
            cardId: card.cardId,
            targetPlayerId: target.playerId,
          });
        }
      }
      await socket.emitWithAck("turn:choose", {
        requestId: rid(),
        turnId: payload.turnId,
        hex: payload.options[0]!.hex,
      });
    });
    socket.on("turn:dead-end", (payload) => {
      if (passive) return;
      void socket.emitWithAck("turn:jump", {
        requestId: rid(),
        turnId: payload.turnId,
        hex: payload.options[0]!.hex,
      });
    });
    await new Promise<void>((resolve) => socket.once("connect", resolve));
    bots.push(bot);
  }
  const [host, ...guests] = bots as [Bot, ...Bot[]];
  expect(await host.socket.emitWithAck("room:create", { requestId: rid() })).toMatchObject({ ok: true });
  for (const guest of guests) {
    await guest.socket.emitWithAck("room:join", { requestId: rid(), roomCode: "UMR-7777" });
    await guest.socket.emitWithAck("room:ready", { requestId: rid(), ready: true });
  }
  expect(await host.socket.emitWithAck("game:start", { requestId: rid() })).toEqual({ ok: true });

  const samples: SnapshotSample[] = [];
  const sampledAt = new Set<string>();
  const sampleSnapshots = () => {
    const session = server.games.get("UMR-7777");
    const room = server.rooms.get("UMR-7777");
    if (!session || !room || session.state.phase !== "turn") return;
    const key = `${session.state.public.calendar.step}:${session.state.pendingRealities.length}:${session.state.movedThisRound.length}`;
    if (sampledAt.has(key)) return;
    sampledAt.add(key);
    const revealedTexts = session.state.public.openedHexes.flatMap((h) => (h.reality ? [h.reality.text] : []));
    for (const bot of bots) {
      samples.push({
        playerId: bot.playerId,
        step: session.state.public.calendar.step,
        snapshot: structuredClone(createSnapshot(room, bot.playerId, session)),
        hiddenTexts: session.state.pendingRealities.map((r) => r.text),
        revealedTexts,
        beforeReveal: true,
      });
    }
  };

  const total = () => bots.reduce((sum, bot) => sum + bot.log.length, 0);
  const finished = () => bots.every((bot) => bot.log.some((entry) => entry.type === "game:finished"));
  while (!finished()) {
    if (Date.now() - startedAt > 40_000) throw new Error("Game tidak selesai tepat waktu");
    const before = total();
    await sleep(25);
    sampleSnapshots();
    if (total() === before) clock.advance(15_000);
  }
  await sleep(150); // refleksi akhir
  const session = server.games.get("UMR-7777")!;
  return { bots, samples, server, session, elapsed: Date.now() - startedAt };
}

let cached: Awaited<ReturnType<typeof playFullGame>> | null = null;
async function game() {
  cached ??= await playFullGame();
  return cached;
}

describe("privasi: satu game penuh 4 bot, provider none (API_CONTRACT 1.8)", () => {
  it("sanity: game selesai, semua menerima game:finished dan sampel snapshot terkumpul", async () => {
    const { bots, samples, elapsed } = await game();
    for (const bot of bots) {
      expect(bot.log.filter((e) => e.type === "game:finished")).toHaveLength(1);
    }
    expect(samples.length).toBeGreaterThan(20);
    expect(elapsed).toBeLessThan(40_000);
  }, 60_000);

  it("1. event privat hanya diterima pemiliknya", async () => {
    const { bots } = await game();
    for (const type of PRIVATE_TYPES) {
      for (const bot of bots) {
        const received = bot.log.filter((e) => e.type === type).map((e) => e.payload);
        const expected = tap.events
          .filter((e) => e.type === type && e.target.kind === "player" && e.target.playerId === bot.playerId)
          .map((e) => e.payload);
        expect(received.length, `${type} untuk ${bot.name}`).toBe(expected.length);
        expect(received).toEqual(expected);
      }
    }
    for (const bot of bots) {
      for (const e of bot.log) {
        if (e.type === "turn:options" || e.type === "turn:dead-end") expect(e.payload.turnId).toContain(bot.playerId);
        if (e.type === "invite:incoming") expect(e.payload.fromPlayerId).not.toBe(bot.playerId);
        if (e.type === "invite:resolved") {
          expect([e.payload.fromPlayerId, e.payload.targetPlayerId]).toContain(bot.playerId);
        }
        if (e.type === "reflection:ready") expect(e.payload.playerId).toBe(bot.playerId);
        if (e.type === "invite:card" && e.payload.card) expect(e.payload.card.cardId).toContain(bot.playerId);
      }
    }
    expect(tap.events.some((e) => e.type === "invite:resolved")).toBe(true);
    expect(tap.events.some((e) => e.type === "reflection:ready")).toBe(true);
  }, 60_000);

  it("2. motif Ajakan: sebelum round:reveal hanya pengirim (lewat invite:card); pemain ketiga tidak pernah", async () => {
    const { bots } = await game();
    for (const bot of bots) {
      let revealed = false;
      for (const e of bot.log) {
        if (e.type === "round:reveal") revealed = true;
        if (!JSON.stringify(e.payload ?? null).includes('"motive"')) continue;
        if (e.type === "session:snapshot") continue; // kartu milik sendiri, diperiksa di poin 6
        expect(["invite:card", "invite:resolved"], `motive di ${e.type} (${bot.name})`).toContain(e.type);
        if (e.type === "invite:card") expect(e.payload.card.cardId).toContain(bot.playerId);
        if (e.type === "invite:resolved") expect(revealed).toBe(true);
      }
    }
    // Pemain ketiga: tidak menerima invite:resolved Ajakan yang bukan miliknya.
    const incoming = tap.events.filter((e) => e.type === "invite:incoming");
    for (const e of incoming) {
      const inviteId = e.payload.inviteId as string;
      const involved = new Set([e.payload.fromPlayerId as string, e.target.playerId as string]);
      for (const bot of bots) {
        if (involved.has(bot.playerId)) continue;
        const leaked = bot.log.filter((x) => JSON.stringify(x.payload ?? null).includes(inviteId));
        expect(leaked, `Ajakan ${inviteId} bocor ke ${bot.name}`).toEqual([]);
      }
    }
  }, 60_000);

  it("3. Realita (teks dan outcome) tidak muncul sebelum round:reveal ronde itu, termasuk di snapshot tengah ronde", async () => {
    const { bots, samples } = await game();
    for (const bot of bots) {
      const revealIndex = new Map<number, number>();
      bot.log.forEach((e, i) => {
        if (e.type === "round:reveal" && !revealIndex.has(e.payload.round)) revealIndex.set(e.payload.round, i);
      });
      const textsBefore = new Set<string>();
      bot.log.forEach((e, i) => {
        if (e.type !== "tile:resolved") return;
        const round = e.payload.round as number;
        const reveal = revealIndex.get(round);
        expect(reveal, `tile:resolved ronde ${round} tanpa round:reveal`).toBeDefined();
        expect(i).toBeGreaterThan(reveal!);
        if (!textsBefore.has(e.payload.text)) {
          for (let j = 0; j < reveal!; j += 1) {
            const entry = bot.log[j]!;
            expect(
              JSON.stringify(entry.payload ?? null).includes(e.payload.text),
              `Realita "${e.payload.text}" bocor di ${entry.type} sebelum round:reveal ${round} (${bot.name})`,
            ).toBe(false);
          }
        }
        textsBefore.add(e.payload.text);
      });
      // openedHexes tidak pernah memuat outcome/reality untuk hex ronde yang belum dibuka.
      bot.log.forEach((e, i) => {
        const hexes = e.type === "session:snapshot" ? e.payload.game?.openedHexes : undefined;
        for (const h of hexes ?? []) {
          const reveal = revealIndex.get(h.step);
          if (reveal === undefined || i < reveal) {
            expect(h.reality ?? null).toBeNull();
            }
        }
      });
    }
    for (const sample of samples) {
      const json = JSON.stringify(sample.snapshot);
      for (const text of sample.hiddenTexts) {
        if (sample.revealedTexts.includes(text)) continue; // teks sama sah dari Realita ronde lalu
        expect(json.includes(text), `snapshot ronde ${sample.step} memuat Realita tersembunyi "${text}"`).toBe(false);
      }
      for (const h of sample.snapshot.game?.openedHexes ?? []) {
        if (h.step === sample.step) {
          expect(h.reality ?? null).toBeNull();
        }
      }
    }
  }, 60_000);

  it("4. judul petak dari turn:options hanya diterima pemain aktif sampai heksa dibuka", async () => {
    const { bots } = await game();
    const goldHexes = tap.events
      .filter((e) => e.type === "gold:spawned")
      .map((e) => `${e.payload.gold.hex.q},${e.payload.gold.hex.r}`);
    let checked = 0;
    for (const owner of bots) {
      for (const e of owner.log.filter((x) => x.type === "turn:options" || x.type === "turn:dead-end")) {
        for (const option of e.payload.options as Array<{ hex: { q: number; r: number }; title: string }>) {
          const key = `${option.hex.q},${option.hex.r}`;
          if (goldHexes.includes(key)) continue; // Petak Emas memang publik (GDD 4.7)
          for (const other of bots) {
            if (other === owner) continue;
            const openedAt = other.log.findIndex(
              (x) => x.type === "tile:opened" && `${x.payload.to.q},${x.payload.to.r}` === key,
            );
            const limit = openedAt === -1 ? other.log.length : openedAt;
            for (let i = 0; i < limit; i += 1) {
              // Heksa yang sama bisa menyala untuk pemain lain di giliran mereka sendiri (privat untuknya).
              if (other.log[i]!.type === "turn:options" || other.log[i]!.type === "turn:dead-end") continue;
              const json = JSON.stringify(other.log[i]!.payload ?? null);
              const mentionsHex = json.includes(`"q":${option.hex.q},"r":${option.hex.r}`);
              expect(
                mentionsHex && json.includes(`"title":"${option.title}"`),
                `judul "${option.title}" di heksa ${key} bocor ke ${other.name} lewat ${other.log[i]!.type}`,
              ).toBe(false);
            }
          }
          checked += 1;
        }
      }
    }
    expect(checked).toBeGreaterThan(50);
  }, 60_000);

  it("5. tidak ada kunci internal di payload mana pun; motive hanya di invite:card dan invite:resolved", async () => {
    const { bots, samples } = await game();
    for (const bot of bots) {
      for (const e of bot.log) {
        const keys =
          e.type === "session:snapshot"
            ? collectKeys({ ...e.payload, me: { ...e.payload.me, inviteCard: null } })
            : collectKeys(e.payload ?? null);
        for (const forbidden of FORBIDDEN_KEYS) {
          expect(keys.has(forbidden), `${forbidden} di ${e.type} (${bot.name})`).toBe(false);
        }
        if (e.type !== "invite:card" && e.type !== "invite:resolved") {
          expect(keys.has("motive"), `motive di ${e.type} (${bot.name})`).toBe(false);
        }
      }
    }
    for (const sample of samples) {
      const keys = collectKeys({ ...sample.snapshot, me: { ...sample.snapshot.me, inviteCard: null } });
      for (const forbidden of [...FORBIDDEN_KEYS, "motive"]) expect(keys.has(forbidden)).toBe(false);
    }
  }, 60_000);

  it("6. snapshot tiap pemain hanya memuat status, kartu, dan popup miliknya", async () => {
    const { bots, samples, session } = await game();
    const incomingTo = (playerId: string, inviteId: string) =>
      tap.events.some(
        (e) => e.type === "invite:incoming" && e.payload.inviteId === inviteId && e.target.playerId === playerId,
      );
    for (const sample of samples) {
      const { me } = sample.snapshot;
      expect(me.playerId).toBe(sample.playerId);
      if (me.inviteCard) expect(me.inviteCard.cardId).toContain(sample.playerId);
      if (me.pendingTurn) expect(me.pendingTurn.turnId).toContain(sample.playerId);
      if (me.pendingInvite) {
        expect(me.pendingInvite.fromPlayerId).not.toBe(sample.playerId);
        expect(incomingTo(sample.playerId, me.pendingInvite.inviteId)).toBe(true);
      }
      // Status privat hanya di me.status / me.pendingMonth; tidak di bagian lain snapshot.
      const rest = { ...sample.snapshot, me: { ...me, status: null, pendingMonth: null } };
      const keys = collectKeys(rest);
      for (const key of STAT_KEYS) expect(keys.has(key), `kunci ${key} di luar me pada snapshot`).toBe(false);
    }
    // Snapshot yang dikirim server lewat session:snapshot juga hanya milik penerimanya.
    for (const bot of bots) {
      for (const e of bot.log.filter((x) => x.type === "session:snapshot")) {
        expect(e.payload.me.playerId).toBe(bot.playerId);
        const keys = collectKeys({ ...e.payload, me: { ...e.payload.me, status: null, pendingMonth: null } });
        for (const key of STAT_KEYS) expect(keys.has(key)).toBe(false);
      }
    }
    expect(session.finished).toBe(true);
  }, 60_000);

  it("7. Kekayaan dan Hutang pemain lain tidak pernah dikirim (points di game:finished boleh)", async () => {
    const { bots, session } = await game();
    const allowed = new Set(["player:status", "month:summary", "session:snapshot"]);
    for (const bot of bots) {
      for (const e of bot.log) {
        const payload =
          e.type === "game:finished"
            ? { ...e.payload, ranking: e.payload.ranking.map(({ points: _points, ...rest }: any) => rest) }
            : e.payload;
        const keys =
          e.type === "session:snapshot"
            ? collectKeys({ ...payload, me: { ...payload.me, status: null, pendingMonth: null } })
            : collectKeys(payload ?? null);
        if (allowed.has(e.type) && e.type !== "session:snapshot") continue;
        for (const key of ["wealth", "debt", "debtLimit"]) {
          expect(keys.has(key), `${key} di ${e.type} (${bot.name})`).toBe(false);
        }
      }
      // player:status terakhir sama dengan status milik sendiri di state sesi.
      const last = bot.log.filter((x) => x.type === "player:status").at(-1)?.payload;
      expect(last).toEqual(session.state.players[bot.playerId]!.status);
    }
    // Ranking memuat poin tiap pemain (boleh), tetapi bukan Kekayaan/Hutang.
    const ranking = bots[0]!.log.find((x) => x.type === "game:finished")!.payload.ranking;
    for (const row of ranking) {
      expect(row).not.toHaveProperty("wealth");
      expect(row).not.toHaveProperty("debt");
      expect(row.points).toEqual({ finance: expect.any(Number), health: expect.any(Number), calm: expect.any(Number) });
    }
  }, 60_000);
});
