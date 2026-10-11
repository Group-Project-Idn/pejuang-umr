import type { z } from "zod";
import {
  CalendarAnswerRequestSchema,
  EmoteSendRequestSchema,
  GameStartRequestSchema,
  InviteRespondRequestSchema,
  InviteSendRequestSchema,
  RoomRematchRequestSchema,
  SpectateEnterRequestSchema,
  TurnChooseRequestSchema,
  TurnJumpRequestSchema,
} from "../schemas/game-actions";
import {
  RoomCreateRequestSchema,
  RoomJoinRequestSchema,
  RoomKickRequestSchema,
  RoomLeaveRequestSchema,
  RoomPawnRequestSchema,
  RoomReadyRequestSchema,
  RoomTimerRequestSchema,
  SessionResumeRequestSchema,
} from "../schemas/room-actions";
import type { ClientToServerEvents } from "./events";
import { PingSchema } from "./ping";

export const ClientEventSchemas: Record<keyof ClientToServerEvents, z.ZodType> =
  {
    "ping:test": PingSchema,
    "session:resume": SessionResumeRequestSchema,
    "room:create": RoomCreateRequestSchema,
    "room:join": RoomJoinRequestSchema,
    "room:leave": RoomLeaveRequestSchema,
    "room:ready": RoomReadyRequestSchema,
    "room:pawn": RoomPawnRequestSchema,
    "room:timer": RoomTimerRequestSchema,
    "room:kick": RoomKickRequestSchema,
    "room:rematch": RoomRematchRequestSchema,
    "game:start": GameStartRequestSchema,
    "calendar:answer": CalendarAnswerRequestSchema,
    "turn:choose": TurnChooseRequestSchema,
    "turn:jump": TurnJumpRequestSchema,
    "spectate:enter": SpectateEnterRequestSchema,
    "invite:send": InviteSendRequestSchema,
    "invite:respond": InviteRespondRequestSchema,
    "emote:send": EmoteSendRequestSchema,
  };
