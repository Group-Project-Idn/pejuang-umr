import { GuestRequestSchema, type GuestRequest, type GuestResponse } from "@pejuang/shared";

export const PROFILE_COPY = {
  editButton: "Edit Profile",
  editTitle: "Edit Profile",
  guestTitle: "Masuk sebagai tamu",
  invalidForm: "Nama 2–20 karakter, lalu pilih avatar.",
  savedEdit: "Profil berhasil diubah.",
  savedGuest: "Masuk sebagai tamu berhasil.",
} as const;

// Teks UI sesuai API_CONTRACT Bagian 15 (ALREADY_IN_ROOM versi /guest).
export function toGuestErrorMessage(code: string): string {
  switch (code) {
    case "ALREADY_IN_ROOM": return "Edit Profile hanya bisa di Lobby.";
    case "NAME_REJECTED": return "Nama ini tidak bisa dipakai.";
    case "RATE_LIMITED": return "Pelan-pelan dulu, coba sebentar lagi.";
    case "UNAUTHORIZED": return "Sesi habis. Masuk sebagai tamu lagi.";
    case "INVALID_PAYLOAD": return "Ada yang salah. Coba lagi.";
    case "INTERNAL": return "Server lagi bermasalah. Coba lagi.";
    default: return `Gagal: ${code}`;
  }
}

export function profileFormDefaults(session: GuestResponse | null, fallbackAvatarId: string) {
  return { name: session?.name ?? "", avatarId: session?.avatarId ?? fallbackAvatarId };
}

export type SaveProfileDeps = {
  createOrUpdateGuest: (payload: GuestRequest, token?: string) => Promise<GuestResponse>;
  writeGuestSession: (session: GuestResponse) => void;
};

export type SaveProfileResult =
  | { ok: true; session: GuestResponse }
  | { ok: false; message: string; code: string };

export async function saveProfile(
  values: { name: string; avatarId: string },
  session: GuestResponse | null,
  deps: SaveProfileDeps,
): Promise<SaveProfileResult> {
  const parsed = GuestRequestSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, code: "INVALID_PAYLOAD", message: PROFILE_COPY.invalidForm };
  }
  try {
    const next = await deps.createOrUpdateGuest(parsed.data, session?.token);
    deps.writeGuestSession(next);
    return { ok: true, session: next };
  } catch (error) {
    const code = error instanceof Error ? error.message : "INTERNAL";
    return { ok: false, code, message: toGuestErrorMessage(code) };
  }
}
