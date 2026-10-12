import { once } from "node:events";
import type { AddressInfo } from "node:net";
import type { ClientToServerEvents, ServerToClientEvents } from "@pejuang/shared";
import { io as createClient, type Socket } from "socket.io-client";
import { afterEach, describe, expect, it } from "vitest";
import { ManualClock } from "../game/test-clock";
import { RoomRepository } from "../repositories/room-repository";
import { createGuestToken } from "../services/guest-token";
import { createPejuangServer } from "../server";

const secret = "test-secret-with-at-least-thirty-two-characters";
type TestSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
type Shown = Parameters<ServerToClientEvents["emote:shown"]>[0];
type TestPlayer = { socket: TestSocket; playerId: string; shown: Shown[] };

const openServers: Array<ReturnType<typeof createPejuangServer>> = [];
const openSockets: TestSocket[] = [];

afterEach(async () => {
  for (const socket of openSockets.splice(0)) socket.disconnect();
  for (const server of openServers.splice(0)) {
    await new Promise<void>((resolve) => server.io.close(() => resolve()));
  }
});

let counter = 0;
const rid = () => `00000000-0000-4000-8000-${String(2000 + ++counter).padStart(12, "0")}`;

async function until(condition: () => boolean, label: string) {
  for (let i = 0; i < 300; i += 1) {
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

  const connect = async (name: string, avatar: string): Promise<TestPlayer> => {
    const guest = createGuestToken({ name, avatarId: avatar as never }, secret);
    const socket: TestSocket = createClient(baseUrl, {
      transports: ["websocket"],
      auth: { token: guest.token },
      reconnection: false,
    });
    openSockets.push(socket);
    const shown: Shown[] = [];
    socket.on("emote:shown", (payload) => shown.push(payload));
    await new Promise<void>((resolve) => socket.once("connect", resolve));
    return { socket, playerId: guest.identity.playerId, shown };
  };

  const host = await connect("Host", "avatar-01");
  const guest = await connect("Guest", "avatar-02");
  const outsider = await connect("Luar", "avatar-03");
  await host.socket.emitWithAck("room:create", { requestId: rid() });
  await guest.socket.emitWithAck("room:join", { requestId: rid(), roomCode: "UMR-1234" });
  const send = (p: TestPlayer, emoteId: string) =>
    p.socket.emitWithAck("emote:send", { requestId: rid(), emoteId });
  return { clock, server, host, guest, outsider, send };
}

describe("emote", () => {
  it("di Room (waiting): semua anggota menerima emote:shown tanpa version", async () => {
    const { host, guest, send, clock } = await setup();
    expect(await send(host, "thumbs-up")).toEqual({ ok: true });
    await until(() => host.shown.length === 1 && guest.shown.length === 1, "emote:shown");
    expect(guest.shown[0]).toEqual({ playerId: host.playerId, emoteId: "thumbs-up", at: clock.now() });
    expect(guest.shown[0]).not.toHaveProperty("version");
  });

  it("emote kedua dalam 3 detik -> RATE_LIMITED; setelah 3 detik boleh lagi; batas per pemain", async () => {
    const { host, guest, send, clock } = await setup();
    expect(await send(host, "wave")).toEqual({ ok: true });
    clock.advance(2_999);
    expect(await send(host, "wave")).toEqual({ ok: false, error: "RATE_LIMITED" });
    expect(await send(guest, "wave")).toEqual({ ok: true });
    clock.advance(1);
    expect(await send(host, "wave")).toEqual({ ok: true });
    await until(() => guest.shown.length === 3, "tiga emote:shown");
  });

  it("batas emote terpisah dari rate limit umum (emote ditolak tidak menghabiskan jatah)", async () => {
    const { host, send } = await setup();
    expect(await send(host, "a")).toEqual({ ok: true });
    for (let i = 0; i < 5; i += 1) {
      expect(await send(host, "a")).toEqual({ ok: false, error: "RATE_LIMITED" });
    }
  });

  it("emoteId tidak valid -> INVALID_PAYLOAD dan tidak menghabiskan jatah", async () => {
    const { host, guest, send } = await setup();
    for (const bad of ["", "ABC", "has space", "a_b", "x".repeat(25), "😀"]) {
      expect(await send(host, bad), bad).toEqual({ ok: false, error: "INVALID_PAYLOAD" });
    }
    expect(await host.socket.emitWithAck("emote:send", { requestId: rid() } as never)).toEqual({
      ok: false,
      error: "INVALID_PAYLOAD",
    });
    expect(await send(host, "x".repeat(24))).toEqual({ ok: true });
    await until(() => guest.shown.length === 1, "emote:shown");
  });

  it("pemain di luar room -> NOT_IN_ROOM dan tidak ada yang menerima", async () => {
    const { host, outsider, send } = await setup();
    expect(await send(outsider, "wave")).toEqual({ ok: false, error: "NOT_IN_ROOM" });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(host.shown).toHaveLength(0);
  });

  it("saat game: pemain tereliminasi boleh mengirim", async () => {
    const { host, guest, server, send, clock } = await setup();
    await guest.socket.emitWithAck("room:ready", { requestId: rid(), ready: true });
    expect(await host.socket.emitWithAck("game:start", { requestId: rid() })).toEqual({ ok: true });
    await until(() => server.games.get("UMR-1234") !== null, "sesi game");
    const session = server.games.get("UMR-1234")!;
    const player = session.state.players[guest.playerId]!;
    session.state = {
      ...session.state,
      players: {
        ...session.state.players,
        [guest.playerId]: { ...player, eliminated: true, eliminatedAtStep: 1, eliminatedReason: "burnout" },
      },
    };

    expect(await send(guest, "sad")).toEqual({ ok: true });
    clock.advance(3_000);
    expect(await send(guest, "gg")).toEqual({ ok: true });
    await until(() => host.shown.length === 2, "emote:shown di game");
    expect(host.shown.map((e) => e.emoteId)).toEqual(["sad", "gg"]);
  });
});
