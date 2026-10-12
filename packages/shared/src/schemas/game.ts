import { z } from "zod";
import {
  AvatarIdSchema,
  CategorySchema,
  EffectSchema,
  HexCoordSchema,
  OutcomeSchema,
  PawnIdSchema,
  PrivateStatusSchema,
  RiskSchema,
  TurnSecondsSchema,
} from "./common";
import {
  CalendarEventPayloadSchema,
  CalendarInfoSchema,
  MonthSummaryPayloadSchema,
} from "./calendar";
import { InviteCardSchema, InviteIncomingPayloadSchema } from "./invite";
import { RoomStateSchema } from "./room";

export const RevealedRealitySchema = z.object({
  outcome: OutcomeSchema,
  text: z.string(),
  effects: z.array(EffectSchema),
  seasonal: z.boolean(),
});

export const ReflectionSchema = z.object({
  source: z.enum(["ai", "rules"]),
  summary: z.string(),
  insights: z.array(
    z.object({
      title: z.string().min(1),
      body: z.string(),
      reference: z.string().optional(),
    }),
  ),
});

export const OpenedHexSchema = z.object({
  hex: HexCoordSchema,
  category: CategorySchema,
  title: z.string().min(1),
  /** @deprecated v0.3: pakai `reality`. */
  outcome: OutcomeSchema.nullable(),
  // v0.3: wajib setelah pembersihan G7
  plan: z.array(EffectSchema).optional(),
  // v0.3: wajib setelah pembersihan G7
  reality: RevealedRealitySchema.nullable().optional(),
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
  // v1.12: skor desimal 0-100 (sebelumnya int).
  provisionalScore: z.number().min(0).max(100),
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
  // v0.3: wajib setelah pembersihan G7
  phase: z.enum(["calendar", "turn", "reveal", "finished"]).optional(),
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
  turnSeconds: TurnSecondsSchema,
});

/** @deprecated v0.3: `turn:timer` dihapus. */
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
  // v0.3: wajib setelah pembersihan G7
  round: z.number().int().positive().optional(),
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
  turnSeconds: TurnSecondsSchema,
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
  zonkFocus: z.enum([
    "floodRain",
    "heatPollution",
    "sick",
    /** @deprecated v0.3 */
    "vehicleWash",
    /** @deprecated v0.3 */
    "vehicleBreakdown",
  ]),
  // v0.3: wajib setelah pembersihan G7
  hint: z.string().optional(),
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
  // v0.3: wajib setelah pembersihan G7
  round: z.number().int().positive().optional(),
  stressAfter: z.number().int().min(0).max(10),
});

export const PlayerEliminatedPayloadSchema = z.object({
  version: z.number().int().nonnegative(),
  playerId: z.string().min(1),
  reason: z.enum(["bankrupt", "burnout"]),
  step: z.number().int().min(1).max(24),
  // v0.3: wajib setelah pembersihan G7
  frozenScore: z.number().min(0).max(100).optional(),
});

export const RoundRevealPayloadSchema = z.object({
  version: z.number().int().nonnegative(),
  round: z.number().int().positive(),
  step: z.number().int().min(1).max(24),
  order: z.array(
    z.object({ playerId: z.string().min(1), hex: HexCoordSchema }),
  ),
});

export const ReflectionReadyPayloadSchema = z.object({
  gameId: z.string().min(1),
  playerId: z.string().min(1),
  reflection: ReflectionSchema,
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

export const GameFinishedRankSchema = z.strictObject({
  rank: z.number().int().positive(),
  playerId: z.string().min(1),
  name: z.string().min(1),
  pawn: PawnIdSchema,
  // v0.3: wajib setelah pembersihan G7
  avatarId: AvatarIdSchema.optional(),
  points: z.strictObject({
    finance: z.number().min(0).max(100),
    health: z.number().min(0).max(100),
    calm: z.number().min(0).max(100),
  }),
  // v1.12: skor desimal 0-100 (sebelumnya int).
  finalScore: z.number().min(0).max(100),
  netWorth: z.number().int(),
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
    // v0.3: wajib setelah pembersihan G7
    pendingMonth: MonthSummaryPayloadSchema.nullable().optional(),
    // v0.3: wajib setelah pembersihan G7
    reflection: ReflectionSchema.nullable().optional(),
  }),
  result: GameFinishedPayloadSchema.nullable(),
});