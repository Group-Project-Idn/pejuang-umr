import { describe, expect, it } from "vitest";
import {
  getCountdownPresentation,
  getCountdownSeconds,
  getParticipantLabel,
  getStartHelper,
  ROOM_COPY,
} from "./waiting-room";

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

  it("menampilkan jumlah peserta dengan format desain", () => {
    expect(getParticipantLabel(2)).toBe("PESERTA (2/4)");
  });

  it("menampilkan alasan tombol mulai sesuai RoomState", () => {
    expect(getStartHelper(false, "NEED_MIN_PLAYERS")).toBe("Menunggu minimal 2 pemain");
    expect(getStartHelper(false, "WAITING_READY")).toBe("Menunggu pemain siap");
    expect(getStartHelper(true, null)).toBe("Semua peserta siap. Rapat bisa dimulai.");
  });

  it("menghitung countdown dari waktu aktual dan selesai setelah deadline", () => {
    expect(getCountdownSeconds(63_000, 60_000)).toBe(3);
    expect(getCountdownSeconds(63_000, 61_001)).toBe(2);
    expect(getCountdownSeconds(63_000, 62_001)).toBe(1);
    expect(getCountdownSeconds(63_000, 63_000)).toBeNull();
    expect(getCountdownSeconds(63_000, 73_000)).toBeNull();
  });

  it("mengganti overlay angka dengan status persiapan setelah deadline", () => {
    expect(getCountdownPresentation("countdown", 63_000, 62_001)).toEqual({
      seconds: 1,
      preparing: false,
    });
    expect(getCountdownPresentation("countdown", 63_000, 73_000)).toEqual({
      seconds: null,
      preparing: true,
    });
    expect(getCountdownPresentation("waiting", null, 73_000)).toEqual({
      seconds: null,
      preparing: false,
    });
  });
});