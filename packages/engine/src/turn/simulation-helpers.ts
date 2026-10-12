import { getCalendarEventAtStep } from "../calendar/calendar";
import { createGame } from "../game/create-game";
import type { DomainEvent } from "../game/domain-events";
import type { CalendarChoiceId, GameState } from "../game/game-state";
import { expireInvite, respondInvite, sendInvite } from "../invite/invite";
import type { RandomSource } from "../random";
import {
  answerCalendarEvent,
  answerMonthPayment,
  closeCalendarEvent,
  closeMonthChange,
  startRound,
} from "./round";
import { chooseHex, endRound, startTurn, timeoutTurn } from "./turn";

const MAX_ITERATIONS = 2000;
const TIMEOUT_PCT = 10;
const SKIP_ANSWER_PCT = 15;
const PLAYER_RANDOM_OFFSET = 7919;
const INVITE_RANDOM_OFFSET = 104729;
const INVITE_SEND_PCT = 30;
const INVITE_EXPIRE_PCT = 20;
const INVITE_JOIN_PCT = 50;
/** Bot debtor membayar separuh batas slider, dibulatkan ke bawah kelipatan Rp1.000. */
const BOT_PAYMENT_ROUNDING = 1_000;

/** RandomSource deterministik (mulberry32) untuk simulasi; bukan Math.random. */
export class SeededRandom implements RandomSource {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  private next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  integer(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  chance(percent: number): boolean {
    return this.next() * 100 < percent;
  }

  pick<T>(items: readonly T[]): T {
    return items[this.integer(0, items.length - 1)]!;
  }
}

/** Catatan satu Ajakan sukses; `scoreDelta` = selisih Skor Sementara sesaat setelah dijawab. */
export interface InviteLogEntry {
  step: number;
  senderId: string;
  targetId: string;
  answer: "join" | "decline";
  autoDeclined: boolean;
  senderScoreDelta: number;
  targetScoreDelta: number;
}

export interface SimulationResult {
  state: GameState;
  events: DomainEvent[];
  initialUsedHexKeys: string[];
  playerIds: string[];
  inviteLog: InviteLogEntry[];
  /** Percobaan kirim yang ditolak karena INVITE_LIMIT (1 Ajakan per ronde). */
  inviteLimitRejections: number;
}

function isFinished(state: GameState): boolean {
  return state.phase === "finished";
}

function scoreOf(state: GameState, playerId: string): number {
  return state.public.scores.find((row) => row.playerId === playerId)?.provisionalScore ?? 0;
}

export type Observer = (state: GameState, events: readonly DomainEvent[]) => void;

/** Memainkan satu game penuh dengan keputusan acak, sampai phase "finished". */
export function playRandomGame(
  playerCount: number,
  seed: number,
  observe?: Observer,
): SimulationResult {
  const engineRandom = new SeededRandom(seed);
  const playerRandom = new SeededRandom(seed + PLAYER_RANDOM_OFFSET);
  const inviteRandom = new SeededRandom(seed + INVITE_RANDOM_OFFSET);
  const inviteLog: InviteLogEntry[] = [];
  let inviteLimitRejections = 0;
  const playerIds = Array.from({ length: playerCount }, (_, index) => `p${index + 1}`);

  const created = createGame(playerIds, `sim-${seed}`, engineRandom);
  let state = created.state;
  const events: DomainEvent[] = [...created.events];
  const initialUsedHexKeys = [...state.board.usedHexKeys];
  observe?.(state, created.events);

  const record = (next: GameState, produced: readonly DomainEvent[]) => {
    state = next;
    events.push(...produced);
    observe?.(state, produced);
  };

  /** Pemain yang sedang giliran punya peluang 30% mengirim Ajakan bila memegang kartu. */
  const maybeInvite = (senderId: string) => {
    const card = state.players[senderId]?.inviteCard;
    if (!card || !inviteRandom.chance(INVITE_SEND_PCT)) return;
    const targets = playerIds.filter((id) => id !== senderId && !state.players[id]!.eliminated);
    if (targets.length === 0) return;
    const targetId = inviteRandom.pick(targets);
    const sent = sendInvite(state, senderId, card.cardId, targetId);
    if (!sent.ok) {
      if (sent.code !== "INVITE_LIMIT") throw new Error(`${sent.code}: ${sent.message}`);
      inviteLimitRejections += 1;
      return;
    }
    record(sent.state, sent.events);
    const inviteId = state.pendingInvite!.inviteId;
    const step = state.public.calendar.step;
    const senderBefore = scoreOf(state, senderId);
    const targetBefore = scoreOf(state, targetId);
    const autoDeclined = inviteRandom.chance(INVITE_EXPIRE_PCT);
    const answer = inviteRandom.chance(INVITE_JOIN_PCT) ? "join" : "decline";
    const resolved = autoDeclined
      ? expireInvite(state, inviteId)
      : respondInvite(state, targetId, inviteId, answer);
    if (!resolved.ok) throw new Error(`${resolved.code}: ${resolved.message}`);
    record(resolved.state, resolved.events);
    inviteLog.push({
      step,
      senderId,
      targetId,
      answer: autoDeclined ? "decline" : answer,
      autoDeclined,
      senderScoreDelta: scoreOf(state, senderId) - senderBefore,
      targetScoreDelta: scoreOf(state, targetId) - targetBefore,
    });
  };

  for (let iteration = 0; state.phase !== "finished"; iteration += 1) {
    if (iteration >= MAX_ITERATIONS) {
      throw new Error(`Simulasi seed ${seed} melewati ${MAX_ITERATIONS} iterasi.`);
    }

    if (state.phase === "roundStart") {
      const round = startRound(state, engineRandom);
      record(round.state, round.events);
      continue;
    }

    if (state.phase === "monthChange") {
      const pending = state.pendingMonth!;
      for (const playerId of pending.debtorIds) {
        const status = state.players[playerId]!.status;
        const max = Math.min(status.wealth, status.debt);
        const amount = Math.floor(max / 2 / BOT_PAYMENT_ROUNDING) * BOT_PAYMENT_ROUNDING;
        const answered = answerMonthPayment(state, playerId, pending.month, amount);
        if (!answered.ok) throw new Error(`${answered.code}: ${answered.message}`);
        record(answered.state, answered.events);
      }
      const closed = closeMonthChange(state);
      record(closed.state, closed.events);
      continue;
    }

    if (state.phase === "calendarEvent") {
      const def = getCalendarEventAtStep(state.public.calendar.step)!;
      const choices = (["join", "joinPaylater", "skip"] as const).filter(
        (id) => def.choices[id],
      );
      for (const playerId of state.public.turnOrder) {
        if (playerRandom.chance(SKIP_ANSWER_PCT)) continue; // waktu habis -> skip otomatis
        const choice: CalendarChoiceId = playerRandom.pick(choices);
        const answered = answerCalendarEvent(state, playerId, def.id, choice);
        if (!answered.ok) throw new Error(`${answered.code}: ${answered.message}`);
        state = answered.state;
      }
      const closed = closeCalendarEvent(state, engineRandom);
      record(closed.state, closed.events);
      continue;
    }

    // phase "turn"
    if (state.pendingTurn === null) {
      const started = startTurn(state, engineRandom);
      record(started.state, started.events);
      if (started.events.length === 0) {
        const ended = endRound(state, engineRandom);
        record(ended.state, ended.events);
      }
      continue;
    }

    maybeInvite(state.pendingTurn.playerId);
    if (isFinished(state)) continue;

    const pending = state.pendingTurn;
    const result = playerRandom.chance(TIMEOUT_PCT)
      ? timeoutTurn(state, pending.turnId, engineRandom)
      : chooseHex(
          state,
          pending.playerId,
          pending.turnId,
          playerRandom.pick(pending.options),
          engineRandom,
        );
    if (!result.ok) throw new Error(`${result.code}: ${result.message}`);
    record(result.state, result.events);
    if (result.nextAction === "endRound") {
      const ended = endRound(state, engineRandom);
      record(ended.state, ended.events);
    }
  }

  return { state, events, initialUsedHexKeys, playerIds, inviteLog, inviteLimitRejections };
}
