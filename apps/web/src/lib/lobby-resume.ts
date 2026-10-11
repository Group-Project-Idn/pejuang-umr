import type { RoomLookupResponse } from "@pejuang/shared";

/** API_CONTRACT §4.2: storage saja bukan bukti keanggotaan room. */
export function getResumableRoomCode(room: RoomLookupResponse): string | null {
  return room.isMember === true && (room.status === "waiting" || room.status === "playing")
    ? room.code
    : null;
}