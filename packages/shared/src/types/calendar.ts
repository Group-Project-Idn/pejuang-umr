import type { Effect } from "./player";

export type Season = "rainy" | "dry" | "transition";

export type CalendarInfo = {
  step: number;
  totalSteps: 24;
  round: number;
  month: number;
  dateLabel: string;
  season: Season;
  nextEvent: { name: string; stepsLeft: number } | null;
};

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