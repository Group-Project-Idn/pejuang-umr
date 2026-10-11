import {
  formatRupiah,
  type CalendarEventPayload,
  type Effect,
  type ErrorCode,
  type MonthSummaryPayload,
  type Season,
} from "@pejuang/shared";
import {
  getCalendarEventAtStep,
  getCalendarInfo,
  getSeasonChange,
} from "../calendar/calendar";
import {
  VULNERABLE_CATEGORIES,
  type CalendarChoice,
  type CalendarEventDefinition,
} from "../data";
import { toMultiplayerEffects } from "../data/multiplier";
import { applyEffects } from "../economy/apply-effects";
import { processMonthChange } from "../economy/month-change";
import { isBurnout } from "../economy/elimination";
import { isMonthChangeStep } from "../economy/schedule";
import type { DomainEvent } from "../game/domain-events";
import type { CalendarChoiceId, GameState } from "../game/game-state";
import type { RandomSource } from "../random";
import { checkEarlyFinish } from "./turn";

export interface RoundResult {
  state: GameState;
  events: DomainEvent[];
  /** "finished" bila game selesai lebih cepat (<= 1 pemain hidup); server berhenti melanjutkan ronde. */
  nextAction?: "finished";
}

export type AnswerResult =
  | { ok: true; state: GameState }
  | { ok: false; code: ErrorCode; message: string };

const ZONK_FOCUS_BY_SEASON = {
  rainy: "vehicleWash",
  dry: "vehicleBreakdown",
  transition: "sick",
} as const satisfies Record<Season, "vehicleWash" | "vehicleBreakdown" | "sick">;

const CHOICE_ORDER: readonly CalendarChoiceId[] = ["join", "joinPaylater", "skip"];

function choiceLabel(eventId: string, id: CalendarChoiceId): string {
  if (id === "skip") return "Tidak ikut";
  if (id === "joinPaylater") return "Belanja lewat Paylater";
  return eventId === "harbolnas" ? "Belanja" : "Ikut";
}

function describeEffect(effect: Effect): string {
  const sign = effect.delta > 0 ? "+" : "";
  switch (effect.stat) {
    case "wealth":
      return `Kekayaan ${effect.delta > 0 ? "+" : ""}${formatRupiah(effect.delta)}`;
    case "debt":
      return `Hutang ${effect.delta > 0 ? "+" : ""}${formatRupiah(effect.delta)}`;
    case "health":
      return `Kesehatan ${sign}${effect.delta}`;
    case "stress":
      return `Level Stress ${sign}${effect.delta}`;
  }
}

function chanceNote(choice: CalendarChoice): string | undefined {
  if (!choice.chance) return undefined;
  const effects = toMultiplayerEffects(choice.chance.effects).map(describeEffect);
  return `${choice.chance.pct}% ${choice.chance.text}: ${effects.join(", ")}`;
}

function buildCalendarEvent(def: CalendarEventDefinition): DomainEvent {
  const choices: CalendarEventPayload["choices"] = [];
  for (const id of CHOICE_ORDER) {
    const choice = def.choices[id];
    if (!choice) continue;
    const note = chanceNote(choice);
    choices.push({
      id,
      label: choiceLabel(def.id, id),
      effects: toMultiplayerEffects(choice.effects),
      ...(note ? { note } : {}),
    });
  }
  return {
    type: "calendar:event",
    target: { kind: "room" },
    payload: {
      version: 0,
      eventId: def.id,
      name: def.name,
      dateLabel: def.dateLabel,
      deadline: 0, // diisi server (15 detik)
      choices,
    },
  };
}

/**
 * GDD 1.2, 4.2: Langkah 1 memakai baseTurnOrder. Saat bulan berganti, urutan bulan
 * sebelumnya (tanpa pemain tereliminasi) diputar: pemain pertama pindah ke akhir.
 * Di dalam bulan yang sama urutan tetap, hanya pemain tereliminasi yang dibuang.
 */
function orderForStep(state: GameState, step: number): string[] {
  const alive = (id: string) => !state.players[id]?.eliminated;
  if (step === 1) return state.baseTurnOrder.filter(alive);
  const previous = state.public.turnOrder.filter(alive);
  if (!isMonthChangeStep(step) || previous.length === 0) return previous;
  return [...previous.slice(1), previous[0]!];
}

/** GDD 2.4, 3.3, 4.2: awal ronde (kalender, musim, ganti bulan, urutan giliran, Event Tanggal). */
export function startRound(state: GameState, random: RandomSource): RoundResult {
  const step = state.public.calendar.step;
  const calendar = getCalendarInfo(step);
  const events: DomainEvent[] = [];
  const players = { ...state.players };
  let publicState = { ...state.public, calendar };

  events.push({
    type: "game:patch",
    target: { kind: "room" },
    payload: { version: 0, ops: [{ type: "calendar", calendar }] },
  });

  const season = getSeasonChange(step);
  if (season) {
    events.push({
      type: "season:changed",
      target: { kind: "room" },
      payload: {
        version: 0,
        season,
        vulnerableCategories: [...VULNERABLE_CATEGORIES[season]],
        zonkFocus: ZONK_FOCUS_BY_SEASON[season],
      },
    });
  }

  if (isMonthChangeStep(step)) {
    for (const playerId of state.baseTurnOrder) {
      const player = players[playerId];
      if (!player || player.eliminated) continue;
      const result = processMonthChange(player.status, calendar.month, random);
      const target = { kind: "player", playerId } as const;
      events.push({ type: "month:summary", target, payload: result.summary as MonthSummaryPayload });
      events.push({ type: "player:status", target, payload: result.status });
      if (result.summary.doomAmount !== null) {
        events.push({
          type: "doom:triggered",
          target,
          payload: {
            amount: result.summary.doomAmount,
            trigger: "month",
            stressAfter: result.status.stress,
          },
        });
      }
      players[playerId] = {
        status: result.status,
        eliminated: result.eliminated !== null,
        eliminatedAtStep: result.eliminated ? step : null,
        eliminatedReason: result.eliminated,
      };
      if (result.eliminated) {
        publicState = {
          ...publicState,
          eliminated: [...publicState.eliminated, playerId],
          scores: publicState.scores.map((row) =>
            row.playerId === playerId ? { ...row, eliminated: true } : row,
          ),
        };
        events.push({
          type: "player:eliminated",
          target: { kind: "room" },
          payload: { version: 0, playerId, reason: result.eliminated, step },
        });
      }
    }
  }

  const next: GameState = { ...state, players, public: publicState, movedThisRound: [] };
  const early = checkEarlyFinish(next);
  if (early) {
    return { state: early.state, events: [...events, ...early.events], nextAction: "finished" };
  }
  publicState.turnOrder = orderForStep(next, step);

  // TODO: Petak Emas (muncul di langkah 1, 5, 9, 13, 17, 21).
  // TODO: Kartu Ajakan (bagikan kartu di awal ronde).
  // TODO: Beban Peringkat 1 (game:patch rankOneBurden).

  const def = getCalendarEventAtStep(step);
  if (def) {
    events.push(buildCalendarEvent(def));
    return {
      state: {
        ...next,
        phase: "calendarEvent",
        pendingCalendarEvent: { eventId: def.id, answers: {} },
      },
      events,
    };
  }
  return { state: { ...next, phase: "turn" }, events };
}

/** Menyimpan jawaban satu pemain untuk Event Tanggal yang sedang terbuka. */
export function answerCalendarEvent(
  state: GameState,
  playerId: string,
  eventId: string,
  choice: CalendarChoiceId,
): AnswerResult {
  const pending = state.pendingCalendarEvent;
  if (state.phase !== "calendarEvent" || !pending || pending.eventId !== eventId) {
    return { ok: false, code: "EVENT_CLOSED", message: "Event Tanggal sudah ditutup." };
  }
  if (playerId in pending.answers) {
    return { ok: false, code: "EVENT_CLOSED", message: "Kamu sudah menjawab." };
  }
  const player = state.players[playerId];
  if (!player || player.eliminated) {
    return { ok: false, code: "INVALID_PAYLOAD", message: "Pemain tidak ikut event ini." };
  }
  const def = getCalendarEventAtStep(state.public.calendar.step);
  if (!def || !def.choices[choice]) {
    return { ok: false, code: "INVALID_PAYLOAD", message: "Pilihan tidak tersedia." };
  }
  return {
    ok: true,
    state: {
      ...state,
      pendingCalendarEvent: {
        ...pending,
        answers: { ...pending.answers, [playerId]: choice },
      },
    },
  };
}

/** Menutup Event Tanggal: yang belum menjawab otomatis "skip", lalu efek diterapkan. */
export function closeCalendarEvent(state: GameState, random: RandomSource): RoundResult {
  const pending = state.pendingCalendarEvent;
  const def = getCalendarEventAtStep(state.public.calendar.step);
  if (!pending || !def) {
    return { state: { ...state, pendingCalendarEvent: null, phase: "turn" }, events: [] };
  }
  const events: DomainEvent[] = [];
  const players = { ...state.players };
  const step = state.public.calendar.step;
  let publicState = state.public;
  for (const playerId of state.public.turnOrder) {
    const player = players[playerId];
    if (!player || player.eliminated) continue;
    const autoChosen = !(playerId in pending.answers);
    const choiceId = pending.answers[playerId] ?? "skip";
    const choice = def.choices[choiceId] ?? def.choices.skip;
    const effects = toMultiplayerEffects(choice.effects);
    let flavor: string | undefined;
    if (choice.chance && random.chance(choice.chance.pct)) {
      effects.push(...toMultiplayerEffects(choice.chance.effects));
      flavor = choice.chance.text;
    }
    // Kekurangan Kekayaan dari Event Tanggal tidak menyebabkan Bangkrut (GDD 1.4);
    // hanya Burnout Total yang bisa mengeliminasi di sini.
    const status = applyEffects(player.status, effects).status;
    const burnout = isBurnout(status);
    players[playerId] = burnout
      ? { status, eliminated: true, eliminatedAtStep: step, eliminatedReason: "burnout" }
      : { ...player, status };
    const target = { kind: "player", playerId } as const;
    events.push({
      type: "calendar:result",
      target,
      payload: {
        eventId: def.id,
        choice: choiceId,
        autoChosen,
        effects,
        ...(flavor ? { flavor } : {}),
      },
    });
    events.push({ type: "player:status", target, payload: status });
    if (burnout) {
      publicState = {
        ...publicState,
        eliminated: [...publicState.eliminated, playerId],
        scores: publicState.scores.map((row) =>
          row.playerId === playerId ? { ...row, eliminated: true } : row,
        ),
      };
      events.push({
        type: "player:eliminated",
        target: { kind: "room" },
        payload: { version: 0, playerId, reason: "burnout", step },
      });
    }
  }
  const next: GameState = {
    ...state,
    players,
    public: publicState,
    pendingCalendarEvent: null,
    phase: "turn",
  };
  const early = checkEarlyFinish(next);
  if (early) {
    return { state: early.state, events: [...events, ...early.events], nextAction: "finished" };
  }
  return { state: next, events };
}
