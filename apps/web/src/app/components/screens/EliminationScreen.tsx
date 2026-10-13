import { formatRupiah, type EliminationReason, type PrivateStatus, type Reflection } from "@pejuang/shared";
import { ELIMINATION_REASON_LABEL } from "@/lib/result-screens";
import ReflectionCard from "../game/ReflectionCard";
import Button from "../ui/Button";
import Card from "../ui/Card";

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
  return (
    <main className="mx-auto grid w-full max-w-md gap-4 bg-latar px-4 py-6 text-teks-utama">
      <header className="grid gap-1">
        <h1 className="text-headline">{ELIMINATION_COPY.title}</h1>
        {reason ? (
          <p className="text-body-sm text-teks-sekunder">
            Alasan: {ELIMINATION_REASON_LABEL[reason]}
          </p>
        ) : null}
      </header>
      {status ? (
        <Card title={ELIMINATION_COPY.summary}>
          <dl className="mt-2 grid grid-cols-2 gap-2 text-body-sm">
            <dt>Kekayaan</dt><dd className="text-right">{formatRupiah(status.wealth)}</dd>
            <dt>Hutang</dt><dd className="text-right">{formatRupiah(status.debt)}</dd>
            <dt>Kesehatan</dt><dd className="text-right">{status.health}/10</dd>
            <dt>Level Stress</dt><dd className="text-right">{status.stress}/10</dd>
          </dl>
        </Card>
      ) : null}
      <ReflectionCard reflection={reflection} />
      {message ? <p role="status" className="text-body-sm text-teks-sekunder">{message}</p> : null}
      <Button onClick={onLeave} disabled={busy}>{ELIMINATION_COPY.leave}</Button>
    </main>
  );
}
