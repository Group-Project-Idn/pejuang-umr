import { describe, expect, it } from "vitest";
import type { PublicGameState } from "@pejuang/shared";
import {
  buildRevealSchedule,
  deriveRevealOrder,
  getRevealProgress,
  maskUnrevealed,
  REVEAL_STEP_MS,
} from "./reveal";

const order = [
  { playerId: "p1", hex: { q: 0, r: 1 } },
  { playerId: "p2", hex: { q: 1, r: 0 } },
  { playerId: "p3", hex: { q: -1, r: 1 } },
];
const ENDS = 100_000;
const START = ENDS - 3 * REVEAL_STEP_MS;

function reality(outcome: "zonk" | "safe" | "lucky") {
  return { outcome, text: "x", effects: [], seasonal: false };
}

function makeGame(): PublicGameState {
  return {
    turnOrder: ["p1", "p2", "p3"],
    calendar: { step: 5 },
    openedHexes: [
      { hex: order[2].hex, category: "social", byPlayerId: "p3", step: 5, reality: reality("lucky") },
      { hex: order[0].hex, category: "finance", byPlayerId: "p1", step: 5, reality: reality("zonk") },
      { hex: { q: 3, r: 0 }, category: "gold", byPlayerId: "p2", step: 5, reality: null },
      { hex: order[1].hex, category: "health", byPlayerId: "p2", step: 5, reality: reality("safe") },
      { hex: { q: 4, r: 0 }, category: "finance", byPlayerId: "p1", step: 4, reality: reality("safe") },
    ],
  } as unknown as PublicGameState;
}

describe("jadwal animasi Fase Pembalikan", () => {
  it("membagi waktu rata sampai revealEndsAt", () => {
    const schedule = buildRevealSchedule(order, ENDS);
    expect(schedule.steps.map((s) => s.startsAt)).toEqual([
      START,
      START + REVEAL_STEP_MS,
      START + 2 * REVEAL_STEP_MS,
    ]);
    expect(schedule.steps[2].startsAt + schedule.stepMs).toBe(ENDS);
    expect(schedule.steps.map((s) => s.playerId)).toEqual(["p1", "p2", "p3"]);
  });

  it("belum ada yang terbalik di awal, heksa pertama aktif", () => {
    const schedule = buildRevealSchedule(order, ENDS);
    const progress = getRevealProgress(schedule, START);
    expect(progress.flippedKeys.size).toBe(0);
    expect(progress.activeKey).toBe(schedule.steps[0].key);
    expect(progress.done).toBe(false);
  });

  it("reconnect di tengah melanjutkan dari posisi yang benar", () => {
    const schedule = buildRevealSchedule(order, ENDS);
    const progress = getRevealProgress(schedule, START + REVEAL_STEP_MS + 100);
    expect([...progress.flippedKeys]).toEqual([schedule.steps[0].key]);
    expect(progress.activeKey).toBe(schedule.steps[1].key);
    expect(progress.done).toBe(false);
  });

  it("revealEndsAt sudah lewat langsung ke keadaan akhir", () => {
    const schedule = buildRevealSchedule(order, ENDS);
    const progress = getRevealProgress(schedule, ENDS + 1);
    expect(progress.flippedKeys.size).toBe(3);
    expect(progress.activeKey).toBeNull();
    expect(progress.done).toBe(true);
  });

  it("reduced motion langsung menampilkan hasil", () => {
    const schedule = buildRevealSchedule(order, ENDS);
    const progress = getRevealProgress(schedule, START, true);
    expect(progress.done).toBe(true);
    expect(progress.flippedKeys.size).toBe(3);
  });

  it("order dari snapshot: langkah ronde ini, tanpa Petak Emas, urut giliran", () => {
    expect(deriveRevealOrder(makeGame()).map((o) => o.playerId)).toEqual(["p1", "p2", "p3"]);
  });

  it("Realita heksa yang belum terbalik disembunyikan", () => {
    const game = makeGame();
    const schedule = buildRevealSchedule(deriveRevealOrder(game), ENDS);
    const progress = getRevealProgress(schedule, START + REVEAL_STEP_MS + 100);
    const masked = maskUnrevealed(game, schedule, progress);
    const byPlayer = (id: string) => masked.openedHexes.find((o) => o.byPlayerId === id && o.step === 5 && o.category !== "gold")!;
    expect(byPlayer("p1").reality?.outcome).toBe("zonk");
    expect(byPlayer("p2").reality).toBeNull();
    expect(byPlayer("p3").reality).toBeNull();
    expect(masked.openedHexes.find((o) => o.step === 4)?.reality).not.toBeNull();
    expect(maskUnrevealed(game, schedule, getRevealProgress(schedule, ENDS))).toBe(game);
  });
});
