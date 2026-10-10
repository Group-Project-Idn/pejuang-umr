import type { z } from "zod";
import {
  AvatarIdSchema,
  EffectSchema,
  PawnIdSchema,
  PrivateStatusSchema,
} from "../schemas/common";
import { PublicPlayerSchema } from "../schemas/room";

export type AvatarId = z.infer<typeof AvatarIdSchema>;

export type PawnId = z.infer<typeof PawnIdSchema>;

export type Stat = z.infer<typeof EffectSchema>["stat"];

export type Effect = z.infer<typeof EffectSchema>;

export type PublicPlayer = z.infer<typeof PublicPlayerSchema>;

export type PrivateStatus = z.infer<typeof PrivateStatusSchema>;
