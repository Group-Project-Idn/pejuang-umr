import { create } from "zustand";

export type UiPreferences = {
  /** Ikuti opsi kurangi gerakan (guide: efek dekoratif bisa dimatikan). */
  reduceMotion: boolean;
  /** Tingkatkan kontras teks (dukungan buta warna parsial). */
  contrastBoost: boolean;
  /** Getar (haptics) bisa dimatikan. */
  haptics: boolean;
  setPreferences: (patch: Partial<UiPreferencesState>) => void;
  resetPreferences: () => void;
};

type UiPreferencesState = Pick<UiPreferences, "reduceMotion" | "contrastBoost" | "haptics">;

const DEFAULTS: UiPreferencesState = {
  reduceMotion: false,
  contrastBoost: false,
  haptics: true,
};

/** Store UI global (read-only ke logic game server-authoritative). */
export const useUiStore = create<UiPreferences>()((set) => ({
  ...DEFAULTS,
  setPreferences: (patch) => set(patch),
  resetPreferences: () => set({ ...DEFAULTS }),
}));
