import { RoomLookupResponseSchema } from "@pejuang/shared";
import { describe, expect, it } from "vitest";
import { getResumableRoomCode } from "./lobby-resume";

describe("kartu lanjutkan permainan sesuai API_CONTRACT §4.2", () => {
  it.each(["waiting", "countdown", "playing", "finished"])("memeriksa status %s dan keanggotaan", (status) => {
    const room = RoomLookupResponseSchema.parse({
      ok: true, code: "UMR-1234", status, playerCount: 2,
      maxPlayers: 4, joinable: false, reason: "ROOM_LOCKED", isMember: true,
    });
    expect(getResumableRoomCode(room)).toBe(
      status === "waiting" || status === "playing" ? room.code : null,
    );
    expect(getResumableRoomCode({ ...room, isMember: false })).toBeNull();
    expect(getResumableRoomCode({ ...room, isMember: undefined })).toBeNull();
  });
});