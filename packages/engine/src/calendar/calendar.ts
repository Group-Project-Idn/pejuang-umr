import type { CalendarInfo } from "@pejuang/shared";
import {
  CALENDAR_EVENTS,
  SEASON_BY_MONTH,
  type CalendarEventDefinition,
  type MonthNumber,
  type Season,
} from "../data";
import { monthOfStep, TOTAL_STEPS } from "../economy/schedule";

const MONTH_ABBR = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
] as const;

function seasonOfStep(step: number): Season {
  return SEASON_BY_MONTH[monthOfStep(step) as MonthNumber];
}

function dateLabelOfStep(step: number): string {
  const day = step % 2 === 1 ? 1 : 15;
  return `${day} ${MONTH_ABBR[monthOfStep(step) - 1]}`;
}

/** GDD 3.1-3.2: info kalender untuk HUD pada langkah Multiplayer ini. */
export function getCalendarInfo(step: number): CalendarInfo {
  const month = monthOfStep(step);
  const next = CALENDAR_EVENTS.find((event) => event.multiplayerStep > step);
  return {
    step,
    totalSteps: TOTAL_STEPS,
    round: step,
    month,
    dateLabel: dateLabelOfStep(step),
    season: seasonOfStep(step),
    nextEvent: next
      ? { name: next.name, stepsLeft: next.multiplayerStep - step }
      : null,
  };
}

/** GDD 3.4: musim baru jika berbeda dari langkah sebelumnya, atau di langkah 1. */
export function getSeasonChange(step: number): Season | null {
  const season = seasonOfStep(step);
  if (step === 1 || season !== seasonOfStep(step - 1)) return season;
  return null;
}

/** GDD 3.3: Event Tanggal yang jatuh tepat di langkah ini. */
export function getCalendarEventAtStep(
  step: number,
): CalendarEventDefinition | null {
  return CALENDAR_EVENTS.find((event) => event.multiplayerStep === step) ?? null;
}
