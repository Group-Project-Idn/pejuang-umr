import type { z } from "zod";
import {
  CharacterIdSchema,
  EffectSchema,
  PrivateStatusSchema,
  StatSchema,
  TurnSecondsSchema,
} from "../schemas/common";
import { PublicPlayerSchema } from "../schemas/room";

export type CharacterId = z.infer<typeof CharacterIdSchema>;

export type AvatarId = CharacterId;

export type TurnSeconds = z.infer<typeof TurnSecondsSchema>;

export type Stat = z.infer<typeof StatSchema>;

export type Effect = z.infer<typeof EffectSchema>;

export type PublicPlayer = z.infer<typeof PublicPlayerSchema>;

export type PrivateStatus = z.infer<typeof PrivateStatusSchema>;
