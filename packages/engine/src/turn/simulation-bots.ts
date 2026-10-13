import type { Effect, HexCoord, Risk } from "@pejuang/shared";
import { hexKey } from "@pejuang/shared";
import { getCalendarEventAtStep } from "../calendar/calendar";
import { applyEffects } from "../economy/apply-effects";
import { resolveBalance } from "../economy/balance";
import type { CalendarChoiceId, GameState } from "../game/game-state";
import type { RandomSource } from "../random";
import { buildTileOption } from "../reality/tile-option";
import { calculateWelfareScore } from "../score/score";

/** Jenis bot simulasi keseimbangan. */
export type BotKind = "smart" | "random" | "risky";

export const BOT_KINDS: readonly BotKind[] = ["smart", "random", "risky"];

/** Peluang Zonk perkiraan per level risiko (tengah rentang API_CONTRACT 3.2). */
const RISK_PCT: Record<Risk, number> = { low: 8, medium: 25, high: 50 };

/** Kerugian skor perkiraan bila Zonk terjadi; bot cerdas mengalikannya dengan peluang. */
const EXPECTED_ZONK_SCORE_LOSS = 8;

/** Bot pengambil risiko memberi bonus ke Rencana yang menambah Hutang. */
const RISKY_DEBT_BONUS = 6;
const RISKY_ZONK_BONUS_PER_PCT = 0.08;

const BOT_PAYMENT_ROUNDING = 1_000;

function projectedScore(state: GameState, playerId: string, effects: readonly Effect[]): number {
  const status = applyEffects(state.players[playerId]!.status, effects).status;
  return calculateWelfareScore(status, state.balance?.financeDivisor).score;
}

function addsDebt(plan: readonly Effect[]): boolean {
  return plan.some((effect) => effect.stat === "debt" && effect.delta > 0);
}

/**
 * Memilih heksa menurut jenis bot. "random" mengundi; "smart" memilih Skor Sementara hasil
 * Rencana terbaik dikurangi perkiraan kerugian Zonk (risiko terkecil); "risky" suka Rencana
 * yang menambah Hutang (Pinjol/Paylater) dan Zonk dasar tinggi.
 */
export function chooseBotHex(
  kind: BotKind,
  state: GameState,
  playerId: string,
  options: readonly HexCoord[],
  random: RandomSource,
): HexCoord {
  if (kind === "random") return random.pick(options);
  const context = {
    season: state.public.calendar.season,
    isRankOneBurden: state.public.rankOneBurden.includes(playerId),
    health: state.players[playerId]!.status.health,
  };
  let best = options[0]!;
  let bestValue = Number.NEGATIVE_INFINITY;
  for (const hex of options) {
    const option = buildTileOption(hex, state.board.tiles[hexKey(hex)]!, context);
    const zonkPct = option.risk ? RISK_PCT[option.risk] : 0;
    const value = projectedScore(state, playerId, option.plan);
    const score =
      kind === "smart"
        ? value - (zonkPct / 100) * EXPECTED_ZONK_SCORE_LOSS
        : value +
          (addsDebt(option.plan) ? RISKY_DEBT_BONUS : 0) +
          zonkPct * RISKY_ZONK_BONUS_PER_PCT +
          random.integer(0, 100) / 100; // pemecah seri
    if (score > bestValue) {
      bestValue = score;
      best = hex;
    }
  }
  return best;
}

/** Nominal Bayar Hutang bot: cerdas melunasi sebisanya, pengambil risiko tidak membayar. */
export function botPaymentAmount(kind: BotKind, max: number): number | null {
  if (kind === "smart") return Math.floor(max / BOT_PAYMENT_ROUNDING) * BOT_PAYMENT_ROUNDING;
  if (kind === "risky") return 0;
  return null; // acak: pakai kebijakan bawaan simulasi
}

/** Pilihan Event Tanggal bot; null berarti pakai pengundian acak bawaan. */
export function botCalendarChoice(
  kind: BotKind,
  state: GameState,
  playerId: string,
): CalendarChoiceId | null {
  if (kind === "random") return null;
  const def = getCalendarEventAtStep(state.public.calendar.step);
  if (!def) return null;
  const available = (["join", "joinPaylater", "skip"] as const).filter((id) => def.choices[id]);
  if (kind === "risky") {
    const paylater = available.includes("joinPaylater") ? "joinPaylater" : null;
    return paylater ?? (available.includes("join") ? "join" : "skip");
  }
  // Cerdas: skip bila Rencana ikut menurunkan skor, kecuali ada pilihan yang menaikkannya.
  let best: CalendarChoiceId = "skip";
  let bestValue = Number.NEGATIVE_INFINITY;
  for (const id of available) {
    const choice = def.choices[id]!;
    const base = projectedScore(state, playerId, choice.effects);
    const value = choice.chance
      ? base * (1 - choice.chance.pct / 100) +
        projectedScore(state, playerId, [...choice.effects, ...choice.chance.effects]) *
          (choice.chance.pct / 100)
      : base;
    if (value > bestValue) {
      bestValue = value;
      best = id;
    }
  }
  return best;
}
