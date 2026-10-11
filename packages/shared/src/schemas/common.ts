import { z } from "zod";

export const RequestIdSchema = z.uuid();
export const RequestPayloadSchema = z.object({ requestId: RequestIdSchema });
export const RoomCodeSchema = z.string().regex(/^UMR-\d{4}$/);
export const HexCoordSchema = z.object({
  q: z.number().int(),
  r: z.number().int(),
});

export const AvatarIdSchema = z.string().trim().min(1).max(64);
export const PawnIdSchema = z.enum([
  "cream-circle",
  "iceblue-square",
  "mint-triangle",
  "salmon-diamond",
]);

export const StatSchema = z.enum(["wealth", "debt", "health", "stress"]);

export const EffectSchema = z.object({
  stat: StatSchema,
  delta: z.number().int(),
});

export const PrivateStatusSchema = z.object({
  wealth: z.number().int().nonnegative(),
  debt: z.number().int().nonnegative().max(25_000_000),
  debtLimit: z.literal(25_000_000),
  health: z.number().int().min(0).max(10),
  stress: z.number().int().min(0).max(10),
});

export const CategorySchema = z.enum([
  "work",
  "social",
  "health",
  "finance",
  "gold",
]);
export const OutcomeSchema = z.enum(["zonk", "safe", "lucky"]);
export const RiskSchema = z.enum(["low", "medium", "high"]);
export const SeasonSchema = z.enum(["rainy", "dry", "transition"]);
