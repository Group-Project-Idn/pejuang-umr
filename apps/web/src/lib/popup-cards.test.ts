import type { CalendarEventPayload, InviteResolvedPayload, MonthSummaryPayload, PublicGameState, Snapshot } from "@pejuang/shared";
import { describe, expect, it } from "vitest";
import { buildResultsGrid, buildStartGrid, getVisibleCards, pickGrid } from "./popup-cards";

const status = { wealth: 5_000_000, debt: 0, debtLimit: 25_000_000 as const, health: 7, stress: 2 };
const batch = { batchId: "game-1-step3", deadline: 25_000 };
const room = { players: [
  { playerId: "p1", name: "Rina" }, { playerId: "p2", name: "Budi" }, { playerId: "p3", name: "Sari" },
] } as never;

const game = (extra: Partial<PublicGameState> = {}): PublicGameState => ({
  version: 5, gameId: "game-1", boardRadius: 6,
  calendar: { step: 3, totalSteps: 24, round: 3, month: 2, dateLabel: "Februari", season: "rainy", seasonHint: "Hujan", nextEvent: null },
  turnOrder: ["p1", "p2", "p3"], activePlayerId: null, turnDeadline: null, revealEndsAt: null, revealOrder: [], revealStepMs: 2_500,
  eliminationReasons: [], inviteBusyPlayerIds: [], pawns: [], openedHexes: [], gold: null, scores: [], rankOneBurden: [],
  eliminated: [], phase: "calendar", ...extra,
});
const month = (payDebt: MonthSummaryPayload["payDebt"]): MonthSummaryPayload => ({
  month: 2, salary: 5_730_000, livingCost: 5_200_000, passiveStress: 1, interest: 0, interestAddedToDebt: 0,
  ...batch, before: status, after: status, payDebt,
});
const event: CalendarEventPayload = {
  version: 5, ...batch, eventId: "e1", name: "Kondangan", dateLabel: "15 Mei", choices: [{ id: "skip", label: "Tidak ikut", effects: [] }],
};
const me = (extra: Partial<Snapshot["me"]> = {}): Snapshot["me"] => ({
  playerId: "p1", status, inviteCard: null, pendingTurn: null, pendingCalendar: null, pendingInvite: null,
  pendingMonth: null, inviteResults: [], reflection: null, ...extra,
});
const noNotice = { seasonNotice: null, goldSpawnedStep: null };
const none = new Set<string>();

describe("kartu popup serentak awal ronde", () => {
  it("dua kartu bersamaan: Ganti Bulan berhutang dan Event Tanggal, keduanya butuh keputusan", () => {
    const grid = buildStartGrid({ game: game(), me: me({ pendingMonth: month({ max: 100_000 }), pendingCalendar: event }), popupBatch: batch, ...noNotice });
    expect(grid?.deadline).toBe(25_000);
    expect(grid?.cards.map((card) => [card.kind, card.needsDecision])).toEqual([["month", true], ["calendar", true]]);
  });

  it("hanya informasi: Ganti Bulan tanpa utang, musim, Petak Emas, dan Beban Peringkat 1", () => {
    const grid = buildStartGrid({
      game: game({ gold: { goldId: "g1", hex: { q: 1, r: 0 }, title: "Emas", plan: [], expiresAtStep: 9 }, rankOneBurden: ["p1"] }),
      me: me({ pendingMonth: month(null) }), popupBatch: batch,
      seasonNotice: { step: 3, season: "dry", hint: "Kemarau" }, goldSpawnedStep: 3,
    });
    expect(grid?.cards.map((card) => [card.kind, card.needsDecision])).toEqual([
      ["month", false], ["season", false], ["gold", false], ["burden", false],
    ]);
  });

  it("hanya keputusan: Event Tanggal sendirian", () => {
    const grid = buildStartGrid({ game: game(), me: me({ pendingCalendar: event }), popupBatch: batch, ...noNotice });
    expect(grid?.cards.map((card) => card.kind)).toEqual(["calendar"]);
    expect(grid?.cards.every((card) => card.needsDecision)).toBe(true);
  });

  it("reconnect saat batch terbuka: kartu keputusan memakai deadline asli dan jawaban yang sudah masuk tidak muncul lagi", () => {
    const reconnected = buildStartGrid({ game: game(), me: me({ pendingMonth: month(null), pendingCalendar: event }), popupBatch: batch, ...noNotice });
    expect(reconnected?.deadline).toBe(25_000);
    expect(reconnected?.cards.map((card) => [card.kind, card.needsDecision])).toEqual([["month", false], ["calendar", true]]);
    const answered = buildStartGrid({ game: game(), me: me({ pendingMonth: month(null) }), popupBatch: batch, ...noNotice });
    expect(answered?.cards.map((card) => card.kind)).toEqual(["month"]);
  });

  it("notifikasi musim dan Petak Emas dari ronde lain tidak ikut, Beban hanya untuk yang menanggung", () => {
    const grid = buildStartGrid({
      game: game({ rankOneBurden: ["p2"], gold: { goldId: "g1", hex: { q: 1, r: 0 }, title: "Emas", plan: [], expiresAtStep: 9 } }),
      me: me({ pendingMonth: month(null) }), popupBatch: batch,
      seasonNotice: { step: 1, season: "dry", hint: "Kemarau" }, goldSpawnedStep: 1,
    });
    expect(grid?.cards.map((card) => card.kind)).toEqual(["month"]);
  });

  it("tanpa batch, di luar fase kalender, atau pemain tereliminasi: tidak ada grid", () => {
    const input = { game: game(), me: me({ pendingMonth: month(null) }), popupBatch: batch, ...noNotice };
    expect(buildStartGrid({ ...input, popupBatch: null })).toBeNull();
    expect(buildStartGrid({ ...input, game: game({ phase: "turn" }) })).toBeNull();
    expect(buildStartGrid({ ...input, game: game({ eliminated: ["p1"] }) })).toBeNull();
    expect(buildStartGrid({ ...input, me: null })).toBeNull();
  });

  it("kartu hilang saat deadline lewat atau ditutup; menutup satu kartu tidak memengaruhi kartu lain", () => {
    const grid = buildStartGrid({ game: game(), me: me({ pendingMonth: month(null), pendingCalendar: event }), popupBatch: batch, ...noNotice })!;
    expect(getVisibleCards(grid, none, 24_999)).toHaveLength(2);
    expect(getVisibleCards(grid, new Set([grid.cards[0].id]), 10_000).map((card) => card.kind)).toEqual(["calendar"]);
    expect(getVisibleCards(grid, new Set(grid.cards.map((card) => card.id)), 10_000)).toEqual([]);
    expect(getVisibleCards(grid, none, 25_000)).toEqual([]);
    expect(getVisibleCards(null, none, 0)).toEqual([]);
  });
});

describe("kartu hasil akhir ronde", () => {
  const invite = (extra: Partial<InviteResolvedPayload> = {}): InviteResolvedPayload => ({
    inviteId: "i1", fromPlayerId: "p1", targetPlayerId: "p2", answer: "join", autoDeclined: false,
    plan: "hangout", motive: "sincere", effectsForYou: [], ...extra,
  } as InviteResolvedPayload);
  const resultsWindow = { step: 4, revealEndsAt: 30_000, resultsDeadline: 38_000 };
  const base = { game: game({ phase: "reveal" }), room, resultsWindow, notices: [] as never[] };
  const doomNotice = { id: 7, kind: "doom" as const, payload: { amount: 750_000, round: 4, stressAfter: 8 } };

  it("tampil setelah revealEndsAt dan berakhir di resultsDeadline", () => {
    const grid = buildResultsGrid({ ...base, me: me({ inviteResults: [invite()] }) })!;
    expect(getVisibleCards(grid, none, 29_999)).toEqual([]);
    expect(getVisibleCards(grid, none, 30_000)).toHaveLength(1);
    expect(getVisibleCards(grid, none, 38_000)).toEqual([]);
  });

  it("memuat hasil Ajakan (pengirim) dan Doom Spending milik sendiri", () => {
    const grid = buildResultsGrid({ ...base, me: me({ inviteResults: [invite()] }), notices: [doomNotice] });
    expect(grid?.cards.map((card) => card.kind)).toEqual(["inviteResult", "doom"]);
    expect(grid?.cards.every((card) => !card.needsDecision)).toBe(true);
  });

  it("privat: Ajakan antara pemain lain tidak membuat kartu dan tidak membocorkan motif", () => {
    const other = invite({ fromPlayerId: "p2", targetPlayerId: "p3" });
    const grid = buildResultsGrid({ ...base, me: me({ inviteResults: [other] }) });
    expect(grid?.cards).toEqual([]);
    const own = buildResultsGrid({ ...base, me: me({ inviteResults: [invite()] }) });
    expect(JSON.stringify(own?.cards)).toContain("Motif");
  });

  it("pemain tanpa kartu tidak melihat apa pun; tanpa jendela, bukan fase pembalikan, atau tereliminasi: tidak ada grid", () => {
    const empty = buildResultsGrid({ ...base, me: me() })!;
    expect(getVisibleCards(empty, none, 31_000)).toEqual([]);
    expect(buildResultsGrid({ ...base, me: me(), resultsWindow: null })).toBeNull();
    expect(buildResultsGrid({ ...base, me: me(), game: game({ phase: "calendar" }) })).toBeNull();
    expect(buildResultsGrid({ ...base, me: me(), game: game({ phase: "reveal", eliminated: ["p1"] }) })).toBeNull();
  });

  it("grid hasil menggantikan grid awal ronde", () => {
    const start = buildStartGrid({ game: game(), me: me({ pendingMonth: month(null) }), popupBatch: batch, ...noNotice });
    const results = buildResultsGrid({ ...base, me: me() });
    expect(pickGrid(start, results)).toBe(results);
    expect(pickGrid(start, null)).toBe(start);
  });
});
