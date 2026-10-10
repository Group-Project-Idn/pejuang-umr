import { z } from "zod";
import { EffectSchema, HexCoordSchema, PrivateStatusSchema } from "./common";
import { RoomStateSchema } from "./room";

export const CalendarInfoSchema = z.object({
  step: z.number().int().min(1).max(24),
  totalSteps: z.literal(24),
  round: z.number().int().positive(),
  month: z.number().int().min(1).max(12),
  dateLabel: z.string().min(1),
  season: z.enum(["rainy", "dry", "transition"]),
  nextEvent: z
    .object({ name: z.string().min(1), stepsLeft: z.number().int().nonnegative() })
    .nullable(),
});

const OpenedHexSchema = z.object({
  hex: HexCoordSchema,
  category: z.enum(["work", "social", "health", "finance", "gold"]),
  title: z.string().min(1),
  outcome: z.enum(["zonk", "safe", "lucky"]).nullable(),
  byPlayerId: z.string().min(1),
  step: z.number().int().min(1).max(24),
});

const GoldTileSchema = z.object({
  goldId: z.string().min(1),
  hex: HexCoordSchema,
  title: z.string().min(1),
  plan: z.array(EffectSchema),
  expiresAtStep: z.number().int().min(1).max(25),
});

const ScoreRowSchema = z.object({
  playerId: z.string().min(1),
  provisionalScore: z.number().int(),
  rank: z.number().int().positive(),
  eliminated: z.boolean(),
});

export const PublicGameStateSchema = z.object({
  version: z.number().int().nonnegative(),
  gameId: z.string().min(1),
  boardRadius: z.union([z.literal(4), z.literal(5), z.literal(6)]),
  calendar: CalendarInfoSchema,
  turnOrder: z.array(z.string().min(1)),
  activePlayerId: z.string().min(1).nullable(),
  turnDeadline: z.number().int().nullable(),
  turnPaused: z.boolean(),
  pawns: z.array(z.object({ playerId: z.string().min(1), hex: HexCoordSchema })),
  openedHexes: z.array(OpenedHexSchema),
  deadHexes: z.array(HexCoordSchema),
  gold: GoldTileSchema.nullable(),
  scores: z.array(ScoreRowSchema),
  rankOneBurden: z.array(z.string().min(1)),
  eliminated: z.array(z.string().min(1)),
  spectators: z.array(z.string().min(1)),
});

export const SnapshotSchema = z.object({
  serverTime: z.number().int(),
  room: RoomStateSchema,
  game: PublicGameStateSchema.nullable(),
  me: z.object({
    playerId: z.string().min(1),
    status: PrivateStatusSchema.nullable(),
    inviteCard: z.unknown().nullable(),
    pendingTurn: z.unknown().nullable(),
    pendingCalendar: z.unknown().nullable(),
    pendingInvite: z.unknown().nullable(),
    isSpectator: z.boolean(),
  }),
  result: z.unknown().nullable(),
});