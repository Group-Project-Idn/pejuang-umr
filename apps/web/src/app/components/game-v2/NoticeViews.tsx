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

function DoomOverlay({ id, payload, onDismiss }: {
  id: number;
  payload: DoomTriggeredPayload;
  onDismiss: (id: number) => void;
}) {
  useAutoDismiss(id, onDismiss);
  const [headline, ...rest] = getDoomLines(payload);
  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-black/80 p-4"
      role="alertdialog"
      aria-label="Doom Spending"
    >
      <section className="grid w-full max-w-md gap-3 rounded-lg border border-garis bg-kartu p-4 text-center text-teks-utama">
        <h2 className="text-title">{headline}</h2>
        {rest.map((line) => <p key={line} className="text-body-sm">{line}</p>)}
        <button type="button" className="min-h-11 rounded-sm border border-garis bg-kartu-tinggi px-3" onClick={() => onDismiss(id)}>
          Tutup
        </button>
      </section>
    </div>
  );
}

function CalendarResultToast({ id, payload, onDismiss }: {
  id: number;
  payload: CalendarResultPayload;
  onDismiss: (id: number) => void;
}) {
  useAutoDismiss(id, onDismiss);
  return (
    <div role="status" className="rounded-lg border border-garis bg-kartu p-3 text-body-sm text-teks-utama">
      {getCalendarResultLines(payload).map((line) => <p key={line}>{line}</p>)}
    </div>
  );
}

export default function NoticeViews({ notices, onDismiss }: {
  notices: readonly TransientNotice[];
  onDismiss: (id: number) => void;
}) {
  const doom = notices.filter((notice) => notice.kind === "doom");
  const results = notices.filter((notice) => notice.kind === "calendarResult");
  return (
    <>
      {doom[0] ? <DoomOverlay key={doom[0].id} id={doom[0].id} payload={doom[0].payload} onDismiss={onDismiss} /> : null}
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
