import { z } from "zod";
import {
  CategorySchema,
  EffectSchema,
  HexCoordSchema,
  OutcomeSchema,
  PawnIdSchema,
  PrivateStatusSchema,
  RiskSchema,
} from "./common";
import { CalendarEventPayloadSchema, CalendarInfoSchema } from "./calendar";
import { InviteCardSchema, InviteIncomingPayloadSchema } from "./invite";
import { RoomStateSchema } from "./room";

export const OpenedHexSchema = z.object({
  hex: HexCoordSchema,
  category: CategorySchema,
  title: z.string().min(1),
  outcome: OutcomeSchema.nullable(),
  byPlayerId: z.string().min(1),
  step: z.number().int().min(1).max(24),
});

export const GoldTileSchema = z.object({
  goldId: z.string().min(1),
  hex: HexCoordSchema,
  title: z.string().min(1),
  plan: z.array(EffectSchema),
  expiresAtStep: z.number().int().min(1).max(25),
});

export const ScoreRowSchema = z.strictObject({
  playerId: z.string().min(1),
  provisionalScore: z.number().int(),
  rank: z.number().int().positive(),
  eliminated: z.boolean(),
});

export const PublicGameStateSchema = z.strictObject({
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

export const RiskTagSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("rankOne"), plusPct: z.literal(15) }),
  z.object({
    type: z.literal("season"),
    season: z.enum(["rainy", "dry", "transition"]),
    plusPct: z.literal(10),
  }),
  z.object({ type: z.literal("immune"), reason: z.literal("health>=8") }),
]);

export const TileOptionSchema = z.object({
  hex: HexCoordSchema,
  category: CategorySchema,
  title: z.string().min(1),
  plan: z.array(EffectSchema),
  risk: RiskSchema.nullable(),
  riskTags: z.array(RiskTagSchema),
  isGold: z.boolean(),
});

export const TurnOptionsPayloadSchema = z.object({
  turnId: z.string().min(1),
  options: z.array(TileOptionSchema),
});

export const DeadEndPayloadSchema = z.object({
  turnId: z.string().min(1),
  options: z.array(
    TileOptionSchema.extend({ distance: z.number().int().nonnegative() }),
  ),
  stressPenalty: z.literal(1),
});

export const TurnStartPayloadSchema = z.object({
  version: z.number().int().nonnegative(),
  turnId: z.string().min(1),
  playerId: z.string().min(1),
  deadline: z.number().int(),
  turnSeconds: z.union([z.literal(15), z.literal(30), z.literal(60)]),
});

export const TurnTimerPayloadSchema = z.object({
  version: z.number().int().nonnegative(),
  turnId: z.string().min(1),
  paused: z.boolean(),
  deadline: z.number().int().nullable(),
  remainingMs: z.number().int().nonnegative(),
});

export const TileOpenedPayloadSchema = z.object({
  version: z.number().int().nonnegative(),
  turnId: z.string().min(1),
  playerId: z.string().min(1),
  from: HexCoordSchema,
  to: HexCoordSchema,
  category: CategorySchema,
  title: z.string().min(1),
  plan: z.array(EffectSchema),
  isGold: z.boolean(),
  viaJump: z.boolean(),
  autoPicked: z.boolean(),
});

export const TileResolvedPayloadSchema = z.object({
  version: z.number().int().nonnegative(),
  turnId: z.string().min(1),
  playerId: z.string().min(1),
  hex: HexCoordSchema,
  outcome: OutcomeSchema,
  text: z.string(),
  effects: z.array(EffectSchema),
  seasonal: z.boolean(),
});

export const GoldSpawnedPayloadSchema = z.object({
  version: z.number().int().nonnegative(),
  gold: GoldTileSchema,
});

export const GoldExpiredPayloadSchema = z.object({
  version: z.number().int().nonnegative(),
  goldId: z.string().min(1),
  hex: HexCoordSchema,
});

export const GameStartedPayloadSchema = z.object({
  version: z.number().int().nonnegative(),
  serverTime: z.number().int(),
  gameId: z.string().min(1),
  boardRadius: z.union([z.literal(4), z.literal(5), z.literal(6)]),
  turnSeconds: z.union([z.literal(15), z.literal(30), z.literal(60)]),
  turnOrder: z.array(z.string().min(1)),
  startPositions: z.array(
    z.object({ playerId: z.string().min(1), hex: HexCoordSchema }),
  ),
  calendar: CalendarInfoSchema,
});

export const SeasonChangedPayloadSchema = z.object({
  version: z.number().int().nonnegative(),
  season: z.enum(["rainy", "dry", "transition"]),
  vulnerableCategories: z.array(CategorySchema),
  zonkFocus: z.enum(["vehicleWash", "vehicleBreakdown", "sick"]),
});

export const PlayerConnectionPayloadSchema = z.object({
  version: z.number().int().nonnegative().optional(),
  playerId: z.string().min(1),
  connected: z.boolean(),
  at: z.number().int(),
});

export const DoomTriggeredPayloadSchema = z.object({
  amount: z.number().int(),
  trigger: z.enum(["month", "tile"]),
  stressAfter: z.number().int().min(0).max(10),
});

export const PlayerEliminatedPayloadSchema = z.object({
  version: z.number().int().nonnegative(),
  playerId: z.string().min(1),
  reason: z.enum(["bankrupt", "burnout"]),
  step: z.number().int().min(1).max(24),
});

export const EmoteShownPayloadSchema = z.object({
  playerId: z.string().min(1),
  emoteId: z.string().min(1),
  at: z.number().int(),
});

export const RoomKickedPayloadSchema = z.object({
  roomCode: z.string().regex(/^UMR-\d{4}$/),
});

export const RoomCountdownPayloadSchema = z.object({
  deadline: z.number().int(),
  seconds: z.literal(3),
});

export const GamePatchOpSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("scores"), scores: z.array(ScoreRowSchema) }),
  z.object({
    type: z.literal("rankOneBurden"),
    playerIds: z.array(z.string().min(1)),
  }),
  z.object({ type: z.literal("calendar"), calendar: CalendarInfoSchema }),
  z.object({
    type: z.literal("inviteSincereDeclined"),
    fromPlayerId: z.string().min(1),
    targetPlayerId: z.string().min(1),
  }),
]);

export const GamePatchPayloadSchema = z.object({
  version: z.number().int().nonnegative(),
  ops: z.array(GamePatchOpSchema),
});

export const GameFinishedRankSchema = z.object({
  rank: z.number().int().positive(),
  playerId: z.string().min(1),
  name: z.string().min(1),
  pawn: PawnIdSchema,
  finalScore: z.number().int(),
  netWorth: z.number().int(),
  modifier: z.enum(["penalty", "bonus", "none"]),
  modifierPct: z.union([z.literal(-50), z.literal(20), z.literal(0)]),
  eliminated: z.boolean(),
  eliminatedAtStep: z.number().int().nullable(),
});

export const GameFinishedPayloadSchema = z.object({
  version: z.number().int().nonnegative(),
  ranking: z.array(GameFinishedRankSchema),
});

export const SnapshotSchema = z.object({
  serverTime: z.number().int(),
  room: RoomStateSchema,
  game: PublicGameStateSchema.nullable(),
  me: z.object({
    playerId: z.string().min(1),
    status: PrivateStatusSchema.nullable(),
    inviteCard: InviteCardSchema.nullable(),
    pendingTurn: z
      .union([TurnOptionsPayloadSchema, DeadEndPayloadSchema])
      .nullable(),
    pendingCalendar: CalendarEventPayloadSchema.nullable(),
    pendingInvite: InviteIncomingPayloadSchema.nullable(),
    isSpectator: z.boolean(),
  }),
  result: GameFinishedPayloadSchema.nullable(),
});