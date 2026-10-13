import { DEV_ROOM_CODE } from "@pejuang/shared";
import type { GameRepository } from "../repositories/game-repository";
import type { RoomRepository } from "../repositories/room-repository";

/**
 * Room uji UMR-0099 kembali ke status menunggu bila tidak ada pemain tersambung: room dan sesi
 * game-nya dihapus, lalu dibuat ulang otomatis saat pemain pertama berikutnya masuk. Game yang
 * sedang berjalan tidak disentuh (ia selesai lewat timer, lalu dicek lagi saat selesai).
 * Mengembalikan true bila room direset.
 */
export function resetAbandonedDevRoom(rooms: RoomRepository, games: GameRepository): boolean {
  if (!rooms.isDevRoomEnabled()) return false;
  const room = rooms.get(DEV_ROOM_CODE);
  if (!room || room.status === "playing" || room.status === "countdown") return false;
  if (room.players.some((player) => player.connected)) return false;
  games.get(DEV_ROOM_CODE)?.dispose();
  games.delete(DEV_ROOM_CODE);
  rooms.close(DEV_ROOM_CODE);
  return true;
}
