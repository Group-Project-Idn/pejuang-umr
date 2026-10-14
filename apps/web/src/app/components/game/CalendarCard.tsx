import type { CalendarInfo } from "@pejuang/shared";
import { SEASON_LABEL } from "@/lib/popup-cards";

const SEASON_ICON = {
  rainy: "☂",
  dry: "☀",
  transition: "◐",
} as const;

/** Tanggal dan musim tetap terpisah agar hint selalu mengikuti nama musim. */
export default function CalendarCard({ calendar }: { calendar: CalendarInfo }) {
  return (
    <div className="calendar-card">
      <span className="binder binder-left" />
      <span className="binder binder-right" />
      <div className="calendar-date">
        <strong>{calendar.dateLabel}</strong>
        <small>Langkah {calendar.step}/{calendar.totalSteps}</small>
      </div>
      <div className="weather">
        <span aria-hidden="true" className="weather-icon">{SEASON_ICON[calendar.season]}</span>
        <span className="weather-name">{SEASON_LABEL[calendar.season]}</span>
        <small className="season-hint" role="status">{calendar.seasonHint}</small>
      </div>
    </div>
  );
}