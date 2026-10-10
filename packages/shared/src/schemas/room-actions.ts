import { z } from "zod";
import {
  PawnIdSchema,
  RequestPayloadSchema,
  RoomCodeSchema,
} from "./common";

export const RoomCreateRequestSchema = RequestPayloadSchema;

export const RoomJoinRequestSchema = RequestPayloadSchema.extend({
  roomCode: RoomCodeSchema,
});

export const SessionResumeRequestSchema = RoomJoinRequestSchema;

export const RoomLeaveRequestSchema = RequestPayloadSchema;

export const RoomReadyRequestSchema = RequestPayloadSchema.extend({
  ready: z.boolean(),
});

export const RoomPawnRequestSchema = RequestPayloadSchema.extend({
  pawn: PawnIdSchema,
});

export const RoomTimerRequestSchema = RequestPayloadSchema.extend({
  turnSeconds: z.union([z.literal(30), z.literal(60)]),
});

export const RoomKickRequestSchema = RequestPayloadSchema.extend({
  targetPlayerId: z.string().min(1),
});
