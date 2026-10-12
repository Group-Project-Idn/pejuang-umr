import { z } from "zod";

export const RequestIdSchema = z.uuid();
export const RequestPayloadSchema = z.object({ requestId: RequestIdSchema });
export const RoomCodeSchema = z.string().regex(/^UMR-\d{4}$/);
export const HexCoordSchema = z.object({
  q: z.number().int(),
  r: z.number().int(),
});

export const AvatarIdSchema = z.string().trim().min(1).max(64);
export const CharacterIdSchema = z.enum(["michael", "raka", "sinta", "icha"]);
export const TurnSecondsSchema = z.union([
  z.literal(15),
  z.literal(30),
  z.literal(60),
]);
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
  // v1.12: Hutang tanpa batas atas; Bangkrut bila > debtLimit (sebelumnya .max(25_000_000)).
  debt: z.number().int().nonnegative(),
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
