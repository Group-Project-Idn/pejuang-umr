import { hexKey } from "@pejuang/shared";
import type { HexCoord, PublicGameState } from "@pejuang/shared";

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

/** Waktu dibagi rata: heksa ke-i mulai di endsAt - (n - i) × stepMs (stepMs dari server). */
export function buildRevealSchedule(
  order: readonly RevealOrderItem[],
  revealEndsAt: number,
  stepMs: number,
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
 * Urutan Fase Pembalikan dari server (game.revealOrder, urutan giliran ronde ini),
 * dipasangkan dengan heksa yang dibuka tiap pemain di langkah ini.
 */
export function getRevealOrder(game: PublicGameState): RevealOrderItem[] {
  return game.revealOrder.flatMap((playerId) => {
    const opened = game.openedHexes.find(
      (entry) => entry.step === game.calendar.step && entry.byPlayerId === playerId,
    );
    return opened ? [{ playerId, hex: opened.hex }] : [];
  });
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
