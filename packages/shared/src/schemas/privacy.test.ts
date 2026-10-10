import { describe, expect, it } from "vitest";
import {
  InviteIncomingPayloadSchema,
} from "./invite";
import { PublicGameStateSchema, TileOptionSchema } from "./game";

const PRIVACY_FIELDS = ["wealth", "debt", "health", "stress"] as const;

function validGameState() {
  return {
    version: 1,
    gameId: "game-1",
    boardRadius: 4,
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
    turnPaused: false,
    pawns: [],
    openedHexes: [],
    deadHexes: [],
    gold: null,
    scores: [],
    rankOneBurden: [],
    eliminated: [],
    spectators: [],
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

  it("InviteIncomingPayloadSchema menolak objek yang membawa motive", () => {
    const leaked = { ...validInviteIncoming(), motive: "trap" };
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
