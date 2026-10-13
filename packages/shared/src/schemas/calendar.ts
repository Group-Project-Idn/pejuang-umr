import { z } from "zod";
import { EffectSchema, PrivateStatusSchema, SeasonSchema } from "./common";

export const CalendarInfoSchema = z.object({
  step: z.number().int().min(1).max(24),
  totalSteps: z.literal(24),
  round: z.number().int().positive(),
  month: z.number().int().min(1).max(12),
  dateLabel: z.string().min(1),
  season: SeasonSchema,
  /** Keterangan musim untuk HUD; sama dengan hint season:changed, jadi tetap ada setelah snapshot. */
  seasonHint: z.string().min(1),
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
  /** Popup serentak awal ronde (GDD 4.2 v1.14): sama dengan batchId month:summary di ronde yang sama. Opsional selama fase expand (D3); server selalu mengisinya. Jadikan wajib setelah web pindah (Prompt 10). */
  batchId: z.string().min(1).optional(),
  eventId: z.string().min(1),
  name: z.string().min(1),
  dateLabel: z.string().min(1),
  /** Deadline bersama batch (epoch ms), sama dengan month:summary di ronde yang sama. */
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
  /** Popup serentak awal ronde (GDD 4.2 v1.14): sama dengan batchId calendar:event di ronde yang sama. Opsional selama fase expand (D3); server selalu mengisinya. Jadikan wajib setelah web pindah (Prompt 10). */
  batchId: z.string().min(1).optional(),
  /** Deadline bersama batch (epoch ms), selalu terisi server, juga saat payDebt null. */
  deadline: z.number().int().optional(),
  payDebt: z
    .object({
      max: z.number().int().nonnegative(),
      /** @deprecated Pakai `deadline` di level payload; nilainya sama. Dihapus setelah web pindah (Prompt 10). */
      deadline: z.number().int(),
    })
    .nullable(),
  before: PrivateStatusSchema,
  after: PrivateStatusSchema,
});
