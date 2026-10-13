import type {
  CalendarEventPayload,
  DoomTriggeredPayload,
  MonthSummaryPayload,
  PublicGameState,
  RoomState,
  Season,
  Snapshot,
} from "@pejuang/shared";
import { buildInviteResultView, type InviteResultView } from "./invites";
import type { PopupBatch, ResultsWindow, TransientNotice } from "./room-session-view";

export const SEASON_LABEL: Record<Season, string> = {
  rainy: "Musim hujan",
  dry: "Musim kemarau",
  transition: "Pancaroba",
};

export const DECISION_TAG = "Butuh keputusanmu!";
export const BURDEN_TEXT = "Kamu Peringkat 1. Peluang Zonk naik 15 poin persen.";
export const GOLD_CARD_TEXT = "Petak Emas muncul! Hilang dalam 3 ronde";

export type PopupCard =
  | { id: string; kind: "month"; needsDecision: boolean; summary: MonthSummaryPayload }
  | { id: string; kind: "calendar"; needsDecision: true; event: CalendarEventPayload }
  | { id: string; kind: "season"; needsDecision: false; season: Season; hint: string }
  | { id: string; kind: "gold"; needsDecision: false }
  | { id: string; kind: "burden"; needsDecision: false }
  | { id: string; kind: "inviteResult"; needsDecision: false; view: InviteResultView }
  | { id: string; kind: "doom"; needsDecision: false; noticeId: number; payload: DoomTriggeredPayload };

export type PopupGridModel = {
  /** Kunci unik per batch atau jendela hasil; dasar id kartu. */
  key: string;
  /** Deadline bersama dari server (epoch ms). */
  deadline: number;
  /** Awal jendela tampil (epoch ms); 0 untuk batch awal ronde yang tampil sejak diterima. */
  startsAt: number;
  cards: PopupCard[];
};

type Me = Snapshot["me"];

/**
 * Kartu popup serentak awal ronde. Hanya memakai data privat milik pemain ini (me) dan
 * state publik, jadi tidak ada isi heksa tertutup atau Realita di sini.
 */
export function buildStartGrid(input: {
  game: PublicGameState;
  me: Me | null;
  popupBatch: PopupBatch | null;
  seasonNotice: { step: number; season: Season; hint: string } | null;
  goldSpawnedStep: number | null;
}): PopupGridModel | null {
  const { game, me, popupBatch, seasonNotice, goldSpawnedStep } = input;
  if (!me || !popupBatch || game.phase !== "calendar") return null;
  if (game.eliminated.includes(me.playerId)) return null;
  const key = popupBatch.batchId;
  const cards: PopupCard[] = [];
  if (me.pendingMonth) {
    cards.push({
      id: `${key}:month`,
      kind: "month",
      needsDecision: me.pendingMonth.payDebt !== null,
      summary: me.pendingMonth,
    });
  }
  if (me.pendingCalendar) {
    cards.push({ id: `${key}:calendar`, kind: "calendar", needsDecision: true, event: me.pendingCalendar });
  }
  if (seasonNotice && seasonNotice.step === game.calendar.step) {
    cards.push({ id: `${key}:season`, kind: "season", needsDecision: false, season: seasonNotice.season, hint: seasonNotice.hint });
  }
  if (game.gold && goldSpawnedStep === game.calendar.step) {
    cards.push({ id: `${key}:gold`, kind: "gold", needsDecision: false });
  }
  if (game.rankOneBurden.includes(me.playerId)) {
    cards.push({ id: `${key}:burden`, kind: "burden", needsDecision: false });
  }
  return { key, deadline: popupBatch.deadline, startsAt: 0, cards };
}

/**
 * Kartu hasil pribadi akhir ronde: hasil Ajakan (motif hanya untuk pengirim dan target, disaring
 * buildInviteResultView) dan Doom Spending milik pemain ini. Eliminasi punya layar sendiri.
 */
export function buildResultsGrid(input: {
  game: PublicGameState;
  me: Me | null;
  room: Pick<RoomState, "players">;
  resultsWindow: ResultsWindow | null;
  notices: readonly TransientNotice[];
}): PopupGridModel | null {
  const { game, me, room, resultsWindow, notices } = input;
  if (!me || !resultsWindow || game.phase !== "reveal") return null;
  if (game.eliminated.includes(me.playerId)) return null;
  const key = `results-step${resultsWindow.step}`;
  const cards: PopupCard[] = [];
  for (const result of me.inviteResults) {
    const view = buildInviteResultView(result, me.playerId, room);
    if (view) cards.push({ id: `${key}:invite:${view.inviteId}`, kind: "inviteResult", needsDecision: false, view });
  }
  for (const notice of notices) {
    if (notice.kind === "doom") {
      cards.push({ id: `${key}:doom:${notice.id}`, kind: "doom", needsDecision: false, noticeId: notice.id, payload: notice.payload });
    }
  }
  return { key, deadline: resultsWindow.resultsDeadline, startsAt: resultsWindow.revealEndsAt, cards };
}

/** Kartu yang tampil sekarang: kosong sebelum jendela mulai, setelah deadline, atau bila semua ditutup. */
export function getVisibleCards(
  grid: PopupGridModel | null,
  dismissedIds: ReadonlySet<string>,
  serverNow: number,
): PopupCard[] {
  if (!grid || serverNow < grid.startsAt || serverNow >= grid.deadline) return [];
  return grid.cards.filter((card) => !dismissedIds.has(card.id));
}

/** Satu grid aktif sekaligus; hasil akhir ronde menggantikan batch awal ronde yang sudah lewat. */
export function pickGrid(
  start: PopupGridModel | null,
  results: PopupGridModel | null,
): PopupGridModel | null {
  return results ?? start;
}

export function getGridSeconds(deadline: number, serverNow: number): number {
  return Math.max(0, Math.ceil((deadline - serverNow) / 1000));
}
