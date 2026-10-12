import type { z } from "zod";
import {
  AvatarIdSchema,
  CharacterIdSchema,
  EffectSchema,
  PawnIdSchema,
  PrivateStatusSchema,
  StatSchema,
  TurnSecondsSchema,
} from "../schemas/common";
import { PublicPlayerSchema } from "../schemas/room";

export type AvatarId = z.infer<typeof AvatarIdSchema>;

export type CharacterId = z.infer<typeof CharacterIdSchema>;

export type TurnSeconds = z.infer<typeof TurnSecondsSchema>;

export type PawnId = z.infer<typeof PawnIdSchema>;

export type Stat = z.infer<typeof StatSchema>;

export type Effect = z.infer<typeof EffectSchema>;

export type PublicPlayer = z.infer<typeof PublicPlayerSchema>;

export type PrivateStatus = z.infer<typeof PrivateStatusSchema>;
