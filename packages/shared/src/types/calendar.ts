import type { z } from "zod";
import type { Effect } from "./player";
import { CalendarInfoSchema } from "../schemas/game";

export type Season = z.infer<typeof CalendarInfoSchema>["season"];

export type CalendarInfo = z.infer<typeof CalendarInfoSchema>;

export type CalendarEventPayload = {
  version: number;
  eventId: string;
  title: string;
  description: string;
  choices: Array<"join" | "joinPaylater" | "skip">;
  deadline: number;
};

export type CalendarResultPayload = {
  eventId: string;
  choice: "join" | "joinPaylater" | "skip";
  autoChosen: boolean;
  effects: Effect[];
  flavor?: string;
};