import { randomInt } from "node:crypto";
import {
  CharacterIdSchema,
  DEV_ROOM_CODE,
  type CharacterId,
  type ErrorCode,
  type RoomPlayer,
  type RoomState,
  type SocketData,
  type TurnSeconds,
} from "@pejuang/shared";

type RoomMutationResult =
  | { ok: true; room: RoomState }
  | { ok: false; error: ErrorCode };

type RoomCodeFactory = () => string;

function defaultRoomCodeFactory(): string {
  let code: string;
  do {
    code = `UMR-${randomInt(0, 10_000).toString().padStart(4, "0")}`;
  } while (code === DEV_ROOM_CODE);
  return code;
}

function cloneRoom(room: RoomState): RoomState {
  return { ...room, players: room.players.map((player) => ({ ...player })) };
}

/** Urutan karakter sah (GDD 9.1 v1.12). */
const CHARACTER_ORDER: readonly CharacterId[] = CharacterIdSchema.options;

/**
 * Karakter untuk pemain baru di room: profil tamu bila sah dan belum dipakai,
 * selain itu karakter kosong pertama sesuai urutan CharacterIdSchema.
 */
function pickAvatar(players: RoomPlayer[], preferred: string): CharacterId {
  const taken = new Set<string>(players.map((player) => player.avatarId));
  const wanted = CharacterIdSchema.safeParse(preferred);
  if (wanted.success && !taken.has(wanted.data)) return wanted.data;
  return CHARACTER_ORDER.find((id) => !taken.has(id)) ?? CHARACTER_ORDER[0]!;
}

function guestsReady(players: RoomPlayer[]): boolean {
  return players.filter((player) => !player.isHost).every((player) => player.ready);
}

function withDerivedState(room: RoomState): RoomState {
  const enoughPlayers = room.players.length >= 2;
  const ready = guestsReady(room.players);

  return {
    ...room,
    canStart: room.status === "waiting" && enoughPlayers && ready,
    startBlockReason: !enoughPlayers
      ? "NEED_MIN_PLAYERS"
      : ready
        ? null
        : "WAITING_READY",
  };
}

export class RoomRepository {
  private readonly rooms = new Map<string, RoomState>();
  private readonly playerRooms = new Map<string, string>();

  /** Room uji UMR-0099 (GDD v1.14): dibuat otomatis saat pemain pertama masuk. */
  private devRoomEnabled = false;

  constructor(private readonly createCode: RoomCodeFactory = defaultRoomCodeFactory) {}

  /** Mengaktifkan room uji (hanya bila DEV_TOOLS=true). */
  enableDevRoom(): void {
    this.devRoomEnabled = true;
  }

  isDevRoomEnabled(): boolean {
    return this.devRoomEnabled;
  }

  create(identity: SocketData, now = Date.now()): RoomMutationResult {
    if (this.playerRooms.has(identity.playerId)) {
      return { ok: false, error: "ALREADY_IN_ROOM" };
    }

    // Kode UMR-0099 dicadangkan: tidak pernah dipakai room biasa.
    const unavailable = (candidate: string) =>
      this.rooms.has(candidate) || candidate === DEV_ROOM_CODE;
    let code = this.createCode();
    for (let attempt = 0; unavailable(code) && attempt < 20; attempt += 1) {
      code = this.createCode();
    }
    if (unavailable(code)) return { ok: false, error: "INTERNAL" };

    return { ok: true, room: cloneRoom(this.openRoom(code, identity, now)) };
  }

  private openRoom(code: string, identity: SocketData, now: number): RoomState {
    const room = withDerivedState({
      code,
      status: "waiting",
      hostId: identity.playerId,
      turnSeconds: 30,
      players: [this.createPlayer(identity, true, now, pickAvatar([], identity.avatarId))],
      maxPlayers: 4,
      canStart: false,
      startBlockReason: "NEED_MIN_PLAYERS",
    });
    this.rooms.set(code, room);
    this.playerRooms.set(identity.playerId, code);
    return room;
  }

  join(code: string, identity: SocketData, now = Date.now()): RoomMutationResult {
    const existingCode = this.playerRooms.get(identity.playerId);
    if (existingCode) {
      if (existingCode === code) {
        const existingRoom = this.rooms.get(code);
        return existingRoom
          ? { ok: true, room: cloneRoom(existingRoom) }
          : { ok: false, error: "ROOM_NOT_FOUND" };
      }
      return { ok: false, error: "ALREADY_IN_ROOM" };
    }

    const room = this.rooms.get(code);
    // Room uji dibuat saat pemain pertama masuk; ia menjadi host.
    if (!room && this.devRoomEnabled && code === DEV_ROOM_CODE) {
      return { ok: true, room: cloneRoom(this.openRoom(code, identity, now)) };
    }
    if (!room) return { ok: false, error: "ROOM_NOT_FOUND" };
    if (room.status !== "waiting") return { ok: false, error: "ROOM_LOCKED" };
    if (room.players.length >= room.maxPlayers) {
      return { ok: false, error: "ROOM_FULL" };
    }

    room.players.push(
      this.createPlayer(identity, false, now, pickAvatar(room.players, identity.avatarId)),
    );
    this.playerRooms.set(identity.playerId, code);
    return { ok: true, room: cloneRoom(this.save(room)) };
  }

  leave(playerId: string): RoomMutationResult {
    const room = this.getByPlayerMutable(playerId);
    if (!room) return { ok: false, error: "NOT_IN_ROOM" };
    // Saat finished, pemain boleh keluar (Kembali ke Lobby); saat countdown/playing tidak.
    if (room.status !== "waiting" && room.status !== "finished") {
      return { ok: false, error: "ROOM_LOCKED" };
    }

    room.players = room.players.filter((player) => player.playerId !== playerId);
    this.playerRooms.delete(playerId);

    if (room.players.length === 0) {
      this.rooms.delete(room.code);
      return { ok: true, room: cloneRoom(room) };
    }

    if (room.hostId === playerId) {
      // Pemain yang masuk paling awal (urutan array = urutan masuk).
      this.assignHost(room, room.status === "finished" ? this.earliestConnected(room) : room.players[0]!);
    }
    return { ok: true, room: cloneRoom(this.save(room)) };
  }

  /**
   * Pemain yang sudah tereliminasi keluar saat game berjalan (GDD 9.4 v1.12): dikeluarkan dari
   * room. Host berpindah ke pemain tersambung paling awal. Game tidak terpengaruh.
   */
  leaveEliminated(playerId: string): RoomMutationResult {
    const room = this.getByPlayerMutable(playerId);
    if (!room) return { ok: false, error: "NOT_IN_ROOM" };
    if (room.status !== "playing") return { ok: false, error: "ROOM_LOCKED" };
    room.players = room.players.filter((player) => player.playerId !== playerId);
    this.playerRooms.delete(playerId);
    if (room.players.length === 0) {
      this.rooms.delete(room.code);
      return { ok: true, room: cloneRoom(room) };
    }
    if (room.hostId === playerId) this.assignHost(room, this.earliestConnected(room));
    return { ok: true, room: cloneRoom(this.save(room)) };
  }

  private earliestConnected(room: RoomState): RoomPlayer {
    return room.players.find((player) => player.connected) ?? room.players[0]!;
  }

  private assignHost(room: RoomState, host: RoomPlayer): void {
    room.hostId = host.playerId;
    room.players = room.players.map((player) => ({
      ...player,
      isHost: player.playerId === host.playerId,
    }));
  }

  // Keluar saat game berjalan (GDD 9.4 v1.10): diperlakukan sama seperti
  // koneksi putus. Pemain TETAP terdaftar di room dan game, hanya ditandai
  // terputus (connected: false) agar bisa kembali lewat session:resume.
  markDisconnected(playerId: string): RoomMutationResult {
    const room = this.getByPlayerMutable(playerId);
    if (!room) return { ok: false, error: "NOT_IN_ROOM" };
    room.players = room.players.map((player) =>
      player.playerId === playerId ? { ...player, connected: false } : player,
    );
    return { ok: true, room: cloneRoom(this.save(room)) };
  }

  setReady(playerId: string, ready: boolean): RoomMutationResult {
    const room = this.getByPlayerMutable(playerId);
    if (!room) return { ok: false, error: "NOT_IN_ROOM" };
    if (room.hostId === playerId) return { ok: false, error: "INVALID_PAYLOAD" };
    return this.updatePlayer(playerId, (player) => ({ ...player, ready }));
  }

  /** room:avatar (GDD 9.3 v1.12): ganti karakter di room ini; unik per room. */
  setAvatar(playerId: string, avatarId: CharacterId): RoomMutationResult {
    const room = this.getByPlayerMutable(playerId);
    if (!room) return { ok: false, error: "NOT_IN_ROOM" };
    if (room.status !== "waiting") return { ok: false, error: "ROOM_LOCKED" };
    if (
      room.players.some(
        (player) => player.playerId !== playerId && player.avatarId === avatarId,
      )
    ) {
      return { ok: false, error: "AVATAR_TAKEN" };
    }
    return this.updatePlayer(playerId, (player) => ({
      ...player,
      avatarId,
      ready: false,
    }));
  }

  setTimer(playerId: string, turnSeconds: TurnSeconds): RoomMutationResult {
    const room = this.getByPlayerMutable(playerId);
    if (!room) return { ok: false, error: "NOT_IN_ROOM" };
    if (room.hostId !== playerId) return { ok: false, error: "NOT_HOST" };
    if (room.status !== "waiting") return { ok: false, error: "ROOM_LOCKED" };
    room.turnSeconds = turnSeconds;
    return { ok: true, room: cloneRoom(this.save(room)) };
  }

  kick(hostId: string, targetPlayerId: string): RoomMutationResult {
    const room = this.getByPlayerMutable(hostId);
    if (!room) return { ok: false, error: "NOT_IN_ROOM" };
    if (room.hostId !== hostId) return { ok: false, error: "NOT_HOST" };
    if (room.status !== "waiting") return { ok: false, error: "ROOM_LOCKED" };
    if (targetPlayerId === hostId) return { ok: false, error: "INVALID_TARGET" };
    if (!room.players.some((player) => player.playerId === targetPlayerId)) {
      return { ok: false, error: "INVALID_TARGET" };
    }

    room.players = room.players.filter(
      (player) => player.playerId !== targetPlayerId,
    );
    this.playerRooms.delete(targetPlayerId);
    return { ok: true, room: cloneRoom(this.save(room)) };
  }

  beginCountdown(hostId: string): RoomMutationResult {
    const room = this.getByPlayerMutable(hostId);
    if (!room) return { ok: false, error: "NOT_IN_ROOM" };
    if (room.hostId !== hostId) return { ok: false, error: "NOT_HOST" };
    if (room.status !== "waiting") return { ok: false, error: "ROOM_LOCKED" };
    if (room.players.length < 2) {
      return { ok: false, error: "NOT_ENOUGH_PLAYERS" };
    }
    if (!guestsReady(room.players)) {
      return { ok: false, error: "PLAYERS_NOT_READY" };
    }
    room.status = "countdown";
    return { ok: true, room: cloneRoom(this.save(room)) };
  }

  markPlaying(code: string): RoomMutationResult {
    const room = this.rooms.get(code);
    if (!room) return { ok: false, error: "ROOM_NOT_FOUND" };
    if (room.status !== "countdown") return { ok: false, error: "ROOM_LOCKED" };
    if (room.players.length < 2) {
      return { ok: false, error: "NOT_ENOUGH_PLAYERS" };
    }
    if (!guestsReady(room.players)) {
      return { ok: false, error: "PLAYERS_NOT_READY" };
    }
    room.status = "playing";
    return { ok: true, room: cloneRoom(this.save(room)) };
  }

  /**
   * Game selesai. Host yang sudah tereliminasi pindah ke pemain belum tereliminasi yang masih
   * tersambung dengan peringkat terbaik (`survivorsByRank`, urutan peringkat game:finished);
   * bila tak ada yang memenuhi syarat, host tidak berubah (D7). Host yang masih hidup mengikuti
   * aturan lama: pemain tersambung paling awal.
   */
  markFinished(code: string, survivorsByRank?: readonly string[]): RoomMutationResult {
    const room = this.rooms.get(code);
    if (!room) return { ok: false, error: "ROOM_NOT_FOUND" };
    if (room.status !== "playing") return { ok: false, error: "ROOM_LOCKED" };
    room.status = "finished";
    // Peran host tidak diperlukan selama game; saat selesai dipilih ulang.
    const hostSurvived = survivorsByRank === undefined || survivorsByRank.includes(room.hostId);
    if (hostSurvived) {
      this.assignHost(room, this.earliestConnected(room));
    } else {
      const best = survivorsByRank
        .map((id) => room.players.find((player) => player.playerId === id))
        .find((player): player is RoomPlayer => player !== undefined && player.connected);
      if (best) this.assignHost(room, best);
    }
    return { ok: true, room: cloneRoom(this.save(room)) };
  }

  /**
   * Main Lagi (GDD 9.5 v1.12): hanya host dan hanya saat finished. Pemain tidak tersambung dan
   * pemain yang tereliminasi di game sebelumnya (`eliminatedIds`) dikeluarkan. Bila tak seorang pun
   * tersisa, ditolak NOT_ENOUGH_PLAYERS dan room tidak berubah (D7).
   */
  rematch(
    hostId: string,
    eliminatedIds: readonly string[] = [],
  ): RoomMutationResult & { removed?: string[] } {
    const room = this.getByPlayerMutable(hostId);
    if (!room) return { ok: false, error: "NOT_IN_ROOM" };
    if (room.hostId !== hostId) return { ok: false, error: "NOT_HOST" };
    if (room.status !== "finished") return { ok: false, error: "INVALID_PAYLOAD" };
    const qualifies = (player: RoomPlayer) =>
      player.connected && !eliminatedIds.includes(player.playerId);
    if (!room.players.some(qualifies)) return { ok: false, error: "NOT_ENOUGH_PLAYERS" };
    const stays = qualifies;
    const removed = room.players.filter((player) => !stays(player)).map((player) => player.playerId);
    for (const playerId of removed) this.playerRooms.delete(playerId);
    room.players = room.players.filter(stays).map((player) => ({ ...player, ready: false }));
    // Host yang dikeluarkan (mis. tereliminasi) digantikan pemain tersambung paling awal.
    if (!room.players.some((player) => player.playerId === room.hostId)) {
      this.assignHost(room, this.earliestConnected(room));
    }
    room.status = "waiting";
    return { ok: true, room: cloneRoom(this.save(room)), removed };
  }

  setConnected(playerId: string, connected: boolean): RoomState | null {
    const room = this.getByPlayerMutable(playerId);
    if (!room) return null;
    room.players = room.players.map((player) =>
      player.playerId === playerId ? { ...player, connected } : player,
    );
    return cloneRoom(this.save(room));
  }

  codes(): string[] {
    return [...this.rooms.keys()];
  }

  /** Menghapus room beserta pemetaan semua anggotanya. */
  close(code: string): void {
    const room = this.rooms.get(code);
    if (!room) return;
    for (const player of room.players) this.playerRooms.delete(player.playerId);
    this.rooms.delete(code);
  }

  get(code: string): RoomState | null {
    const room = this.rooms.get(code);
    return room ? cloneRoom(room) : null;
  }

  getByPlayer(playerId: string): RoomState | null {
    const room = this.getByPlayerMutable(playerId);
    return room ? cloneRoom(room) : null;
  }

  private updatePlayer(
    playerId: string,
    update: (player: RoomPlayer) => RoomPlayer,
  ): RoomMutationResult {
    const room = this.getByPlayerMutable(playerId);
    if (!room) return { ok: false, error: "NOT_IN_ROOM" };
    if (room.status !== "waiting") return { ok: false, error: "ROOM_LOCKED" };
    room.players = room.players.map((player) =>
      player.playerId === playerId ? update(player) : player,
    );
    return { ok: true, room: cloneRoom(this.save(room)) };
  }

  private save(room: RoomState): RoomState {
    const saved = withDerivedState(room);
    this.rooms.set(room.code, saved);
    return saved;
  }

  private getByPlayerMutable(playerId: string): RoomState | null {
    const code = this.playerRooms.get(playerId);
    return code ? (this.rooms.get(code) ?? null) : null;
  }

  private createPlayer(
    identity: SocketData,
    isHost: boolean,
    joinedAt: number,
    avatarId: CharacterId,
  ): RoomPlayer {
    return {
      ...identity,
      avatarId,
      connected: true,
      isHost,
      ready: false,
      joinedAt,
    };
  }
}
