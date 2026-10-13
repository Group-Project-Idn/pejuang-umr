import { describe, expect, it } from "vitest";
import {
  CalendarAnswerRequestSchema,
  EmoteSendRequestSchema,
  GameStartRequestSchema,
  InviteRespondRequestSchema,
  InviteSendRequestSchema,
  RoomRematchRequestSchema,
  TurnChooseRequestSchema,
  TurnJumpRequestSchema,
} from "./game-actions";

const REQUEST_ID = "00000000-0000-4000-8000-000000000000";

describe("game action schemas", () => {
  it("menerima game:start yang valid dan menolak field asing", () => {
    expect(
      GameStartRequestSchema.safeParse({ requestId: REQUEST_ID }).success,
    ).toBe(true);
    expect(
      GameStartRequestSchema.safeParse({
        requestId: REQUEST_ID,
        extra: "nope",
      }).success,
    ).toBe(false);
  });

  it("menerima room:rematch yang valid dan menolak requestId kosong", () => {
    expect(
      RoomRematchRequestSchema.safeParse({ requestId: REQUEST_ID }).success,
    ).toBe(true);
    expect(
      RoomRematchRequestSchema.safeParse({ requestId: "" }).success,
    ).toBe(false);
  });

  it("menerima calendar:answer yang valid dan menolak choice tidak dikenal", () => {
    expect(
      CalendarAnswerRequestSchema.safeParse({
        requestId: REQUEST_ID,
        eventId: "wedding",
        choice: "join",
      }).success,
    ).toBe(true);
    expect(
      CalendarAnswerRequestSchema.safeParse({
        requestId: REQUEST_ID,
        eventId: "wedding",
        choice: "maybe",
      }).success,
    ).toBe(false);
  });

  it("menerima turn:choose yang valid dan menolak hex desimal", () => {
    expect(
      TurnChooseRequestSchema.safeParse({
        requestId: REQUEST_ID,
        turnId: "turn-1",
        hex: { q: 2, r: -1 },
      }).success,
    ).toBe(true);
    expect(
      TurnChooseRequestSchema.safeParse({
        requestId: REQUEST_ID,
        turnId: "turn-1",
        hex: { q: 1.5, r: 0 },
      }).success,
    ).toBe(false);
  });

  it("menerima turn:jump yang valid dan menolak turnId kosong", () => {
    expect(
      TurnJumpRequestSchema.safeParse({
        requestId: REQUEST_ID,
        turnId: "turn-1",
        hex: { q: 0, r: 3 },
      }).success,
    ).toBe(true);
    expect(
      TurnJumpRequestSchema.safeParse({
        requestId: REQUEST_ID,
        turnId: "",
        hex: { q: 0, r: 3 },
      }).success,
    ).toBe(false);
  });

  it("menerima invite:send yang valid dan menolak targetPlayerId kosong", () => {
    expect(
      InviteSendRequestSchema.safeParse({
        requestId: REQUEST_ID,
        turnId: "turn-1",
        cardId: "card-1",
        targetPlayerId: "player-2",
      }).success,
    ).toBe(true);
    expect(
      InviteSendRequestSchema.safeParse({
        requestId: REQUEST_ID,
        cardId: "card-1",
        targetPlayerId: "player-2",
      }).success,
    ).toBe(false);
    expect(
      InviteSendRequestSchema.safeParse({
        requestId: REQUEST_ID,
        turnId: "turn-1",
        cardId: "card-1",
        targetPlayerId: "",
      }).success,
    ).toBe(false);
  });

  it("menerima invite:respond yang valid dan menolak answer tidak dikenal", () => {
    expect(
      InviteRespondRequestSchema.safeParse({
        requestId: REQUEST_ID,
        inviteId: "invite-1",
        answer: "join",
      }).success,
    ).toBe(true);
    expect(
      InviteRespondRequestSchema.safeParse({
        requestId: REQUEST_ID,
        inviteId: "invite-1",
        answer: "maybe",
      }).success,
    ).toBe(false);
  });

  it("menerima emote:send yang valid dan menolak emoteId kosong", () => {
    expect(
      EmoteSendRequestSchema.safeParse({
        requestId: REQUEST_ID,
        emoteId: "laugh",
      }).success,
    ).toBe(true);
    expect(
      EmoteSendRequestSchema.safeParse({
        requestId: REQUEST_ID,
        emoteId: "",
      }).success,
    ).toBe(false);
  });
});
