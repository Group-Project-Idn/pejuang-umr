import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, readSettings, writeSettings } from "./settings";

function memoryStorage(initial?: string) {
  let value: string | null = initial ?? null;
  return {
    getItem: () => value,
    setItem: (_k: string, v: string) => { value = v; },
  };
}

describe("settings", () => {
  it("default semua aktif", () => {
    expect(readSettings(memoryStorage())).toEqual({ music: true, sfx: true, inviteNotifications: true });
    expect(readSettings(null)).toEqual(DEFAULT_SETTINGS);
  });
  it("menyimpan dan membaca kembali", () => {
    const s = memoryStorage();
    writeSettings({ music: false, sfx: true, inviteNotifications: false }, s);
    expect(readSettings(s)).toEqual({ music: false, sfx: true, inviteNotifications: false });
  });
  it("data rusak atau bertipe salah jatuh ke default", () => {
    expect(readSettings(memoryStorage("{bukan json"))).toEqual(DEFAULT_SETTINGS);
    expect(readSettings(memoryStorage("null"))).toEqual(DEFAULT_SETTINGS);
    expect(readSettings(memoryStorage('{"music":"tidak","sfx":false}'))).toEqual({ music: true, sfx: false, inviteNotifications: true });
  });
  it("tidak melempar saat storage error", () => {
    const broken = { getItem: () => { throw new Error("x"); }, setItem: () => { throw new Error("x"); } };
    expect(readSettings(broken)).toEqual(DEFAULT_SETTINGS);
    expect(() => writeSettings(DEFAULT_SETTINGS, broken)).not.toThrow();
  });
});
