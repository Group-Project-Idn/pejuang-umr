import { formatRupiah, type EliminationReason, type PrivateStatus, type Reflection } from "@pejuang/shared";
import { getEliminatedLabel } from "@/lib/result-screens";
import { useSfxOnMount } from "@/lib/use-sfx";
import ReflectionCard from "../game/ReflectionCard";
import Button from "../ui/Button";

export const ELIMINATION_COPY = {
  title: "Hari ini kamu perlu istirahat.",
  summary: "Ringkasan terakhirmu",
  leave: "Kembali ke Lobby",
} as const;

export default function EliminationScreen({
  status,
  reason,
  reflection,
  busy,
  message,
  onLeave,
}: {
  status: PrivateStatus | null;
  /** Alasan dari game.eliminationReasons; null bila belum diketahui. */
  reason: EliminationReason | null;
  reflection: Reflection | null | undefined;
  busy: boolean;
  message: string;
  onLeave: () => void;
}) {
  useSfxOnMount("eliminated");
  return (
    <div className="lobby-desk min-h-dvh px-3 py-6 sm:px-6">
      <main className="room-folder mx-auto grid w-full max-w-2xl content-start gap-4 text-[color:var(--ink-text)]" style={{ minHeight: 0 }}>
        <header className="grid gap-2">
          {reason ? <span className="ui-stamp justify-self-start text-body-sm">{getEliminatedLabel(reason)}</span> : null}
          <h1 className="text-headline font-black">{ELIMINATION_COPY.title}</h1>
        </header>
        {status ? (
          <section className="ui-note p-3" aria-label={ELIMINATION_COPY.summary}>
            <h2 className="text-title font-black">{ELIMINATION_COPY.summary}</h2>
            <dl className="mt-2 grid grid-cols-2 gap-2 text-body-sm">
              <dt>Kekayaan</dt><dd className="text-right">{formatRupiah(status.wealth)}</dd>
              <dt>Hutang</dt><dd className="text-right">{formatRupiah(status.debt)}</dd>
              <dt>Kesehatan</dt><dd className="text-right">{status.health}/10</dd>
              <dt>Level Stress</dt><dd className="text-right">{status.stress}/10</dd>
            </dl>
          </section>
        ) : null}
        <ReflectionCard reflection={reflection} />
        {message ? <p role="status" className="text-body-sm">{message}</p> : null}
        <Button onClick={onLeave} disabled={busy}>{ELIMINATION_COPY.leave}</Button>
      </main>
    </div>
  );
}
