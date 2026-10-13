import { describe, expect, it } from "vitest";
import {
  buildWaveSchedule,
  hexDistance,
  ORIGIN_FLIP_MS,
  originMotion,
  rippleMotion,
  WAVE_MS,
  waveFitsStep,
} from "./board-wave";

const origin = { q: 0, r: 0 };

describe("hexDistance", () => {
  it("menghitung langkah aksial", () => {
    expect(hexDistance(origin, origin)).toBe(0);
    expect(hexDistance(origin, { q: 1, r: 0 })).toBe(1);
    expect(hexDistance(origin, { q: 2, r: -1 })).toBe(2);
    expect(hexDistance({ q: -2, r: 1 }, { q: 2, r: -1 })).toBe(4);
  });
});

describe("buildWaveSchedule", () => {
  const hexes = [origin, { q: 1, r: 0 }, { q: 2, r: -1 }, { q: 4, r: -2 }];

  it("origin mulai di 0 dan hanya muncul sekali", () => {
    const { entries } = buildWaveSchedule(origin, hexes);
    const originEntries = entries.filter((entry) => entry.kind === "origin");
    expect(originEntries).toHaveLength(1);
    expect(originEntries[0]).toMatchObject({ key: "0,0", delayMs: 0, durationMs: ORIGIN_FLIP_MS });
    expect(entries).toHaveLength(4);
  });

  it("jeda naik sebanding jarak dan heksa terjauh selesai di WAVE_MS", () => {
    const { entries, totalMs } = buildWaveSchedule(origin, hexes);
    const ripples = entries.filter((entry) => entry.kind === "ripple");
    expect(ripples.map((entry) => entry.delayMs)).toEqual([...ripples.map((entry) => entry.delayMs)].sort((a, b) => a - b));
    expect(ripples[ripples.length - 1].delayMs + ripples[ripples.length - 1].durationMs).toBe(WAVE_MS);
    expect(totalMs).toBe(WAVE_MS);
  });

  it("tanpa heksa lain hanya origin", () => {
    const schedule = buildWaveSchedule(origin, [origin]);
    expect(schedule.entries).toHaveLength(1);
    expect(schedule.totalMs).toBe(ORIGIN_FLIP_MS);
  });

  it("muat dalam jeda server bawaan 2.500 ms", () => {
    expect(waveFitsStep(buildWaveSchedule(origin, hexes), 2_500)).toBe(true);
    expect(waveFitsStep(buildWaveSchedule(origin, hexes), 800)).toBe(false);
  });
});

describe("rippleMotion", () => {
  const entry = { key: "1,0", kind: "ripple" as const, delayMs: 200, durationMs: 500 };
  it("diam sebelum giliran dan kembali ke sudut awal saat selesai", () => {
    expect(rippleMotion(100, entry)).toMatchObject({ angle: 0, done: false });
    expect(rippleMotion(700, entry)).toMatchObject({ angle: 0, lift: 0, done: true });
  });
  it("berputar penuh: setengah jalan sudutnya setengah putaran", () => {
    const mid = rippleMotion(450, entry);
    expect(mid.angle).toBeCloseTo(Math.PI, 5);
    expect(mid.lift).toBeGreaterThan(0);
  });
});

describe("originMotion", () => {
  const entry = { key: "0,0", kind: "origin" as const, delayMs: 0, durationMs: 600 };
  it("berhenti di tepi selama Realita belum tiba", () => {
    const held = originMotion(600, entry, false);
    expect(held.angle).toBeCloseTo(Math.PI / 2, 5);
    expect(held.showReality).toBe(false);
    expect(held.done).toBe(false);
  });
  it("selesai di sisi Realita setelah ready", () => {
    const end = originMotion(600, entry, true);
    expect(end.showReality).toBe(true);
    expect(end.done).toBe(true);
    expect(end.angle).toBeCloseTo(0, 5);
  });
  it("sisi Realita tidak tampil sebelum melewati tepi", () => {
    expect(originMotion(100, entry, true).showReality).toBe(false);
  });
});
