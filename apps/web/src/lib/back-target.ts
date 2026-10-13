const MARKER_KEY = "pejuang.nav-marker";

export type BackTarget = "history" | "home";

/**
 * Tombol Kembali memakai riwayat browser hanya jika halaman ini dibuka dari
 * dalam aplikasi (ada penanda navigasi internal) dan ada entri riwayat
 * sebelumnya. Jika dibuka langsung (tab baru, tautan), kembali ke Home.
 * document.referrer tidak dipakai: ia tidak berubah pada navigasi sisi klien.
 */
export function decideBackTarget(input: { cameFromApp: boolean; historyLength: number }): BackTarget {
  return input.cameFromApp && input.historyLength > 1 ? "history" : "home";
}

type MarkerStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function defaultStorage(): MarkerStorage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

/** Dipanggil sebelum membuka halaman yang punya tombol Kembali. */
export function markInternalNavigation(storage: MarkerStorage | null = defaultStorage()): void {
  try {
    storage?.setItem(MARKER_KEY, "1");
  } catch {
    // Penyimpanan tidak tersedia: tombol Kembali jatuh ke Home.
  }
}

/** Membaca lalu menghapus penanda (sekali pakai). */
export function consumeInternalNavigation(storage: MarkerStorage | null = defaultStorage()): boolean {
  try {
    const found = storage?.getItem(MARKER_KEY) === "1";
    storage?.removeItem(MARKER_KEY);
    return found;
  } catch {
    return false;
  }
}
