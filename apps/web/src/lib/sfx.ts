import { isMusicEnabled, isSfxEnabled, SETTINGS_CHANGED_EVENT } from "./settings";
import { SFX_IDS, type BgmId, type SfxId } from "./sfx-events";

export type { BgmId, SfxId } from "./sfx-events";

const AUDIO_DIR = "/audio";
const POOL_SIZE = 3;
export const MUSIC_VOLUME = 0.25;

/** Volume per suara (0-1). */
export const SFX_VOLUME: Record<SfxId, number> = {
  click: 0.5,
  step: 0.5,
  "turn-start": 0.7,
  tick: 0.5,
  "popup-open": 0.6,
  flip: 0.6,
  zonk: 0.8,
  safe: 0.7,
  lucky: 0.8,
  month: 0.7,
  gold: 0.8,
  invite: 0.7,
  doom: 0.8,
  eliminated: 0.8,
  finish: 0.8,
};

export const audioSrc = (id: string) => `${AUDIO_DIR}/${id}.mp3`;

let unlocked = false;
let track: BgmId = "bgm-lobby";
// Berkas yang gagal dimuat (belum ada/404): suaranya dilewati diam-diam.
const missing = new Set<string>();
const pools = new Map<SfxId, HTMLAudioElement[]>();
const music = new Map<BgmId, HTMLAudioElement>();

function createAudio(id: string, volume: number): HTMLAudioElement | null {
  if (typeof Audio === "undefined") return null;
  const element = new Audio(audioSrc(id));
  element.preload = "auto";
  element.volume = volume;
  element.addEventListener("error", () => missing.add(id), { once: true });
  return element;
}

function poolFor(id: SfxId): HTMLAudioElement[] {
  let pool = pools.get(id);
  if (!pool) {
    pool = [];
    pools.set(id, pool);
  }
  return pool;
}

/** Memutar efek; dua pemanggilan berdekatan boleh tumpang tindih (sampai POOL_SIZE). */
export function playSfx(id: SfxId): void {
  if (!unlocked || missing.has(id) || !isSfxEnabled()) return;
  try {
    const pool = poolFor(id);
    let element = pool.find((candidate) => candidate.paused || candidate.ended);
    if (!element && pool.length < POOL_SIZE) {
      const created = createAudio(id, SFX_VOLUME[id]);
      if (created) {
        pool.push(created);
        element = created;
      }
    }
    element ??= pool[0];
    if (!element) return;
    element.currentTime = 0;
    void element.play().catch(() => {});
  } catch {
    // Audio tidak boleh mengganggu permainan.
  }
}

/** Sinkronkan musik dengan pengaturan, trek yang diminta, dan status buka-kunci. */
export function syncMusic(): void {
  try {
    const enabled = unlocked && isMusicEnabled();
    for (const id of ["bgm-lobby", "bgm-game"] as const) {
      let element = music.get(id);
      const wanted = enabled && id === track && !missing.has(id);
      if (!element && wanted) {
        element = createAudio(id, MUSIC_VOLUME) ?? undefined;
        if (element) {
          element.loop = true;
          music.set(id, element);
        }
      }
      if (!element) continue;
      if (wanted) void element.play().catch(() => {});
      else element.pause();
    }
  } catch {
    // Diabaikan.
  }
}

export function setMusicTrack(next: BgmId): void {
  track = next;
  syncMusic();
}

function unlock(): void {
  if (unlocked) return;
  unlocked = true;
  for (const id of SFX_IDS) {
    const element = createAudio(id, SFX_VOLUME[id]);
    if (element) poolFor(id).push(element);
  }
  syncMusic();
}

/**
 * Pasang pendengar global: buka audio pada interaksi pertama (kebijakan autoplay),
 * bunyi klik untuk tombol/tautan, dan ikuti perubahan pengaturan. Mengembalikan pembersih.
 */
export function startSfx(): () => void {
  const onUnlock = () => unlock();
  const onClick = (event: MouseEvent) => {
    const target = event.target;
    if (target instanceof Element && target.closest("button, a[href], [role='button']")) playSfx("click");
  };
  const unlockEvents = ["pointerdown", "keydown", "touchstart"] as const;
  for (const name of unlockEvents) window.addEventListener(name, onUnlock, { passive: true });
  window.addEventListener("click", onClick);
  window.addEventListener(SETTINGS_CHANGED_EVENT, syncMusic);
  window.addEventListener("storage", syncMusic);
  return () => {
    for (const name of unlockEvents) window.removeEventListener(name, onUnlock);
    window.removeEventListener("click", onClick);
    window.removeEventListener(SETTINGS_CHANGED_EVENT, syncMusic);
    window.removeEventListener("storage", syncMusic);
  };
}
