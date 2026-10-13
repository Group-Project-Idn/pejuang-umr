import type { DomainEvent } from "../game/domain-events";
import type { BalanceParams } from "../economy/balance";
import { rankPlayers } from "../score/ranking";
import { rankingEntries } from "./turn";
import { BOT_KINDS, type BotKind } from "./simulation-bots";
import { playRandomGame } from "./simulation-helpers";

/** Batas Level Stress yang dihitung "tinggi" di laporan (indikator merah di 02_DESIGN). */
const HIGH_STRESS = 8;

export interface BotStats {
  players: number;
  scoreSum: number;
  highStress: number;
  doomPlayers: number;
  doomCount: number;
  bankrupt: number;
  burnout: number;
  wealthSum: number;
  debtSum: number;
}

export interface BotSummary {
  players: number;
  avgScore: number;
  highStressPct: number;
  doomPct: number;
  doomPerPlayer: number;
  bankruptPct: number;
  burnoutPct: number;
  eliminatedPct: number;
  avgWealth: number;
  avgDebt: number;
}

export type SeatMode = BotKind | "mixed";

export interface BatchConfig {
  playerCount: number;
  games: number;
  /** Jenis bot di semua kursi, atau "mixed" yang memutar ketiga jenis antar kursi dan game. */
  mode: SeatMode;
  balance?: Partial<BalanceParams>;
  seedBase?: number;
}

export interface BatchResult {
  config: BatchConfig;
  byKind: Record<BotKind, BotSummary>;
  overall: BotSummary;
}

function emptyStats(): BotStats {
  return {
    players: 0,
    scoreSum: 0,
    highStress: 0,
    doomPlayers: 0,
    doomCount: 0,
    bankrupt: 0,
    burnout: 0,
    wealthSum: 0,
    debtSum: 0,
  };
}

function merge(into: BotStats, from: BotStats): void {
  for (const key of Object.keys(into) as Array<keyof BotStats>) into[key] += from[key];
}

export function summarize(stats: BotStats): BotSummary {
  const n = stats.players || 1;
  const pct = (count: number) => (count / n) * 100;
  return {
    players: stats.players,
    avgScore: stats.scoreSum / n,
    highStressPct: pct(stats.highStress),
    doomPct: pct(stats.doomPlayers),
    doomPerPlayer: stats.doomCount / n,
    bankruptPct: pct(stats.bankrupt),
    burnoutPct: pct(stats.burnout),
    eliminatedPct: pct(stats.bankrupt + stats.burnout),
    avgWealth: stats.wealthSum / n,
    avgDebt: stats.debtSum / n,
  };
}

function seatKinds(mode: SeatMode, playerCount: number, gameIndex: number): BotKind[] {
  return Array.from({ length: playerCount }, (_, seat) =>
    mode === "mixed" ? BOT_KINDS[(seat + gameIndex) % BOT_KINDS.length]! : mode,
  );
}

/**
 * Menjalankan `games` game penuh dengan bot dan merangkum hasil per jenis bot.
 * Deterministik untuk seedBase tetap. Bot tidak pernah kehabisan waktu atau melewatkan
 * Event Tanggal (timeout 0%) supaya yang diukur adalah kebijakan bot, bukan kelalaian.
 */
export function runBalanceBatch(config: BatchConfig): BatchResult {
  const seedBase = config.seedBase ?? 1;
  const stats: Record<BotKind, BotStats> = {
    smart: emptyStats(),
    random: emptyStats(),
    risky: emptyStats(),
  };

  for (let game = 0; game < config.games; game += 1) {
    const kinds = seatKinds(config.mode, config.playerCount, game);
    const playerIds = kinds.map((_, index) => `p${index + 1}`);
    const bots = Object.fromEntries(playerIds.map((id, index) => [id, kinds[index]!]));
    const doomBy: Record<string, number> = {};
    const result = playRandomGame(
      config.playerCount,
      seedBase + game,
      (_state, produced: readonly DomainEvent[]) => {
        for (const event of produced) {
          if (event.type === "doom:triggered" && event.target.kind === "player") {
            doomBy[event.target.playerId] = (doomBy[event.target.playerId] ?? 0) + 1;
          }
        }
      },
      { bots, balance: config.balance, timeoutPct: 0, skipAnswerPct: 0 },
    );

    const ranked = rankPlayers(
      rankingEntries(result.state.players, result.state.baseTurnOrder),
      config.balance?.financeDivisor,
    );
    for (const entry of ranked) {
      const player = result.state.players[entry.playerId]!;
      const target = stats[bots[entry.playerId]!];
      target.players += 1;
      target.scoreSum += entry.score;
      if (player.status.stress >= HIGH_STRESS) target.highStress += 1;
      const doom = doomBy[entry.playerId] ?? 0;
      if (doom > 0) target.doomPlayers += 1;
      target.doomCount += doom;
      if (player.eliminatedReason === "bankrupt") target.bankrupt += 1;
      if (player.eliminatedReason === "burnout") target.burnout += 1;
      target.wealthSum += player.status.wealth;
      target.debtSum += player.status.debt;
    }
  }

  const total = emptyStats();
  for (const kind of BOT_KINDS) merge(total, stats[kind]);
  return {
    config,
    byKind: {
      smart: summarize(stats.smart),
      random: summarize(stats.random),
      risky: summarize(stats.risky),
    },
    overall: summarize(total),
  };
}

/** Target usulan 05_PROJECT_STATE. */
export const BALANCE_TARGET = {
  score: { min: 55, max: 70 },
  eliminatedPct: { min: 10, max: 20 },
  doomPct: { min: 25, max: 40 },
} as const;

function miss(value: number, range: { min: number; max: number }): number {
  if (value < range.min) return range.min - value;
  if (value > range.max) return value - range.max;
  return 0;
}

/** Jarak ke target (0 = semua dalam rentang); persentase dan skor dibobot sama. */
export function distanceToTarget(summary: BotSummary): number {
  return (
    miss(summary.avgScore, BALANCE_TARGET.score) +
    miss(summary.eliminatedPct, BALANCE_TARGET.eliminatedPct) +
    miss(summary.doomPct, BALANCE_TARGET.doomPct)
  );
}

function offCenter(value: number, range: { min: number; max: number }): number {
  const half = (range.max - range.min) / 2;
  return Math.abs(value - (range.min + half)) / half;
}

/**
 * Pemecah seri antar kombinasi yang sama-sama masuk target: makin dekat ke tengah ketiga
 * rentang makin kecil (0 = tepat di tengah, 1 = di tepi), jadi lebih tahan terhadap selisih bot dan pemain nyata.
 */
export function centerOffset(summary: BotSummary): number {
  return (
    offCenter(summary.avgScore, BALANCE_TARGET.score) +
    offCenter(summary.eliminatedPct, BALANCE_TARGET.eliminatedPct) +
    offCenter(summary.doomPct, BALANCE_TARGET.doomPct)
  );
}
