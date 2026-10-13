import { describe, expect, it } from "vitest";
import { hexKey } from "@pejuang/shared";
import {
  BALANCE_V1_14,
  DEFAULT_BALANCE,
  resolveBalance,
  scaleRealityEffects,
} from "../economy/balance";
import { processMonthChange } from "../economy/month-change";
import { INITIAL_STATUS } from "../economy/constants";
import { calculateWelfareScore } from "../score/score";
import { SeededRandom } from "./simulation-helpers";
import { runBalanceBatch } from "./balance-simulation";
import { chooseBotHex } from "./simulation-bots";
import { createGame } from "../game/create-game";

describe("simulasi keseimbangan", () => {
  it("deterministik untuk seed tetap", () => {
    const config = { playerCount: 3, games: 8, mode: "mixed" as const, seedBase: 42 };
    expect(runBalanceBatch(config)).toEqual(runBalanceBatch(config));
  });

  it("memberi hasil untuk ketiga jenis bot dan semua jumlah pemain", () => {
    for (const playerCount of [2, 3, 4]) {
      const result = runBalanceBatch({ playerCount, games: 6, mode: "mixed", seedBase: 7 });
      expect(result.overall.players).toBe(playerCount * 6);
      for (const kind of ["smart", "random", "risky"] as const) {
        expect(result.byKind[kind].players).toBeGreaterThan(0);
        expect(result.byKind[kind].avgScore).toBeGreaterThanOrEqual(0);
        expect(result.byKind[kind].avgScore).toBeLessThanOrEqual(100);
      }
    }
  });

  it("parameter yang lebih berat menurunkan skor rata-rata", () => {
    const base = runBalanceBatch({ playerCount: 3, games: 30, mode: "smart", seedBase: 3 });
    const hard = runBalanceBatch({
      playerCount: 3,
      games: 30,
      mode: "smart",
      seedBase: 3,
      balance: { livingCost: 6_200_000 },
    });
    expect(hard.overall.avgScore).toBeLessThan(base.overall.avgScore);
  });
});

describe("parameter keseimbangan", () => {
  it("bawaan sama dengan aturan resmi GDD v1.15", () => {
    expect(resolveBalance()).toEqual(DEFAULT_BALANCE);
    expect(DEFAULT_BALANCE).toEqual({
      livingCost: 5_200_000,
      passiveStress: 1,
      financeDivisor: 500_000,
      zonkMultiplier: 2,
      realityScale: 1,
    });
    const plain = processMonthChange(INITIAL_STATUS, 2);
    expect(processMonthChange(INITIAL_STATUS, 2, {})).toEqual(plain);
    expect(plain.summary.livingCost).toBe(5_200_000);
  });

  it("aturan v1.14 tetap bisa dipakai untuk perbandingan", () => {
    const old = processMonthChange(INITIAL_STATUS, 2, BALANCE_V1_14);
    expect(old.summary.livingCost).toBe(4_600_000);
    expect(old.summary.passiveStress).toBe(0);
    expect(old.status.stress).toBe(INITIAL_STATUS.stress);
  });

  it("Biaya Hidup dan Level Stress pasif mengikuti opsi", () => {
    const result = processMonthChange(INITIAL_STATUS, 2, { livingCost: 5_000_000, passiveStress: 1 });
    expect(result.summary.livingCost).toBe(5_000_000);
    expect(result.status.stress).toBe(INITIAL_STATUS.stress + 1);
    expect(result.status.wealth).toBe(INITIAL_STATUS.wealth + 5_730_000 - 5_000_000);
  });

  it("pembagi Poin Keuangan mengubah Poin Keuangan", () => {
    const status = { ...INITIAL_STATUS, wealth: 10_000_000 };
    expect(calculateWelfareScore(status).points.finance).toBe(70);
    expect(calculateWelfareScore(status, 1_000_000).points.finance).toBe(60);
  });

  it("pengali Zonk hanya untuk Zonk, ukuran Realita untuk semuanya", () => {
    const effects = [
      { stat: "wealth", delta: -750_000 },
      { stat: "stress", delta: 1 },
    ] as const;
    expect(scaleRealityEffects(effects, "zonk", { zonkMultiplier: 1 })).toBe(effects);
    expect(scaleRealityEffects(effects, "safe")).toBe(effects);
    expect(scaleRealityEffects(effects, "safe", { zonkMultiplier: 3 })).toBe(effects);
    expect(scaleRealityEffects(effects, "zonk")).toEqual([
      { stat: "wealth", delta: -1_500_000 },
      { stat: "stress", delta: 2 },
    ]);
    expect(scaleRealityEffects(effects, "zonk", { zonkMultiplier: 2 })).toEqual([
      { stat: "wealth", delta: -1_500_000 },
      { stat: "stress", delta: 2 },
    ]);
    expect(scaleRealityEffects(effects, "safe", { realityScale: 0.1 })).toEqual([
      { stat: "wealth", delta: -50_000 },
      { stat: "stress", delta: 1 },
    ]);
  });
});

describe("bot", () => {
  it("bot cerdas memilih heksa yang ada di opsi", () => {
    const created = createGame(["a", "b"], "bot-test", new SeededRandom(5));
    const keys = Object.keys(created.state.board.tiles);
    const options = keys.slice(0, 3).map((key) => {
      const [q, r] = key.split(",").map(Number);
      return { q: q!, r: r! };
    });
    const chosen = chooseBotHex("smart", { ...created.state }, "a", options, new SeededRandom(1));
    expect(options.map(hexKey)).toContain(hexKey(chosen));
  });
});
