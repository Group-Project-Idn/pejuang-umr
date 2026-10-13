import {
  formatRupiah,
  hexKey,
  type CalendarEventPayload,
  type Effect,
  type ErrorCode,
  type GoldTile,
  type MonthSummaryPayload,
  type ScoreRow,
  type Season,
} from "@pejuang/shared";
import {
  getCalendarEventAtStep,
  getCalendarInfo,
  getSeasonChange,
} from "../calendar/calendar";
import {
  GOLD_TILES,
  VULNERABLE_CATEGORIES,
  type CalendarChoice,
  type CalendarEventDefinition,
} from "../data";
import { applyEffects } from "../economy/apply-effects";
import { processMonthChange } from "../economy/month-change";
import { payDebt } from "../economy/pay-debt";
import { isMonthChangeStep } from "../economy/schedule";
import type { DomainEvent } from "../game/domain-events";
import type { CalendarChoiceId, GameState } from "../game/game-state";
import { withPhase } from "../game/phase";
import { pickGoldHex } from "../gold/placement";
import { dealInviteCard, isInviteCardStep } from "../invite/deal-invite";
import { appendDecision } from "../log/decision-log";
import type { RandomSource } from "../random";

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
  rainy: "floodRain",
  dry: "heatPollution",
  transition: "sick",
} as const satisfies Record<Season, "floodRain" | "heatPollution" | "sick">;

/** GDD 3.2: petunjuk HUD saat musim berganti. */
const SEASON_HINT: Record<Season, string> = {
  rainy: "Hujan: petak Kerja lebih rawan",
  dry: "Kemarau: petak Keuangan dan Sosial lebih rawan",
  transition: "Pancaroba: petak Kesehatan lebih rawan",
};

const CHOICE_ORDER: readonly CalendarChoiceId[] = ["join", "joinPaylater", "skip"];

/** GDD 4.6: Beban Peringkat 1 mulai berlaku di Langkah 5 (Bulan 3). */
const RANK_ONE_BURDEN_START_STEP = 5;

/** GDD 4.7: Petak Emas muncul di awal Langkah 1, 5, 9, 13, 17, 21. */
const GOLD_SPAWN_STEPS: readonly number[] = [1, 5, 9, 13, 17, 21];

/** GDD 4.7: Petak Emas bertahan 4 ronde sebelum hangus jadi Heksa Mati. */
const GOLD_LIFETIME_STEPS = 4;

function isGoldSpawnStep(step: number): boolean {
  return GOLD_SPAWN_STEPS.includes(step);
}

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
  const effects = choice.chance.effects.map(describeEffect);
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
      effects: choice.effects,
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

/**
 * GDD 4.6: playerId yang menanggung Beban Peringkat 1, yaitu pemain dengan Skor
 * Sementara (provisionalScore) tertinggi di antara yang belum tereliminasi.
 * Jika beberapa pemain seri di puncak, semua yang seri ikut. Memakai
 * `public.scores` terakhir; urutan hasil mengikuti urutan baris skor.
 */
function selectRankOneBurden(scores: readonly ScoreRow[]): string[] {
  const alive = scores.filter((row) => !row.eliminated);
  if (alive.length === 0) return [];
  const top = Math.max(...alive.map((row) => row.provisionalScore));
  return alive
    .filter((row) => row.provisionalScore === top)
    .map((row) => row.playerId);
}

/** GDD 2.4, 3.3, 4.2: awal ronde (kalender, musim, ganti bulan, urutan giliran, Event Tanggal). */
export function startRound(state: GameState, random: RandomSource): RoundResult {
  // Langkah baru disimpan di nextStep oleh endRound; kalender publik baru maju di sini (game:patch calendar).
  const step = state.nextStep ?? state.public.calendar.step;
  const calendar = getCalendarInfo(step);
  const events: DomainEvent[] = [];
  const players = { ...state.players };
  let publicState = { ...state.public, calendar };
  let board = state.board;

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
        hint: SEASON_HINT[season],
      },
    });
  }

  const next: GameState = {
    ...state,
    players,
    public: publicState,
    movedThisRound: [],
    roundInvites: [],
    nextStep: null,
  };
  publicState.turnOrder = orderForStep(next, step);

  // GDD 4.7 v1.12: Petak Emas (muncul di langkah 1, 5, 9, 13, 17, 21). Petak Emas
  // lama yang belum diambil kembali ke petak aslinya (tertutup, bisa menyala lagi),
  // lalu Petak Emas baru muncul. Isi petak asli tidak pernah dikirim ke klien.
  if (isGoldSpawnStep(step)) {
    const expired = publicState.gold;
    publicState.gold = null;
    if (expired) {
      const origin = board.goldOrigin;
      if (origin && origin.hexKey === hexKey(expired.hex)) {
        board = { ...board, tiles: { ...board.tiles, [origin.hexKey]: origin.tileId } };
      }
      board = { ...board, goldOrigin: null };
      events.push({
        type: "gold:expired",
        target: { kind: "room" },
        payload: { version: 0, goldId: expired.goldId, hex: expired.hex },
      });
    }
    const hex = pickGoldHex({ ...next, board }, random);
    if (hex) {
      const def = random.pick(GOLD_TILES);
      board = {
        ...board,
        tiles: { ...board.tiles, [hexKey(hex)]: def.id },
        goldOrigin: { hexKey: hexKey(hex), tileId: board.tiles[hexKey(hex)]! },
      };
      const gold: GoldTile = {
        goldId: def.id,
        hex,
        title: def.title,
        plan: def.plan,
        expiresAtStep: step + GOLD_LIFETIME_STEPS,
      };
      publicState.gold = gold;
      events.push({
        type: "gold:spawned",
        target: { kind: "room" },
        payload: { version: 0, gold },
      });
    }
    next.board = board;
  }

  // GDD 4.8: Kartu Ajakan baru di Langkah 1, 5, 9, 13, 17, 21; kartu lama yang
  // belum dipakai hangus. Motif hanya dikirim ke pemilik kartu.
  if (isInviteCardStep(step)) {
    for (const playerId of state.baseTurnOrder) {
      const player = players[playerId];
      if (!player || player.eliminated) continue;
      const card = dealInviteCard({ step, month: calendar.month, playerId }, random);
      players[playerId] = { ...player, inviteCard: card };
      events.push({
        type: "invite:card",
        target: { kind: "player", playerId },
        payload: { card, expiredCardId: player.inviteCard?.cardId ?? null },
      });
    }
  }

  // GDD 4.6: Beban Peringkat 1 mulai Bulan 3 (Langkah 5). Pemain dengan Skor
  // Sementara tertinggi di antara yang belum tereliminasi menanggung beban;
  // jika seri, semua yang seri kena. Sebelum Langkah 5 beban selalu kosong.
  if (step >= RANK_ONE_BURDEN_START_STEP) {
    const burdened = selectRankOneBurden(publicState.scores);
    publicState.rankOneBurden = burdened;
    events.push({
      type: "game:patch",
      target: { kind: "room" },
      payload: { version: 0, ops: [{ type: "rankOneBurden", playerIds: burdened }] },
    });
  }

  // GDD 2.4 v1.12: Ganti Bulan memproses gaji, biaya, dan bunga, lalu menunggu
  // slider Bayar Hutang. Event Tanggal (bila ada) menyusul setelah popup ditutup.
  if (isMonthChangeStep(step)) {
    const debtorIds: string[] = [];
    for (const playerId of state.baseTurnOrder) {
      const player = players[playerId];
      if (!player || player.eliminated) continue;
      const result = processMonthChange(player.status, calendar.month);
      const hasDebt = result.status.debt > 0;
      if (hasDebt) debtorIds.push(playerId);
      const payload = {
        ...result.summary,
        payDebt: hasDebt
          ? { max: Math.min(result.status.wealth, result.status.debt), deadline: 0 } // deadline diisi server
          : null,
      } as MonthSummaryPayload;
      const target = { kind: "player", playerId } as const;
      events.push({ type: "month:summary", target, payload });
      events.push({ type: "player:status", target, payload: result.status });
      players[playerId] = { ...player, status: result.status };
    }
    return {
      state: withPhase(
        { ...next, pendingMonth: { month: calendar.month, debtorIds, answers: {} } },
        "monthChange",
      ),
      events,
    };
  }

  return { state: enterCalendarEventOrTurn(next, events), events };
}

/** Event Tanggal bila ada di langkah ini (phase calendarEvent + calendar:event), selain itu giliran. */
function enterCalendarEventOrTurn(state: GameState, events: DomainEvent[]): GameState {
  const def = getCalendarEventAtStep(state.public.calendar.step);
  if (!def) return withPhase(state, "turn");
  events.push(buildCalendarEvent(def));
  return withPhase(
    { ...state, pendingCalendarEvent: { eventId: def.id, answers: {} } },
    "calendarEvent",
  );
}

export type MonthPaymentResult =
  | {
      ok: true;
      state: GameState;
      events: DomainEvent[];
      paid: number;
      debtCleared: boolean;
      stressDelta: 0 | -2;
    }
  | { ok: false; code: ErrorCode; message: string };

/**
 * GDD 2.4 v1.12: jawaban slider Bayar Hutang. Nominal 0..min(Kekayaan, Hutang) saat ini;
 * langsung diterapkan. Hutang lunas memberi Level Stress -2.
 */
export function answerMonthPayment(
  state: GameState,
  playerId: string,
  month: number,
  amount: number,
): MonthPaymentResult {
  const pending = state.pendingMonth;
  if (
    state.phase !== "monthChange" ||
    !pending ||
    pending.month !== month ||
    !pending.debtorIds.includes(playerId) ||
    playerId in pending.answers
  ) {
    return { ok: false, code: "PAYMENT_CLOSED", message: "Pembayaran Hutang sudah ditutup." };
  }
  const player = state.players[playerId]!;
  const max = Math.min(player.status.wealth, player.status.debt);
  if (!Number.isInteger(amount) || amount < 0 || amount > max) {
    return {
      ok: false,
      code: "INVALID_PAYLOAD",
      message: `Nominal harus bilangan bulat antara 0 dan ${max}.`,
    };
  }
  const result = payDebt(player.status, amount);
  return {
    ok: true,
    state: {
      ...state,
      decisionLog: appendDecision(state.decisionLog, playerId, {
        kind: "debtPayment",
        step: state.public.calendar.step,
        month,
        amount: result.paid,
        debtBefore: player.status.debt,
        cleared: result.debtCleared,
      }),
      players: { ...state.players, [playerId]: { ...player, status: result.status } },
      pendingMonth: { ...pending, answers: { ...pending.answers, [playerId]: result.paid } },
    },
    events: [{ type: "player:status", target: { kind: "player", playerId }, payload: result.status }],
    paid: result.paid,
    debtCleared: result.debtCleared,
    stressDelta: result.stressDelta,
  };
}

/** True bila ada pemain berhutang yang ditunggu di popup Ganti Bulan. */
export function hasMonthDebtors(state: GameState): boolean {
  return (state.pendingMonth?.debtorIds.length ?? 0) > 0;
}

/** True bila semua debtor sudah menjawab (juga true bila tidak ada debtor). */
export function allMonthPaymentsAnswered(state: GameState): boolean {
  const pending = state.pendingMonth;
  if (!pending) return true;
  return pending.debtorIds.every((id) => id in pending.answers);
}

/**
 * Menutup popup Ganti Bulan: debtor yang belum menjawab dianggap bayar 0, lalu
 * lanjut ke Event Tanggal (bila ada di langkah ini) atau giliran.
 */
export function closeMonthChange(state: GameState): RoundResult {
  if (state.phase !== "monthChange") return { state, events: [] };
  const events: DomainEvent[] = [];
  // Debtor yang tidak menjawab dicatat membayar Rp0.
  let decisionLog = state.decisionLog;
  const pending = state.pendingMonth;
  for (const playerId of pending?.debtorIds ?? []) {
    if (pending && playerId in pending.answers) continue;
    decisionLog = appendDecision(decisionLog, playerId, {
      kind: "debtPayment",
      step: state.public.calendar.step,
      month: pending!.month,
      amount: 0,
      debtBefore: state.players[playerId]!.status.debt,
      cleared: false,
    });
  }
  const next = enterCalendarEventOrTurn({ ...state, decisionLog, pendingMonth: null }, events);
  return { state: next, events };
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

/**
 * Menutup Event Tanggal: yang belum menjawab otomatis "skip", lalu efek diterapkan.
 * Eliminasi (Bangkrut, Burnout) baru dicek di Fase Pembalikan (GDD 4.2 v1.12).
 */
export function closeCalendarEvent(state: GameState, random: RandomSource): RoundResult {
  const pending = state.pendingCalendarEvent;
  const def = getCalendarEventAtStep(state.public.calendar.step);
  if (!pending || !def) {
    return { state: withPhase({ ...state, pendingCalendarEvent: null }, "turn"), events: [] };
  }
  const events: DomainEvent[] = [];
  const players = { ...state.players };
  let decisionLog = state.decisionLog;
  for (const playerId of state.public.turnOrder) {
    const player = players[playerId];
    if (!player || player.eliminated) continue;
    const autoChosen = !(playerId in pending.answers);
    const choiceId = pending.answers[playerId] ?? "skip";
    const choice = def.choices[choiceId] ?? def.choices.skip;
    const effects = [...choice.effects];
    let flavor: string | undefined;
    if (choice.chance && random.chance(choice.chance.pct)) {
      effects.push(...choice.chance.effects);
      flavor = choice.chance.text;
    }
    const status = applyEffects(player.status, effects).status;
    players[playerId] = { ...player, status };
    decisionLog = appendDecision(decisionLog, playerId, {
      kind: "calendar",
      step: state.public.calendar.step,
      eventId: def.id,
      choice: choiceId,
      autoChosen,
    });
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
  }
  return {
    state: withPhase({ ...state, players, decisionLog, pendingCalendarEvent: null }, "turn"),
    events,
  };
}
