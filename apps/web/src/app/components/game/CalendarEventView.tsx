import type { CalendarEventPayload } from "@pejuang/shared";
import Button from "../ui/Button";

export type CalendarEventViewProps = {
  event: CalendarEventPayload;
  pending: boolean;
  /** Hitung mundur bersama sudah habis. */
  expired?: boolean;
  onAnswer: (
    eventId: string,
    choiceId: CalendarEventPayload["choices"][number]["id"],
  ) => void;
};

/** Isi kartu Event Tanggal: pilih satu jawaban, lalu kirim ke server. Bingkai ada di PopupGrid. */
export default function CalendarEventView({ event, pending, expired = false, onAnswer }: CalendarEventViewProps) {
  return (
    <form
      className="grid gap-3"
      onSubmit={(ev) => {
        ev.preventDefault();
        const choiceId = new FormData(ev.currentTarget).get("choice");
        const choice = event.choices.find((candidate) => candidate.id === choiceId);
        if (choice) onAnswer(event.eventId, choice.id);
      }}
    >
      <p className="ui-stamp">EVENT TANGGAL</p>
      <p className="comic-event-date">{event.dateLabel}</p>
      <fieldset className="grid gap-2">
        <legend className="text-label">Pilih jawabanmu</legend>
        {event.choices.map((choice) => (
          <label key={choice.id} className="comic-choice">
            <input type="radio" name="choice" value={choice.id} required className="comic-choice-radio" />
            <span className="comic-choice-text">
              <span>{choice.label}</span>
              {choice.note ? <small className="comic-choice-note">{choice.note}</small> : null}
            </span>
            <span aria-hidden="true" className="comic-choice-check">✓</span>
          </label>
        ))}
      </fieldset>
      <Button variant="primary" type="submit" disabled={pending || expired}>
        {pending ? "Mengirim..." : "Kirim jawaban"}
      </Button>
    </form>
  );
}
