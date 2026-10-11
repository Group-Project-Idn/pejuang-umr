import { formatRupiah, type PrivateStatus } from "@pejuang/shared";
import Badge from "../ui/Badge";
import Card from "../ui/Card";
import ProgressBar from "../ui/ProgressBar";

export type StatusPanelV2Props = {
  status: PrivateStatus | null;
};

/** Kartu status pribadi v2: Kekayaan bar, Hutang angka+badge, Kesehatan/Stres 0-10. */
export default function StatusPanelV2({ status }: StatusPanelV2Props) {
  return (
    <Card title="Kartu status pribadi">
      <p className="text-label text-teks-sekunder">▣ Hanya kamu yang melihat</p>
      {status ? (
        <div className="mt-3 grid gap-3">
          <ProgressBar kind="kekayaan" value={status.wealth} icon="●" max={50_000_000} />
          <p className="text-body tabular-nums text-teks-utama">{formatRupiah(status.wealth)}</p>
          <div className="grid gap-1">
            <p className="flex items-center gap-1 text-label text-teks-sekunder">
              <span aria-hidden="true">−</span>
              <span>Hutang</span>
            </p>
            <Badge amount={status.debt} />
          </div>
          <ProgressBar kind="kesehatan" value={status.health} icon="♥" />
          <ProgressBar kind="stres" value={status.stress} icon="ϟ" />
        </div>
      ) : (
        <p className="mt-3 text-body-sm text-teks-sekunder">
          Status akan muncul saat giliran permainan aktif.
        </p>
      )}
    </Card>
  );
}
