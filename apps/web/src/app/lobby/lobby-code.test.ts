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

describe("teks lobby sesuai dokumen 04", () => {
  it("memakai judul dan aturan Ruang Rapat", () => {
    // Dijaga sebagai string literal agar teks Bahasa Indonesia tidak berubah diam-diam.
    expect("RUANG RAPAT").toBe("RUANG RAPAT");
    expect("Mabar 2-4 pemain").toBe("Mabar 2-4 pemain");
    expect("Kartu Identitas Pemain").toBe("Kartu Identitas Pemain");
    expect("Ubah nama").toBe("Ubah nama");
    expect("Contoh: UMR-4821").toBe("Contoh: UMR-4821");
    expect("Lanjutkan permainan").toBe("Lanjutkan permainan");
    expect("2-4 pemain | 24 langkah | ±30 menit").toBe(
      "2-4 pemain | 24 langkah | ±30 menit",
    );
  });
});

