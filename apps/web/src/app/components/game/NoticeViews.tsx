"use client";

import { formatRupiah } from "@pejuang/shared";
import { useEffect, useRef } from "react";
import { formatEffects } from "@/lib/invites";
import type { CalendarResultPayload, DoomTriggeredPayload } from "@pejuang/shared";
import type { TransientNotice } from "@/lib/room-session-view";

export const NOTICE_AUTO_DISMISS_MS = 4_000;
export const DOOM_HEADLINE = "Checkout dulu, nyesel belakangan.";

const CHOICE_LABEL: Record<CalendarResultPayload["choice"], string> = {
  join: "Ikut",
  joinPaylater: "Ikut dengan Paylater",
  skip: "Tidak ikut",
};

export function getDoomLines(payload: DoomTriggeredPayload): string[] {
  return [
    DOOM_HEADLINE,
    `Kekayaan -${formatRupiah(Math.abs(payload.amount))}`,
    `Level Stress sekarang ${payload.stressAfter}`,
  ];
}

export function getCalendarResultLines(payload: CalendarResultPayload): string[] {
  const choice = payload.autoChosen
    ? `${CHOICE_LABEL[payload.choice]} (otomatis, waktu habis)`
    : CHOICE_LABEL[payload.choice];
  const lines = [`Pilihanmu: ${choice}`, `Efek: ${formatEffects(payload.effects)}`];
  if (payload.flavor) lines.push(payload.flavor);
  return lines;
}

function useAutoDismiss(id: number, onDismiss: (id: number) => void) {
  // Ref agar render ulang induk tidak mengulang hitungan 4 detik.
  const dismissRef = useRef(onDismiss);
  useEffect(() => {
    dismissRef.current = onDismiss;
  });
  useEffect(() => {
    const timer = window.setTimeout(() => dismissRef.current(id), NOTICE_AUTO_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [id]);
}

function CalendarResultToast({ id, payload, onDismiss }: {
  id: number;
  payload: CalendarResultPayload;
  onDismiss: (id: number) => void;
}) {
  useAutoDismiss(id, onDismiss);
  return (
    <div role="status" className="ui-note p-3 text-body-sm">
      {getCalendarResultLines(payload).map((line) => <p key={line}>{line}</p>)}
    </div>
  );
}

export default function NoticeViews({ notices, onDismiss }: {
  notices: readonly TransientNotice[];
  onDismiss: (id: number) => void;
}) {
  // Doom Spending tampil sebagai kartu hasil di PopupGrid, bukan di sini.
  const results = notices.filter((notice) => notice.kind === "calendarResult");
  return (
    <>
      {results.length > 0 ? (
        <div className="fixed inset-x-0 top-4 z-[70] mx-auto grid w-full max-w-md gap-2 px-4">
          {results.map((notice) => (
            <CalendarResultToast key={notice.id} id={notice.id} payload={notice.payload} onDismiss={onDismiss} />
          ))}
        </div>
      ) : null}
    </>
  );
}
