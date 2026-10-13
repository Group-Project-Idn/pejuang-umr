"use client";

import type { CalendarEventPayload } from "@pejuang/shared";
import { useState, type ReactNode } from "react";
import {
  BURDEN_TEXT,
  DECISION_TAG,
  getGridSeconds,
  GOLD_CARD_TEXT,
  SEASON_LABEL,
  type PopupCard,
} from "@/lib/popup-cards";
import PopupFrame from "../ui/PopupFrame";
import TimerRing from "../ui/TimerRing";
import CalendarEventView from "./CalendarEventView";
import MonthChangeView from "./MonthChangeView";
import { getDoomLines } from "./NoticeViews";

export type PopupGridProps = {
  /** Kartu yang sudah disaring (belum ditutup, di dalam jendela waktu); kosong berarti grid tidak dirender. */
  cards: readonly PopupCard[];
  deadline: number;
  serverNow: number;
  pending: boolean;
  monthError?: string;
  onDismissCard: (card: PopupCard) => void;
  onPayDebt: (month: number, amount: number) => void;
  onAnswerCalendar: (eventId: string, choice: CalendarEventPayload["choices"][number]["id"]) => void;
};

function CardBody({ card, expired, pending, monthError, onPayDebt, onAnswerCalendar }: {
  card: PopupCard;
  expired: boolean;
  pending: boolean;
  monthError?: string;
  onPayDebt: PopupGridProps["onPayDebt"];
  onAnswerCalendar: PopupGridProps["onAnswerCalendar"];
}): ReactNode {
  switch (card.kind) {
    case "month":
      return <MonthChangeView summary={card.summary} pending={pending} expired={expired} error={monthError} onPayDebt={onPayDebt} />;
    case "calendar":
      return <CalendarEventView event={card.event} pending={pending} expired={expired} onAnswer={onAnswerCalendar} />;
    case "season":
      return <><p className="ui-stamp">{SEASON_LABEL[card.season]}</p><p>{card.hint}</p></>;
    case "gold":
      return <p>{GOLD_CARD_TEXT}</p>;
    case "burden":
      return <p>{BURDEN_TEXT}</p>;
    case "inviteResult":
      return (
        <>
          <p className="comic-invite-plan"><strong>{card.view.title}</strong></p>
          <p className="comic-invite-detail">{card.view.answerText}</p>
          <p className="comic-invite-detail">{card.view.motiveText}</p>
          <p className="comic-effect">Efek untukmu: {card.view.effectsText}</p>
        </>
      );
    case "doom": {
      const [, ...rest] = getDoomLines(card.payload);
      return <>{rest.map((line) => <p key={line}>{line}</p>)}</>;
    }
  }
}

function cardTitle(card: PopupCard): string {
  switch (card.kind) {
    case "month": return "Ganti Bulan";
    case "calendar": return card.event.name;
    case "season": return "Musim berganti";
    case "gold": return "Petak Emas";
    case "burden": return "Beban Peringkat 1";
    case "inviteResult": return "Hasil Ajakan";
    case "doom": return getDoomLines(card.payload)[0];
  }
}

/**
 * Semua popup satu momen dalam satu grid dengan satu cincin hitung mundur dari deadline server.
 * Kartu keputusan bertag dan tanpa X; kartu informasi punya X yang hanya menutup di layar ini.
 * Pasang dengan key unik per batch supaya skala cincin dihitung ulang.
 */
export default function PopupGrid({
  cards,
  deadline,
  serverNow,
  pending,
  monthError,
  onDismissCard,
  onPayDebt,
  onAnswerCalendar,
}: PopupGridProps) {
  const seconds = getGridSeconds(deadline, serverNow);
  // Skala cincin = sisa detik saat grid pertama tampil; key per batch membuatnya dihitung ulang.
  const [totalSeconds] = useState(seconds);
  if (cards.length === 0) return null;
  const expired = seconds === 0;
  return (
    <div className="popup-grid" role="group" aria-label="Popup">
      <TimerRing secondsLeft={seconds} totalSeconds={Math.max(totalSeconds, seconds)} label="Sisa waktu popup" />
      <div className="popup-grid-cards">
        {cards.map((card) => (
          <PopupFrame
            key={card.id}
            title={cardTitle(card)}
            className="popup-card"
            header={card.needsDecision ? <p className="popup-decision-tag">{DECISION_TAG}</p> : undefined}
            corner={card.needsDecision ? undefined : (
              <button type="button" className="popup-close" aria-label="Tutup" onClick={() => onDismissCard(card)}>
                <span aria-hidden="true">×</span>
              </button>
            )}
          >
            <CardBody
              card={card}
              expired={expired}
              pending={pending}
              monthError={monthError}
              onPayDebt={onPayDebt}
              onAnswerCalendar={onAnswerCalendar}
            />
          </PopupFrame>
        ))}
      </div>
    </div>
  );
}
