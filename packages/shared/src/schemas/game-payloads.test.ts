import { describe, expect, it } from "vitest";
import {
  CalendarEventPayloadSchema,
  CalendarResultPayloadSchema,
  MonthSummaryPayloadSchema,
} from "./calendar";
import {
  DeadEndPayloadSchema,
  GameFinishedPayloadSchema,
  GamePatchPayloadSchema,
  GameStartedPayloadSchema,
  GoldExpiredPayloadSchema,
  GoldSpawnedPayloadSchema,
  SeasonChangedPayloadSchema,
  TileOpenedPayloadSchema,
  TileResolvedPayloadSchema,
  TileOptionSchema,
  TurnOptionsPayloadSchema,
  TurnStartPayloadSchema,
  TurnTimerPayloadSchema,
} from "./game";
import {
  InviteCardSchema,
  InviteIncomingPayloadSchema,
  InviteResolvedPayloadSchema,
} from "./invite";
import { PrivateStatusSchema } from "./common";

const EFFECT = { stat: "wealth", delta: 1_500_000 } as const;

const TILE_OPTION = {
  hex: { q: 1, r: -1 },
  category: "work",
  title: "Lembur Proyek",
  plan: [EFFECT],
  risk: "medium",
  riskTags: [{ type: "rankOne", plusPct: 15 }],
  isGold: false,
} as const;

const CALENDAR_INFO = {
  step: 1,
  totalSteps: 24,
  round: 1,
  month: 1,
  dateLabel: "Januari · Pekan 1",
  season: "rainy",
  nextEvent: null,
} as const;

const PRIVATE_STATUS = {
  wealth: 7_500_000,
  debt: 0,
  debtLimit: 25_000_000,
  health: 10,
  stress: 0,
} as const;

describe("bentuk payload S->C", () => {
  it("status privat dan ringkasan bulan menerima Hutang di atas batas Bangkrut", () => {
    const after = { ...PRIVATE_STATUS, debt: 25_000_001 };
    expect(PrivateStatusSchema.safeParse(after).success).toBe(true);
    expect(PrivateStatusSchema.safeParse({ ...after, debt: -1 }).success).toBe(false);
    expect(PrivateStatusSchema.safeParse({ ...after, debt: 0.5 }).success).toBe(false);
    expect(MonthSummaryPayloadSchema.safeParse({
      month: 3, salary: 5_730_000, livingCost: 4_600_000,
      interest: 750_000, interestAddedToDebt: 0, doomAmount: null,
      before: PRIVATE_STATUS, after,
    }).success).toBe(true);
  });
  it("TileOptionSchema menerima opsi heksa yang valid", () => {
    expect(TileOptionSchema.safeParse(TILE_OPTION).success).toBe(true);
  });

  it("TurnOptionsPayloadSchema menerima daftar opsi yang valid", () => {
    expect(
      TurnOptionsPayloadSchema.safeParse({
        turnId: "turn-1",
        options: [TILE_OPTION],
      }).success,
    ).toBe(true);
  });

  it("DeadEndPayloadSchema menerima opsi berjarak dengan stressPenalty 1", () => {
    expect(
      DeadEndPayloadSchema.safeParse({
        turnId: "turn-1",
        options: [{ ...TILE_OPTION, distance: 2 }],
        stressPenalty: 1,
      }).success,
    ).toBe(true);
  });

  it("CalendarEventPayloadSchema menerima popup event yang valid", () => {
    expect(
      CalendarEventPayloadSchema.safeParse({
        version: 3,
        eventId: "wedding",
        name: "Kondangan Teman",
        dateLabel: "15 Mei",
        deadline: 15_000,
        choices: [
          {
            id: "join",
            label: "Ikut",
            effects: [{ stat: "wealth", delta: -1_000_000 }],
          },
          { id: "skip", label: "Tidak ikut", effects: [] },
        ],
      }).success,
    ).toBe(true);
  });

  it("CalendarResultPayloadSchema menerima hasil event yang valid", () => {
    expect(
      CalendarResultPayloadSchema.safeParse({
        eventId: "wedding",
        choice: "join",
        autoChosen: false,
        effects: [{ stat: "stress", delta: 1 }],
        flavor: "Seru!",
      }).success,
    ).toBe(true);
  });

  it("MonthSummaryPayloadSchema menerima ringkasan bulan yang valid", () => {
    expect(
      MonthSummaryPayloadSchema.safeParse({
        month: 3,
        salary: 5_730_000,
        livingCost: 4_600_000,
        interest: 0,
        interestAddedToDebt: 0,
        doomAmount: null,
        before: PRIVATE_STATUS,
        after: PRIVATE_STATUS,
      }).success,
    ).toBe(true);
  });

  it("InviteCardSchema menerima kartu ajakan yang valid", () => {
    expect(
      InviteCardSchema.safeParse({
        cardId: "card-1",
        plan: "hangout",
        planEffects: [EFFECT],
        motive: "sincere",
        expiresAtMonth: 3,
      }).success,
    ).toBe(true);
  });

  it("InviteCardSchema menolak motif Jebakan yang sudah dihapus", () => {
    expect(InviteCardSchema.safeParse({
      cardId: "card-1",
      plan: "hangout",
      planEffects: [EFFECT],
      motive: "trap",
      expiresAtMonth: 3,
    }).success).toBe(false);
  });

  it("InviteIncomingPayloadSchema menerima ajakan masuk yang valid", () => {
    expect(
      InviteIncomingPayloadSchema.safeParse({
        inviteId: "invite-1",
        fromPlayerId: "p2",
        fromName: "Raka",
        plan: "hangout",
        planEffects: [EFFECT],
        deadline: 1_000,
      }).success,
    ).toBe(true);
  });

  it("InviteResolvedPayloadSchema menerima hasil ajakan yang valid", () => {
    expect(
      InviteResolvedPayloadSchema.safeParse({
        inviteId: "invite-1",
        fromPlayerId: "p2",
        targetPlayerId: "p1",
        answer: "join",
        autoDeclined: false,
        motive: "commission",
        effectsForYou: [EFFECT],
      }).success,
    ).toBe(true);
  });

  it("GameFinishedPayloadSchema menerima hasil akhir yang valid", () => {
    expect(
      GameFinishedPayloadSchema.safeParse({
        version: 24,
        ranking: [
          {
            rank: 1,
            playerId: "p1",
            name: "Nick",
            pawn: "cream-circle",
            finalScore: 70,
            netWorth: 5_000_000,
            points: { finance: 60, health: 80, calm: 70 },
            eliminated: false,
            eliminatedAtStep: null,
          },
        ],
      }).success,
    ).toBe(true);
  });

  it("TileOpenedPayloadSchema menerima payload heksa terbuka yang valid", () => {
    expect(
      TileOpenedPayloadSchema.safeParse({
        version: 2,
        turnId: "turn-1",
        playerId: "p1",
        from: { q: 0, r: 0 },
        to: { q: 1, r: -1 },
        category: "work",
        title: "Lembur Proyek",
        plan: [EFFECT],
        isGold: false,
        viaJump: false,
        autoPicked: false,
      }).success,
    ).toBe(true);
  });

  it("TileResolvedPayloadSchema menerima payload realita yang valid", () => {
    expect(
      TileResolvedPayloadSchema.safeParse({
        version: 2,
        turnId: "turn-1",
        playerId: "p1",
        hex: { q: 1, r: -1 },
        outcome: "zonk",
        text: "Bos marah",
        effects: [{ stat: "health", delta: -2 }],
        seasonal: false,
      }).success,
    ).toBe(true);
  });

  it("GoldSpawnedPayloadSchema menerima petak emas yang valid", () => {
    expect(
      GoldSpawnedPayloadSchema.safeParse({
        version: 5,
        gold: {
          goldId: "gold-1",
          hex: { q: 2, r: -2 },
          title: "Beasiswa Penuh",
          plan: [EFFECT],
          expiresAtStep: 10,
        },
      }).success,
    ).toBe(true);
  });

  it("GoldExpiredPayloadSchema menerima petak emas hangus yang valid", () => {
    expect(
      GoldExpiredPayloadSchema.safeParse({
        version: 10,
        goldId: "gold-1",
        hex: { q: 2, r: -2 },
      }).success,
    ).toBe(true);
  });

  it("GamePatchPayloadSchema menerima patch dengan op discriminated union", () => {
    expect(
      GamePatchPayloadSchema.safeParse({
        version: 4,
        ops: [
          {
            type: "scores",
            scores: [
              {
                playerId: "p1",
                provisionalScore: 12,
                rank: 1,
                eliminated: false,
              },
            ],
          },
          { type: "rankOneBurden", playerIds: ["p1"] },
          { type: "calendar", calendar: CALENDAR_INFO },
          {
            type: "inviteSincereDeclined",
            fromPlayerId: "p2",
            targetPlayerId: "p1",
          },
        ],
      }).success,
    ).toBe(true);
  });

  it("GameStartedPayloadSchema menerima payload mulai game yang valid", () => {
    expect(
      GameStartedPayloadSchema.safeParse({
        version: 1,
        serverTime: 1_000,
        gameId: "game-1",
        boardRadius: 4,
        turnSeconds: 30,
        turnOrder: ["p1", "p2"],
        startPositions: [
          { playerId: "p1", hex: { q: 4, r: -4 } },
          { playerId: "p2", hex: { q: -4, r: 4 } },
        ],
        calendar: CALENDAR_INFO,
      }).success,
    ).toBe(true);
  });

  it("SeasonChangedPayloadSchema menerima pergantian musim yang valid", () => {
    expect(
      SeasonChangedPayloadSchema.safeParse({
        version: 5,
        season: "dry",
        vulnerableCategories: ["finance", "social"],
        zonkFocus: "vehicleBreakdown",
      }).success,
    ).toBe(true);
  });

  it("TurnStartPayloadSchema menerima awal giliran yang valid", () => {
    expect(
      TurnStartPayloadSchema.safeParse({
        version: 2,
        turnId: "turn-1",
        playerId: "p1",
        deadline: 1_000,
        turnSeconds: 30,
      }).success,
    ).toBe(true);
  });

  it("TurnTimerPayloadSchema menerima timer giliran yang valid", () => {
    expect(
      TurnTimerPayloadSchema.safeParse({
        version: 3,
        turnId: "turn-1",
        paused: true,
        deadline: null,
        remainingMs: 12_500,
      }).success,
    ).toBe(true);
  });
});
