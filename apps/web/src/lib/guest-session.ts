import { GuestResponseSchema, type GuestResponse } from "@pejuang/shared";

const STORAGE_KEY = "pejuang.guest";

export type GuestSession = GuestResponse;

export function readGuestSession(): GuestSession | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = GuestResponseSchema.safeParse(JSON.parse(raw));
    if (parsed.success && parsed.data.expiresAt > Date.now()) return parsed.data;
  } catch {
    // Invalid local data is removed below.
  }

  window.localStorage.removeItem(STORAGE_KEY);
  return null;
}

export function writeGuestSession(session: GuestSession): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearGuestSession(): void {
  if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY);
}