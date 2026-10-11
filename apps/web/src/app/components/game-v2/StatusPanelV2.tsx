import { formatRupiah, type PrivateStatus } from "@pejuang/shared";
import Badge from "../ui/Badge";
import ProgressBar from "../ui/ProgressBar";

/** Kartu Status Pribadi: angka privat, Hutang sebagai badge (bukan bar). */
export default function StatusPanelV2({ status }: { status: PrivateStatus | null }) {
  return (
    <section aria-label="Kartu status pribadi" className="grid gap-3 rounded-md border border-garis bg-kartu p-4">
      <header className="grid gap-1">
        <h2 className="text-title text-teks-utama">Kartu status pribadi</h2>
        <p className="text-label text-teks-sekunder">▣ Hanya kamu yang melihat</p>
      </header>
      {status ? (
        <dl className="grid gap-3">
          <div className="grid gap-1">
            <dt className="text-label text-teks-sekunder">● Kekayaan</dt>
            <dd className="pu-numeral text-body font-semibold text-teks-utama">{formatRupiah(status.wealth)}</dd>
          </div>
          <div className="grid gap-1">
            <dt className="text-label text-teks-sekunder">Hutang</dt>
            <dd><Badge amount={status.debt} aria-label={`Hutang ${formatRupiah(status.debt)}`} /></dd>
          </div>
          <ProgressBar kind="kesehatan" value={status.health} icon="♥" />
          <p className="pu-numeral -mt-2 text-right text-label text-teks-sekunder" aria-label={`Kesehatan ${status.health} dari 10`}>
            {status.health}/10
          </p>
          <ProgressBar kind="stres" value={status.stress} icon="ϟ" />
          <p className="pu-numeral -mt-2 text-right text-label text-teks-sekunder" aria-label={`Level stres ${status.stress} dari 10`}>
            {status.stress}/10
          </p>
        </dl>
      ) : (
        <p className="rounded-md border border-dashed border-garis p-3 text-body-sm text-teks-sekunder">
          Status akan muncul saat giliran permainan aktif.
        </p>
      )}
    </section>
  );
}
