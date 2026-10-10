import type { z } from "zod";
import type {
  InviteCardSchema,
  InviteIncomingPayloadSchema,
  InviteMotiveSchema,
  InvitePlanSchema,
  InviteResolvedPayloadSchema,
} from "../schemas/invite";

export type InvitePlan = z.infer<typeof InvitePlanSchema>;

export type InviteMotive = z.infer<typeof InviteMotiveSchema>;

export type InviteCard = z.infer<typeof InviteCardSchema>;

export type InviteIncomingPayload = z.infer<typeof InviteIncomingPayloadSchema>;

export type InviteResolvedPayload = z.infer<typeof InviteResolvedPayloadSchema>;
