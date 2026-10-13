import { describe, expect, it } from "vitest";
import type { PublicGameState } from "@pejuang/shared";
import {
  buildRevealRows,
  buildRevealSchedule,
  getRevealOrder,
  getRevealProgress,
  maskUnrevealed,
} from "./reveal";

const order = [
  { playerId: "p1", hex: { q: 0, r: 1 } },
  { playerId: "p2", hex: { q: 1, r: 0 } },
  { playerId: "p3", hex: { q: -1, r: 1 } },
];
const ENDS = 100_000;
// Durasi dari server (bukan konstanta web).
const REVEAL_STEP_MS = 1_800;
const START = ENDS - 3 * REVEAL_STEP_MS;

function reality(outcome: "zonk" | "safe" | "lucky") {
  return { outcome, text: "x", effects: [], seasonal: false };
}

function makeGame(): PublicGameState {
  return {
    turnOrder: ["p1", "p2", "p3"],
    revealOrder: ["p1", "p2", "p3"],
    calendar: { step: 5 },
    openedHexes: [
      { hex: order[2].hex, category: "social", byPlayerId: "p3", step: 5, reality: reality("lucky") },
      { hex: order[0].hex, category: "finance", byPlayerId: "p1", step: 5, reality: reality("zonk") },
      { hex: { q: 3, r: 0 }, category: "gold", byPlayerId: "p4", step: 5, reality: null },
      { hex: order[1].hex, category: "health", byPlayerId: "p2", step: 5, reality: reality("safe") },
      { hex: { q: 4, r: 0 }, category: "finance", byPlayerId: "p1", step: 4, reality: reality("safe") },
    ],
  } as unknown as PublicGameState;
}

describe("jadwal animasi Fase Pembalikan", () => {
  it("membagi waktu rata sampai revealEndsAt", () => {
    const schedule = buildRevealSchedule(order, ENDS, REVEAL_STEP_MS);
    expect(schedule.steps.map((s) => s.startsAt)).toEqual([
      START,
      START + REVEAL_STEP_MS,
      START + 2 * REVEAL_STEP_MS,
    ]);
    expect(schedule.steps[2].startsAt + schedule.stepMs).toBe(ENDS);
    expect(schedule.steps.map((s) => s.playerId)).toEqual(["p1", "p2", "p3"]);
  });

  it("belum ada yang terbalik di awal, heksa pertama aktif", () => {
    const schedule = buildRevealSchedule(order, ENDS, REVEAL_STEP_MS);
    const progress = getRevealProgress(schedule, START);
    expect(progress.flippedKeys.size).toBe(0);
    expect(progress.activeKey).toBe(schedule.steps[0].key);
    expect(progress.done).toBe(false);
  });

  it("reconnect di tengah melanjutkan dari posisi yang benar", () => {
    const schedule = buildRevealSchedule(order, ENDS, REVEAL_STEP_MS);
    const progress = getRevealProgress(schedule, START + REVEAL_STEP_MS + 100);
    expect([...progress.flippedKeys]).toEqual([schedule.steps[0].key]);
    expect(progress.activeKey).toBe(schedule.steps[1].key);
    expect(progress.done).toBe(false);
  });

  it("revealEndsAt sudah lewat langsung ke keadaan akhir", () => {
    const schedule = buildRevealSchedule(order, ENDS, REVEAL_STEP_MS);
    const progress = getRevealProgress(schedule, ENDS + 1);
    expect(progress.flippedKeys.size).toBe(3);
    expect(progress.activeKey).toBeNull();
    expect(progress.done).toBe(true);
  });

  it("reduced motion langsung menampilkan hasil", () => {
    const schedule = buildRevealSchedule(order, ENDS, REVEAL_STEP_MS);
    const progress = getRevealProgress(schedule, START, true);
    expect(progress.done).toBe(true);
    expect(progress.flippedKeys.size).toBe(3);
  });

  it("order dari game.revealOrder: urut giliran dari server, heksa langkah ronde ini", () => {
    const game = { ...makeGame(), revealOrder: ["p2", "p1", "p3"] } as PublicGameState;
    expect(getRevealOrder(game).map((o) => o.playerId)).toEqual(["p2", "p1", "p3"]);
    expect(getRevealOrder(game)[0]!.hex).toEqual(order[1].hex);
    expect(getRevealOrder({ ...game, revealOrder: [] } as PublicGameState)).toEqual([]);
  });

  it("Realita heksa yang belum terbalik disembunyikan", () => {
    const game = makeGame();
    const schedule = buildRevealSchedule(getRevealOrder(game), ENDS, REVEAL_STEP_MS);
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

describe("baris popup Fase Pembalikan", () => {
  const room = {
    players: [
      { playerId: "p1", name: "Ani", avatarId: "raka" },
      { playerId: "p2", name: "Budi", avatarId: "sinta" },
      { playerId: "p3", name: "Cici", avatarId: "icha" },
    ],
  } as unknown as Parameters<typeof buildRevealRows>[3];

  function rowsAt(offset: number) {
    const game = makeGame();
    const schedule = buildRevealSchedule(getRevealOrder(game), ENDS, REVEAL_STEP_MS);
    const progress = getRevealProgress(schedule, START + offset);
    return buildRevealRows(maskUnrevealed(game, schedule, progress), schedule, progress, room);
  }

  it("urut schedule dengan status waiting/active/revealed", () => {
    const rows = rowsAt(REVEAL_STEP_MS + 100);
    expect(rows.map((r) => [r.name, r.status])).toEqual([
      ["Ani", "revealed"],
      ["Budi", "active"],
      ["Cici", "waiting"],
    ]);
    expect(rows[0]!.reality).toMatchObject({ state: "revealed", outcome: "zonk" });
  });

  it("baris yang belum dibalik tidak memuat teks Realita", () => {
    const rows = rowsAt(REVEAL_STEP_MS + 100);
    expect(rows[1]!.reality).toBeNull();
    expect(rows[2]!.reality).toBeNull();
    expect(JSON.stringify(rows.slice(1))).not.toContain('"text":"x"');
  });

  it("memakai game yang sudah di-mask, bukan game mentah", () => {
    const game = makeGame();
    const schedule = buildRevealSchedule(getRevealOrder(game), ENDS, REVEAL_STEP_MS);
    const progress = getRevealProgress(schedule, START);
    const rows = buildRevealRows(maskUnrevealed(game, schedule, progress), schedule, progress, room);
    expect(rows.every((r) => r.reality === null)).toBe(true);
    expect(rows[0]!.status).toBe("active");
  });

  it("Petak Emas tanpa Realita ditandai none setelah dibalik", () => {
    const game = makeGame();
    const goldGame = {
      ...game,
      revealOrder: ["p4"],
    } as PublicGameState;
    const schedule = buildRevealSchedule(getRevealOrder(goldGame), ENDS, REVEAL_STEP_MS);
    const progress = getRevealProgress(schedule, ENDS + 1);
    const rows = buildRevealRows(goldGame, schedule, progress, room);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.name).toBe("pemain");
    expect(rows[0]!.reality).toEqual({ state: "none" });
  });
});
