import { describe, expect, it, vi } from "vitest";
import type { GuestResponse } from "@pejuang/shared";
import { LOBBY_COPY } from "./lobby-screen";
import { profileFormDefaults, saveProfile, toGuestErrorMessage } from "./profile-edit";

const session: GuestResponse = {
  ok: true,
  playerId: "p1",
  name: "Budi",
  avatarId: "raka",
  token: "tok-lama",
  expiresAt: Date.now() + 100_000,
};

describe("Edit Profile", () => {
  it("label tombol Edit Profile", () => {
    expect(LOBBY_COPY.editName).toBe("Edit Profile");
  });

  it("mode edit mengisi nama dan karakter dari sesi", () => {
    expect(profileFormDefaults(session, "michael")).toEqual({ name: "Budi", avatarId: "raka" });
    expect(profileFormDefaults(null, "michael")).toEqual({ name: "", avatarId: "michael" });
  });

  it("simpan memanggil API dengan token sesi lalu memperbarui sesi", async () => {
    const updated = { ...session, name: "Siti", avatarId: "sinta" as const };
    const createOrUpdateGuest = vi.fn().mockResolvedValue(updated);
    const writeGuestSession = vi.fn();
    const result = await saveProfile({ name: " Siti ", avatarId: "sinta" }, session, {
      createOrUpdateGuest,
      writeGuestSession,
    });
    expect(createOrUpdateGuest).toHaveBeenCalledWith({ name: "Siti", avatarId: "sinta" }, "tok-lama");
    expect(writeGuestSession).toHaveBeenCalledWith(updated);
    expect(result).toEqual({ ok: true, session: updated });
  });

  it("input tidak sah tidak memanggil API", async () => {
    const createOrUpdateGuest = vi.fn();
    const result = await saveProfile({ name: "S", avatarId: "sinta" }, session, {
      createOrUpdateGuest,
      writeGuestSession: vi.fn(),
    });
    expect(createOrUpdateGuest).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
  });

  it.each([
    ["ALREADY_IN_ROOM", "Edit Profile hanya bisa di Lobby."],
    ["NAME_REJECTED", "Nama ini tidak bisa dipakai."],
    ["RATE_LIMITED", "Pelan-pelan dulu, coba sebentar lagi."],
  ])("error %s memberi teks dari kontrak dan sesi tidak berubah", async (code, text) => {
    const writeGuestSession = vi.fn();
    const result = await saveProfile({ name: "Siti", avatarId: "sinta" }, session, {
      createOrUpdateGuest: vi.fn().mockRejectedValue(new Error(code)),
      writeGuestSession,
    });
    expect(toGuestErrorMessage(code)).toBe(text);
    expect(result).toMatchObject({ ok: false, code, message: text });
    expect(writeGuestSession).not.toHaveBeenCalled();
  });
});
