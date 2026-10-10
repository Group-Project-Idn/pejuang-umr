import { z } from "zod";

export const RequestIdSchema = z.uuid();
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

export const EffectSchema = z.object({
  stat: z.enum(["wealth", "debt", "health", "stress"]),
  delta: z.number().int(),
});

export const PrivateStatusSchema = z.object({
  wealth: z.number().int(),
  debt: z.number().int().nonnegative(),
  debtLimit: z.literal(25_000_000),
  health: z.number().int().min(0).max(10),
  stress: z.number().int().min(0).max(10),
});