import { hexKey } from "@pejuang/shared";
import type { HexCoord } from "@pejuang/shared";

/**
 * Animasi gelombang Fase Pembalikan. Murni kosmetik: tidak menentukan hasil
 * maupun durasi server. Total gelombang harus muat dalam jeda server (revealStepMs).
 */

/** Gelombang merambat sekitar 1 detik dari heksa ronde itu sampai heksa terjauh selesai. */
export const WAVE_MS = 1000;
/** Flip utama heksa ronde itu (02_DESIGN Motion: 400-800 ms). */
export const ORIGIN_FLIP_MS = 600;
/** Putaran penuh heksa lama yang kembali ke sisi publik. */
export const RIPPLE_SPIN_MS = 500;
/** Setelah batas ini heksa ronde dianggap siap walau Realita belum tiba, supaya tidak menggantung. */
export const ORIGIN_HOLD_MAX_MS = 1500;
/** Tinggi angkat maksimal heksa saat berputar. */
export const WAVE_LIFT = 0.45;

export const OUTCOME_TILE_COLOR = {
  zonk: "#a64438",
  safe: "#5f6b73",
  lucky: "#3f8f5a",
} as const;

export type WaveEntry = {
  key: string;
  kind: "origin" | "ripple";
  /** Jeda sebelum heksa ini mulai bergerak sejak gelombang dimulai. */
  delayMs: number;
  durationMs: number;
};

export type WaveSchedule = {
  entries: WaveEntry[];
  /** Akhir entri paling lambat, dihitung tanpa menunggu Realita. */
  totalMs: number;
};

/** Jarak antar heksa dalam koordinat aksial (jumlah langkah). */
export function hexDistance(a: HexCoord, b: HexCoord): number {
  const dq = a.q - b.q;
  const dr = a.r - b.r;
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
}

/**
 * Jadwal gelombang: heksa ronde (origin) mulai di 0 ms, heksa lain tertunda
 * sebanding jarak ke origin. Heksa terjauh selesai tepat di `waveMs`.
 * `hexes` boleh memuat origin; origin selalu muncul sekali sebagai "origin".
 */
export function buildWaveSchedule(
  origin: HexCoord,
  hexes: readonly HexCoord[],
  options: { waveMs?: number; originFlipMs?: number; spinMs?: number } = {},
): WaveSchedule {
  const waveMs = options.waveMs ?? WAVE_MS;
  const originFlipMs = options.originFlipMs ?? ORIGIN_FLIP_MS;
  const spinMs = options.spinMs ?? RIPPLE_SPIN_MS;
  const originKey = hexKey(origin);
  const seen = new Set<string>([originKey]);
  const others: { key: string; distance: number }[] = [];
  for (const hex of hexes) {
    const key = hexKey(hex);
    if (seen.has(key)) continue;
    seen.add(key);
    others.push({ key, distance: hexDistance(origin, hex) });
  }
  const maxDistance = others.reduce((max, item) => Math.max(max, item.distance), 0);
  const travelMs = Math.max(0, waveMs - spinMs);
  const entries: WaveEntry[] = [
    { key: originKey, kind: "origin", delayMs: 0, durationMs: originFlipMs },
    ...others
      .map((item): WaveEntry => ({
        key: item.key,
        kind: "ripple",
        delayMs: maxDistance === 0 ? 0 : Math.round((item.distance / maxDistance) * travelMs),
        durationMs: spinMs,
      }))
      .sort((a, b) => a.delayMs - b.delayMs),
  ];
  const totalMs = entries.reduce((max, entry) => Math.max(max, entry.delayMs + entry.durationMs), 0);
  return { entries, totalMs };
}

export function easeInOutCubic(t: number): number {
  const p = Math.min(1, Math.max(0, t));
  return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
}

export type TileMotion = {
  /** Sudut putar (radian) yang dipakai untuk menggambar; sisi yang tampak mengikuti showReality. */
  angle: number;
  lift: number;
  /** Heksa ronde sudah melewati tepi: tampilkan sisi Realita. */
  showReality: boolean;
  done: boolean;
};

/** Putaran penuh 360 derajat heksa lama; kembali ke sisi publik di akhir. */
export function rippleMotion(elapsedMs: number, entry: WaveEntry): TileMotion {
  const t = (elapsedMs - entry.delayMs) / entry.durationMs;
  if (t <= 0) return { angle: 0, lift: 0, showReality: false, done: false };
  if (t >= 1) return { angle: 0, lift: 0, showReality: false, done: true };
  return {
    angle: 2 * Math.PI * easeInOutCubic(t),
    lift: Math.sin(Math.PI * t) * WAVE_LIFT,
    showReality: false,
    done: false,
  };
}

/**
 * Flip 180 derajat heksa ronde. Selama Realita belum tiba (tile:resolved belum
 * diterima) heksa berhenti di tepi (90 derajat) dan baru menyelesaikan flip
 * setelah `ready`. Sudut gambar di sisi Realita dikurangi 180 derajat karena
 * heksa simetris, jadi sisi baru tampak tegak.
 */
export function originMotion(elapsedMs: number, entry: WaveEntry, ready: boolean): TileMotion {
  const t = Math.min(1, Math.max(0, elapsedMs / entry.durationMs));
  const rawAngle = Math.PI * easeInOutCubic(t);
  const angle = ready ? rawAngle : Math.min(rawAngle, Math.PI / 2);
  const showReality = ready && angle >= Math.PI / 2;
  const lift = Math.sin(Math.PI * (angle / Math.PI)) * WAVE_LIFT;
  return {
    angle: showReality ? angle - Math.PI : angle,
    lift,
    showReality,
    done: ready && t >= 1,
  };
}

/** Gelombang tetap dalam jeda server? Dipakai tes dan laporan angka yang disarankan. */
export function waveFitsStep(schedule: WaveSchedule, stepMs: number): boolean {
  return schedule.totalMs <= stepMs;
}
