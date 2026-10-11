import { z } from "zod";
import { EffectSchema } from "./common";

export const InvitePlanSchema = z.enum([
  "hangout",
  "morningRun",
  "jointProject",
  "staycation",
]);

export const InviteMotiveSchema = z.enum(["sincere", "commission", "trap"]);

export const InviteCardSchema = z.strictObject({
  cardId: z.string().min(1),
  plan: InvitePlanSchema,
  planEffects: z.array(EffectSchema),
  motive: InviteMotiveSchema,
  expiresAtMonth: z.number().int().min(1).max(12),
});

export const InviteIncomingPayloadSchema = z.strictObject({
  inviteId: z.string().min(1),
  fromPlayerId: z.string().min(1),
  fromName: z.string().min(1),
  plan: InvitePlanSchema,
  planEffects: z.array(EffectSchema),
  deadline: z.number().int(),
});

export const InviteResolvedPayloadSchema = z.strictObject({
  inviteId: z.string().min(1),
  fromPlayerId: z.string().min(1),
  targetPlayerId: z.string().min(1),
  answer: z.enum(["join", "decline"]),
  autoDeclined: z.boolean(),
  motive: InviteMotiveSchema.nullable(),
  effectsForYou: z.array(EffectSchema),
});

export const InviteCardPushPayloadSchema = z.strictObject({
  card: InviteCardSchema.nullable(),
  expiredCardId: z.string().min(1).nullable(),
});
