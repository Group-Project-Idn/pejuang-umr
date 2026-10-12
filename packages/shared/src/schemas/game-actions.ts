import { z } from "zod";
import { HexCoordSchema, RequestPayloadSchema } from "./common";

export const GameStartRequestSchema = z.strictObject(
  RequestPayloadSchema.shape,
);

export const RoomRematchRequestSchema = z.strictObject(
  RequestPayloadSchema.shape,
);

export const CalendarAnswerRequestSchema = z.strictObject({
  ...RequestPayloadSchema.shape,
  eventId: z.string().min(1),
  choice: z.enum(["join", "joinPaylater", "skip"]),
});

const turnMoveShape = {
  ...RequestPayloadSchema.shape,
  turnId: z.string().min(1),
  hex: HexCoordSchema,
};

export const TurnChooseRequestSchema = z.strictObject(turnMoveShape);

export const TurnJumpRequestSchema = z.strictObject(turnMoveShape);

export const InviteSendRequestSchema = z.strictObject({
  ...RequestPayloadSchema.shape,
  turnId: z.string().min(1),
  cardId: z.string().min(1),
  targetPlayerId: z.string().min(1),
});

export const InviteRespondRequestSchema = z.strictObject({
  ...RequestPayloadSchema.shape,
  inviteId: z.string().min(1),
  answer: z.enum(["join", "decline"]),
});

export const EmoteSendRequestSchema = z.strictObject({
  ...RequestPayloadSchema.shape,
  emoteId: z.string().min(1),
});

export const MonthPayDebtRequestSchema = z.strictObject({
  ...RequestPayloadSchema.shape,
  month: z.number().int().min(1).max(12),
  amount: z.number().int().nonnegative(),
});
