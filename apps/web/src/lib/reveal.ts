import { hexKey } from "@pejuang/shared";
import type { Category, Effect, HexCoord, PublicGameState, RoomState } from "@pejuang/shared";

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

/**
 * Durasi animasi balik satu heksa (ms). Heksa berstatus aktif dari `startsAt`
 * sampai `startsAt + min(REVEAL_FLIP_MS, stepMs * 0.4)`, lalu masuk `flippedKeys`
 * dan tetap terbuka sampai fase berakhir. Batas 0.4 × stepMs menjaga jendela
 * aktif tidak pernah tumpang tindih dengan heksa berikutnya.
 */
export const REVEAL_FLIP_MS = 700;

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
 * Posisi animasi pada waktu server `serverNow`. Heksa berstatus aktif selama
 * jendela animasi balik, lalu dianggap terbuka (flipped) dan tetap terbuka
 * sampai fase berakhir. Karena itu heksa terakhir masuk `flippedKeys` jauh
 * sebelum `endsAt`, jadi sempat tampil sebelum popup Fase Pembalikan menutup.
 * Reconnect di tengah langsung ke posisi yang benar dan tidak mengulang yang
 * sudah lewat. Tanpa animasi (reduced motion), semua langsung terbuka.
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
  // Jendela aktif dibatasi 0.4 × stepMs agar tidak tumpang tindih dengan
  // heksa berikutnya walaupun stepMs kecil (mis. konfigurasi server rendah).
  const flipMs = Math.min(REVEAL_FLIP_MS, schedule.stepMs * 0.4);
  const flipped = new Set<string>();
  let activeKey: string | null = null;
  for (const step of schedule.steps) {
    if (serverNow >= step.startsAt + flipMs) flipped.add(step.key);
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

export type RevealRowStatus = "waiting" | "active" | "revealed";

export type RevealRowReality =
  | { state: "none" }
  | { state: "revealed"; outcome: keyof typeof OUTCOME_LABEL; text: string; effects: Effect[] };

export type RevealRow = {
  playerId: string;
  name: string;
  avatarId: string;
  key: string;
  title: string;
  category: Category;
  status: RevealRowStatus;
  /** Null selama belum dibalik; Petak Emas (tanpa Realita) berstatus "none" setelah dibalik. */
  reality: RevealRowReality | null;
};

/**
 * Baris popup Fase Pembalikan per pemain, urut schedule.steps. Realita hanya dibaca dari
 * `shownGame` (hasil maskUnrevealed) dan hanya untuk heksa di progress.flippedKeys.
 */
export function buildRevealRows(
  shownGame: PublicGameState,
  schedule: RevealSchedule,
  progress: RevealProgress,
  room: Pick<RoomState, "players">,
): RevealRow[] {
  return schedule.steps.flatMap((step) => {
    const opened = shownGame.openedHexes.find(
      (entry) =>
        entry.step === shownGame.calendar.step &&
        entry.byPlayerId === step.playerId &&
        hexKey(entry.hex) === step.key,
    );
    if (!opened) return [];
    const player = room.players.find((entry) => entry.playerId === step.playerId);
    const flipped = progress.done || progress.flippedKeys.has(step.key);
    const status: RevealRowStatus = flipped
      ? "revealed"
      : progress.activeKey === step.key ? "active" : "waiting";
    const reality: RevealRowReality | null = !flipped
      ? null
      : opened.reality
        ? {
            state: "revealed",
            outcome: opened.reality.outcome,
            text: opened.reality.text,
            effects: opened.reality.effects,
          }
        : { state: "none" };
    return [{
      playerId: step.playerId,
      name: player?.name ?? "pemain",
      avatarId: player?.avatarId ?? "",
      key: step.key,
      title: opened.title,
      category: opened.category,
      status,
      reality,
    }];
  });
}
