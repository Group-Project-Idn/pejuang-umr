import type { z } from "zod";
import type { AckCallback } from "../common/ack";
import { ServerErrorPayloadSchema } from "../common/errors";
import type {
  CalendarAnswerRequestSchema,
  EmoteSendRequestSchema,
  GameStartRequestSchema,
  InviteRespondRequestSchema,
  InviteSendRequestSchema,
  MonthPayDebtRequestSchema,
  RoomRematchRequestSchema,
  TurnChooseRequestSchema,
  TurnJumpRequestSchema,
} from "../schemas/game-actions";
import type {
  CalendarEventPayloadSchema,
  CalendarResultPayloadSchema,
  MonthSummaryPayloadSchema,
} from "../schemas/calendar";
import { PrivateStatusSchema } from "../schemas/common";
import {
  DeadEndPayloadSchema,
  DoomTriggeredPayloadSchema,
  GameFinishedPayloadSchema,
  GamePatchPayloadSchema,
  GameStartedPayloadSchema,
  GoldExpiredPayloadSchema,
  GoldSpawnedPayloadSchema,
  PlayerConnectionPayloadSchema,
  PlayerEliminatedPayloadSchema,
  ReflectionReadyPayloadSchema,
  RoundRevealPayloadSchema,
  EmoteShownPayloadSchema,
  RoomCountdownPayloadSchema,
  RoomKickedPayloadSchema,
  SeasonChangedPayloadSchema,
  SnapshotSchema,
  TileOpenedPayloadSchema,
  TileResolvedPayloadSchema,
  TurnStartPayloadSchema,
  TurnOptionsPayloadSchema,
} from "../schemas/game";
import {
  InviteCardPushPayloadSchema,
  InviteIncomingPayloadSchema,
  InviteResolvedPayloadSchema,
} from "../schemas/invite";
import type {
  RoomAvatarRequestSchema,
  RoomCreateRequestSchema,
  RoomJoinRequestSchema,
  RoomKickRequestSchema,
  RoomLeaveRequestSchema,
  RoomReadyRequestSchema,
  RoomTimerRequestSchema,
  SessionResumeRequestSchema,
} from "../schemas/room-actions";
import { RoomStateSchema } from "../schemas/room";
import type { Snapshot } from "../types/game";
import type { RoomState } from "../types/room";
import type { PingSchema } from "./ping";

type RoomResult = { room: RoomState };

export interface ClientToServerEvents {
  "ping:test": (
    payload: z.infer<typeof PingSchema>,
    ack: AckCallback<{ message: string }>,
  ) => void;
  "session:resume": (
    payload: z.infer<typeof SessionResumeRequestSchema>,
    ack: AckCallback<{ snapshot: Snapshot }>,
  ) => void;
  "room:create": (
    payload: z.infer<typeof RoomCreateRequestSchema>,
    ack: AckCallback<RoomResult>,
  ) => void;
  "room:join": (
    payload: z.infer<typeof RoomJoinRequestSchema>,
    ack: AckCallback<RoomResult>,
  ) => void;
  "room:leave": (
    payload: z.infer<typeof RoomLeaveRequestSchema>,
    ack: AckCallback,
  ) => void;
  "room:ready": (
    payload: z.infer<typeof RoomReadyRequestSchema>,
    ack: AckCallback,
  ) => void;
  "room:avatar": (
    payload: z.infer<typeof RoomAvatarRequestSchema>,
    ack: AckCallback,
  ) => void;
  "room:timer": (
    payload: z.infer<typeof RoomTimerRequestSchema>,
    ack: AckCallback,
  ) => void;
  "room:kick": (
    payload: z.infer<typeof RoomKickRequestSchema>,
    ack: AckCallback,
  ) => void;
  "room:rematch": (
    payload: z.infer<typeof RoomRematchRequestSchema>,
    ack: AckCallback<RoomResult>,
  ) => void;
  "game:start": (
    payload: z.infer<typeof GameStartRequestSchema>,
    ack: AckCallback,
  ) => void;
  "calendar:answer": (
    payload: z.infer<typeof CalendarAnswerRequestSchema>,
    ack: AckCallback,
  ) => void;
  "turn:choose": (
    payload: z.infer<typeof TurnChooseRequestSchema>,
    ack: AckCallback,
  ) => void;
  "turn:jump": (
    payload: z.infer<typeof TurnJumpRequestSchema>,
    ack: AckCallback,
  ) => void;
  "month:pay-debt": (
    payload: z.infer<typeof MonthPayDebtRequestSchema>,
    ack: AckCallback<{
      paid: number;
      debtCleared: boolean;
      stressDelta: 0 | -2;
    }>,
  ) => void;
  "invite:send": (
    payload: z.infer<typeof InviteSendRequestSchema>,
    ack: AckCallback<{ inviteId: string; deadline: number }>,
  ) => void;
  "invite:respond": (
    payload: z.infer<typeof InviteRespondRequestSchema>,
    ack: AckCallback,
  ) => void;
  "emote:send": (
    payload: z.infer<typeof EmoteSendRequestSchema>,
    ack: AckCallback,
  ) => void;
}

export interface ServerToClientEvents {
  "session:snapshot": (payload: z.infer<typeof SnapshotSchema>) => void;
  "player:connection": (payload: z.infer<typeof PlayerConnectionPayloadSchema>) => void;
  error: (payload: z.infer<typeof ServerErrorPayloadSchema>) => void;
  "room:kicked": (payload: z.infer<typeof RoomKickedPayloadSchema>) => void;
  "room:state": (payload: z.infer<typeof RoomStateSchema>) => void;
  "room:countdown": (payload: z.infer<typeof RoomCountdownPayloadSchema>) => void;
  "game:started": (payload: z.infer<typeof GameStartedPayloadSchema>) => void;
  "game:finished": (payload: z.infer<typeof GameFinishedPayloadSchema>) => void;
  "game:patch": (payload: z.infer<typeof GamePatchPayloadSchema>) => void;
  "player:status": (payload: z.infer<typeof PrivateStatusSchema>) => void;
  "calendar:event": (payload: z.infer<typeof CalendarEventPayloadSchema>) => void;
  "calendar:result": (payload: z.infer<typeof CalendarResultPayloadSchema>) => void;
  "season:changed": (payload: z.infer<typeof SeasonChangedPayloadSchema>) => void;
  "month:summary": (payload: z.infer<typeof MonthSummaryPayloadSchema>) => void;
  "turn:start": (payload: z.infer<typeof TurnStartPayloadSchema>) => void;
  "turn:options": (payload: z.infer<typeof TurnOptionsPayloadSchema>) => void;
  "turn:dead-end": (payload: z.infer<typeof DeadEndPayloadSchema>) => void;
  "round:reveal": (payload: z.infer<typeof RoundRevealPayloadSchema>) => void;
  "reflection:ready": (payload: z.infer<typeof ReflectionReadyPayloadSchema>) => void;
  "tile:opened": (payload: z.infer<typeof TileOpenedPayloadSchema>) => void;
  "tile:resolved": (payload: z.infer<typeof TileResolvedPayloadSchema>) => void;
  "gold:spawned": (payload: z.infer<typeof GoldSpawnedPayloadSchema>) => void;
  "gold:expired": (payload: z.infer<typeof GoldExpiredPayloadSchema>) => void;
  "doom:triggered": (payload: z.infer<typeof DoomTriggeredPayloadSchema>) => void;
  "player:eliminated": (payload: z.infer<typeof PlayerEliminatedPayloadSchema>) => void;
  "invite:card": (payload: z.infer<typeof InviteCardPushPayloadSchema>) => void;
  "invite:incoming": (payload: z.infer<typeof InviteIncomingPayloadSchema>) => void;
  "invite:resolved": (payload: z.infer<typeof InviteResolvedPayloadSchema>) => void;
  "emote:shown": (payload: z.infer<typeof EmoteShownPayloadSchema>) => void;
}

export interface InterServerEvents {}

export interface SocketData {
  playerId: string;
  name: string;
  /** String bebas: token tamu lama bisa memuat avatar tidak sah. */
  avatarId: string;
}