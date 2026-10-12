import { describe, expect, it } from "vitest";
import {
  AVATAR_TAKEN_MESSAGE,
  getAvatarChoices,
  getCountdownPresentation,
  getCountdownSeconds,
  getParticipantLabel,
  getRoomActionMessage,
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
describe("pemilih karakter", () => {
  const players = [
    { playerId: "p1", avatarId: "michael" },
    { playerId: "p2", avatarId: "sinta" },
  ];

  it("menyediakan 4 karakter dengan id, nama, dan gambar", () => {
    const choices = getAvatarChoices(players, "p1");
    expect(choices.map((choice) => choice.id)).toEqual(["michael", "raka", "sinta", "icha"]);
    for (const choice of choices) {
      expect(choice.name.length).toBeGreaterThan(0);
      expect(choice.src).toMatch(/^\/characters\/.+\.png$/);
    }
  });

  it("menonaktifkan karakter yang dipakai pemain lain, bukan milik sendiri", () => {
    const byId = Object.fromEntries(
      getAvatarChoices(players, "p1").map((choice) => [choice.id, choice]),
    );
    expect(byId.michael).toMatchObject({ taken: false, selected: true });
    expect(byId.sinta).toMatchObject({ taken: true, selected: false });
    expect(byId.raka).toMatchObject({ taken: false, selected: false });
    expect(byId.icha).toMatchObject({ taken: false, selected: false });
  });

  it("menerjemahkan AVATAR_TAKEN dan error lain", () => {
    expect(getRoomActionMessage("Pilih karakter", { ok: false, error: "AVATAR_TAKEN" }))
      .toBe("Karakter ini sudah dipilih pemain lain.");
    expect(AVATAR_TAKEN_MESSAGE).toBe("Karakter ini sudah dipilih pemain lain.");
    expect(getRoomActionMessage("Pilih karakter", { ok: false, error: "INTERNAL" }))
      .toBe("Gagal: INTERNAL");
    expect(getRoomActionMessage("Pilih karakter", { ok: true } as never))
      .toBe("Pilih karakter berhasil.");
  });
});
