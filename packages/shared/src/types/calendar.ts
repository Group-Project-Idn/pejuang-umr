import type { z } from "zod";
import {
  CalendarEventPayloadSchema,
  CalendarInfoSchema,
  CalendarResultPayloadSchema,
  MonthSummaryPayloadSchema,
} from "../schemas/calendar";
import { SeasonSchema } from "../schemas/common";

export type Season = z.infer<typeof SeasonSchema>;

export type CalendarInfo = z.infer<typeof CalendarInfoSchema>;

export type CalendarEventPayload = z.infer<typeof CalendarEventPayloadSchema>;

export type CalendarResultPayload = z.infer<typeof CalendarResultPayloadSchema>;

export type MonthSummaryPayload = z.infer<typeof MonthSummaryPayloadSchema>;
