import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from "@pejuang/shared";
import type { Server } from "socket.io";
import type { Clock, TimerHandle } from "../game/clock";
import type { GameRepository } from "../repositories/game-repository";
import type { RoomRepository } from "../repositories/room-repository";

type GameServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

interface Entry {
  lastActivity: number;
  status: string;
  emptySince: number | null;
}

export const ROOM_CLOSED_MESSAGE = "Room ditutup karena tidak aktif.";

/**
 * Menutup room yang tidak aktif (audit M11, API_CONTRACT 17 #2).
 * - waiting/finished: tutup bila tanpa aktivitas `idleMs`, atau semua anggota putus `emptyMs`.
 * - countdown/playing: tidak pernah ditutup karena idle (game jalan lewat timer);
 *   tutup hanya bila semua pemain putus `idleMs`.
 * Satu timer sapuan dipasang hanya selama ada room, dan dilepas saat room habis.
 */
export class RoomJanitor {
  private readonly entries = new Map<string, Entry>();
  private timer: TimerHandle | null = null;
  private readonly intervalMs: number;

  constructor(
    private readonly io: GameServer,
    private readonly rooms: RoomRepository,
    private readonly games: GameRepository,
    private readonly clock: Clock,
    private readonly idleMs: number,
    private readonly emptyMs: number,
    /** Kode room yang tidak pernah ditutup janitor (room uji UMR-0099). */
    private readonly exemptCodes: ReadonlySet<string> = new Set(),
  ) {
    this.intervalMs = Math.max(1, Math.floor(Math.min(idleMs, emptyMs) / 4));
  }

  /** Mencatat aktivitas dari anggota room (event C->S yang valid). */
  touch(playerId: string): void {
    const room = this.rooms.getByPlayer(playerId);
    if (!room || this.exemptCodes.has(room.code)) return;
    this.entryFor(room.code, room.status).lastActivity = this.clock.now();
    this.ensureTimer();
  }

  dispose(): void {
    if (this.timer !== null) this.clock.clearTimeout(this.timer);
    this.timer = null;
    this.entries.clear();
  }

  /** Satu sapuan; dipanggil oleh timer, dan bisa dipanggil langsung di tes. */
  sweep(): void {
    const now = this.clock.now();
    const codes = this.rooms.codes();
    for (const code of [...this.entries.keys()]) {
      if (!codes.includes(code)) this.entries.delete(code);
    }
    for (const code of codes) {
      const room = this.rooms.get(code);
      if (!room || this.exemptCodes.has(code)) continue;
      const entry = this.entryFor(code, room.status);
      if (entry.status !== room.status) {
        entry.status = room.status;
        entry.lastActivity = now;
      }
      const allDisconnected = room.players.every((player) => !player.connected);
      entry.emptySince = allDisconnected ? (entry.emptySince ?? now) : null;

      const running = room.status === "playing" || room.status === "countdown";
      const idle = !running && now - entry.lastActivity >= this.idleMs;
      const empty =
        entry.emptySince !== null &&
        now - entry.emptySince >= (running ? this.idleMs : this.emptyMs);
      if (idle || empty) this.close(code);
    }
  }

  private close(code: string): void {
    this.io.to(code).emit("error", {
      code: "ROOM_NOT_FOUND",
      message: ROOM_CLOSED_MESSAGE,
      fatal: true,
    });
    this.io.in(code).socketsLeave(code);
    const session = this.games.get(code);
    session?.dispose();
    this.games.delete(code);
    this.rooms.close(code);
    this.entries.delete(code);
  }

  private entryFor(code: string, status: string): Entry {
    let entry = this.entries.get(code);
    if (!entry) {
      entry = { lastActivity: this.clock.now(), status, emptySince: null };
      this.entries.set(code, entry);
    }
    return entry;
  }

  private ensureTimer(): void {
    if (this.timer !== null) return;
    this.timer = this.clock.setTimeout(() => {
      this.timer = null;
      this.sweep();
      if (this.rooms.codes().length > 0) this.ensureTimer();
    }, this.intervalMs);
  }
}
