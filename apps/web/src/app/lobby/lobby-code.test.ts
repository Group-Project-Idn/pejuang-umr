import { describe, expect, it } from "vitest";
import { RoomCodeSchema } from "@pejuang/shared";
import { getAvatarName, getAvatarSrc } from "@/lib/avatars";
import { toRoomErrorMessage } from "./lobby-screen";

describe("aturan kode lobby", () => {
  it("menerima format UMR-1234", () => {
    expect(RoomCodeSchema.safeParse("UMR-1234").success).toBe(true);
  });

  it("menolak format selain UMR-1234", () => {
    expect(RoomCodeSchema.safeParse("ABC-1").success).toBe(false);
    expect(RoomCodeSchema.safeParse("umr-1234").success).toBe(false);
  });
});

describe("pesan error lobby", () => {
  it("memakai teks Indonesia sesuai dokumen", () => {
    expect(toRoomErrorMessage("ROOM_NOT_FOUND")).toBe("Kode room tidak ketemu.");
    expect(toRoomErrorMessage("ROOM_FULL")).toContain("penuh");
  });
});

describe("avatar lobby", () => {
  it("memetakan id ke PNG di public/characters", () => {
    expect(getAvatarSrc("michael")).toBe("/characters/michael.png");
    expect(getAvatarSrc("sinta")).toBe("/characters/sinta.png");
    expect(getAvatarName("raka")).toBe("Raka");
  });
});
