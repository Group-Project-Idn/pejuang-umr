const STORAGE_KEY = "pejuang.settings";

/** Dikirim ke window setelah pengaturan ditulis, supaya musik bisa langsung menyala/mati. */
export const SETTINGS_CHANGED_EVENT = "pejuang:settings-changed";

export type Settings = {
  music: boolean;
  sfx: boolean;
  inviteNotifications: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  music: true,
  sfx: true,
  inviteNotifications: true,
};

type SettingsStorage = Pick<Storage, "getItem" | "setItem">;

function defaultStorage(): SettingsStorage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** Membaca pengaturan; nilai hilang atau rusak jatuh ke default (aktif). */
export function readSettings(storage: SettingsStorage | null = defaultStorage()): Settings {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return { ...DEFAULT_SETTINGS };
    const obj = parsed as Record<string, unknown>;
    const pick = (key: keyof Settings) => (typeof obj[key] === "boolean" ? obj[key] : DEFAULT_SETTINGS[key]);
    return { music: pick("music"), sfx: pick("sfx"), inviteNotifications: pick("inviteNotifications") };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function writeSettings(settings: Settings, storage: SettingsStorage | null = defaultStorage()): void {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(settings));
    if (typeof window !== "undefined") window.dispatchEvent(new Event(SETTINGS_CHANGED_EVENT));
  } catch {
    // Penyimpanan penuh/diblokir: pengaturan hanya berlaku selama halaman terbuka.
  }
}

export const isMusicEnabled = () => readSettings().music;
export const isSfxEnabled = () => readSettings().sfx;
export const isInviteNotificationEnabled = () => readSettings().inviteNotifications;
