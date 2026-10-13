import { describe, expect, it } from "vitest";
import {
  InviteIncomingPayloadSchema,
} from "./invite";
import { GamePatchPayloadSchema, PublicGameStateSchema, TileOptionSchema } from "./game";

const PRIVACY_FIELDS = ["wealth", "debt", "health", "stress"] as const;

function validGameState() {
  return {
    version: 1,
    gameId: "game-1",
    boardRadius: 6,
    calendar: {
      step: 1,
      totalSteps: 24,
      round: 1,
      month: 1,
      dateLabel: "Januari · Pekan 1",
      season: "rainy",
      nextEvent: null,
    },
    turnOrder: ["p1"],
    activePlayerId: "p1",
    turnDeadline: null,
    revealEndsAt: null,
    inviteBusyPlayerIds: [],
    pawns: [],
    openedHexes: [],
    gold: null,
    scores: [],
    rankOneBurden: [],
    eliminated: [],
    phase: "turn",
  };
}

function validInviteIncoming() {
  return {
    inviteId: "invite-1",
    fromPlayerId: "p2",
    fromName: "Raka",
    plan: "hangout",
    planEffects: [{ stat: "stress", delta: -1 }],
    deadline: 1_000,
  };
}

describe("privasi payload", () => {
  it.each(PRIVACY_FIELDS)(
    "PublicGameStateSchema menolak field privasi %s",
    (field) => {
      const leaked = { ...validGameState(), [field]: 100 };
      expect(PublicGameStateSchema.safeParse(leaked).success).toBe(false);
    },
  );

  it("PublicGameStateSchema menerima objek tanpa field privasi", () => {
    expect(PublicGameStateSchema.safeParse(validGameState()).success).toBe(true);
  });

  it("PublicGameState.inviteBusyPlayerIds hanya berisi id string, tanpa motif, isi, atau pengirim", () => {
    const state = { ...validGameState(), inviteBusyPlayerIds: ["p2"] };
    expect(PublicGameStateSchema.safeParse(state).success).toBe(true);
    const leaked = { ...state, inviteBusyPlayerIds: [{ playerId: "p2", motive: "commission" }] };
    expect(PublicGameStateSchema.safeParse(leaked).success).toBe(false);
    const op = { version: 2, ops: [{ type: "inviteBusy", playerIds: ["p2"] }] };
    expect(GamePatchPayloadSchema.safeParse(op).success).toBe(true);
    expect(
      GamePatchPayloadSchema.safeParse({ version: 2, ops: [{ type: "inviteBusy", playerIds: [{ id: "p2" }] }] }).success,
    ).toBe(false);
  });

  it("InviteIncomingPayloadSchema menolak objek yang membawa motive", () => {
    const leaked = { ...validInviteIncoming(), motive: "sincere" };
    expect(InviteIncomingPayloadSchema.safeParse(leaked).success).toBe(false);
  });

  it("InviteIncomingPayloadSchema menerima objek tanpa motive", () => {
    expect(
      InviteIncomingPayloadSchema.safeParse(validInviteIncoming()).success,
    ).toBe(true);
  });

  it("TileOptionSchema tidak punya field outcome atau reality", () => {
    expect(TileOptionSchema.shape).not.toHaveProperty("outcome");
    expect(TileOptionSchema.shape).not.toHaveProperty("realita");
    expect(TileOptionSchema.shape).not.toHaveProperty("reality");
  });
});
