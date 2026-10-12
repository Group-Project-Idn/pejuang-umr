import { z } from "zod";
import { EffectSchema, PrivateStatusSchema, SeasonSchema } from "./common";

export const CalendarInfoSchema = z.object({
  step: z.number().int().min(1).max(24),
  totalSteps: z.literal(24),
  round: z.number().int().positive(),
  month: z.number().int().min(1).max(12),
  dateLabel: z.string().min(1),
  season: SeasonSchema,
  nextEvent: z
    .object({ name: z.string().min(1), stepsLeft: z.number().int().nonnegative() })
    .nullable(),
});

const CalendarChoiceSchema = z.object({
  id: z.enum(["join", "joinPaylater", "skip"]),
  label: z.string().min(1),
  effects: z.array(EffectSchema),
  note: z.string().optional(),
});

export const CalendarEventPayloadSchema = z.strictObject({
  version: z.number().int().nonnegative(),
  eventId: z.string().min(1),
  name: z.string().min(1),
  dateLabel: z.string().min(1),
  deadline: z.number().int(),
  choices: z.array(CalendarChoiceSchema).min(1),
});

export const CalendarResultPayloadSchema = z.strictObject({
  eventId: z.string().min(1),
  choice: z.enum(["join", "joinPaylater", "skip"]),
  autoChosen: z.boolean(),
  effects: z.array(EffectSchema),
  flavor: z.string().optional(),
});

export const MonthSummaryPayloadSchema = z.strictObject({
  month: z.number().int().min(1).max(12),
  salary: z.literal(5_730_000),
  livingCost: z.literal(4_600_000),
  interest: z.number().int(),
  interestAddedToDebt: z.number().int(),
  /** @deprecated v0.3: Doom Spending pindah ke Fase Pembalikan; selalu null. */
  doomAmount: z.number().int().nullable(),
  // v0.3: wajib setelah pembersihan G7
  payDebt: z
    .object({
      max: z.number().int().nonnegative(),
      deadline: z.number().int(),
    })
    .nullable()
    .optional(),
  before: PrivateStatusSchema,
  after: PrivateStatusSchema,
});
