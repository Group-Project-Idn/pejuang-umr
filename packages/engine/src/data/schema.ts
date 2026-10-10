import { z } from "zod";
import {
  EffectSchema,
  InviteMotiveSchema,
  InvitePlanSchema,
  OutcomeSchema,
  SeasonSchema,
} from "@pejuang/shared";

const KEBAB_CASE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const ContentIdSchema = z.string().regex(KEBAB_CASE_PATTERN);

export const TileCategorySchema = z.enum([
  "work",
  "social",
  "health",
  "finance",
]);

const EffectListSchema = z.array(EffectSchema).max(3);

export const RealityVariantSchema = z.object({
  id: ContentIdSchema,
  outcome: OutcomeSchema,
  text: z.string().min(1),
  effects: EffectListSchema,
});

export const TileDefinitionSchema = z.object({
  id: ContentIdSchema,
  category: TileCategorySchema,
  title: z.string().min(1),
  plan: EffectListSchema,
  baseZonkPct: z.number().int().min(0).max(80),
  realities: z.array(RealityVariantSchema).length(6),
});

export const GoldTileDefinitionSchema = z.object({
  id: ContentIdSchema,
  title: z.string().min(1),
  plan: EffectListSchema,
});

const CalendarChoiceSchema = z.object({
  effects: z.array(EffectSchema),
  chance: z
    .object({
      pct: z.number().int().min(0).max(100),
      effects: z.array(EffectSchema),
      text: z.string().min(1),
    })
    .optional(),
});

export const CalendarEventDefinitionSchema = z.object({
  id: ContentIdSchema,
  name: z.string().min(1),
  dateLabel: z.string().min(1),
  multiplayerStep: z.number().int().positive(),
  choices: z.object({
    join: CalendarChoiceSchema,
    skip: CalendarChoiceSchema,
    joinPaylater: CalendarChoiceSchema.optional(),
  }),
});

export const SeasonZonkDefinitionSchema = z.object({
  id: ContentIdSchema,
  season: SeasonSchema,
  focus: z.string().min(1),
  title: z.string().min(1),
  effects: z.array(EffectSchema),
});

export const InvitePlanDefinitionSchema = z.object({
  id: InvitePlanSchema,
  title: z.string().min(1),
  effects: z.array(EffectSchema),
});

export type ContentId = z.infer<typeof ContentIdSchema>;
export type TileCategory = z.infer<typeof TileCategorySchema>;
export type Effect = z.infer<typeof EffectSchema>;
export type RealityVariant = z.infer<typeof RealityVariantSchema>;
export type TileDefinition = z.infer<typeof TileDefinitionSchema>;
export type GoldTileDefinition = z.infer<typeof GoldTileDefinitionSchema>;
export type CalendarChoice = z.infer<typeof CalendarChoiceSchema>;
export type CalendarEventDefinition = z.infer<
  typeof CalendarEventDefinitionSchema
>;
export type SeasonZonkDefinition = z.infer<typeof SeasonZonkDefinitionSchema>;
export type InvitePlanDefinition = z.infer<typeof InvitePlanDefinitionSchema>;
export type InviteMotive = z.infer<typeof InviteMotiveSchema>;
export type Season = z.infer<typeof SeasonSchema>;
export type MonthNumber = keyof typeof SEASON_BY_MONTH;

/** GDD 3.4: Hujan = Des, Jan, Feb; Kemarau = Jun-Agu; Pancaroba = Mar-Mei dan Sep-Nov. */
export const SEASON_BY_MONTH = {
  1: "rainy",
  2: "rainy",
  3: "transition",
  4: "transition",
  5: "transition",
  6: "dry",
  7: "dry",
  8: "dry",
  9: "transition",
  10: "transition",
  11: "transition",
  12: "rainy",
} as const;

/** GDD 3.4: kategori yang mendapat +10 poin persen Zonk saat musim aktif. */
export const VULNERABLE_CATEGORIES = {
  rainy: ["work"],
  dry: ["finance", "social"],
  transition: ["health"],
} as const satisfies Record<Season, readonly TileCategory[]>;
