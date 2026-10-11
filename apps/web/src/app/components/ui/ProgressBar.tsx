import { scoreToPercent } from "@/design/tokens";

export type ProgressKind = "kekayaan" | "kesehatan" | "stres";

const FILL_CLASSES: Record<ProgressKind, string> = {
  kekayaan: "bg-indikator-kekayaan",
  kesehatan: "bg-indikator-kesehatan",
  stres: "bg-indikator-stres",
};

const KIND_LABEL: Record<ProgressKind, string> = {
  kekayaan: "Kekayaan",
  kesehatan: "Kesehatan",
  stres: "Level stres",
};

export type ProgressBarProps = {
  kind: ProgressKind;
  /** Skor 0-10 (Kesehatan/Stres) atau 0-100 untuk Kekayaan. */
  value: number;
  /** Ikon selalu menyertai warna (buta warna). */
  icon: string;
  max?: number;
};

/** Bar indikator + ikon. Kekayaan relatif ke max; Kesehatan/Stres skala 0-10. */
export default function ProgressBar({ kind, value, icon, max = 100 }: ProgressBarProps) {
  const percent =
    kind === "kekayaan"
      ? Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100))
      : scoreToPercent(value);
  const label = KIND_LABEL[kind];
  return (
    <div className="grid gap-1">
      <p className="flex items-center gap-1 text-label text-teks-sekunder">
        <span aria-hidden="true">{icon}</span>
        <span>{label}</span>
      </p>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={kind === "kekayaan" ? max : 10}
        aria-valuenow={Math.round(kind === "kekayaan" ? value : Math.max(0, Math.min(10, value)))}
        className="h-3 overflow-hidden rounded-full bg-kartu-tinggi"
      >
        <div className={`h-full rounded-full ${FILL_CLASSES[kind]}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
