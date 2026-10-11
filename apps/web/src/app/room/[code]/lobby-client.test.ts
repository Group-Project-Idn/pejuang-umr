import { describe, expect, it } from "vitest";
import { getStartHelper, ROOM_COPY } from "./waiting-room";

describe("copy ruang tunggu", () => {
  it("mengikuti teks Room pada dokumen UI", () => {
    expect(ROOM_COPY).toEqual({
      title: "RUANG TUNGGU",
      subtitle: "Menunggu peserta rapat",
      rules: "2-4 pemain | 24 langkah | ±30 menit",
      rulesDetail: "1 permainan = 12 bulan. Papan menyesuaikan jumlah pemain.",
      minimumPlayers: "Menunggu minimal 2 pemain",
      waitingReady: "Menunggu pemain siap",
    });
  });

  it("menampilkan alasan tombol mulai sesuai RoomState", () => {
    expect(getStartHelper(false, "NEED_MIN_PLAYERS")).toBe("Menunggu minimal 2 pemain");
    expect(getStartHelper(false, "WAITING_READY")).toBe("Menunggu pemain siap");
    expect(getStartHelper(true, null)).toBe("Semua peserta siap. Rapat bisa dimulai.");
  });
});