import { describe, expect, it } from "vitest";
import { RoomCodeSchema } from "../schemas/common";
import { ClientEventSchemas } from "./client-event-schemas";
import { DEV_EVENTS, DEV_ROOM_CODE, DevEventSchemas } from "./dev-events";
import type { ClientToServerEvents, ServerToClientEvents } from "./events";

// Daftar event API_CONTRACT v0.3 Bagian 0 (46 event: 44 dari 03_REKOMENDASI
// ditambah room:kicked dan room:rematch). Record<..., true> membuat daftar
// ini wajib lengkap terhadap tipe event di events.ts (typecheck gagal bila beda).
const CONTRACT_CLIENT_EVENTS: Record<Exclude<keyof ClientToServerEvents, "ping:test">, true> = {
  "session:resume": true,
  "room:create": true,
  "room:join": true,
  "room:leave": true,
  "room:ready": true,
  "room:avatar": true,
  "room:timer": true,
  "room:kick": true,
  "room:rematch": true,
  "game:start": true,
  "calendar:answer": true,
  "month:pay-debt": true,
  "turn:choose": true,
  "turn:jump": true,
  "invite:send": true,
  "invite:respond": true,
  "emote:send": true,
};

const CONTRACT_SERVER_EVENTS: Record<keyof ServerToClientEvents, true> = {
  "session:snapshot": true,
  "player:connection": true,
  error: true,
  "room:kicked": true,
  "room:state": true,
  "room:countdown": true,
  "game:started": true,
  "game:finished": true,
  "game:patch": true,
  "player:status": true,
  "calendar:event": true,
  "calendar:result": true,
  "season:changed": true,
  "month:summary": true,
  "turn:start": true,
  "turn:options": true,
  "turn:dead-end": true,
  "tile:opened": true,
  "round:reveal": true,
  "tile:resolved": true,
  "gold:spawned": true,
  "gold:expired": true,
  "doom:triggered": true,
  "player:eliminated": true,
  "reflection:ready": true,
  "invite:card": true,
  "invite:incoming": true,
  "invite:resolved": true,
  "emote:shown": true,
};

/** Satu-satunya event di luar kontrak: dipakai uji koneksi dan batas laju server. */
const NON_CONTRACT_CLIENT_EVENTS = ["ping:test"];

describe("daftar event sama dengan API_CONTRACT Bagian 0", () => {
  it("event klien-ke-server: 17 event kontrak, skema ada untuk masing-masing", () => {
    const contract = Object.keys(CONTRACT_CLIENT_EVENTS).sort();
    expect(contract).toHaveLength(17);
    expect(Object.keys(ClientEventSchemas).sort()).toEqual(
      [...contract, ...NON_CONTRACT_CLIENT_EVENTS].sort(),
    );
  });

  it("event server-ke-klien: 29 event kontrak", () => {
    expect(Object.keys(CONTRACT_SERVER_EVENTS)).toHaveLength(29);
  });

  it("total 46 event Socket.IO", () => {
    expect(
      Object.keys(CONTRACT_CLIENT_EVENTS).length + Object.keys(CONTRACT_SERVER_EVENTS).length,
    ).toBe(46);
  });
});

describe("event dev terpisah dari 46 event produksi", () => {
  it("DEV_EVENTS tidak ada di skema klien produksi dan punya skema sendiri", () => {
    expect([...DEV_EVENTS]).toEqual(["dev:finish-game"]);
    expect(Object.keys(DevEventSchemas).sort()).toEqual([...DEV_EVENTS].sort());
    for (const event of DEV_EVENTS) expect(Object.keys(ClientEventSchemas)).not.toContain(event);
  });

  it("kode room dev lolos RoomCodeSchema", () => {
    expect(DEV_ROOM_CODE).toBe("UMR-0099");
    expect(RoomCodeSchema.safeParse(DEV_ROOM_CODE).success).toBe(true);
  });
});
