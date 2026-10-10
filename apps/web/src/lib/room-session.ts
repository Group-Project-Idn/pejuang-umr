import { RoomCodeSchema } from "@pejuang/shared";

const STORAGE_KEY = "pejuang.room";

export function readRoomCode(): string | null {
  if (typeof window === "undefined") return null;
  const parsed = RoomCodeSchema.safeParse(window.localStorage.getItem(STORAGE_KEY));
  if (parsed.success) return parsed.data;
  window.localStorage.removeItem(STORAGE_KEY);
  return null;
}

export function writeRoomCode(code: string): void {
  window.localStorage.setItem(STORAGE_KEY, RoomCodeSchema.parse(code));
}

export function clearRoomCode(): void {
  if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY);
}
