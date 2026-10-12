import { describe, expect, it } from "vitest";
import { ERROR_CODES } from "../common/errors";
import { MonthSummaryPayloadSchema } from "./calendar";
import { CharacterIdSchema, PrivateStatusSchema, TurnSecondsSchema } from "./common";
import {
  DoomTriggeredPayloadSchema,
  GameFinishedPayloadSchema,
  OpenedHexSchema,
  PlayerEliminatedPayloadSchema,
  PublicGameStateSchema,
  ReflectionReadyPayloadSchema,
  ReflectionSchema,
  RevealedRealitySchema,
  RoundRevealPayloadSchema,
  ScoreRowSchema,
  SeasonChangedPayloadSchema,
  SnapshotSchema,
  TileResolvedPayloadSchema,
  TurnStartPayloadSchema,
} from "./game";
import { InviteSendRequestSchema, MonthPayDebtRequestSchema } from "./game-actions";
import { RoomStateSchema } from "./room";
import { RoomAvatarRequestSchema, RoomTimerRequestSchema } from "./room-actions";

const REQUEST_ID = "00000000-0000-4000-8000-000000000000";
const EFFECT = { stat: "wealth", delta: -250_000 } as const;
const STATUS = { wealth: 1_000_000, debt: 0, debtLimit: 25_000_000, health: 8, stress: 3 };
const REALITY = { outcome: "zonk", text: "Macet parah di jalan", effects: [EFFECT], seasonal: false };
const CALENDAR = {
  step: 1, totalSteps: 24, round: 1, month: 1, dateLabel: "Januari · Pekan 1",
  season: "rainy", nextEvent: null,
};

describe("kontrak v0.3: skema dasar", () => {
  it("CharacterIdSchema menerima 4 karakter dan menolak lainnya", () => {
    for (const id of ["michael", "raka", "sinta", "icha"]) {
      expect(CharacterIdSchema.safeParse(id).success).toBe(true);
    }
    expect(CharacterIdSchema.safeParse("avatar-01").success).toBe(false);
  });

  it("TurnSecondsSchema menerima 15, 30, 60 saja", () => {
    for (const s of [15, 30, 60]) expect(TurnSecondsSchema.safeParse(s).success).toBe(true);
    expect(TurnSecondsSchema.safeParse(45).success).toBe(false);
  });

  it("RevealedRealitySchema dan ReflectionSchema", () => {
    expect(RevealedRealitySchema.safeParse(REALITY).success).toBe(true);
    expect(RevealedRealitySchema.safeParse({ ...REALITY, outcome: "x" }).success).toBe(false);
    const reflection = {
      source: "rules",
      summary: "Kamu bertahan sampai akhir.",
      insights: [{ title: "Dana darurat", body: "Sisihkan 10%.", reference: "OJK" }, { title: "T", body: "B" }],
    };
    expect(ReflectionSchema.safeParse(reflection).success).toBe(true);
    expect(ReflectionSchema.safeParse({ ...reflection, source: "llm" }).success).toBe(false);
  });

  it("daftar kode error sama dengan API_CONTRACT Bagian 15", () => {
    expect([...ERROR_CODES].sort()).toEqual(
      [
        "INVALID_PAYLOAD", "UNAUTHORIZED", "NAME_REJECTED", "RATE_LIMITED", "ROOM_NOT_FOUND",
        "ROOM_FULL", "ROOM_LOCKED", "ALREADY_IN_ROOM", "NOT_IN_ROOM", "NOT_HOST", "AVATAR_TAKEN",
        "NOT_ENOUGH_PLAYERS", "PLAYERS_NOT_READY", "NOT_YOUR_TURN", "TILE_NOT_LIT", "INVALID_TILE",
        "STALE_VERSION", "EVENT_CLOSED", "PAYMENT_CLOSED", "NO_INVITE_CARD", "INVITE_NOT_ALLOWED",
        "INVALID_TARGET", "INVITE_EXPIRED", "GAME_FINISHED", "INTERNAL",
      ].sort(),
    );
  });
});

describe("kontrak v0.3: field wajib", () => {
  it("OpenedHex mewajibkan plan dan reality (null atau isi) dan tidak punya outcome", () => {
    const base = {
      hex: { q: 0, r: 0 }, category: "social", title: "Jalan-jalan",
      plan: [EFFECT], reality: null, byPlayerId: "p1", step: 3,
    };
    expect(OpenedHexSchema.safeParse(base).success).toBe(true);
    expect(OpenedHexSchema.safeParse({ ...base, reality: REALITY }).success).toBe(true);
    expect(OpenedHexSchema.safeParse({ ...base, plan: undefined }).success).toBe(false);
    expect(OpenedHexSchema.safeParse({ ...base, reality: undefined }).success).toBe(false);
    expect(OpenedHexSchema.shape).not.toHaveProperty("outcome");
  });

  it("PublicGameState.phase wajib dan dibatasi enum; boardRadius selalu 6", () => {
    const state = {
      version: 1, gameId: "g1", boardRadius: 6, calendar: CALENDAR, turnOrder: ["p1"],
      activePlayerId: "p1", turnDeadline: null, pawns: [],
      openedHexes: [], gold: null, scores: [], rankOneBurden: [],
      eliminated: [], phase: "reveal",
    };
    expect(PublicGameStateSchema.safeParse(state).success).toBe(true);
    expect(PublicGameStateSchema.safeParse({ ...state, phase: undefined }).success).toBe(false);
    expect(PublicGameStateSchema.safeParse({ ...state, phase: "lain" }).success).toBe(false);
    expect(PublicGameStateSchema.safeParse({ ...state, boardRadius: 5 }).success).toBe(false);
  });

  it("ranking game:finished mensyaratkan tiga poin dan avatarId karakter", () => {
    const rank = {
      rank: 1, playerId: "p1", name: "Budi", avatarId: "michael", finalScore: 80,
      netWorth: 1_000_000, points: { finance: 65, health: 90, calm: 85 }, eliminated: false,
      eliminatedAtStep: null,
    };
    const payload = (r: object) => ({ version: 1, ranking: [r] });
    expect(GameFinishedPayloadSchema.safeParse(payload(rank)).success).toBe(true);
    expect(GameFinishedPayloadSchema.safeParse(payload({ ...rank, avatarId: undefined })).success).toBe(false);
    expect(GameFinishedPayloadSchema.safeParse(payload({ ...rank, avatarId: "avatar-01" })).success).toBe(false);
    expect(GameFinishedPayloadSchema.safeParse(payload({ ...rank, pawn: "cream-circle" })).success).toBe(false);
    expect(GameFinishedPayloadSchema.safeParse(payload({ ...rank, points: undefined })).success).toBe(false);
    expect(
      GameFinishedPayloadSchema.safeParse(payload({ ...rank, points: { finance: 30 } })).success,
    ).toBe(false);
    for (const invalid of [
      { ...rank, finalScore: -0.01 },
      { ...rank, finalScore: 100.01 },
      { ...rank, points: { ...rank.points, finance: 100.01 } },
      { ...rank, points: { ...rank.points, calm: -0.01 } },
    ]) {
      expect(GameFinishedPayloadSchema.safeParse(payload(invalid)).success).toBe(false);
    }
  });

  it("MonthSummary mewajibkan payDebt (objek atau null)", () => {
    const summary = {
      month: 2, salary: 5_730_000, livingCost: 4_600_000, interest: 30_000,
      interestAddedToDebt: 0, payDebt: null, before: STATUS, after: STATUS,
    };
    expect(MonthSummaryPayloadSchema.safeParse(summary).success).toBe(true);
    expect(MonthSummaryPayloadSchema.safeParse({ ...summary, payDebt: undefined }).success).toBe(false);
    expect(
      MonthSummaryPayloadSchema.safeParse({ ...summary, payDebt: { max: 500_000, deadline: 1_700_000_000_000 } }).success,
    ).toBe(true);
    expect(MonthSummaryPayloadSchema.safeParse({ ...summary, payDebt: { max: -1, deadline: 1 } }).success).toBe(false);
  });

  it("Snapshot.me mewajibkan pendingMonth dan reflection", () => {
    const snapshot = (extra: object) => ({
      serverTime: 1,
      room: {
        code: "UMR-1234", hostId: "p1", status: "lobby", turnSeconds: 15, players: [],
        version: 1,
      },
      game: null,
      me: {
        playerId: "p1", status: null, inviteCard: null, pendingTurn: null,
        pendingCalendar: null, pendingInvite: null, pendingMonth: null, reflection: null, ...extra,
      },
      result: null,
    });
    const reflection = { source: "ai", summary: "s", insights: [] };
    const month = {
      month: 2, salary: 5_730_000, livingCost: 4_600_000, interest: 0,
      interestAddedToDebt: 0, payDebt: null, before: STATUS, after: STATUS,
    };
    // uji bagian me tetap lolos bila RoomState valid; uji bagian me secara terpisah
    const me = SnapshotSchema.shape.me;
    expect(me.safeParse(snapshot({}).me).success).toBe(true);
    expect(me.safeParse(snapshot({ pendingMonth: undefined }).me).success).toBe(false);
    expect(me.safeParse(snapshot({ reflection: undefined }).me).success).toBe(false);
    expect(me.safeParse(snapshot({ pendingMonth: month, reflection }).me).success).toBe(true);
    expect(me.safeParse(snapshot({ pendingMonth: null, reflection: null }).me).success).toBe(true);
    expect(me.safeParse(snapshot({ reflection: { source: "x" } }).me).success).toBe(false);
  });

  it("season:changed mewajibkan hint dan hanya menerima zonkFocus v0.3", () => {
    const base = { version: 1, season: "transition", vulnerableCategories: ["health"], hint: "Pancaroba" };
    for (const zonkFocus of ["floodRain", "heatPollution", "sick"]) {
      expect(SeasonChangedPayloadSchema.safeParse({ ...base, zonkFocus }).success).toBe(true);
    }
    expect(SeasonChangedPayloadSchema.safeParse({ ...base, hint: undefined, zonkFocus: "sick" }).success).toBe(false);
    expect(
      SeasonChangedPayloadSchema.safeParse({
        ...base, zonkFocus: "sick", hint: "Pancaroba: petak Kesehatan lebih rawan",
      }).success,
    ).toBe(true);
    expect(SeasonChangedPayloadSchema.safeParse({ ...base, zonkFocus: "lain" }).success).toBe(false);
  });

  it("player:eliminated, doom:triggered, tile:resolved mewajibkan field v0.3", () => {
    expect(
      PlayerEliminatedPayloadSchema.safeParse({
        version: 1, playerId: "p1", reason: "bankrupt", step: 10, frozenScore: 42.5,
      }).success,
    ).toBe(true);
    expect(
      PlayerEliminatedPayloadSchema.safeParse({
        version: 1, playerId: "p1", reason: "bankrupt", step: 10, frozenScore: 120,
      }).success,
    ).toBe(false);
    expect(
      PlayerEliminatedPayloadSchema.safeParse({
        version: 1, playerId: "p1", reason: "bankrupt", step: 10,
      }).success,
    ).toBe(false);
    expect(
      DoomTriggeredPayloadSchema.safeParse({ amount: 750_000, round: 3, stressAfter: 8 }).success,
    ).toBe(true);
    expect(DoomTriggeredPayloadSchema.safeParse({ amount: 750_000, stressAfter: 8 }).success).toBe(false);
    expect(DoomTriggeredPayloadSchema.shape).not.toHaveProperty("trigger");
    const resolved = {
      version: 1, round: 3, playerId: "p1", hex: { q: 0, r: 0 },
      outcome: "zonk", text: "x", effects: [EFFECT], seasonal: false,
    };
    expect(TileResolvedPayloadSchema.safeParse(resolved).success).toBe(true);
    expect(TileResolvedPayloadSchema.safeParse({ ...resolved, round: undefined }).success).toBe(false);
    expect(TileResolvedPayloadSchema.shape).not.toHaveProperty("turnId");
  });

  it("turnSeconds 15 diterima di turn:start, room:timer, dan RoomState", () => {
    expect(
      TurnStartPayloadSchema.safeParse({ version: 1, turnId: "t", playerId: "p1", deadline: 1, turnSeconds: 15 }).success,
    ).toBe(true);
    expect(RoomTimerRequestSchema.safeParse({ requestId: REQUEST_ID, turnSeconds: 15 }).success).toBe(true);
    expect(RoomTimerRequestSchema.safeParse({ requestId: REQUEST_ID, turnSeconds: 45 }).success).toBe(false);
    expect(RoomStateSchema.shape.turnSeconds.safeParse(15).success).toBe(true);
  });
});

describe("kontrak v1.12: Hutang tanpa batas atas dan skor desimal", () => {
  it("PrivateStatus menerima Hutang di atas debtLimit (Bangkrut dicek engine)", () => {
    const status = { ...STATUS, debt: 30_000_000 };
    expect(PrivateStatusSchema.safeParse(status).success).toBe(true);
    expect(PrivateStatusSchema.safeParse({ ...status, debt: -1 }).success).toBe(false);
  });

  it("ScoreRow dan ranking menerima skor desimal", () => {
    expect(
      ScoreRowSchema.safeParse({ playerId: "p1", provisionalScore: 88.3333, rank: 1, eliminated: false })
        .success,
    ).toBe(true);
    for (const provisionalScore of [-0.01, 100.01]) {
      expect(ScoreRowSchema.safeParse({ playerId: "p1", provisionalScore, rank: 1, eliminated: false }).success).toBe(false);
    }
    expect(
      GameFinishedPayloadSchema.safeParse({
        version: 1,
        ranking: [
          {
            rank: 1, playerId: "p1", name: "Budi", avatarId: "raka", finalScore: 56.3333,
            netWorth: 4_500_000, points: { finance: 59, health: 60, calm: 50 }, eliminated: false,
            eliminatedAtStep: null,
          },
        ],
      }).success,
    ).toBe(true);
  });
});

describe("kontrak v0.3: event baru", () => {
  it("room:avatar", () => {
    expect(RoomAvatarRequestSchema.safeParse({ requestId: REQUEST_ID, avatarId: "sinta" }).success).toBe(true);
    expect(RoomAvatarRequestSchema.safeParse({ requestId: REQUEST_ID, avatarId: "zzz" }).success).toBe(false);
  });

  it("month:pay-debt", () => {
    const ok = { requestId: REQUEST_ID, month: 3, amount: 500_000 };
    expect(MonthPayDebtRequestSchema.safeParse(ok).success).toBe(true);
    expect(MonthPayDebtRequestSchema.safeParse({ ...ok, amount: 0 }).success).toBe(true);
    expect(MonthPayDebtRequestSchema.safeParse({ ...ok, amount: -1 }).success).toBe(false);
    expect(MonthPayDebtRequestSchema.safeParse({ ...ok, amount: 1.5 }).success).toBe(false);
    expect(MonthPayDebtRequestSchema.safeParse({ ...ok, extra: 1 }).success).toBe(false);
  });

  it("invite:send mewajibkan turnId", () => {
    const base = { requestId: REQUEST_ID, cardId: "c1", targetPlayerId: "p2" };
    expect(InviteSendRequestSchema.safeParse(base).success).toBe(false);
    expect(InviteSendRequestSchema.safeParse({ ...base, turnId: "t1" }).success).toBe(true);
  });

  it("round:reveal", () => {
    const ok = { version: 5, round: 2, step: 2, order: [{ playerId: "p1", hex: { q: 1, r: -1 } }] };
    expect(RoundRevealPayloadSchema.safeParse(ok).success).toBe(true);
    expect(RoundRevealPayloadSchema.safeParse({ ...ok, order: [{ playerId: "p1" }] }).success).toBe(false);
  });

  it("reflection:ready", () => {
    const reflection = { source: "rules", summary: "s", insights: [{ title: "t", body: "b" }] };
    expect(ReflectionReadyPayloadSchema.safeParse({ gameId: "g1", playerId: "p1", reflection }).success).toBe(true);
    expect(ReflectionReadyPayloadSchema.safeParse({ gameId: "g1", playerId: "p1" }).success).toBe(false);
  });

});
