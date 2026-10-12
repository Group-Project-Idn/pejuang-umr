import { z } from "zod";
import {
  AvatarIdSchema,
  PawnIdSchema,
  RoomCodeSchema,
  TurnSecondsSchema,
} from "./common";

export const PublicPlayerSchema = z.strictObject({
  playerId: z.string().min(1),
  name: z.string().min(1),
  avatarId: AvatarIdSchema,
  pawn: PawnIdSchema.nullable(),
  connected: z.boolean(),
});

export const RoomPlayerSchema = PublicPlayerSchema.extend({
  isHost: z.boolean(),
  ready: z.boolean(),
  joinedAt: z.number().int(),
});

export const RoomStateSchema = z.object({
  code: z.string().regex(/^UMR-\d{4}$/),
  status: z.enum(["waiting", "countdown", "playing", "finished"]),
  hostId: z.string().min(1),
  turnSeconds: TurnSecondsSchema,
  players: z.array(RoomPlayerSchema).max(4),
  maxPlayers: z.literal(4),
  canStart: z.boolean(),
  startBlockReason: z.enum(["NEED_MIN_PLAYERS", "WAITING_READY"]).nullable(),
});

// GET /api/v1/rooms/:code (API_CONTRACT §4.2). Hanya data pengecekan,
// tidak pernah memuat daftar pemain, nama, playerId, atau avatar.
export const RoomLookupResponseSchema = z
  .object({
    ok: z.literal(true),
    code: RoomCodeSchema,
    status: z.enum(["waiting", "countdown", "playing", "finished"]),
    playerCount: z.number().int().nonnegative(),
    maxPlayers: z.literal(4),
    joinable: z.boolean(),
    reason: z.enum(["ROOM_FULL", "ROOM_LOCKED"]).nullable(),
    isMember: z.boolean().optional(),
  })
  .strict();

export type RoomLookupResponse = z.infer<typeof RoomLookupResponseSchema>;