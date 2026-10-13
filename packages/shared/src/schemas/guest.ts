import { z } from "zod";
import { CharacterIdSchema } from "./common";

const GUEST_NAME_PATTERN = /^[\p{L}\p{N} .'-]+$/u;

export const GuestNameSchema = z
  .string()
  .trim()
  .min(2)
  .max(20)
  .regex(GUEST_NAME_PATTERN);

export const GuestRequestSchema = z.object({
  name: GuestNameSchema,
  avatarId: CharacterIdSchema,
});

export const GuestResponseSchema = z.object({
  ok: z.literal(true),
  playerId: z.string().min(1),
  name: GuestNameSchema,
  avatarId: CharacterIdSchema,
  token: z.string().min(1),
  expiresAt: z.number().int(),
});

export type GuestRequest = z.infer<typeof GuestRequestSchema>;
export type GuestResponse = z.infer<typeof GuestResponseSchema>;