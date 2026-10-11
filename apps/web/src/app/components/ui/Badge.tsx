import { formatRupiah } from "@pejuang/shared";
import { DEBT_LIMIT } from "@/design/tokens";

export type BadgeProps = {
  amount: number;
};

/** Hutang sebagai angka + badge (jangan pakai progress bar). */
export default function Badge({ amount }: BadgeProps) {
  const danger = amount >= DEBT_LIMIT * 0.8;
  return (
    <span
      className={`inline-flex min-h-6 items-center gap-1 rounded-full border px-2 py-0.5 text-label tabular-nums ${
        danger
          ? "border-bahaya bg-bahaya-lembut text-bahaya"
          : "border-garis bg-kartu-tinggi text-teks-utama"
      }`}
      role="status"
      aria-label={`Hutang ${formatRupiah(amount)} dari batas ${formatRupiah(DEBT_LIMIT)}`}
    >
      <span aria-hidden="true">−</span>
      <span>{formatRupiah(amount)}</span>
    </span>
  );
}
