import { hexKey } from "@pejuang/shared";
import type { HexCoord, PublicGameState } from "@pejuang/shared";

/** Durasi per pemain di Fase Pembalikan (API_CONTRACT 11a): revealEndsAt = kirim + ini × order.length. */
export const REVEAL_STEP_MS = 2_500;

export type RevealStep = {
  playerId: string;
  hex: HexCoord;
  key: string;
  /** Waktu server (epoch ms) heksa ini mulai dibalik. */
  startsAt: number;
};

export type RevealSchedule = {
  steps: RevealStep[];
  endsAt: number;
  stepMs: number;
};

export type RevealOrderItem = { playerId: string; hex: HexCoord };

export const OUTCOME_LABEL = {
  zonk: "Zonk",
  safe: "Aman",
  lucky: "Hoki",
} as const;

/** Waktu dibagi rata: heksa ke-i mulai di endsAt - (n - i) × stepMs. */
export function buildRevealSchedule(
  order: readonly RevealOrderItem[],
  revealEndsAt: number,
  stepMs: number = REVEAL_STEP_MS,
): RevealSchedule {
  const start = revealEndsAt - order.length * stepMs;
  return {
    endsAt: revealEndsAt,
    stepMs,
    steps: order.map((item, index) => ({
      playerId: item.playerId,
      hex: item.hex,
      key: hexKey(item.hex),
      startsAt: start + index * stepMs,
    })),
  };
}

/**
 * Urutan Fase Pembalikan dari snapshot: heksa yang dibuka di langkah ronde ini
 * (Petak Emas tidak dibalik), diurutkan menurut urutan giliran.
 */
export function deriveRevealOrder(game: PublicGameState): RevealOrderItem[] {
  const rank = (playerId: string) => {
    const index = game.turnOrder.indexOf(playerId);
    return index === -1 ? game.turnOrder.length : index;
  };
  return game.openedHexes
    .filter((opened) => opened.step === game.calendar.step && opened.category !== "gold")
    .map((opened) => ({ playerId: opened.byPlayerId, hex: opened.hex }))
    .sort((a, b) => rank(a.playerId) - rank(b.playerId));
}

export type RevealProgress = {
  /** Heksa yang sudah selesai dibalik (Realita terbuka). */
  flippedKeys: ReadonlySet<string>;
  /** Heksa yang sedang dibalik, atau null. */
  activeKey: string | null;
  /** Fase Pembalikan sudah lewat; tampilkan keadaan akhir. */
  done: boolean;
};

/**
 * Posisi animasi pada waktu server `serverNow`. Heksa dihitung terbalik begitu
 * jendelanya mulai, jadi reconnect di tengah langsung ke posisi yang benar dan
 * tidak mengulang yang sudah lewat. Tanpa animasi (reduced motion), semua langsung terbuka.
 */
export function getRevealProgress(
  schedule: RevealSchedule,
  serverNow: number,
  reducedMotion = false,
): RevealProgress {
  if (reducedMotion || serverNow >= schedule.endsAt) {
    return {
      flippedKeys: new Set(schedule.steps.map((step) => step.key)),
      activeKey: null,
      done: true,
    };
  }
  const flipped = new Set<string>();
  let activeKey: string | null = null;
  for (const step of schedule.steps) {
    if (serverNow >= step.startsAt + schedule.stepMs) flipped.add(step.key);
    else if (serverNow >= step.startsAt) activeKey = step.key;
  }
  return { flippedKeys: flipped, activeKey, done: false };
}

/** Sembunyikan Realita heksa yang belum selesai dibalik; selain itu game tidak berubah. */
export function maskUnrevealed(
  game: PublicGameState,
  schedule: RevealSchedule,
  progress: RevealProgress,
): PublicGameState {
  if (progress.done) return game;
  const pending = new Set(
    schedule.steps
      .filter((step) => !progress.flippedKeys.has(step.key))
      .map((step) => `${step.key}|${step.playerId}`),
  );
  if (pending.size === 0) return game;
  return {
    ...game,
    openedHexes: game.openedHexes.map((opened) =>
      opened.step === game.calendar.step &&
      pending.has(`${hexKey(opened.hex)}|${opened.byPlayerId}`)
        ? { ...opened, reality: null }
        : opened,
    ),
  };
}
