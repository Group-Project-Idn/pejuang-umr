import { create } from "zustand";

export type UiSheet = "hexDetail" | "invite" | "calendar" | null;

type UiState = {
  activeSheet: UiSheet;
  selectedHex: string | null;
  reduceMotion: boolean;
  openSheet: (sheet: Exclude<UiSheet, null>, hex?: string) => void;
  closeSheet: () => void;
  setReduceMotion: (value: boolean) => void;
};

/** State UI lokal saja (sheet/bottom-sheet, pilihan heksa). Bukan state game. */
export const useUiStore = create<UiState>()((set) => ({
  activeSheet: null,
  selectedHex: null,
  reduceMotion: false,
  openSheet: (sheet, hex) =>
    set({ activeSheet: sheet, selectedHex: hex ?? null }),
  closeSheet: () => set({ activeSheet: null, selectedHex: null }),
  setReduceMotion: (value) => set({ reduceMotion: value }),
}));
