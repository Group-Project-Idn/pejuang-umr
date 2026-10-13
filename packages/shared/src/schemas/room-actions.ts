import { z } from "zod";
import {
  CharacterIdSchema,
  RequestPayloadSchema,
  RoomCodeSchema,
  TurnSecondsSchema,
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

export const RoomAvatarRequestSchema = RequestPayloadSchema.extend({
  avatarId: CharacterIdSchema,
});

export const RoomTimerRequestSchema = RequestPayloadSchema.extend({
  turnSeconds: TurnSecondsSchema,
});

export const RoomKickRequestSchema = RequestPayloadSchema.extend({
  targetPlayerId: z.string().min(1),
});
