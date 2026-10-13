type Outcome = "zonk" | "safe" | "lucky";
import type { PopupCard } from "./popup-cards";

export const SFX_IDS = [
  "click", "step", "turn-start", "tick", "popup-open", "flip", "zonk", "safe",
  "lucky", "month", "gold", "invite", "doom", "eliminated", "finish",
] as const;
export type SfxId = (typeof SFX_IDS)[number];

export const BGM_IDS = ["bgm-lobby", "bgm-game"] as const;
export type BgmId = (typeof BGM_IDS)[number];

/** Hanya dipanggil untuk heksa yang sedang/selesai dibalik (Realita sudah terbuka). */
export function outcomeSound(outcome: Outcome): SfxId {
  return outcome;
}

/** Satu suara per grid popup; yang paling mendesak menang. */
export function popupOpenSound(kinds: readonly PopupCard["kind"][]): SfxId | null {
  if (kinds.length === 0) return null;
  if (kinds.includes("doom")) return "doom";
  if (kinds.includes("month")) return "month";
  if (kinds.includes("gold")) return "gold";
  if (kinds.includes("inviteResult")) return "invite";
  return "popup-open";
}

/** Tick untuk 5 detik terakhir Timer Giliran, hanya untuk pemain yang sedang giliran. */
export function tickSound(secondsLeft: number, hasDeadline: boolean, isMyTurn: boolean): SfxId | null {
  return isMyTurn && hasDeadline && secondsLeft >= 1 && secondsLeft <= 5 ? "tick" : null;
}

export type RevealSoundState = { activeKey: string | null; flipped: ReadonlySet<string> };

/**
 * Suara Fase Pembalikan dari perubahan posisi animasi. Zonk/Aman/Hoki hanya keluar untuk
 * heksa yang baru selesai dibalik; `outcomeOf` mengembalikan null untuk Petak Emas (tanpa
 * Realita) dan undefined bila heksa tak dikenal. Pemanggil memberi Realita yang sudah di-mask.
 * Dengan reduced motion semua heksa langsung terbuka: bandingkan dengan state kosong agar
 * tiap heksa berbunyi sekali saat hasilnya dibuka.
 */
export function revealSounds(
  prev: RevealSoundState,
  next: RevealSoundState,
  outcomeOf: (key: string) => Outcome | null | undefined,
): SfxId[] {
  const sounds: SfxId[] = [];
  if (next.activeKey && next.activeKey !== prev.activeKey) sounds.push("flip");
  for (const key of next.flipped) {
    if (prev.flipped.has(key)) continue;
    // Tanpa jendela aktif (terlewat di antara dua tick, atau reduced motion): flip tetap berbunyi sebelum hasilnya.
    if (key !== prev.activeKey) sounds.push("flip");
    const outcome = outcomeOf(key);
    if (outcome) sounds.push(outcomeSound(outcome));
    else if (outcome === null) sounds.push("gold");
  }
  return sounds;
}
